// Compatibility exports for older callers. Credentials are sent only to the
// configured auth service; this module must never connect to Neon in-browser.
import { proxyLogin, proxySignup } from './authProxy';

export function userLogin(email, password, captchaToken = '') {
  return proxyLogin(email, password, captchaToken);
}

export function userSignup(email, password, captchaToken = '') {
  return proxySignup(email, password, captchaToken);
}
