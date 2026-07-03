import type { TestUser } from '../pages/RegisterPage.js';

export function makeUser(): TestUser {
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  return {
    firstName: 'Codex',
    lastName: 'Runner',
    email: `codex_${stamp}@example.com`,
    telephone: '9876543210',
    password: 'Password123!',
  };
}
