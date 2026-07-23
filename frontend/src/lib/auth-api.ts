import { getTelegramAuth } from './telegram-auth';
import { useAuthStore } from '../store/auth';

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3001';
const AUTH_TOKEN_URL = '/api/auth';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    tg_user_id?: string;
    email?: string;
    first_name?: string;
    username?: string;
  };
}

/**
 * Авторизация через Telegram initData (Mini App / веб-виджет).
 * После успеха JWT-токены сохраняются в localStorage через zustand persist.
 */
export async function loginWithTelegram(initData?: string): Promise<AuthResponse | null> {
  const tgData = initData ? { initData } : getTelegramAuth();
  if (!tgData.initData) return null;

  const res = await fetch(`${BASE_URL}${AUTH_TOKEN_URL}/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ init_data: tgData.initData }),
  });

  if (!res.ok) return null;
  const data: AuthResponse = await res.json();

  // Store JWT tokens
  const store = useAuthStore.getState();
  store.setTokens(data.access_token, data.refresh_token);
  store.setUser({
    id: data.user.id,
    firstName: data.user.first_name || '',
    username: data.user.username || data.user.tg_user_id,
    isAdmin: false,
    email: data.user.email,
  });

  return data;
}

/**
 * Регистрация по email (standalone — без Telegram).
 */
export async function registerEmail(email: string, password: string): Promise<{ user_id: number } | null> {
  const res = await fetch(`${BASE_URL}${AUTH_TOKEN_URL}/email/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Registration failed');
  }

  return res.json();
}

/**
 * Подтверждение email по коду.
 */
export async function verifyEmail(email: string, code: string): Promise<AuthResponse | null> {
  const res = await fetch(`${BASE_URL}${AUTH_TOKEN_URL}/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  if (!res.ok) return null;
  const data: AuthResponse = await res.json();

  const store = useAuthStore.getState();
  store.setTokens(data.access_token, data.refresh_token);
  store.setUser({
    id: data.user.id,
    firstName: data.user.first_name || '',
    email: data.user.email,
    isAdmin: false,
  });

  return data;
}

/**
 * Вход по email + пароль.
 */
export async function loginEmail(email: string, password: string): Promise<AuthResponse | null> {
  const res = await fetch(`${BASE_URL}${AUTH_TOKEN_URL}/email/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) return null;
  const data: AuthResponse = await res.json();

  const store = useAuthStore.getState();
  store.setTokens(data.access_token, data.refresh_token);
  store.setUser({
    id: data.user.id,
    firstName: data.user.first_name || '',
    username: data.user.username,
    email: data.user.email,
    isAdmin: false,
  });

  return data;
}

/**
 * Привязка Telegram к существующей email-учётке.
 */
export async function linkTelegramToEmail(initData: string, email: string, password: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}${AUTH_TOKEN_URL}/link-telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ init_data: initData, email, password }),
  });

  return res.ok;
}

/**
 * Обновление access token через refresh token.
 */
export async function refreshAccessToken(): Promise<boolean> {
  const store = useAuthStore.getState();
  const refreshToken = store.refreshToken;
  if (!refreshToken) return false;

  const res = await fetch(`${BASE_URL}${AUTH_TOKEN_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    store.logout();
    return false;
  }

  const data = await res.json();
  store.setTokens(data.access_token, data.refresh_token);
  return true;
}

/**
 * Выход — очистка refresh token на сервере и в сторе.
 */
export async function logout(): Promise<void> {
  const store = useAuthStore.getState();
  if (store.refreshToken) {
    try {
      await fetch(`${BASE_URL}${AUTH_TOKEN_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: store.refreshToken }),
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  store.logout();
}

/**
 * Получить Authorization header для API-запросов.
 * Если access token истёк — попытаться обновить.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const store = useAuthStore.getState();
  const headers: Record<string, string> = {};

  if (store.accessToken) {
    // TODO: добавить проверку срока через jwt-decode
    headers['Authorization'] = `Bearer ${store.accessToken}`;
  } else {
    // Fallback: initData для первого запроса из Mini App
    const tgData = getTelegramAuth();
    if (tgData.initData) {
      headers['Authorization'] = `tma ${tgData.initData}`;
    }
  }

  return headers;
}
