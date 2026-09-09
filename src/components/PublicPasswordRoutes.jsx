import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import App from '../App';
import ForgotPassword from '../pages/ForgotPassword';
import SetNewPassword from '../pages/SetNewPassword';

const RECOVERY_KEY = 'animevault_password_recovery';
const RECOVERY_TTL = 15 * 60 * 1000;

export function getPasswordRecovery() {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.email || !data?.requestedAt || Date.now() - data.requestedAt > RECOVERY_TTL) {
      localStorage.removeItem(RECOVERY_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function savePasswordRecovery(data) {
  try {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify({ ...data, requestedAt: data.requestedAt || Date.now() }));
  } catch {}
}

export function clearPasswordRecovery() {
  try { localStorage.removeItem(RECOVERY_KEY); } catch {}
}

export default function PublicPasswordRoutes(){
  const location = useLocation();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const recovery = getPasswordRecovery();
    if (location.pathname !== '/forgot-password' && location.pathname !== '/set-new-password' && recovery) {
      navigate(`/set-new-password?email=${encodeURIComponent(recovery.email)}`, { replace: true });
      return;
    }
    setChecked(true);
  }, [location.pathname, navigate]);

  if (!checked && location.pathname !== '/forgot-password' && location.pathname !== '/set-new-password') return null;
  if(location.pathname==='/forgot-password') return <ForgotPassword/>;
  if(location.pathname==='/set-new-password') return <SetNewPassword/>;
  return <App/>;
}
