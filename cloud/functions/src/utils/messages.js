const {
  firestore,
  firef,
  getTransactionData,
  getFirestoreData,
} = require("../utils");

const getMessageById = async (id, transaction) => {
  if (transaction) {
    return await getTransactionData(transaction, `Message/${id}`);
  } else {
    return await getFirestoreData(`Message/${id}`);
  }
};

const mutateMessageById = async (data, transaction) => {
  if (transaction) {
    transaction.update(firef(`Message/${data.objectId}`), data);
  } else {
    await firestore.doc(`Message/${data.objectId}`).update(data);
  }
};

const getLastVisibleMessageByChat = async (chatId) => {
  let lastMessage;
  const snapshot = await firestore
    .collection("Message")
    .where("chatId", "==", chatId)
    .where("isDeleted", "==", false)
    .orderBy("counter", "desc")
    .limit(1)
    .get();
  snapshot.forEach((doc) => {
    lastMessage = doc.data();
  });
  return lastMessage;
};

const createMessageDB = async (data, transaction) => {
  if (transaction) {
    transaction.set(firef(`Message/${data.objectId}`), data);
  } else {
    await firestore.doc(`Message/${data.objectId}`).set(data);
  }
};

module.exports = {
  getMessageById,
  mutateMessageById,
  getLastVisibleMessageByChat,
  createMessageDB,
};
