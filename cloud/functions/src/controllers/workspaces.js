// eslint-disable-next-line no-unused-vars
const express = require("express");
const {
  firestore,
  FieldValue,
  sha256,
  auth,
  postData,
  functions,
} = require("../utils");
const { v4: uuidv4 } = require("uuid");
const {
  saveImageThumbnail,
  createPersistentDownloadUrlWithMetadata,
} = require("../utils/storage");
const {
  WORKSPACE_THUMBNAIL_WIDTH,
  WORKSPACE_PHOTO_MAX_WIDTH,
} = require("../../config");
const {
  getUserByEmail,
  mutateUserById,
  getUsersByWorkspace,
  createUserDB,
} = require("../utils/users");
const {
  createChannelDB,
  getChannelsByWorkspace,
  getChannelById,
  mutateChannelById,
  getChannelsByUser,
} = require("../utils/channels");
const { createDirectDB, getDirectsByUser } = require("../utils/directs");
const {
  createDetailDB,
  getDetailsByWorkspace,
  getDetailsByWorkspaceAndUser,
} = require("../utils/details");
const {
  createWorkspaceDB,
  getWorkspaceById,
  mutateWorkspaceById,
} = require("../utils/workspaces");
const { createPresenceDB } = require("../utils/presence");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createWorkspace = async (req, res, next) => {
  try {
    const { name, objectId: customObjectId } = req.body;
    const { uid } = res.locals;

    const promises = [];
    const workspaceId = customObjectId || uuidv4();
    const channelId = uuidv4();
    const directMessageId = uuidv4();

    promises.push(
      mutateUserById({
        objectId: uid,
        updatedAt: FieldValue.serverTimestamp(),
        workspaces: FieldValue.arrayUnion(workspaceId),
      })
    );
    promises.push(
      createChannelDB({
        objectId: channelId,
        name: "general",
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
        details: "",
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );
    promises.push(
      createDirectDB({
        objectId: directMessageId,
        members: [uid],
        typing: [],
        lastTypingReset: FieldValue.serverTimestamp(),
        active: [uid],
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );

    const detailChannelId = sha256(`${uid}#${channelId}`);
    promises.push(
      createDetailDB({
        objectId: detailChannelId,
        chatId: channelId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    const detailDmId = sha256(`${uid}#${directMessageId}`);
    promises.push(
      createDetailDB({
        objectId: detailDmId,
        chatId: directMessageId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    await Promise.all(promises);

    await createWorkspaceDB({
      name,
      channelId,
      objectId: workspaceId,
      members: [uid],
      ownerId: uid,
      details: "",
      photoURL: "",
      thumbnailURL: "",
      isDeleted: false,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    res.locals.data = {
      workspaceId,
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
const updateWorkspace = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;
    const { uid } = res.locals;
    const { photoPath, name, details } = req.body;

    if (name === "") throw new Error("Name must be provided.");
    if (photoPath && !photoPath.startsWith(`Workspace/${workspaceId}`))
      throw new Error("Not allowed.");

    await firestore.runTransaction(async (transaction) => {
      const workspace = await getWorkspaceById(workspaceId, transaction);

      if (name && workspace.ownerId !== uid)
        throw new Error("The workspace name can only be renamed by the owner.");

      if (!workspace.members.includes(uid))
        throw new Error("The user is not a member of the workspace.");

      const [photoURL, metadata] =
        await createPersistentDownloadUrlWithMetadata(photoPath);
      const [thumbnailURL, , photoResizedURL] = await saveImageThumbnail(
        photoPath,
        WORKSPACE_THUMBNAIL_WIDTH,
        WORKSPACE_THUMBNAIL_WIDTH,
        metadata,
        false,
        false,
        true,
        WORKSPACE_PHOTO_MAX_WIDTH
      );

      mutateWorkspaceById(
        {
          objectId: workspaceId,
          ...(photoPath != null && {
            photoURL: photoResizedURL || photoURL,
            thumbnailURL,
          }),
          ...(details != null && { details }),
          ...(name && { name }),
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
const deleteWorkspace = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;
    const { uid } = res.locals;

    const workspace = await getWorkspaceById(workspaceId);

    if (!workspace.members.includes(uid))
      throw new Error("The user is not a member of the workspace.");

    await mutateWorkspaceById({
      objectId: workspaceId,
      updatedAt: FieldValue.serverTimestamp(),
      isDeleted: true,
      members: [],
    });

    const details = await getDetailsByWorkspace(workspaceId);
    await Promise.all(
      details.map(async (doc) => {
        await doc.ref.delete();
      })
    );

    const channels = await getChannelsByWorkspace(workspaceId);
    await Promise.all(
      channels.map(async (doc) => {
        await doc.ref.update({
          isDeleted: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      })
    );

    const users = await getUsersByWorkspace(workspaceId);
    await Promise.all(
      users.map(async (doc) => {
        await doc.ref.update({
          workspaces: FieldValue.arrayRemove(workspaceId),
          updatedAt: FieldValue.serverTimestamp(),
        });
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
const addTeammate = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { id: workspaceId } = req.params;
    const { uid } = res.locals;

    let { objectId: teammateId } = await getUserByEmail(email);
    if (!teammateId) {
      const name = "Guest";
      const teammate = await auth.createUser({
        email,
        password: uuidv4(),
        displayName: name,
      });
      teammateId = teammate.uid;
      const batch = firestore.batch();
      createUserDB(
        {
          objectId: teammateId,
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
          objectId: teammateId,
          lastPresence: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        batch
      );
      await batch.commit();
      await postData(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${
          functions.config().webapp.api_key
        }`,
        {
          requestType: "PASSWORD_RESET",
          email,
        }
      );
    }

    let channelId;

    await firestore.runTransaction(async (transaction) => {
      const workspace = await getWorkspaceById(workspaceId, transaction);
      // if (!workspace.members.includes(uid))
      //   throw new Error("The user is not a member of the workspace.");

      if (workspace.members.includes(teammateId))
        throw new Error(
          "Email is already associated with a user in this workspace."
        );

      const channel = await getChannelById(workspace.channelId, transaction);
      channelId = channel.objectId;

      mutateWorkspaceById(
        {
          objectId: workspaceId,
          updatedAt: FieldValue.serverTimestamp(),
          members: FieldValue.arrayUnion(teammateId),
        },
        transaction
      );

      mutateUserById(
        {
          objectId: teammateId,
          updatedAt: FieldValue.serverTimestamp(),
          workspaces: FieldValue.arrayUnion(workspaceId),
        },
        transaction
      );

      mutateChannelById(
        {
          objectId: channel.objectId,
          updatedAt: FieldValue.serverTimestamp(),
          members: FieldValue.arrayUnion(teammateId),
        },
        transaction
      );

      // Added by another user than me
      if (uid !== teammateId) {
        const directMessageId = uuidv4();
        createDirectDB(
          {
            objectId: directMessageId,
            members: [uid, teammateId],
            active: [uid],
            typing: [],
            lastTypingReset: FieldValue.serverTimestamp(),
            workspaceId,
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            lastMessageCounter: 0,
            lastMessageText: "",
          },
          transaction
        );
        // New teammate chat details with me
        const d2 = sha256(`${teammateId}#${directMessageId}`);
        createDetailDB(
          {
            objectId: d2,
            chatId: directMessageId,
            userId: teammateId,
            lastRead: 0,
            workspaceId,
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          },
          transaction
        );

        // My chat detail with the new teammate
        const d3 = sha256(`${uid}#${directMessageId}`);
        createDetailDB(
          {
            objectId: d3,
            chatId: directMessageId,
            userId: uid,
            lastRead: 0,
            workspaceId,
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          },
          transaction
        );
      }

      const selfDirectMessageId = uuidv4();
      createDirectDB(
        {
          objectId: selfDirectMessageId,
          members: [teammateId],
          active: [teammateId],
          typing: [],
          lastTypingReset: FieldValue.serverTimestamp(),
          workspaceId,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
          lastMessageCounter: 0,
          lastMessageText: "",
        },
        transaction
      );

      // New teammate chat details with default channel
      const d1 = sha256(`${teammateId}#${channel.objectId}`);
      createDetailDB(
        {
          objectId: d1,
          chatId: channel.objectId,
          userId: teammateId,
          lastRead: channel.lastMessageCounter,
          workspaceId,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        transaction
      );

      // New teammate chat details with himself
      const d4 = sha256(`${teammateId}#${selfDirectMessageId}`);
      createDetailDB(
        {
          objectId: d4,
          chatId: selfDirectMessageId,
          userId: teammateId,
          lastRead: 0,
          workspaceId,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        transaction
      );
    });

    res.locals.data = {
      workspaceId,
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
const deleteTeammate = async (req, res, next) => {
  try {
    const { id: workspaceId, userId } = req.params;
    const { uid } = res.locals;

    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace.members.includes(uid))
      throw new Error("The user is not a member of the workspace.");

    const batch = firestore.batch();

    mutateWorkspaceById(
      {
        objectId: workspaceId,
        members: FieldValue.arrayRemove(userId),
        updatedAt: FieldValue.serverTimestamp(),
      },
      batch
    );

    mutateUserById(
      {
        objectId: userId,
        workspaces: FieldValue.arrayRemove(workspaceId),
        updatedAt: FieldValue.serverTimestamp(),
      },
      batch
    );

    await batch.commit();

    const details = await getDetailsByWorkspaceAndUser(workspaceId, userId);
    await Promise.all(
      details.map(async (doc) => {
        await doc.ref.delete();
      })
    );

    const directs = await getDirectsByUser(workspaceId, userId);
    await Promise.all(
      directs.map(async (doc) => {
        await doc.ref.delete();
      })
    );

    const channels = await getChannelsByUser(workspaceId, userId);
    await Promise.all(
      channels.map(async (doc) => {
        await doc.ref.update({
          updatedAt: FieldValue.serverTimestamp(),
          members: FieldValue.arrayRemove(userId),
        });
      })
    );

    res.locals.data = {
      succes: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addTeammate,
  deleteTeammate,
};
