import { UserRole } from './user-role';

export interface UserProfile {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}