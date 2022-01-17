import LoadingScreen from 'components/LoadingScreen';
import { APP_NAME } from 'config';
import { auth } from 'lib/firebase';
import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

export default function Logout() {
  useEffect(() => {
    (async () => {
      localStorage.removeItem('theme');
      localStorage.removeItem('backgroundColor');
      await auth.signOut();
      window.location.replace('/authentication/login');
    })();
  }, []);

  return (
    <>
      <Helmet>
        <title>{APP_NAME}</title>
      </Helmet>
      <LoadingScreen />
    </>
  );
}
