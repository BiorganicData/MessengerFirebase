import { UserContext, WorkspacesContext } from 'lib/context';
import { firestore } from 'lib/firebase';
import { useContext, useEffect, useState } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';

export function useWorkspaces() {
  const { user } = useContext(UserContext);

  const [value, loading] = useCollectionData(
    user
      ? firestore
          .collection('Workspace')
          .where('members', 'array-contains', user?.uid)
          .where('isDeleted', '==', false)
          .orderBy('createdAt', 'desc')
      : null
  );

  return { value, loading };
}

export function useWorkspaceById(id: string) {
  const { value } = useContext(WorkspacesContext);

  const [workspace, setWorkspace] = useState<any>(null);

  useEffect(() => {
    setWorkspace(value?.find((p: any) => p.objectId === id));
  }, [value, id]);

  return { value: workspace };
}

function compare(a: any, b: any) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

export function useAllWorkspaces() {
  const { user } = useContext(UserContext);

  const [value, loading] = useCollectionData(
    user
      ? firestore.collection('Workspace').where('isDeleted', '==', false)
      : null
  );

  return { value: value?.sort(compare), loading };
}
