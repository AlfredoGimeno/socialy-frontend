import {inject,Injectable} from '@angular/core';

import {HttpClient} from '@angular/common/http';

import {Observable} from 'rxjs';

import {API_BASE_URL} from '../../config/api.config';

import {Activity} from '../models/activity';

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
}