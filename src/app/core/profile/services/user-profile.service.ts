import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserProfile } from '../../auth/models/user-profile';
import { UpdateUserProfileRequest } from '../../auth/models/update-user-profile-request';
import { API_BASE_URL } from '../../config/api.config';

@Injectable({
    providedIn: 'root'
})
export class UserProfileService {

    private readonly http = inject(HttpClient);

    getProfile(): Observable<UserProfile> {
        return this.http.get<UserProfile>(
            `${API_BASE_URL}/users/me`
        );
    }

    updateProfile(
        request: UpdateUserProfileRequest
    ): Observable<UserProfile> {
        return this.http.put<UserProfile>(
            `${API_BASE_URL}/users/me`,
            request
        );
    }
}