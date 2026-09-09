import React from 'react';
import { useLocation } from 'react-router-dom';
import App from '../App';
import ForgotPassword from '../pages/ForgotPassword';
import SetNewPassword from '../pages/SetNewPassword';

export default function PublicPasswordRoutes(){
  const location=useLocation();
  if(location.pathname==='/forgot-password') return <ForgotPassword/>;
  if(location.pathname==='/set-new-password') return <SetNewPassword/>;
  return <App/>;
}
