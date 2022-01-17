import { DetailsContext, UserContext } from 'lib/context';
import { firestore } from 'lib/firebase';
import { useContext, useEffect, useState } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useLocation } from 'react-router-dom';

export function useDetailsByWorkspace() {
  const { user } = useContext(UserContext);
  const location = useLocation();
  const [details, setDetails] = useState<any[]>([]);
  const id = location.pathname
    .split('/dashboard/workspaces/')[1]
    ?.split('/')[0];

  const [value, loading] = useCollectionData(
    user && id
      ? firestore
          .collection('Detail')
          .where('userId', '==', user?.uid)
          .where('workspaceId', '==', id)
      : null
  );

  useEffect(() => {
    if (value?.length) {
      const temp = details.filter((data: any) => data.w !== id);
      setDetails([...temp, { w: id, data: value }]);
    }
  }, [value]);

  return { value: details.find((data: any) => data.w === id)?.data, loading };
}

export function useDetailByChat(id: string) {
  const { value } = useContext(DetailsContext);

  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!value?.length) return;
    setDetail(value.find((p: any) => p.chatId === id));
  }, [value, id]);

  return { value: detail };
}
