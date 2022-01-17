const {
  firestore,
  firef,
  getFirestoreData,
  getTransactionData,
} = require("../utils");

const getChannelById = async (id, transaction) => {
  if (transaction) {
    return await getTransactionData(transaction, `Channel/${id}`);
  } else {
    return await getFirestoreData(`Channel/${id}`);
  }
};

/**
 * @param  {object} data
 * @param  {FirebaseFirestore.Transaction} transaction
 * @return {FirebaseFirestore.Transaction | Promise<FirebaseFirestore.WriteResult>}
 */
const mutateChannelById = async (data, transaction) => {
  if (transaction) {
    transaction.update(firef(`Channel/${data.objectId}`), data);
  } else {
    await firestore.doc(`Channel/${data.objectId}`).update(data);
  }
};

const createChannelDB = async (data, transaction) => {
  if (transaction) {
    transaction.set(firef(`Channel/${data.objectId}`), data);
  } else {
    await firestore.doc(`Channel/${data.objectId}`).set(data);
  }
};

const getChannelsByName = async (workspaceId, name) => {
  const snapshot = await firestore
    .collection("Channel")
    .where("name", "==", name)
    .where("workspaceId", "==", workspaceId)
    .where("isDeleted", "==", false)
    .limit(1)
    .get();
  return snapshot.docs.map((doc) => doc.data());
};

const getChannelsByWorkspace = async (workspaceId) => {
  const snapshot = await firestore
    .collection("Channel")
    .where("workspaceId", "==", workspaceId)
    .where("isDeleted", "==", false)
    .get();
  return snapshot.docs;
};

const getChannelsByUser = async (workspaceId, userId) => {
  const snapshot = await firestore
    .collection("Channel")
    .where("workspaceId", "==", workspaceId)
    .where("members", "array-contains", userId)
    .get();
  return snapshot.docs;
};

module.exports = {
  getChannelById,
  mutateChannelById,
  createChannelDB,
  getChannelsByName,
  getChannelsByWorkspace,
  getChannelsByUser,
};
