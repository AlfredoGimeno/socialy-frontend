import {Category} from './category';
import {OrganizationSummary} from './organization-summary';
import {ProjectStatus} from './project-status';

export interface Project {
  id: number;
  organization: OrganizationSummary;
  category: Category | null;
  title: string;
  description: string;
  requirements: string | null;
  location: string | null;
  city: string | null;
  province: string | null;
  startDate: string;
  endDate: string;
  maxVolunteers: number | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}