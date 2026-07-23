/**
 * Email verification utilities.
 * Генерация кодов подтверждения для email-регистрации.
 */

import { randomInt } from 'node:crypto';

/**
 * Генерирует 6-значный код подтверждения email.
 */
export function generateVerificationCode(): string {
  return String(randomInt(100000, 999999));
}

/**
 * Проверяет, что код корректен (6 цифр).
 */
export function isValidCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Простая валидация email.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
