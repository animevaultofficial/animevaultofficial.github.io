import React, { createContext, useContext, useState, useEffect } from 'react';
import { warn } from '../utils/logger.js';
import { createAnimeVaultAuthClient } from './authClient';
import { clearActiveSubAccount } from '../utils/subAccounts';
import {
  fetchWatchHistory,
  addToHistory as dbAddToHistory,
  clearWatchHistory as dbClearWatchHistory,
  fetchContinueWatching,
  updateContinueWatching as dbUpdateContinueWatching,
  fetchLikedItems,
  toggleLikeItem as dbToggleLike,
  updateUserProfile as dbUpdateUserProfile,
  fetchReminders,
  addReminder as dbAddReminder,
  removeReminder as dbRemoveReminder,
  syncNeonUserToDb,
  createUserSession,
  restoreSession,
  deleteUserSession,
  fetchSubAccounts as dbFetchSubAccounts,
  createSubAccount as dbCreateSubAccount,
  updateSubAccount as dbUpdateSubAccount,
  deleteSubAccount as dbDeleteSubAccount,
  ensureMainSubAccount as dbEnsureMainSubAccount
} from './db';
import { userLogin as dbUserLogin, userSignup as dbUserSignup } from './authDb';
const authClient = createAnimeVaultAuthClient();
const UserContext = createContext(null);
const CACHED_USER_KEY = 'animevault_cached_user';
const GUEST_USER = { id: null, username: 'Guest', avatar: null, banner: null, is_guest: true, is_admin: false, is_verified: false };
function authOperationMessage(error, fallback) {
 const messageStatus = String(error?.message || '').match(/\bHTTP\s+(\d{3})\b/i)?.[1];
 const status=Number(error?.status||error?.statusCode||error?.cause?.status||messageStatus);
 if(status===403)return 'Neon Auth blocked this request. Check the project settings and allowed origins.';
 if(status===404)return 'Neon Auth returned HTTP 404. Check VITE_NEON_AUTH_URL and make sure this auth method is enabled for the project.';
 return error?.message||fallback;
}
export function UserProvider({children}){const[user,setUserState]=useState(null);const[authLoading,setAuthLoading]=useState(true);const setUser=next=>{setUserState(next);try{next?localStorage.setItem(CACHED_USER_KEY,JSON.stringify(next)):localStorage.removeItem(CACHED_USER_KEY)}catch{}};const[history,setHistory]=useState([]),[continueWatching,setContinueWatching]=useState([]),[likes,setLikes]=useState([]),[reminders,setReminders]=useState([]),[showAuthModal,setShowAuthModal]=useState(false),[authTab,setAuthTab]=useState('login'),[activeSubAccount,setActiveSubAccountState]=useState(null),[subAccounts,setSubAccounts]=useState([]);
 const finishNeonAuth=async(result)=>{const session=await Promise.race([authClient.getSession().catch(()=>null),new Promise(resolve=>setTimeout(()=>resolve(null),2500))]);const sessionData=session?.data;const data=sessionData?.session||sessionData?.user?sessionData:(result?.data?.session?result.data:null);const authUser=data?.user||data?.session?.user;if(!authUser?.email)return{success:false,message:'Neon Auth did not return an active signed-in session.'};const user=await syncAuthSessionUser(data);if(!user)return{success:false,message:'Your Neon Auth account could not be linked to AnimeVault data.'};return{success:true,user}};
 const establishLegacySession=async legacyUser=>{try{const session=await createUserSession(legacyUser.id);if(!session)warn('[AnimeVault Auth] Legacy login succeeded, but a persistent session could not be created.')}catch(error){warn('[AnimeVault Auth] Legacy session creation failed:',error?.message||error)}setUser({...legacyUser,is_guest:false});setShowAuthModal(false);return{success:true,user:legacyUser}};
 const loginWithNeonPassword = async (email, password) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) return { success: false, message: 'Email and password are required.' };
  const legacy = await dbUserLogin(normalizedEmail, password);
  if (legacy.success) return establishLegacySession(legacy.user);
  try {
   const result = await authClient.signIn.email({ email: normalizedEmail, password });
   if (result?.error) return { success: false, message: authOperationMessage(result.error, legacy.message || 'Invalid email or password.') };
   return await finishNeonAuth(result);
  } catch (error) {
   warn('[AnimeVault Auth] Password sign-in failed:', error?.message || error);
   return { success: false, message: authOperationMessage(error, legacy.message || 'Sign-in failed. Please try again.') };
  }
 };
 const signupWithNeonEmail=async(email,password)=>{const normalizedEmail=String(email||'').trim().toLowerCase();if(!normalizedEmail||!password)return{success:false,message:'Email and password are required.'};try{const result=await authClient.signUp.email({email:normalizedEmail,password,name:normalizedEmail.split('@')[0]});if(result?.error){const status=Number(result.error.status||result.error.statusCode||result.error.cause?.status||String(result.error.message||'').match(/\bHTTP\s+(\d{3})\b/i)?.[1]);if(status===404){const legacy=await dbUserSignup(normalizedEmail,password);if(!legacy.success)return legacy;return establishLegacySession(legacy.user)}return{success:false,message:authOperationMessage(result.error,'Could not create your account.')}}return await finishNeonAuth(result)}catch(error){warn('[AnimeVault Auth] Email signup failed:',error?.message||error);const status=Number(error?.status||error?.statusCode||error?.cause?.status||String(error?.message||'').match(/\bHTTP\s+(\d{3})\b/i)?.[1]);if(status===404){const legacy=await dbUserSignup(normalizedEmail,password);if(!legacy.success)return legacy;return establishLegacySession(legacy.user)}return{success:false,message:authOperationMessage(error,'Sign-up failed. Please try again.')}}};
 const loginAsGuest=async()=>{setUser({...GUEST_USER});setShowAuthModal(false);return{success:true,user:{...GUEST_USER}}};
 const loginWithGoogle=async()=>{try{const result=await authClient.signIn.social({provider:'google',callbackURL:window.location.href});if(result?.error){warn('[AnimeVault Auth] Google sign-in rejected:',result.error.message||result.error);return{success:false,message:authOperationMessage(result.error,'Google sign-in failed.')}}return{success:true}}catch(err){warn('[AnimeVault Auth] Google sign-in failed:',err?.message||err);return{success:false,message:authOperationMessage(err,'Google sign-in failed. Please try again.')}}};
 const sendEmailOtp=async email=>{try{if(!email?.trim())return{success:false,message:'Enter your email address first.'};const result=await authClient.emailOtp.sendVerificationOtp({email:email.trim(),type:'sign-in'});if(result?.error){warn('[AnimeVault Auth] OTP send rejected:',result.error.message||result.error);return{success:false,message:authOperationMessage(result.error,'Could not send the verification code.')}}return{success:true}}catch(err){warn('[AnimeVault Auth] OTP send failed:',err?.message||err);return{success:false,message:authOperationMessage(err,'Could not send the verification code. Please try again.')}}};
 const loginWithEmailOtp=async(email,otp)=>{try{if(!email?.trim()||!otp?.trim())return{success:false,message:'Email and verification code are required.'};const result=await authClient.signIn.emailOtp({email:email.trim(),otp:otp.trim()});if(result?.error){warn('[AnimeVault Auth] OTP sign-in rejected:',result.error.message||result.error);return{success:false,message:authOperationMessage(result.error,'Invalid or expired verification code.')}}const session=await Promise.race([authClient.getSession().catch(()=>null),new Promise(resolve=>setTimeout(()=>resolve(null),2500))]);const sessionData=session?.data;const data=sessionData?.session||sessionData?.user?sessionData:(result?.data?.session?result.data:null);if(!data)return{success:false,message:'The code was accepted, but Neon Auth did not establish an active session.'};const sessionUser=await syncAuthSessionUser(data);if(!sessionUser)return{success:false,message:'OTP verified, but the AnimeVault account could not be synchronized.'};setShowAuthModal(false);return{success:true,user:sessionUser}}catch(err){warn('[AnimeVault Auth] OTP sign-in failed:',err?.message||err);return{success:false,message:authOperationMessage(err,'OTP sign-in failed. Please try again.')}}};
 const syncAuthSessionUser=async(existing=null)=>{const data=existing||((await authClient.getSession()).data);const currentUser=data?.user||data?.session?.user;if(!currentUser?.email)return null;const normalizedEmail=String(currentUser.email).trim().toLowerCase();const syncRes=await syncNeonUserToDb(normalizedEmail,currentUser.image||currentUser.avatar_url||null,currentUser.emailVerified||currentUser.email_verified||false,currentUser.id);if(!syncRes.success){warn('[AnimeVault Auth] Could not link authenticated user:',syncRes.message);return null}setUser(syncRes.user);setShowAuthModal(false);return syncRes.user};
 const initSession=async()=>{setAuthLoading(true);setUserState(null);try{const auth=await Promise.race([authClient.getSession().catch(error=>{warn('[AnimeVault Auth] Session lookup failed:',error?.message||error);return null}),new Promise(resolve=>setTimeout(()=>resolve(null),2500))]);const data=auth?.data;if(data?.session||data?.user){const user=await syncAuthSessionUser(data);if(user)return}const legacyUser=await Promise.race([restoreSession().catch(error=>{warn('[AnimeVault Auth] Legacy session lookup failed:',error?.message||error);return null}),new Promise(resolve=>setTimeout(()=>resolve(null),2500))]);if(legacyUser){setUser(legacyUser);return}try{localStorage.removeItem(CACHED_USER_KEY)}catch{}setUserState(null)}catch(err){warn('[AnimeVault Auth] Session init failed:',err);setUser(null)}finally{setAuthLoading(false)}};
 useEffect(()=>{initSession();const subscription=authClient.onAuthStateChange?.((_event,session)=>{if(session?.user)syncAuthSessionUser({session,user:session.user}).catch(err=>{warn('[AnimeVault Auth] Session update failed:',err?.message||err)}).finally(()=>setAuthLoading(false));else setAuthLoading(false)});return()=>{subscription?.data?.subscription?.unsubscribe?.()}},[]);
 const syncUserData=async(userId)=>{if(!userId)return;const[hist,cw,liked,rem]=await Promise.all([fetchWatchHistory(userId).catch(()=>[]),fetchContinueWatching(userId).catch(()=>[]),fetchLikedItems(userId).catch(()=>[]),fetchReminders(userId).catch(()=>[])]);setHistory(hist||[]);setContinueWatching(cw||[]);setLikes(liked||[]);setReminders(rem||[])};useEffect(()=>{if(user?.id)void syncUserData(user.id)},[user?.id]);
 const logout=async()=>{try{await authClient.signOut?.()}catch(err){warn('[AnimeVault Auth] Neon sign-out failed:',err?.message||err)}try{await deleteUserSession()}catch(err){warn('[AnimeVault Auth] Legacy sign-out failed:',err?.message||err)}clearActiveSubAccount();setUser(null);setHistory([]);setContinueWatching([]);setLikes([]);setReminders([])};
 const fetchSubAccounts=async()=>{if(!user?.id)return[];const profiles=(await dbFetchSubAccounts(user.id).catch(()=>[]))||[];setSubAccounts(profiles);return profiles};const ensureMainSubAccount=async()=>user?.id?dbEnsureMainSubAccount(user.id).catch(()=>null):null;const createSubAccount=async data=>user?.id?dbCreateSubAccount(user.id,data).catch(e=>({success:false,message:e.message})):({success:false,message:'Not signed in'});const updateSubAccount=async(id,data)=>user?.id?dbUpdateSubAccount(user.id,id,data).catch(e=>({success:false,message:e.message})):({success:false,message:'Not signed in'});const deleteSubAccount=async id=>user?.id?dbDeleteSubAccount(user.id,id).catch(e=>({success:false,message:e.message})):({success:false,message:'Not signed in'});const addToHistory=async item=>{setHistory(p=>[item,...p.filter(x=>x.id!==item.id)]);if(user?.id)await dbAddToHistory(user.id,item).catch(()=>{})};const clearHistory=async()=>{setHistory([]);if(user?.id)await dbClearWatchHistory(user.id).catch(()=>{})};const updateContinueWatching=async item=>{setContinueWatching(p=>[item,...p.filter(x=>x.id!==item.id)].slice(0,50));if(user?.id)await dbUpdateContinueWatching(user.id,item).catch(()=>{})};const toggleLike=async item=>{setLikes(p=>p.some(x=>x.id===item.id)?p.filter(x=>x.id!==item.id):[...p,item]);if(user?.id)await dbToggleLike(user.id,item).catch(()=>{})};const isLiked=id=>likes.some(x=>x.id===id);const updateProfile=async data=>{setUser({...user,...data});if(user?.id)await dbUpdateUserProfile(user.id,data).catch(()=>{})};const addReminder=async item=>{setReminders(p=>[...p.filter(x=>x.id!==item.id),item]);if(user?.id)await dbAddReminder(user.id,item).catch(()=>{})};const removeReminder=async id=>{setReminders(p=>p.filter(x=>x.id!==id));if(user?.id)await dbRemoveReminder(user.id,id).catch(()=>{})};const isReminded=id=>reminders.some(x=>x.id===id);
 return <UserContext.Provider value={{user,authLoading,setUser,history,continueWatching,likes,reminders,subAccounts,activeSubAccount,showAuthModal,authTab,setShowAuthModal,setAuthTab,setActiveSubAccountState,fetchSubAccounts,ensureMainSubAccount,createSubAccount,updateSubAccount,deleteSubAccount,login:loginWithNeonPassword,signup:signupWithNeonEmail,loginAsGuest,loginWithGoogle,sendEmailOtp,loginWithEmailOtp,logout,syncUserData,addToHistory,clearHistory,updateContinueWatching,toggleLike,isLiked,updateProfile,addReminder,removeReminder,isReminded}}>{children}</UserContext.Provider>}
export function useUser(){const context=useContext(UserContext);if(!context)throw new Error('useUser must be used within UserProvider');return context}
