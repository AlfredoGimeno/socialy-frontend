import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { ActivityParticipant } from '../models/activity-participant';
import { RegisterActivityRequest } from '../models/register-activity-request';
import { UpdateAttendanceStatusRequest } from '../models/update-attendance-status-request';

@Injectable({
    providedIn: 'root'
})
export class ActivityParticipantService {

    private readonly http = inject(HttpClient);

    getMyParticipations(): Observable<ActivityParticipant[]> {
        return this.http.get<ActivityParticipant[]>(
            `${API_BASE_URL}/activity-participants/me`
        );
    }

    getActivityParticipants(activityId: number): Observable<ActivityParticipant[]> {
        return this.http.get<ActivityParticipant[]>(
            `${API_BASE_URL}/activity-participants/activity/${activityId}`
        );
    }

    register(request: RegisterActivityRequest): Observable<ActivityParticipant> {
        return this.http.post<ActivityParticipant>(
            `${API_BASE_URL}/activity-participants`,
            request
        );
    }

    updateAttendance(
        participationId: number,
        request: UpdateAttendanceStatusRequest
    ): Observable<ActivityParticipant> {
        return this.http.patch<ActivityParticipant>(
            `${API_BASE_URL}/activity-participants/${participationId}/attendance`,
            request
        );
    }

    unregister(participationId: number): Observable<void> {
        return this.http.delete<void>(
            `${API_BASE_URL}/activity-participants/${participationId}`
        );
    }
}