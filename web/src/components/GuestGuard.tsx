import LoadingScreen from 'components/LoadingScreen';
import { UserContext } from 'lib/context';
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';

const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const { user } = useContext(UserContext);

  if (user === undefined) return <LoadingScreen />;

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

export default GuestGuard;
