import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AdminUser } from '../../../core/admin/models/admin-user';
import { AdminUserService } from '../../../core/admin/services/admin-user.service';
import { UserRole } from '../../../core/auth/models/user-role';
import { Category } from '../../../core/projects/models/category';
import { Project } from '../../../core/projects/models/project';
import { ProjectStatus } from '../../../core/projects/models/project-status';
import { ProjectService } from '../../../core/projects/services/project.service';
import { CategoryService } from '../../../core/categories/services/category.service';
import { Organization } from '../../../core/organizations/models/organization';
import { OrganizationService } from '../../../core/organizations/services/organization.service';

@Component({
    selector: 'app-admin-dashboard',
    imports: [
        DatePipe,
        RouterLink
    ],
    templateUrl: './admin-dashboard.html',
    styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard implements OnInit {

    private readonly adminUserService = inject(AdminUserService);
    private readonly organizationService = inject(OrganizationService);
    private readonly projectService = inject(ProjectService);
    private readonly categoryService = inject(CategoryService);
    private readonly destroyRef = inject(DestroyRef);

    readonly UserRole = UserRole;
    readonly ProjectStatus = ProjectStatus;

    readonly users = signal<AdminUser[]>([]);
    readonly organizations = signal<Organization[]>([]);
    readonly projects = signal<Project[]>([]);
    readonly categories = signal<Category[]>([]);

    readonly loading = signal(true);
    readonly errorMessage = signal<string | null>(null);

    readonly verificationActionId = signal<number | null>(null);
    readonly verificationError = signal<string | null>(null);

    readonly volunteers = computed(() => {
        return this.users().filter(
            user => user.role === UserRole.VOLUNTEER
        );
    });

    readonly organizationUsers = computed(() => {
        return this.users().filter(
            user => user.role === UserRole.ORGANIZATION
        );
    });

    readonly adminUsers = computed(() => {
        return this.users().filter(
            user => user.role === UserRole.ADMIN
        );
    });

    readonly activeUsers = computed(() => {
        return this.users().filter(
            user => user.active
        );
    });

    readonly inactiveUsers = computed(() => {
        return this.users().filter(
            user => !user.active
        );
    });

    readonly verifiedOrganizations = computed(() => {
        return this.organizations().filter(
            organization => organization.verified
        );
    });

    readonly pendingOrganizations = computed(() => {
        return this.organizations().filter(
            organization => !organization.verified
        );
    });

    readonly openProjects = computed(() => {
        return this.projects().filter(
            project => project.status === ProjectStatus.OPEN
        );
    });

    readonly sortedOrganizations = computed(() => {
        return [
            ...this.organizations()
        ].sort(
            (first, second) => {
                if (first.verified !== second.verified) {
                    return first.verified ? 1 : -1;
                }

                return first.name.localeCompare(second.name);
            }
        );
    });

    ngOnInit(): void {
        this.loadDashboard();
    }

    verifyOrganization(organization: Organization): void {
        if (organization.verified) {
            return;
        }

        this.changeVerification(
            organization,
            true
        );
    }

    removeVerification(organization: Organization): void {
        if (!organization.verified) {
            return;
        }

        const confirmed = window.confirm(
            `¿Seguro que quieres quitar la verificación a "${organization.name}"?`
        );

        if (!confirmed) {
            return;
        }

        this.changeVerification(
            organization,
            false
        );
    }

    isVerificationLoading(organizationId: number): boolean {
        return this.verificationActionId() === organizationId;
    }

    organizationLocation(organization: Organization): string {
        const parts = [
            organization.city,
            organization.province
        ].filter(
            (value): value is string =>
                value !== null &&
                value.trim().length > 0
        );

        if (parts.length > 0) {
            return parts.join(', ');
        }

        return 'Ubicación no indicada';
    }

    private loadDashboard(): void {
        this.loading.set(true);
        this.errorMessage.set(null);

        forkJoin({
            users: this.adminUserService.getUsers(),
            organizations: this.organizationService.getOrganizations(),
            projects: this.projectService.getProjects(),
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
                    this.users.set(result.users);
                    this.organizations.set(result.organizations);
                    this.projects.set(result.projects);
                    this.categories.set(result.categories);
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error cargando el panel de administración:',
                        error
                    );

                    this.errorMessage.set(
                        'No se ha podido cargar el panel de administración.'
                    );
                }
            });
    }

    private changeVerification(
        organization: Organization,
        verified: boolean
    ): void {
        this.verificationActionId.set(organization.id);
        this.verificationError.set(null);

        this.organizationService.updateVerification(
            organization.id,
            verified
        )
            .pipe(
                finalize(() => {
                    this.verificationActionId.set(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: updatedOrganization => {
                    this.organizations.update(
                        current =>
                            current.map(
                                item =>
                                    item.id === updatedOrganization.id
                                        ? updatedOrganization
                                        : item
                            )
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error modificando la verificación:',
                        error
                    );

                    this.verificationError.set(
                        this.getVerificationErrorMessage(error)
                    );
                }
            });
    }

    private getVerificationErrorMessage(
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
            return 'No se puede modificar el estado de verificación.';
        }

        if (error.status === 403) {
            return 'No tienes permiso para verificar organizaciones.';
        }

        if (error.status === 404) {
            return 'La organización indicada no existe.';
        }

        return 'No se ha podido actualizar la organización.';
    }
}