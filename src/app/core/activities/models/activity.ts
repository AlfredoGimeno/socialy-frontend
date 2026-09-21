import {Project} from '../../projects/models/project';

export interface Activity {

  id: number;

  project: Project;

  title: string;

  description: string | null;

  activityDate: string;

  location: string | null;

  maxParticipants: number | null;

  createdAt: string;
}