import { AuthResponse } from './auth-response';

export interface AuthSession extends AuthResponse {
  expiresAt: number;
}