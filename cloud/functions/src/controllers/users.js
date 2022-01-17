// eslint-disable-next-line no-unused-vars
const express = require("express");
const { USER_THUMBNAIL_WIDTH, USER_PHOTO_MAX_WIDTH } = require("../../config");
const {
  firestore,
  FieldValue,
  auth,
  sha256,
  postData,
  functions,
} = require("../utils");
const { getChannelById } = require("../utils/channels");
const {
  getDetailById,
  mutateDetailById,
  createDetailDB,
} = require("../utils/details");
const { getDirectById } = require("../utils/directs");
const { createPresenceDB, mutatePresenceById } = require("../utils/presence");
const {
  saveImageThumbnail,
  createPersistentDownloadUrlWithMetadata,
} = require("../utils/storage");
const { createUserDB, mutateUserById } = require("../utils/users");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const user = await auth.createUser({
      email,
      password,
      displayName: name,
    });
    const uid = user.uid;

    const batch = firestore.batch();

    createUserDB(
      {
        objectId: uid,
        fullName: name,
        displayName: name,
        email,
        phoneNumber: "",
        title: "",
        theme: "",
        photoURL: "",
        thumbnailURL: "",
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      batch
    );

    createPresenceDB(
      {
        objectId: uid,
        lastPresence: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      batch
    );

    await batch.commit();

    res.locals.data = {
      uid,
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
const loginUser = async (req, res, next) => {
  try {
    const { email, password, refreshToken } = req.body;

    if (refreshToken) {
      const data = await postData(
        `https://securetoken.googleapis.com/v1/token?key=${
          functions.config().webapp.api_key
        }`,
        {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }
      );
      res.locals.data = data;
      return next();
    }

    const data = await postData(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${
        functions.config().webapp.api_key
      }`,
      {
        returnSecureToken: true,
        email,
        password,
      }
    );

    res.locals.data = data;
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
const updateUser = async (req, res, next) => {
  try {
    const { photoPath, fullName, displayName, title, phoneNumber, theme } =
      req.body;
    const { id } = req.params;
    const { uid } = res.locals;

    if (id !== uid) throw new Error("Not allowed.");

    if (displayName === "") throw new Error("Display name must be provided.");
    if (fullName === "") throw new Error("Full name must be provided.");
    if (photoPath && !photoPath.startsWith(`User/${uid}`))
      throw new Error("Not allowed.");

    await firestore.runTransaction(async (transaction) => {
      const [photoURL, metadata] =
        await createPersistentDownloadUrlWithMetadata(photoPath);
      const [thumbnailURL, , photoResizedURL] = await saveImageThumbnail(
        photoPath,
        USER_THUMBNAIL_WIDTH,
        USER_THUMBNAIL_WIDTH,
        metadata,
        false,
        false,
        true,
        USER_PHOTO_MAX_WIDTH
      );

      if (displayName) await auth.updateUser(uid, { displayName });

      mutateUserById(
        {
          objectId: uid,
          ...(title != null && { title }),
          ...(photoPath != null && {
            photoURL: photoResizedURL || photoURL,
            thumbnailURL,
          }),
          ...(phoneNumber != null && { phoneNumber }),
          ...(displayName && { displayName }),
          ...(fullName && { fullName }),
          ...(theme && { theme }),
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
const updatePresence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;

    if (id !== uid) throw new Error("Not allowed.");

    try {
      await mutatePresenceById({
        objectId: uid,
        lastPresence: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      // Not found
      if (error.code === 5) {
        await createPresenceDB({
          objectId: uid,
          lastPresence: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
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

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const read = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;
    const { chatType, chatId } = req.body;

    if (id !== uid) throw new Error("Not allowed.");

    const detailId = sha256(`${uid}#${chatId}`);

    await firestore.runTransaction(async (transaction) => {
      const detail = await getDetailById(detailId, transaction);

      const chat =
        chatType === "Channel"
          ? await getChannelById(chatId, transaction)
          : await getDirectById(chatId, transaction);

      if (detail && uid !== detail.userId) throw new Error("Not allowed.");
      if (detail && chatId !== detail.chatId)
        throw new Error("An error has occured.");

      if (detail) {
        mutateDetailById(
          {
            objectId: detailId,
            lastRead: chat.lastMessageCounter,
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
            workspaceId: chat.workspaceId,
            lastRead: chat.lastMessageCounter,
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

module.exports = {
  createUser,
  loginUser,
  updateUser,
  updatePresence,
  read,
};
