import { UserRole } from './user-role';

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;

  userId: number;
  name: string;
  surname: string;
  email: string;
  role: UserRole;

  organizationId: number | null;
  organizationName: string | null;
  organizationVerified: boolean | null;
}