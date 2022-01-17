import { MESSAGES_PER_PAGE } from 'config';
import { MessagesContext } from 'lib/context';
import { firestore } from 'lib/firebase';
import { useContext, useEffect } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';

export function useMessagesByChat(
  id: string,
  type: 'Channel' | 'Direct',
  page = 1
) {
  const { messages, setMessages } = useContext(MessagesContext);

  const [value, loading] = useCollectionData(
    id
      ? firestore
          .collection('Message')
          .where('chatType', '==', type)
          .where('chatId', '==', id)
          .where('isDeleted', '==', false)
          .orderBy('createdAt', 'desc')
          .limit(page * MESSAGES_PER_PAGE)
      : null
  );

  useEffect(() => {
    if (value) {
      const temp = messages.filter((data: any) => data.c !== id);
      setMessages([...temp, { c: id, data: value }]);
    }
  }, [value]);

  return { value: messages.find((data: any) => data.c === id)?.data, loading };
}
