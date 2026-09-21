import {inject,Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {API_BASE_URL} from '../../config/api.config';
import {Project} from '../models/project';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private readonly http = inject(HttpClient);

  getProjects(): Observable<Project[]> {

    return this.http.get<Project[]>(
      `${API_BASE_URL}/projects`
    );
  }

  getProjectById(id: number): Observable<Project> {

    return this.http.get<Project>(
      `${API_BASE_URL}/projects/${id}`
    );
  }
}