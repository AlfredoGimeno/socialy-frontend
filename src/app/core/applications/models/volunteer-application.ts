import {Project} from '../../projects/models/project';
import {UserProfile} from '../../auth/models/user-profile';
import {ApplicationStatus} from './application-status';

export interface VolunteerApplication {

  id: number;

  user: UserProfile;

  project: Project;

  applicationDate: string;

  status: ApplicationStatus;

  motivation: string | null;

  observations: string | null;
}