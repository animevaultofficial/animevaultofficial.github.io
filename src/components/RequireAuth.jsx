
import { useEffect } from 'react';
import { useUser } from '../api/UserContext';

export default function RequireAuth({ children }) {
  const { user, authLoading, setShowAuthModal, setAuthTab } = useUser();

  useEffect(() => {
    if (!authLoading && !user) {
      setAuthTab('login');
      setShowAuthModal(true);
    }
  }, [authLoading, user, setAuthTab, setShowAuthModal]);

  if (authLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '70vh', textAlign: 'center',
        padding: '2rem', color: 'white'
      }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.8rem' }}>Checking your session...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '70vh', textAlign: 'center',
        padding: '2rem', color: 'white'
      }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.8rem' }}>
          Login to Continue
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
          You need to be logged in to use this feature.
        </p>
      </div>
    );
  }

  return children;
}
