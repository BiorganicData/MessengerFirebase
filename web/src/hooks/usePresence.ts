import { PresencesContext, UserContext } from 'lib/context';
import { convertTimestampToDate, firestore } from 'lib/firebase';
import { useContext, useEffect, useState } from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import timeDiff from 'utils/time-diff';

export function usePresenceByUserId(id?: string | null) {
  const { user } = useContext(UserContext);
  const { presences, setPresences } = useContext(PresencesContext);

  const isMe = user?.uid === id;

  const [value, loading] = useDocumentData(
    id && user && !isMe ? firestore.doc(`Presence/${id}`) : null
  );

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (value) {
      const temp = presences.filter((data: any) => data.objectId !== id);
      setPresences([...temp, value]);
    }
  }, [value]);

  const currentPresence = presences.find((data: any) => data.objectId === id);

  let isPresent = false;
  if (isMe) isPresent = true;
  else if (currentPresence?.lastPresence)
    isPresent =
      timeDiff(
        convertTimestampToDate(currentPresence.lastPresence),
        currentTime
      ) < 35;

  return {
    isPresent,
    loading,
  };
}
