const {
  firestore,
  getTransactionData,
  getFirestoreData,
  firef,
} = require("../utils");

const getDetailById = async (id, transaction) => {
  if (transaction) {
    return await getTransactionData(transaction, `Detail/${id}`);
  } else {
    return await getFirestoreData(`Detail/${id}`);
  }
};

const mutateDetailById = async (data, transaction) => {
  if (transaction) {
    transaction.update(firef(`Detail/${data.objectId}`), data);
  } else {
    await firestore.doc(`Detail/${data.objectId}`).update(data);
  }
};

const createDetailDB = async (data, transaction) => {
  if (transaction) {
    transaction.set(firef(`Detail/${data.objectId}`), data);
  } else {
    await firestore.doc(`Detail/${data.objectId}`).set(data);
  }
};

const getDetailsByWorkspace = async (workspaceId) => {
  const snapshot = await firestore
    .collection("Detail")
    .where("workspaceId", "==", workspaceId)
    .get();
  return snapshot.docs;
};

const getDetailsByWorkspaceAndUser = async (workspaceId, userId) => {
  const snapshot = await firestore
    .collection("Detail")
    .where("userId", "==", userId)
    .where("workspaceId", "==", workspaceId)
    .get();
  return snapshot.docs;
};

const getDetailsByChatAndUser = async (chatId, userId) => {
  const snapshot = await firestore
    .collection("Detail")
    .where("chatId", "==", chatId)
    .where("userId", "==", userId)
    .get();
  return snapshot.docs;
};

const getDetailsByChat = async (chatId) => {
  const snapshot = await firestore
    .collection("Detail")
    .where("chatId", "==", chatId)
    .get();
  return snapshot.docs;
};

module.exports = {
  createDetailDB,
  getDetailById,
  mutateDetailById,
  getDetailsByWorkspace,
  getDetailsByWorkspaceAndUser,
  getDetailsByChat,
  getDetailsByChatAndUser,
};
