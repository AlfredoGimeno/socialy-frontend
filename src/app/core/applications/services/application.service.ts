import {inject,Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {API_BASE_URL} from '../../config/api.config';
import {CreateApplicationRequest} from '../models/create-application-request';
import {VolunteerApplication} from '../models/volunteer-application';

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {

  private readonly http = inject(HttpClient);

  getMyApplications(): Observable<VolunteerApplication[]> {

    return this.http
      .get<VolunteerApplication[]>(
        `${API_BASE_URL}/applications/me`
      );
  }

  createApplication(request: CreateApplicationRequest): Observable<VolunteerApplication> {

    return this.http
      .post<VolunteerApplication>(
        `${API_BASE_URL}/applications`,
        request
      );
  }
}