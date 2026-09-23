import {inject,Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {API_BASE_URL} from '../../config/api.config';
import {Project} from '../models/project';
import {CreateProjectRequest} from '../models/create-project-request';
import {UpdateProjectRequest} from '../models/update-project-request';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private readonly http = inject(HttpClient);

  getProjects(): Observable<Project[]> {

    return this.http
      .get<Project[]>(
        `${API_BASE_URL}/projects`
      );
  }

  getProjectById(id: number): Observable<Project> {

    return this.http
      .get<Project>(
        `${API_BASE_URL}/projects/${id}`
      );
  }

  getMyProjects(): Observable<Project[]> {

    return this.http
      .get<Project[]>(
        `${API_BASE_URL}/projects/my-projects`
      );
  }

  createProject(request: CreateProjectRequest): Observable<Project> {

    return this.http
      .post<Project>(
        `${API_BASE_URL}/projects`,
        request
      );
  }

  updateProject(projectId: number, request: UpdateProjectRequest): Observable<Project> {

    return this.http
      .put<Project>(
        `${API_BASE_URL}/projects/${projectId}`,
        request
      );
  }

  deleteProject(projectId: number): Observable<void> {

    return this.http
      .delete<void>(
        `${API_BASE_URL}/projects/${projectId}`
      );
  }
}