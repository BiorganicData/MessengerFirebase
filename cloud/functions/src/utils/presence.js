const {
  firestore,
  firef,
  getFirestoreData,
  getTransactionData,
} = require("../utils");

const getPresenceById = async (id, transaction) => {
  if (transaction) {
    return await getTransactionData(transaction, `Presence/${id}`);
  } else {
    return await getFirestoreData(`Presence/${id}`);
  }
};

const mutatePresenceById = async (data, transaction) => {
  if (transaction) {
    transaction.update(firef(`Presence/${data.objectId}`), data);
  } else {
    await firestore.doc(`Presence/${data.objectId}`).update(data);
  }
};

const createPresenceDB = async (data, transaction) => {
  if (transaction) {
    transaction.set(firef(`Presence/${data.objectId}`), data);
  } else {
    await firestore.doc(`Presence/${data.objectId}`).set(data);
  }
};

module.exports = {
  getPresenceById,
  mutatePresenceById,
  createPresenceDB,
};
