import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';
import { Category } from '../../projects/models/category';
import { CreateCategoryRequest } from '../models/create-category-request';
import { UpdateCategoryRequest } from '../models/update-category-request';

@Injectable({
    providedIn: 'root'
})
export class CategoryService {

    private readonly http = inject(HttpClient);

    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(
            `${API_BASE_URL}/categories`
        );
    }

    getCategoryById(categoryId: number): Observable<Category> {
        return this.http.get<Category>(
            `${API_BASE_URL}/categories/${categoryId}`
        );
    }

    createCategory(request: CreateCategoryRequest): Observable<Category> {
        return this.http.post<Category>(
            `${API_BASE_URL}/categories`,
            request
        );
    }

    updateCategory(
        categoryId: number,
        request: UpdateCategoryRequest
    ): Observable<Category> {
        return this.http.put<Category>(
            `${API_BASE_URL}/categories/${categoryId}`,
            request
        );
    }

    deleteCategory(categoryId: number): Observable<void> {
        return this.http.delete<void>(
            `${API_BASE_URL}/categories/${categoryId}`
        );
    }
}