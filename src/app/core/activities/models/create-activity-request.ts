export interface CreateActivityRequest {
    projectId: number;
    title: string;
    description: string | null;
    activityDate: string;
    location: string | null;
    maxParticipants: number | null;
}