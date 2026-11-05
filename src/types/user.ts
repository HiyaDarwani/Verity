export type UserRole = 'Student' | 'Examiner' | 'Administrator';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

/** Subset stored in auth context after login */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
