import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'vestige_admin_session';
const SESSION_SECONDS = 12 * 60 * 60;

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createAdminCookie() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error('ADMIN_SESSION_SECRET must be configured.');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = String(issuedAt);
  const signature = sign(payload, sessionSecret);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${payload}.${signature}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearAdminCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`;
}

export function isAdminAuthenticated(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return false;

  const token = cookie.slice(COOKIE_NAME.length + 1);
  const separator = token.indexOf('.');
  if (separator < 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const issuedAt = Number(payload);
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isInteger(issuedAt) || issuedAt > now || now - issuedAt > SESSION_SECONDS) {
    return false;
  }

  return safeEqual(signature, sign(payload, secret));
}
