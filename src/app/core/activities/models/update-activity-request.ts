export interface UpdateActivityRequest {
    title: string;
    description: string | null;
    activityDate: string;
    location: string | null;
    maxParticipants: number | null;
}