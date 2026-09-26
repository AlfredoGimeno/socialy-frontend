import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { CreateApplicationRequest } from '../models/create-application-request';
import { UpdateApplicationStatusRequest } from '../models/update-application-status-request';
import { VolunteerApplication } from '../models/volunteer-application';

@Injectable({
    providedIn: 'root'
})
export class ApplicationService {

    private readonly http = inject(HttpClient);

    getMyApplications(): Observable<VolunteerApplication[]> {
        return this.http.get<VolunteerApplication[]>(
            `${API_BASE_URL}/applications/me`
        );
    }

    getProjectApplications(projectId: number): Observable<VolunteerApplication[]> {
        return this.http.get<VolunteerApplication[]>(
            `${API_BASE_URL}/applications/project/${projectId}`
        );
    }

    createApplication(
        request: CreateApplicationRequest
    ): Observable<VolunteerApplication> {
        return this.http.post<VolunteerApplication>(
            `${API_BASE_URL}/applications`,
            request
        );
    }

    updateApplicationStatus(
        applicationId: number,
        request: UpdateApplicationStatusRequest
    ): Observable<VolunteerApplication> {
        return this.http.patch<VolunteerApplication>(
            `${API_BASE_URL}/applications/${applicationId}/status`,
            request
        );
    }

    cancelApplication(applicationId: number): Observable<void> {
        return this.http.patch<void>(
            `${API_BASE_URL}/applications/${applicationId}/cancel`,
            {}
        );
    }
}