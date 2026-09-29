import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { CategoryService } from '../../../core/categories/services/category.service';
import { CreateCategoryRequest } from '../../../core/categories/models/create-category-request';
import { UpdateCategoryRequest } from '../../../core/categories/models/update-category-request';
import { Category } from '../../../core/projects/models/category';
import { Project } from '../../../core/projects/models/project';
import { ProjectService } from '../../../core/projects/services/project.service';

@Component({
    selector: 'app-admin-categories',
    imports: [
        ReactiveFormsModule,
        RouterLink
    ],
    templateUrl: './admin-categories.html',
    styleUrl: './admin-categories.scss'
})
export class AdminCategories implements OnInit {

    private readonly formBuilder = inject(FormBuilder);
    private readonly categoryService = inject(CategoryService);
    private readonly projectService = inject(ProjectService);
    private readonly destroyRef = inject(DestroyRef);

    readonly categories = signal<Category[]>([]);
    readonly projects = signal<Project[]>([]);

    readonly loading = signal(true);
    readonly errorMessage = signal<string | null>(null);

    readonly showForm = signal(false);
    readonly editingCategoryId = signal<number | null>(null);
    readonly saving = signal(false);

    readonly deletingCategoryId = signal<number | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly actionSuccess = signal<string | null>(null);

    readonly sortedCategories = computed(() => {
        return [
            ...this.categories()
        ].sort(
            (first, second) =>
                first.name.localeCompare(second.name)
        );
    });

    readonly unusedCategories = computed(() => {
        return this.categories().filter(
            category =>
                this.projectCount(category.id) === 0
        );
    });

    readonly usedCategories = computed(() => {
        return this.categories().filter(
            category =>
                this.projectCount(category.id) > 0
        );
    });

    readonly categoryForm = this.formBuilder.nonNullable.group({
        name: [
            '',
            [
                Validators.required,
                Validators.maxLength(100)
            ]
        ],
        description: ['']
    });

    ngOnInit(): void {
        this.loadData();
    }

    openCreateForm(): void {
        this.editingCategoryId.set(null);
        this.actionError.set(null);
        this.actionSuccess.set(null);

        this.categoryForm.reset({
            name: '',
            description: ''
        });

        this.showForm.set(true);
    }

    openEditForm(category: Category): void {
        this.editingCategoryId.set(category.id);
        this.actionError.set(null);
        this.actionSuccess.set(null);

        this.categoryForm.reset({
            name: category.name,
            description: category.description ?? ''
        });

        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
        this.editingCategoryId.set(null);

        this.categoryForm.reset({
            name: '',
            description: ''
        });
    }

