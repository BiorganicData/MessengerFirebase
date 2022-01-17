import { auth, firestore } from 'lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';

export function useUserData() {
  const [user, loading] = useAuthState(auth);
  const [value] = useDocumentData(
    user ? firestore.doc(`User/${user.uid}`) : null
  );

  if (loading) return { user: undefined, userdata: undefined };
  return { user, userdata: value };
}
