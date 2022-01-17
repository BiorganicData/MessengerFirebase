import LoadingScreen from 'components/LoadingScreen';
import { UserContext } from 'lib/context';
import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useContext(UserContext);

  useEffect(() => {
    if (user === null) {
      localStorage.removeItem('theme');
      localStorage.removeItem('backgroundColor');
    }
  }, [user]);

  if (user === undefined) return <LoadingScreen />;

  if (user === null) return <Navigate to="/authentication/login" />;

  return <>{children}</>;
}