    saveCategory(): void {
        if (this.categoryForm.invalid) {
            this.categoryForm.markAllAsTouched();
            return;
        }

        const formValue = this.categoryForm.getRawValue();

        const name = formValue.name.trim();

        if (name.length === 0) {
            this.categoryForm.controls.name.setErrors({
                required: true
            });

            this.categoryForm.controls.name.markAsTouched();

            return;
        }

        this.saving.set(true);
        this.actionError.set(null);
        this.actionSuccess.set(null);

        const editingCategoryId = this.editingCategoryId();

        if (editingCategoryId === null) {
            const request: CreateCategoryRequest = {
                name,
                description: this.toNullableString(
                    formValue.description
                )
            };

            this.categoryService.createCategory(request)
                .pipe(
                    finalize(() => {
                        this.saving.set(false);
                    }),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe({
                    next: category => {
                        this.categories.update(
                            current => [
                                ...current,
                                category
                            ]
                        );

                        this.closeForm();

                        this.actionSuccess.set(
                            'La categoría se ha creado correctamente.'
                        );
                    },
                    error: (error: HttpErrorResponse) => {
                        console.error(
                            'Error creando categoría:',
                            error
                        );

                        this.actionError.set(
                            this.getSaveErrorMessage(error)
                        );
                    }
                });

            return;
        }

        const request: UpdateCategoryRequest = {
            name,
            description: this.toNullableString(
                formValue.description
            )
        };

        this.categoryService.updateCategory(
            editingCategoryId,
            request
        )
            .pipe(
                finalize(() => {
                    this.saving.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: updatedCategory => {
                    this.categories.update(
                        current =>
                            current.map(
                                category =>
                                    category.id === updatedCategory.id
                                        ? updatedCategory
                                        : category
                            )
                    );

                    this.closeForm();

                    this.actionSuccess.set(
                        'La categoría se ha actualizado correctamente.'
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error actualizando categoría:',
                        error
                    );

                    this.actionError.set(
                        this.getSaveErrorMessage(error)
                    );
                }
            });
    }

    deleteCategory(category: Category): void {
        if (this.projectCount(category.id) > 0) {
            this.actionError.set(
                'No se puede eliminar una categoría que está siendo utilizada por uno o más proyectos.'
            );

            return;
        }

        const confirmed = window.confirm(
            `¿Seguro que quieres eliminar la categoría "${category.name}"?`
        );

        if (!confirmed) {
            return;
        }

        this.deletingCategoryId.set(category.id);
        this.actionError.set(null);
        this.actionSuccess.set(null);

        this.categoryService.deleteCategory(category.id)
            .pipe(
                finalize(() => {
                    this.deletingCategoryId.set(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.categories.update(
                        current =>
                            current.filter(
                                item =>
                                    item.id !== category.id
                            )
                    );

                    this.actionSuccess.set(
                        'La categoría se ha eliminado correctamente.'
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error eliminando categoría:',
                        error
                    );

                    this.actionError.set(
                        this.getDeleteErrorMessage(error)
                    );
                }
            });
    }

    projectCount(categoryId: number): number {
        return this.projects().filter(
            project =>
                project.category?.id === categoryId
        ).length;
    }

    isDeleting(categoryId: number): boolean {
        return this.deletingCategoryId() === categoryId;
    }

    private loadData(): void {
        this.loading.set(true);
        this.errorMessage.set(null);

        forkJoin({
            categories: this.categoryService.getCategories(),
            projects: this.projectService.getProjects()
        })
            .pipe(
                finalize(() => {
                    this.loading.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: result => {
                    this.categories.set(
                        result.categories
                    );

                    this.projects.set(
                        result.projects
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error cargando categorías:',
                        error
                    );

                    this.errorMessage.set(
                        'No se ha podido cargar la gestión de categorías.'
                    );
                }
            });
    }

    private toNullableString(value: string): string | null {
        const trimmed = value.trim();

        return trimmed.length > 0
            ? trimmed
            : null;
    }

    private getSaveErrorMessage(
        error: HttpErrorResponse
    ): string {
        if (error.status === 0) {
            return 'No se puede conectar con el servidor.';
        }

        if (typeof error.error?.detail === 'string') {
            return error.error.detail;
        }

        if (typeof error.error?.message === 'string') {
            return error.error.message;
        }

        if (error.status === 400) {
            return 'Los datos de la categoría no son válidos.';
        }

        if (error.status === 403) {
            return 'No tienes permiso para gestionar categorías.';
        }

        if (error.status === 409) {
            return 'Ya existe una categoría con ese nombre.';
        }

        return 'No se ha podido guardar la categoría.';
    }

    private getDeleteErrorMessage(
        error: HttpErrorResponse
    ): string {
        if (error.status === 0) {
            return 'No se puede conectar con el servidor.';
        }

        if (typeof error.error?.detail === 'string') {
            return error.error.detail;
        }

        if (typeof error.error?.message === 'string') {
            return error.error.message;
        }

        if (error.status === 403) {
            return 'No tienes permiso para eliminar categorías.';
        }

        if (error.status === 404) {
            return 'La categoría indicada no existe.';
        }

        if (
            error.status === 400 ||
            error.status === 409
        ) {
            return 'No se puede eliminar la categoría porque está siendo utilizada por uno o más proyectos.';
        }

        return 'No se ha podido eliminar la categoría.';
    }
}