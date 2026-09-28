import { UserRole } from '../../auth/models/user-role';

export interface AdminUser {
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