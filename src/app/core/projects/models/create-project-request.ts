export interface CreateProjectRequest {

  categoryId: number;

  title: string;

  description: string;

  requirements: string | null;

  location: string | null;

  city: string | null;

  province: string | null;

  startDate: string;

  endDate: string;

  maxVolunteers: number | null;
}