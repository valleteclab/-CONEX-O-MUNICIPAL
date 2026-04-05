/** Tipos compartilhados entre web e api. */
export const API_PREFIX = '/api/v1' as const;

export type UserRole = 'citizen' | 'mei' | 'company' | 'manager' | 'admin';
