import {inject,Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {API_BASE_URL} from '../../config/api.config';
import {ActivityParticipant} from '../models/activity-participant';
import {RegisterActivityRequest} from '../models/register-activity-request';

@Injectable({
  providedIn: 'root'
})
export class ActivityParticipantService {

  private readonly http = inject(HttpClient);

  getMyParticipations(): Observable<ActivityParticipant[]> {

    return this.http
      .get<ActivityParticipant[]>(
        `${API_BASE_URL}/activity-participants/me`
      );
  }

  register(request: RegisterActivityRequest): Observable<ActivityParticipant> {

    return this.http
      .post<ActivityParticipant>(
        `${API_BASE_URL}/activity-participants`,
        request
      );
  }

  unregister(participationId: number): Observable<void> {

    return this.http
      .delete<void>(
        `${API_BASE_URL}/activity-participants/${participationId}`
      );
  }
}