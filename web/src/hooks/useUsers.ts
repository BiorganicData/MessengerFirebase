import { UserContext, UsersContext } from 'lib/context';
import { firestore } from 'lib/firebase';
import { useContext, useEffect, useState } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useLocation } from 'react-router-dom';
import { useWorkspaceById } from 'hooks/useWorkspaces';

export function useUsersByWorkspace() {
  const { user } = useContext(UserContext);
  const location = useLocation();
  const id = location.pathname
    .split('/dashboard/workspaces/')[1]
    ?.split('/')[0];
  const { value: workspace } = useWorkspaceById(id);
  const [users, setUsers] = useState<any[]>([]);
  const [value, loading] = useCollectionData(
    user && id
      ? firestore
          .collection('User')
          .where('workspaces', 'array-contains', id)
          .orderBy('fullName', 'asc')
      : null
  );

  useEffect(() => {
    if (value && workspace && value.length === workspace.members.length) {
      const temp = users.filter((data: any) => data.w !== id);
      setUsers([
        ...temp,
        {
          w: id,
          data: value,
        },
      ]);
    }
  }, [value, workspace]);

  return { value: users.find((data: any) => data.w === id)?.data, loading };
}

export function useUserById(id?: string) {
  const { value } = useContext(UsersContext);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(value?.find((p: any) => p.objectId === id));
  }, [value, id]);

  return {
    value: user,
  };
}
