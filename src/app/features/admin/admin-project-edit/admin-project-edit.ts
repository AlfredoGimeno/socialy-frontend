import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { CategoryService } from '../../../core/categories/services/category.service';
import { Category } from '../../../core/projects/models/category';
import { Project } from '../../../core/projects/models/project';
import { ProjectStatus } from '../../../core/projects/models/project-status';
import { UpdateProjectRequest } from '../../../core/projects/models/update-project-request';
import { ProjectService } from '../../../core/projects/services/project.service';

@Component({
    selector: 'app-admin-project-edit',
    imports: [
        ReactiveFormsModule,
        RouterLink 
    ],
    templateUrl: './admin-project-edit.html',
    styleUrl: './admin-project-edit.scss'
})
export class AdminProjectEdit implements OnInit {

    private readonly formBuilder = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly projectService = inject(ProjectService);
    private readonly categoryService = inject(CategoryService);
    private readonly destroyRef = inject(DestroyRef);

    readonly ProjectStatus = ProjectStatus;

    readonly project = signal<Project | null>(null);
    readonly categories = signal<Category[]>([]);

    readonly loading = signal(true);
    readonly saving = signal(false);

    readonly errorMessage = signal<string | null>(null);
    readonly saveError = signal<string | null>(null);

    readonly projectForm = this.formBuilder.group({
        title: [
            '',
            [
                Validators.required,
                Validators.maxLength(150)
            ]
        ],
        description: [
            '',
            [
                Validators.required
            ]
        ],
        requirements: [''],
        categoryId: [
            null as number | null,
            [
                Validators.required
            ]
        ],
        location: [''],
        city: [''],
        province: [''],
        startDate: [
            '',
            [
                Validators.required
            ]
        ],
        endDate: [
            '',
            [
                Validators.required
            ]
        ],
        maxVolunteers: [
            null as number | null,
            [
                Validators.min(1)
            ]
        ],
        status: [
            ProjectStatus.OPEN,
            [
                Validators.required
            ]
        ]
    });

    ngOnInit(): void {
        this.loadData();
    }

    saveProject(): void {
        if (this.projectForm.invalid) {
            this.projectForm.markAllAsTouched();
            return;
        }

        const project = this.project();

        if (!project) {
            return;
        }

        const formValue = this.projectForm.getRawValue();

        if (formValue.categoryId === null) {
            this.projectForm.controls.categoryId.setErrors({
                required: true
            });

            return;
        }

        const startDate = formValue.startDate;
        const endDate = formValue.endDate;

        if (
            startDate === null ||
            endDate === null
        ) {
            this.saveError.set(
                'Debes indicar la fecha de inicio y la fecha de fin.'
            );

            return;
        }

        if (startDate > endDate) {
            this.saveError.set(
                'La fecha de fin no puede ser anterior a la fecha de inicio.'
            );

            return;
        }

        const request: UpdateProjectRequest = {
            categoryId: formValue.categoryId,
            title: formValue.title?.trim() ?? '',
            description: formValue.description?.trim() ?? '',
            requirements: this.toNullableString(
                formValue.requirements
            ),
            location: this.toNullableString(
                formValue.location
            ),
            city: this.toNullableString(
                formValue.city
            ),
            province: this.toNullableString(
                formValue.province
            ),
            startDate,
            endDate,
            maxVolunteers: formValue.maxVolunteers,
            status: formValue.status ?? ProjectStatus.OPEN
        };

        this.saving.set(true);
        this.saveError.set(null);

        this.projectService.updateProject(
            project.id,
            request
        )
            .pipe(
                finalize(() => {
                    this.saving.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: updatedProject => {
                    this.project.set(
                        updatedProject
                    );

                    void this.router.navigate(
                        [
                            '/admin/projects'
                        ],
                        {
                            state: {
                                projectUpdated: true,
                                projectTitle: updatedProject.title
                            }
                        }
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error actualizando proyecto:',
                        error
                    );

                    this.saveError.set(
                        this.getSaveErrorMessage(error)
                    );
                }
            });
    }

    statusLabel(status: ProjectStatus): string {
        switch (status) {
            case ProjectStatus.OPEN:
                return 'Abierto';

            case ProjectStatus.CLOSED:
                return 'Cerrado';

            case ProjectStatus.FINISHED:
                return 'Finalizado';

            case ProjectStatus.CANCELLED:
                return 'Cancelado';

            default:
                return status;
        }
    }

    private loadData(): void {
        const projectId = Number(
            this.route.snapshot.paramMap.get('id')
        );

        if (
            !Number.isInteger(projectId) ||
            projectId <= 0
        ) {
            this.loading.set(false);

            this.errorMessage.set(
                'El identificador del proyecto no es válido.'
            );

            return;
        }

        this.loading.set(true);
        this.errorMessage.set(null);

        forkJoin({
            project: this.projectService.getProjectById(
                projectId
            ),
            categories: this.categoryService.getCategories()
        })
            .pipe(
                finalize(() => {
                    this.loading.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: result => {
                    this.project.set(
                        result.project
                    );

                    this.categories.set(
                        result.categories
                    );

                    this.projectForm.reset({
                        title: result.project.title,
                        description: result.project.description,
                        requirements: result.project.requirements ?? '',
                        categoryId: result.project.category?.id ?? null,
                        location: result.project.location ?? '',
                        city: result.project.city ?? '',
                        province: result.project.province ?? '',
                        startDate: result.project.startDate,
                        endDate: result.project.endDate,
                        maxVolunteers: result.project.maxVolunteers,
                        status: result.project.status
                    });
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error cargando proyecto:',
                        error
                    );

                    if (error.status === 404) {
                        this.errorMessage.set(
                            'El proyecto indicado no existe.'
                        );

                        return;
                    }

                    this.errorMessage.set(
                        'No se ha podido cargar el proyecto.'
                    );
                }
            });
    }

    private toNullableString(
        value: string | null | undefined
    ): string | null {
        const trimmed = value?.trim() ?? '';

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
            return 'Los datos introducidos no son válidos.';
        }

        if (error.status === 403) {
            return 'No tienes permiso para modificar este proyecto.';
        }

        if (error.status === 404) {
            return 'El proyecto indicado no existe.';
        }

        if (error.status === 409) {
            return 'No se puede aplicar este cambio al proyecto en su estado actual.';
        }

        return 'No se ha podido actualizar el proyecto.';
    }
}