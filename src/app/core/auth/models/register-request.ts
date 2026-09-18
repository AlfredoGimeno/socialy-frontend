import {AccountType} from './account-type';
import {OrganizationRegisterRequest} from './organization-register-request';

export interface RegisterRequest {
  accountType: AccountType;

  name: string;
  surname: string;
  email: string;
  password: string;
  phone: string | null;

  organization: OrganizationRegisterRequest | null;
}