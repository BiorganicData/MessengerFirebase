import { DirectMessagesContext, UserContext } from 'lib/context';
import { firestore } from 'lib/firebase';
import { useContext, useEffect, useState } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useLocation } from 'react-router-dom';

export function useDirectMessagesByWorkspace() {
  const { user } = useContext(UserContext);
  const location = useLocation();
  const id = location.pathname
    .split('/dashboard/workspaces/')[1]
    ?.split('/')[0];
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [value, loading] = useCollectionData(
    user && id
      ? firestore
          .collection('Direct')
          .where('active', 'array-contains', user?.uid)
          .where('workspaceId', '==', id)
          .orderBy('createdAt', 'desc')
      : null
  );

  useEffect(() => {
    if (value) {
      const temp = directMessages.filter((data: any) => data.w !== id);
      setDirectMessages([...temp, { w: id, data: value }]);
    }
  }, [value]);

  return {
    value: directMessages.find((data: any) => data.w === id)?.data,
    loading,
  };
}

export function useDirectMessageById(id: string) {
  const { value } = useContext(DirectMessagesContext);

  const [directMessage, setDirectMessage] = useState<any>(null);

  useEffect(() => {
    setDirectMessage(value?.find((p: any) => p.objectId === id));
  }, [value, id]);

  return { value: directMessage };
}
