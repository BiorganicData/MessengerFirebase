const { firestore, getFirestoreData } = require("../utils");

const getVersion = async () => {
  const doc = await getFirestoreData("Version/version");
  return doc;
};

const setVersion = async (databaseVersion) => {
  await firestore.doc("Version/version").set({
    databaseVersion,
  });
};

module.exports = {
  getVersion,
  setVersion,
};
