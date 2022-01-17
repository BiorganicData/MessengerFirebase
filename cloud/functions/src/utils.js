const functions = require("firebase-functions");

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
admin.initializeApp();

const firestore = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
const FieldValue = admin.firestore.FieldValue;
const crypto = require("crypto");
const fetch = require("node-fetch");

const removeExtraSpaces = (str) => str.replace(/\s+/g, " ").trim();

const getFirestoreData = async (path) => {
  const doc = await firestore.doc(path).get();
  // if (!doc.exists) throw new Error("Object does not exist.");
  return doc.data();
};

/**
 * @param  {FirebaseFirestore.Transaction} transaction
 * @param  {string} path
 */
const getTransactionData = async (transaction, path) => {
  const ref = firestore.doc(path);
  const doc = await transaction.get(ref);
  // if (!doc.exists) throw new Error("Object does not exist.");
  return doc.data();
};

const firef = (path) => {
  return firestore.doc(path);
};

/**
 * @param  {number} idLength
 * @param  {string} chars
 * @return {string}
 */
const randomId = (idLength, chars) => {
  chars =
    chars || "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rnd = crypto.randomBytes(idLength);
  const value = new Array(idLength);
  const len = Math.min(256, chars.length);
  const d = 256 / len;

  for (let i = 0; i < idLength; i++) {
    value[i] = chars[Math.floor(rnd[i] / d)];
  }

  return value.join("");
};

const postData = async (url, data, addHeaders) => {
  const headers =
    addHeaders !== null
      ? {
          "Content-Type": "application/json",
          ...addHeaders,
        }
      : {};
  const res = await fetch(url, {
    method: "post",
    headers: headers,
    body: JSON.stringify(data || {}),
  });
  if (!res.ok) {
    const e = await res.json();
    const error = new Error(e.error.message);
    throw error;
  }
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1)
    return await res.json();
  return;
};

const deleteData = async (url, addHeaders) => {
  const headers = {
    "Content-Type": "application/json",
    ...addHeaders,
  };
  const res = await fetch(url, {
    method: "delete",
    headers: headers,
  });
  if (!res.ok) {
    const e = await res.json();
    const error = new Error(e.error.message);
    throw error;
  }
  return;
};

const fetcher = async (url, addHeaders) => {
  const headers = {
    "Content-Type": "application/json",
    ...addHeaders,
  };
  const res = await fetch(url, {
    method: "get",
    headers,
  });
  if (!res.ok) {
    const e = await res.json();
    const error = new Error(e.error.message);
    throw error;
  }
  return await res.json();
};

const logTime = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = `0${date.getUTCMonth() + 1}`.slice(-2);
  const day = `0${date.getUTCDate()}`.slice(-2);

  const hours = `0${date.getUTCHours()}`.slice(-2);
  const min = `0${date.getUTCMinutes()}`.slice(-2);
  const sec = `0${date.getUTCSeconds()}`.slice(-2);

  const ms = `00${date.getUTCMilliseconds()}`.slice(-3);

  return `[${year}-${month}-${day} ${hours}:${min}:${sec}.${ms}]`;
};

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const now = () => {
  return Math.floor(Date.now() / 1000);
};

/* Firestore Timestamp conversion and difference */
const Timestamp = admin.firestore.Timestamp;

/**
 * @param  {Timestamp} time
 * @return {Date}
 */
const convertTimestampToDate = (time) =>
  new Timestamp(time.seconds, time.nanoseconds).toDate();

/**
 * @param  {Timestamp} date1
 * @param  {number} date2
 * @return {number}
 */
const timeDiff = (date1, date2) => {
  return Math.abs(date1.getTime() - date2) / 1000;
};

const sha256 = (str) => {
  return crypto.createHash("sha256").update(str).digest("hex");
};

module.exports = {
  removeExtraSpaces,
  getFirestoreData,
  getTransactionData,
  firef,
  FieldValue,
  admin,
  firestore,
  auth,
  storage,
  functions,
  randomId,
  postData,
  fetcher,
  deleteData,
  logTime,
  sleep,
  now,
  convertTimestampToDate,
  timeDiff,
  sha256,
};
