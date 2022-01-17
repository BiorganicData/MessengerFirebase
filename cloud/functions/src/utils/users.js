const {
  firestore,
  getTransactionData,
  getFirestoreData,
  firef,
} = require("../utils");

const getUserById = async (id, transaction) => {
  if (transaction) {
    return await getTransactionData(transaction, `User/${id}`);
  } else {
    return await getFirestoreData(`User/${id}`);
  }
};

const mutateUserById = async (data, transaction) => {
  if (transaction) {
    transaction.update(firef(`User/${data.objectId}`), data);
  } else {
    await firestore.doc(`User/${data.objectId}`).update(data);
  }
};

const getUserByEmail = async (email) => {
  const snapshot = await firestore
    .collection("User")
    .where("email", "==", email)
    .limit(1)
    .get();
  return {
    objectId: snapshot.docs[0] ? snapshot.docs[0].id : null,
  };
};

const getUsersByWorkspace = async (workspaceId) => {
  const snapshot = await firestore
    .collection("User")
    .where("workspaces", "array-contains", workspaceId)
    .get();
  return snapshot.docs;
};

const createUserDB = async (data, transaction) => {
  if (transaction) {
    transaction.set(firef(`User/${data.objectId}`), data);
  } else {
    await firestore.doc(`User/${data.objectId}`).set(data);
  }
};

module.exports = {
  getUserById,
  mutateUserById,
  getUserByEmail,
  createUserDB,
  getUsersByWorkspace,
};
