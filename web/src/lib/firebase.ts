/* eslint-disable */

import { FIREBASE_CONFIG } from 'config';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/storage';

if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

// Auth exports
export const firebaseAuth = firebase.auth;
export const auth = firebase.auth();
export const authCredential = firebase.auth.EmailAuthProvider.credential;
export const authPersistence = firebase.auth.Auth.Persistence;

// Storage exports
export const storage = firebase.storage();

// Firestore exports
export const firestore = firebase.firestore();
export const Timestamp = firebase.firestore.Timestamp;
export const convertTimestampToDate = (time?: firebase.firestore.Timestamp) =>
  time ? new Timestamp(time.seconds, time.nanoseconds).toDate() : null;
