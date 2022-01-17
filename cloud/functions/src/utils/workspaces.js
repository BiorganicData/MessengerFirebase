const {
  getFirestoreData,
  getTransactionData,
  firef,
  firestore,
} = require("../utils");

const getWorkspaceById = async (id, transaction) => {
  if (transaction) {
    return await getTransactionData(transaction, `Workspace/${id}`);
  } else {
    return await getFirestoreData(`Workspace/${id}`);
  }
};

const mutateWorkspaceById = async (data, transaction) => {
  if (transaction) {
    transaction.update(firef(`Workspace/${data.objectId}`), data);
  } else {
    await firestore.doc(`Workspace/${data.objectId}`).update(data);
  }
};

const createWorkspaceDB = async (data, transaction) => {
  if (transaction) {
    transaction.set(firef(`Workspace/${data.objectId}`), data);
  } else {
    await firestore.doc(`Workspace/${data.objectId}`).set(data);
  }
};

module.exports = {
  getWorkspaceById,
  mutateWorkspaceById,
  createWorkspaceDB,
};
