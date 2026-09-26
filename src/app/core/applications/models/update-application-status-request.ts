import { ApplicationStatus } from './application-status';

export interface UpdateApplicationStatusRequest {
    status: ApplicationStatus;
    observations: string | null;
}