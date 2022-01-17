import { AllChannelsContext, ChannelsContext, UserContext } from 'lib/context';
import { firestore } from 'lib/firebase';
import { useContext, useEffect, useState } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useLocation } from 'react-router-dom';

export function useChannelsByWorkspace() {
  const { user } = useContext(UserContext);
  const location = useLocation();
  const id = location.pathname
    .split('/dashboard/workspaces/')[1]
    ?.split('/')[0];
  const [channels, setChannels] = useState<any[]>([]);
  const [value, loading] = useCollectionData(
    user && id
      ? firestore
          .collection('Channel')
          .where('workspaceId', '==', id)
          .where('members', 'array-contains', user?.uid)
          .where('isDeleted', '==', false)
          .where('isArchived', '==', false)
          .orderBy('name', 'asc')
      : null
  );

  useEffect(() => {
    if (value) {
      const temp = channels.filter((data: any) => data.w !== id);
      setChannels([...temp, { w: id, data: value }]);
    }
  }, [value]);

  return { value: channels.find((data: any) => data.w === id)?.data, loading };
}

export function useChannelById(id: string) {
  const { value } = useContext(ChannelsContext);

  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    setChannel(value?.find((p: any) => p.objectId === id));
  }, [value, id]);

  return { value: channel };
}

export function useAllChannelsByWorkspaces() {
  const location = useLocation();
  const id = location.pathname
    .split('/dashboard/workspaces/')[1]
    ?.split('/')[0];
  const { channels, setChannels } = useContext(AllChannelsContext);

  const [value, loading] = useCollectionData(
    firestore
      .collection('Channel')
      .where('workspaceId', '==', id)
      .where('isDeleted', '==', false)
      .orderBy('name', 'asc')
  );

  useEffect(() => {
    if (value) {
      const temp = channels.filter((data: any) => data.w !== id);
      setChannels([...temp, { w: id, data: value }]);
    }
  }, [value]);

  return { value: channels.find((data: any) => data.w === id)?.data, loading };
}
