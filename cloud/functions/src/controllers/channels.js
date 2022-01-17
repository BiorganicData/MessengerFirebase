// eslint-disable-next-line no-unused-vars
const express = require("express");
const {
  firestore,
  FieldValue,
  getFirestoreData,
  convertTimestampToDate,
  timeDiff,
  sha256,
} = require("../utils");
const { v4: uuidv4 } = require("uuid");
const { getUserByEmail } = require("../utils/users");
const {
  getChannelsByName,
  createChannelDB,
  mutateChannelById,
  getChannelById,
} = require("../utils/channels");
const {
  createDetailDB,
  getDetailsByChat,
  getDetailsByChatAndUser,
} = require("../utils/details");
const { getWorkspaceById } = require("../utils/workspaces");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createChannel = async (req, res, next) => {
  try {
    const { name, details, workspaceId, objectId: customObjectId } = req.body;
    const { uid } = res.locals;

    const workspace = await getFirestoreData(`Workspace/${workspaceId}`);
    if (!workspace.members.includes(uid))
      throw new Error("The user is not in the workspace.");

    const channels = await getChannelsByName(
      workspaceId,
      name.replace("#", "")
    );
    if (channels.length) throw new Error("Channel already exists.");

    const channelId = customObjectId || uuidv4();
    const promises = [];
    promises.push(
      createChannelDB({
        objectId: channelId,
        name: `${name.replace("#", "")}`,
        members: [uid],
        typing: [],
        lastTypingReset: FieldValue.serverTimestamp(),
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        createdBy: uid,
        isDeleted: false,
        isArchived: false,
        topic: "",
        details: details || "",
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );

    const detailId = sha256(`${uid}#${channelId}`);
    promises.push(
      createDetailDB({
        objectId: detailId,
        chatId: channelId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    await Promise.all(promises);

    res.locals.data = {
      channelId,
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
const updateChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;
    const { topic, details, name } = req.body;

    if (name != null && (name.trim() === "" || name.trim() === "#"))
      throw new Error("Channel name must be provided.");

    await firestore.runTransaction(async (transaction) => {
      const channel = await getChannelById(channelId, transaction);

      if (name) {
        const channels = await getChannelsByName(
          channel.workspaceId,
          name.trim().replace("#", "")
        );
        if (channels.length) throw new Error("Channel name is already taken.");
      }

      if (!channel.members.includes(uid))
        throw new Error("The user is not in the channel.");

      mutateChannelById(
        {
          objectId: channelId,
          ...(topic != null && { topic }),
          ...(details != null && { details }),
          ...(name && { name: name.replace("#", "") }),
          updatedAt: FieldValue.serverTimestamp(),
        },
        transaction
      );
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
const deleteChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    await firestore.runTransaction(async (transaction) => {
      const channel = await getChannelById(channelId, transaction);
      if (!channel.members.includes(uid))
        throw new Error("The user is not in the channel.");

      mutateChannelById(
        {
          objectId: channelId,
          updatedAt: FieldValue.serverTimestamp(),
          isDeleted: true,
        },
        transaction
      );

      const details = await getDetailsByChat(channelId);
      await Promise.all(
        details.map(async (doc) => {
          await doc.ref.delete();
        })
      );
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
const archiveChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    await firestore.runTransaction(async (transaction) => {
      const channel = await getChannelById(channelId, transaction);
      if (!channel.members.includes(uid))
        throw new Error("The user is not in the channel.");

      mutateChannelById(
        {
          objectId: channelId,
          updatedAt: FieldValue.serverTimestamp(),
          isArchived: true,
        },
        transaction
      );
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
const unarchiveChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    await firestore.runTransaction(async (transaction) => {
      const channel = await getChannelById(channelId, transaction);
      const workspace = await getWorkspaceById(
        channel.workspaceId,
        transaction
      );
      if (!workspace.members.includes(uid))
        throw new Error("The user is not in the workspace.");

      mutateChannelById(
        {
          objectId: channelId,
          updatedAt: FieldValue.serverTimestamp(),
          isArchived: false,
          members: FieldValue.arrayUnion(uid),
        },
        transaction
      );

      if (!channel.members.includes(uid)) {
        const d1 = sha256(`${uid}#${channel.objectId}`);
        createDetailDB(
          {
            objectId: d1,
            chatId: channel.objectId,
            userId: uid,
            workspaceId: channel.workspaceId,
            lastRead: channel.lastMessageCounter,
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
const addMember = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { email } = req.body;
    const { uid } = res.locals;

    const { objectId: userId } = await getUserByEmail(email);
    if (!userId) throw new Error("User does not exist.");

    await firestore.runTransaction(async (transaction) => {
      const channel = await getChannelById(channelId, transaction);
      const workspace = await getWorkspaceById(
        channel.workspaceId,
        transaction
      );

      if (!workspace.members.includes(uid))
        throw new Error("The user is not in this workspace.");

      if (!workspace.members.includes(userId))
        throw new Error("The user is not in this workspace.");

      mutateChannelById(
        {
          objectId: channelId,
          updatedAt: FieldValue.serverTimestamp(),
          members: FieldValue.arrayUnion(userId),
        },
        transaction
      );

      const d1 = sha256(`${userId}#${channel.objectId}`);
      createDetailDB(
        {
          objectId: d1,
          chatId: channel.objectId,
          userId,
          workspaceId: channel.workspaceId,
          lastRead: channel.lastMessageCounter,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        transaction
      );
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
const deleteMember = async (req, res, next) => {
  try {
    const { id: channelId, userId } = req.params;
    const { uid } = res.locals;

    const channel = await getChannelById(channelId);
    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    await mutateChannelById({
      objectId: channelId,
      updatedAt: FieldValue.serverTimestamp(),
      members: FieldValue.arrayRemove(userId),
    });

    const details = await getDetailsByChatAndUser(channelId, userId);
    await Promise.all(
      details.map(async (doc) => {
        await doc.ref.delete();
      })
    );

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
const typingIndicator = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { isTyping } = req.body;
    const { uid } = res.locals;

    const channel = await getChannelById(channelId);

    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    if (
      (isTyping && !channel.typing.includes(uid)) ||
      (!isTyping && channel.typing.includes(uid))
    ) {
      await mutateChannelById({
        objectId: channelId,
        typing: isTyping
          ? FieldValue.arrayUnion(uid)
          : FieldValue.arrayRemove(uid),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

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
const resetTyping = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    const channel = await getChannelById(channelId);

    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    if (
      timeDiff(convertTimestampToDate(channel.lastTypingReset), Date.now()) >=
        30 &&
      channel.typing.length > 0
    ) {
      await mutateChannelById({
        objectId: channelId,
        typing: [],
        lastTypingReset: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
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
  createChannel,
  updateChannel,
  deleteChannel,
  archiveChannel,
  unarchiveChannel,
  addMember,
  deleteMember,
  typingIndicator,
  resetTyping,
};
