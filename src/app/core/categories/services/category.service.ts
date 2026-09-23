import {inject,Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {API_BASE_URL} from '../../config/api.config';
import {Category} from '../../projects/models/category';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  private readonly http = inject(HttpClient);

  getCategories(): Observable<Category[]> {

    return this.http
      .get<Category[]>(
        `${API_BASE_URL}/categories`
      );
  }
}