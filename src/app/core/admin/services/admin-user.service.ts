import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { AdminUser } from '../models/admin-user';
import { UpdateUserActiveRequest } from '../models/update-user-active-request';

@Injectable({
    providedIn: 'root'
})
export class AdminUserService {

    private readonly http = inject(HttpClient);

    getUsers(): Observable<AdminUser[]> {
        return this.http.get<AdminUser[]>(
            `${API_BASE_URL}/users`
        );
    }

    getUserById(userId: number): Observable<AdminUser> {
        return this.http.get<AdminUser>(
            `${API_BASE_URL}/users/${userId}`
        );
    }

    updateActiveStatus(
        userId: number,
        active: boolean
    ): Observable<AdminUser> {
        const request: UpdateUserActiveRequest = {
            active
        };

        return this.http.patch<AdminUser>(
            `${API_BASE_URL}/users/${userId}/active`,
            request
        );
    }
}