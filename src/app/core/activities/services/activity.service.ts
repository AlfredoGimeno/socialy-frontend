import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { Activity } from '../models/activity';
import { CreateActivityRequest } from '../models/create-activity-request';
import { UpdateActivityRequest } from '../models/update-activity-request';

@Injectable({
    providedIn: 'root'
})
export class ActivityService {

    private readonly http = inject(HttpClient);

    getActivities(): Observable<Activity[]> {
        return this.http.get<Activity[]>(
            `${API_BASE_URL}/activities`
        );
    }

    getActivitiesByProject(projectId: number): Observable<Activity[]> {
        return this.http.get<Activity[]>(
            `${API_BASE_URL}/activities/project/${projectId}`
        );
    }

    getActivityById(id: number): Observable<Activity> {
        return this.http.get<Activity>(
            `${API_BASE_URL}/activities/${id}`
        );
    }

    createActivity(request: CreateActivityRequest): Observable<Activity> {
        return this.http.post<Activity>(
            `${API_BASE_URL}/activities`,
            request
        );
    }

    updateActivity(
        activityId: number,
        request: UpdateActivityRequest
    ): Observable<Activity> {
        return this.http.put<Activity>(
            `${API_BASE_URL}/activities/${activityId}`,
            request
        );
    }

    deleteActivity(activityId: number): Observable<void> {
        return this.http.delete<void>(
            `${API_BASE_URL}/activities/${activityId}`
        );
    }
}