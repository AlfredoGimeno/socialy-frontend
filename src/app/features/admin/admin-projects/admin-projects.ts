import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Category } from '../../../core/projects/models/category';
import { OrganizationSummary } from '../../../core/projects/models/organization-summary';
import { Project } from '../../../core/projects/models/project';
import { ProjectStatus } from '../../../core/projects/models/project-status';
import { ProjectService } from '../../../core/projects/services/project.service';

@Component({
    selector: 'app-admin-projects',
    imports: [
        DatePipe,
        FormsModule,
        RouterLink
    ],
    templateUrl: './admin-projects.html',
    styleUrl: './admin-projects.scss'
})
export class AdminProjects implements OnInit {

    private readonly projectService = inject(ProjectService);
    private readonly destroyRef = inject(DestroyRef);

    readonly ProjectStatus = ProjectStatus;

    readonly projects = signal<Project[]>([]);

    readonly loading = signal(true);
    readonly errorMessage = signal<string | null>(null);

    readonly searchTerm = signal('');
    readonly statusFilter = signal<ProjectStatus | null>(null);
    readonly categoryFilter = signal<number | null>(null);
    readonly organizationFilter = signal<number | null>(null);

    readonly deletingProjectId = signal<number | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly actionSuccess = signal<string | null>(null);

    readonly openProjects = computed(() => {
        return this.projects().filter(
            project => project.status === ProjectStatus.OPEN
        );
    });

    readonly closedProjects = computed(() => {
        return this.projects().filter(
            project => project.status === ProjectStatus.CLOSED
        );
    });

    readonly finishedProjects = computed(() => {
        return this.projects().filter(
            project => project.status === ProjectStatus.FINISHED
        );
    });

    readonly cancelledProjects = computed(() => {
        return this.projects().filter(
            project => project.status === ProjectStatus.CANCELLED
        );
    });

    readonly organizations = computed<OrganizationSummary[]>(() => {
        const organizationMap = new Map<number, OrganizationSummary>();

        for (const project of this.projects()) {
            organizationMap.set(
                project.organization.id,
                project.organization
            );
        }

        return Array.from(
            organizationMap.values()
        ).sort(
            (first, second) =>
                first.name.localeCompare(second.name)
        );
    });

    readonly categories = computed<Category[]>(() => {
        const categoryMap = new Map<number, Category>();

        for (const project of this.projects()) {
            if (project.category) {
                categoryMap.set(
                    project.category.id,
                    project.category
                );
            }
        }

        return Array.from(
            categoryMap.values()
        ).sort(
            (first, second) =>
                first.name.localeCompare(second.name)
        );
    });

    readonly filteredProjects = computed(() => {
        const search = this.searchTerm()
            .trim()
            .toLocaleLowerCase();

        const status = this.statusFilter();
        const categoryId = this.categoryFilter();
        const organizationId = this.organizationFilter();

        return [
            ...this.projects()
        ]
            .filter(project => {
                if (
                    status !== null &&
                    project.status !== status
                ) {
                    return false;
                }

                if (
                    categoryId !== null &&
                    project.category?.id !== categoryId
                ) {
                    return false;
                }

                if (
                    organizationId !== null &&
                    project.organization.id !== organizationId
                ) {
                    return false;
                }

                if (search.length === 0) {
                    return true;
                }

                const searchableText = [
                    project.title,
                    project.description,
                    project.organization.name,
                    project.category?.name ?? '',
                    project.location ?? '',
                    project.city ?? '',
                    project.province ?? ''
                ]
                    .join(' ')
                    .toLocaleLowerCase();

                return searchableText.includes(search);
            })
            .sort(
                (first, second) =>
                    new Date(second.createdAt).getTime() -
                    new Date(first.createdAt).getTime()
            );
    });

    readonly hasActiveFilters = computed(() => {
        return (
            this.searchTerm().trim().length > 0 ||
            this.statusFilter() !== null ||
            this.categoryFilter() !== null ||
            this.organizationFilter() !== null
        );
    });

    ngOnInit(): void {
        this.loadProjects();
    }

    onSearchChange(value: string): void {
        this.searchTerm.set(value);
    }

    onStatusFilterChange(value: ProjectStatus | null): void {
        this.statusFilter.set(value);
    }

    onCategoryFilterChange(value: number | null): void {
        this.categoryFilter.set(value);
    }

    onOrganizationFilterChange(value: number | null): void {
        this.organizationFilter.set(value);
    }

    clearFilters(): void {
        this.searchTerm.set('');
        this.statusFilter.set(null);
        this.categoryFilter.set(null);
        this.organizationFilter.set(null);
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

    projectLocation(project: Project): string {
        const parts = [
            project.location,
            project.city,
            project.province
        ].filter(
            (value): value is string =>
                value !== null &&
                value.trim().length > 0
        );

        if (parts.length === 0) {
            return 'Ubicación no indicada';
        }

        return parts.join(', ');
    }

    isDeleting(projectId: number): boolean {
        return this.deletingProjectId() === projectId;
    }

    deleteProject(project: Project): void {
        const confirmed = window.confirm(
            `¿Seguro que quieres eliminar el proyecto "${project.title}"?\n\nEsta acción no se puede deshacer.`
        );

        if (!confirmed) {
            return;
        }

        this.deletingProjectId.set(project.id);
        this.actionError.set(null);
        this.actionSuccess.set(null);

        this.projectService.deleteProject(project.id)
            .pipe(
                finalize(() => {
                    this.deletingProjectId.set(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.projects.update(
                        current =>
                            current.filter(
                                item => item.id !== project.id
                            )
                    );

                    this.actionSuccess.set(
                        `El proyecto "${project.title}" se ha eliminado correctamente.`
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error eliminando proyecto:',
                        error
                    );

                    this.actionError.set(
                        this.getDeleteErrorMessage(error)
                    );
                }
            });
    }

    private loadProjects(): void {
        this.loading.set(true);
        this.errorMessage.set(null);

        this.projectService.getProjects()
            .pipe(
                finalize(() => {
                    this.loading.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: projects => {
                    this.projects.set(projects);
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error cargando proyectos:',
                        error
                    );

                    this.errorMessage.set(
                        'No se ha podido cargar la administración de proyectos.'
                    );
                }
            });
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
            return 'No tienes permiso para eliminar este proyecto.';
        }

        if (error.status === 404) {
            return 'El proyecto indicado no existe.';
        }

        if (
            error.status === 400 ||
            error.status === 409
        ) {
            return 'El proyecto no puede eliminarse porque existen datos relacionados con él.';
        }

        return 'No se ha podido eliminar el proyecto.';
    }
}