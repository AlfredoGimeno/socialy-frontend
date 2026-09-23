import {OrganizationSummary} from '../../projects/models/organization-summary';

export interface Organization extends OrganizationSummary {

  createdAt: string;

  updatedAt: string;
}