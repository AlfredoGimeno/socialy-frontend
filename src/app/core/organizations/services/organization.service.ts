import {inject,Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {API_BASE_URL} from '../../config/api.config';
import {Organization} from '../models/organization';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {

  private readonly http = inject(HttpClient);

  getMine(): Observable<Organization> {

    return this.http
      .get<Organization>(
        `${API_BASE_URL}/organizations/me`
      );
  }
}