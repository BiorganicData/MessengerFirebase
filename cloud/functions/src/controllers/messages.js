// eslint-disable-next-line no-unused-vars
const express = require("express");
const { firestore, FieldValue, sha256 } = require("../utils");
const { v4: uuidv4 } = require("uuid");
const {
  createPersistentDownloadUrlWithMetadata,
  saveImageThumbnail,
} = require("../utils/storage");
const { MESSAGE_THUMBNAIL_WIDTH } = require("../../config");
const {
  getLastVisibleMessageByChat,
  createMessageDB,
  getMessageById,
  mutateMessageById,
} = require("../utils/messages");
const { getChannelById, mutateChannelById } = require("../utils/channels");
const { getDirectById, mutateDirectById } = require("../utils/directs");
const {
  getDetailById,
  mutateDetailById,
  createDetailDB,
} = require("../utils/details");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createMessage = async (req, res, next) => {
  try {
    const {
      text,
      chatId,
      workspaceId,
      chatType,
      filePath,
      sticker,
      fileName,
      objectId: customObjectId,
    } = req.body;
    const { uid } = res.locals;

    if (!chatId || !workspaceId || !chatType) {
      throw new Error("Arguments are missing.");
    }

    await firestore.runTransaction(async (transaction) => {
      const chat =
        chatType === "Channel"
          ? await getChannelById(chatId, transaction)
          : await getDirectById(chatId, transaction);

      if (!chat.members.includes(uid))
        throw new Error("The user is not authorized to create a message.");

      const lastMessageCounter = chat.lastMessageCounter || 0;

      const detailId = sha256(`${uid}#${chatId}`);
      const chatDetails = await getDetailById(detailId, transaction);

      const [fileURL, fileDetails] =
        await createPersistentDownloadUrlWithMetadata(filePath);
      const [thumbnailURL, fileMetadata] = await saveImageThumbnail(
        filePath,
        MESSAGE_THUMBNAIL_WIDTH,
        null,
        fileDetails,
        true,
        true
      );

      const messageId = customObjectId || uuidv4();
      createMessageDB(
        {
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          text: text || "",
          mediaWidth: (fileMetadata && fileMetadata.width) || null,
          mediaHeight: (fileMetadata && fileMetadata.height) || null,
          mediaDuration: (fileMetadata && fileMetadata.duration) || null,
          fileURL,
          thumbnailURL,
          fileSize: fileDetails ? fileDetails.size : null,
          fileType: fileDetails ? fileDetails.contentType : null,
          fileName: fileName || null,
          sticker: sticker || null,
          objectId: messageId,
          senderId: uid,
          workspaceId,
          chatId,
          chatType,
          counter: lastMessageCounter + 1,
          isDeleted: false,
          isEdited: false,
        },
        transaction
      );

      if (chatType === "Channel") {
        mutateChannelById(
          {
            objectId: chatId,
            lastMessageText: text || "",
            lastMessageCounter: FieldValue.increment(1),
            typing: FieldValue.arrayRemove(uid),
            updatedAt: FieldValue.serverTimestamp(),
          },
          transaction
        );
      } else {
        mutateDirectById(
          {
            objectId: chatId,
            lastMessageText: text || "",
            lastMessageCounter: FieldValue.increment(1),
            typing: FieldValue.arrayRemove(uid),
            updatedAt: FieldValue.serverTimestamp(),
            active: chat.members,
          },
          transaction
        );
      }

      if (chatDetails) {
        mutateDetailById(
          {
            objectId: detailId,
            lastRead: lastMessageCounter + 1,
            updatedAt: FieldValue.serverTimestamp(),
          },
          transaction
        );
      } else {
        createDetailDB(
          {
            objectId: detailId,
            chatId,
            userId: uid,
            workspaceId,
            lastRead: lastMessageCounter + 1,
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          },
          transaction
        );
      }
    });

    res.locals.data = {
      success: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const editMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    const { id } = req.params;
    const { uid } = res.locals;

    await firestore.runTransaction(async (transaction) => {
      const message = await getMessageById(id, transaction);
      const chat =
        message.chatType === "Channel"
          ? await getChannelById(message.chatId, transaction)
          : await getDirectById(message.chatId, transaction);

      if (!chat.members.includes(uid)) {
        throw new Error("The user is not authorized to edit this message.");
      }
      if (message.senderId !== uid) {
        throw new Error("The user is not authorized to edit this message.");
      }

      mutateMessageById(
        {
          objectId: id,
          text,
          updatedAt: FieldValue.serverTimestamp(),
          isEdited: true,
        },
        transaction
      );

      const lastMessage = await getLastVisibleMessageByChat(message.chatId);
      if (lastMessage.counter === message.counter) {
        if (message.chatType === "Channel") {
          mutateChannelById(
            {
              objectId: message.chatId,
              lastMessageText: text,
              updatedAt: FieldValue.serverTimestamp(),
            },
            transaction
          );
        } else {
          mutateDirectById(
            {
              objectId: message.chatId,
              lastMessageText: text,
              updatedAt: FieldValue.serverTimestamp(),
            },
            transaction
          );
        }
      }
    });

    res.locals.data = {
      success: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;

    const message = await getMessageById(id);
    const chat =
      message.chatType === "Channel"
        ? await getChannelById(message.chatId)
        : await getDirectById(message.chatId);

    if (!chat.members.includes(uid)) {
      throw new Error("The user is not authorized to delete this message.");
    }
    if (message.senderId !== uid) {
      throw new Error("The user is not authorized to delete this message.");
    }

    await mutateMessageById({
      objectId: id,
      isDeleted: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const lastMessage = await getLastVisibleMessageByChat(message.chatId);

    if (!lastMessage || lastMessage.text !== chat.lastMessageText) {
      if (message.chatType === "Channel") {
        await mutateChannelById({
          objectId: message.chatId,
          lastMessageText: !lastMessage ? "" : lastMessage.text,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await mutateDirectById({
          objectId: message.chatId,
          lastMessageText: !lastMessage ? "" : lastMessage.text,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    res.locals.data = {
      success: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createMessage,
  editMessage,
  deleteMessage,
};
