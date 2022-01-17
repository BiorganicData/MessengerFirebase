const {
  firestore,
  getTransactionData,
  getFirestoreData,
  firef,
} = require("../utils");

const getDirectById = async (id, transaction) => {
  if (transaction) {
    return await getTransactionData(transaction, `Direct/${id}`);
  } else {
    return await getFirestoreData(`Direct/${id}`);
  }
};

const mutateDirectById = async (data, transaction) => {
  if (transaction) {
    transaction.update(firef(`Direct/${data.objectId}`), data);
  } else {
    await firestore.doc(`Direct/${data.objectId}`).update(data);
  }
};

const getDirectsByUser = async (workspaceId, userId) => {
  const snapshot = await firestore
    .collection("Direct")
    .where("workspaceId", "==", workspaceId)
    .where("members", "array-contains", userId)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs;
};

const createDirectDB = async (data, transaction) => {
  if (transaction) {
    transaction.set(firef(`Direct/${data.objectId}`), data);
  } else {
    await firestore.doc(`Direct/${data.objectId}`).set(data);
  }
};

module.exports = {
  getDirectsByUser,
  getDirectById,
  mutateDirectById,
  createDirectDB,
};
