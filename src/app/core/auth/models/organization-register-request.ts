export interface OrganizationRegisterRequest {
  name: string;
  description: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  website: string | null;
}