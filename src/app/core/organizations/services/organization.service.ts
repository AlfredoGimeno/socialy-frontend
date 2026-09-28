import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { Organization } from '../models/organization';
import { UpdateOrganizationVerificationRequest } from '../models/update-organization-verification-request';

@Injectable({
    providedIn: 'root'
})
export class OrganizationService {

    private readonly http = inject(HttpClient);

    getMine(): Observable<Organization> {
        return this.http.get<Organization>(
            `${API_BASE_URL}/organizations/me`
        );
    }

    getOrganizations(): Observable<Organization[]> {
        return this.http.get<Organization[]>(
            `${API_BASE_URL}/organizations`
        );
    }

    getOrganizationById(organizationId: number): Observable<Organization> {
        return this.http.get<Organization>(
            `${API_BASE_URL}/organizations/${organizationId}`
        );
    }

    updateVerification(
        organizationId: number,
        verified: boolean
    ): Observable<Organization> {
        const request: UpdateOrganizationVerificationRequest = {
            verified
        };

        return this.http.patch<Organization>(
            `${API_BASE_URL}/organizations/${organizationId}/verification`,
            request
        );
    }
}