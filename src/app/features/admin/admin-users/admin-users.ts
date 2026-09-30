import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminUser } from '../../../core/admin/models/admin-user';
import { AdminUserService } from '../../../core/admin/services/admin-user.service';
import { UserRole } from '../../../core/auth/models/user-role';
import { AuthStorageService } from '../../../core/auth/services/auth-storage.service';

type RoleFilter = 'ALL' | UserRole;
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

@Component({
    selector: 'app-admin-users',
    imports: [
        DatePipe,
        FormsModule,
        RouterLink
    ],
    templateUrl: './admin-users.html',
    styleUrl: './admin-users.scss'
})
export class AdminUsers implements OnInit {

    private readonly adminUserService = inject(AdminUserService);
    private readonly authStorageService = inject(AuthStorageService);
    private readonly destroyRef = inject(DestroyRef);

    readonly UserRole = UserRole;

    readonly users = signal<AdminUser[]>([]);

    readonly loading = signal(true);
    readonly errorMessage = signal<string | null>(null);

    readonly searchTerm = signal('');
    readonly roleFilter = signal<RoleFilter>('ALL');
    readonly statusFilter = signal<StatusFilter>('ALL');

    readonly userActionId = signal<number | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly actionSuccess = signal<string | null>(null);

    readonly currentUserId = this.authStorageService.getSession()?.userId ?? null;

    readonly volunteerCount = computed(() => {
        return this.users().filter(
            user => user.role === UserRole.VOLUNTEER
        ).length;
    });

    readonly organizationCount = computed(() => {
        return this.users().filter(
            user => user.role === UserRole.ORGANIZATION
        ).length;
    });

    readonly adminCount = computed(() => {
        return this.users().filter(
            user => user.role === UserRole.ADMIN
        ).length;
    });

    readonly activeCount = computed(() => {
        return this.users().filter(
            user => user.active
        ).length;
    });

    readonly inactiveCount = computed(() => {
        return this.users().filter(
            user => !user.active
        ).length;
    });

    readonly filteredUsers = computed(() => {
        const search = this.searchTerm()
            .trim()
            .toLocaleLowerCase();

        const selectedRole = this.roleFilter();
        const selectedStatus = this.statusFilter();

        return [
            ...this.users()
        ]
            .filter(user => {
                if (
                    selectedRole !== 'ALL' &&
                    user.role !== selectedRole
                ) {
                    return false;
                }

                if (
                    selectedStatus === 'ACTIVE' &&
                    !user.active
                ) {
                    return false;
                }

                if (
                    selectedStatus === 'INACTIVE' &&
                    user.active
                ) {
                    return false;
                }

                if (search.length === 0) {
                    return true;
                }

                const searchableText = [
                    user.name,
                    user.surname,
                    user.email,
                    user.phone ?? ''
                ]
                    .join(' ')
                    .toLocaleLowerCase();

                return searchableText.includes(search);
            })
            .sort(
                (first, second) => {
                    const firstName =
                        `${first.surname} ${first.name}`.toLocaleLowerCase();

                    const secondName =
                        `${second.surname} ${second.name}`.toLocaleLowerCase();

                    return firstName.localeCompare(secondName);
                }
            );
    });

    readonly hasActiveFilters = computed(() => {
        return (
            this.searchTerm().trim().length > 0 ||
            this.roleFilter() !== 'ALL' ||
            this.statusFilter() !== 'ALL'
        );
    });

    ngOnInit(): void {
        this.loadUsers();
    }

    onSearchChange(value: string): void {
        this.searchTerm.set(value);
    }

    onRoleFilterChange(value: string): void {
        if (
            value === 'ALL' ||
            value === UserRole.VOLUNTEER ||
            value === UserRole.ORGANIZATION ||
            value === UserRole.ADMIN
        ) {
            this.roleFilter.set(value);
        }
    }

    onStatusFilterChange(value: string): void {
        if (
            value === 'ALL' ||
            value === 'ACTIVE' ||
            value === 'INACTIVE'
        ) {
            this.statusFilter.set(value);
        }
    }

    clearFilters(): void {
        this.searchTerm.set('');
        this.roleFilter.set('ALL');
        this.statusFilter.set('ALL');
    }

    roleLabel(role: UserRole): string {
        switch (role) {
            case UserRole.VOLUNTEER:
                return 'Voluntario';

            case UserRole.ORGANIZATION:
                return 'Organización';

            case UserRole.ADMIN:
                return 'Administrador';

            default:
                return role;
        }
    }

    initials(user: AdminUser): string {
        const nameInitial = user.name
            .charAt(0)
            .toUpperCase();

        const surnameInitial = user.surname
            .charAt(0)
            .toUpperCase();

        return `${nameInitial}${surnameInitial}`;
    }

    isCurrentUser(user: AdminUser): boolean {
        return user.id === this.currentUserId;
    }

    isUserActionLoading(userId: number): boolean {
        return this.userActionId() === userId;
    }

    isAnyUserActionLoading(): boolean {
        return this.userActionId() !== null;
    }

    deactivateUser(user: AdminUser): void {
        if (!user.active) {
            return;
        }

        if (this.isCurrentUser(user)) {
            this.actionError.set(
                'No puedes desactivar tu propia cuenta de administrador.'
            );

            return;
        }

        const confirmed = window.confirm(
            `¿Seguro que quieres desactivar la cuenta de "${user.name} ${user.surname}"?`
        );

        if (!confirmed) {
            return;
        }

        this.changeActiveStatus(
            user,
            false
        );
    }

    reactivateUser(user: AdminUser): void {
        if (user.active) {
            return;
        }

        const confirmed = window.confirm(
            `¿Quieres reactivar la cuenta de "${user.name} ${user.surname}"?`
        );

        if (!confirmed) {
            return;
        }

        this.changeActiveStatus(
            user,
            true
        );
    }

    private loadUsers(): void {
        this.loading.set(true);
        this.errorMessage.set(null);

        this.adminUserService.getUsers()
            .pipe(
                finalize(() => {
                    this.loading.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: users => {
                    this.users.set(users);
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error cargando usuarios:',
                        error
                    );

                    this.errorMessage.set(
                        'No se ha podido cargar la gestión de usuarios.'
                    );
                }
            });
    }

    private changeActiveStatus(
        user: AdminUser,
        active: boolean
    ): void {
        if (this.isAnyUserActionLoading()) {
            return;
        }

        this.userActionId.set(user.id);
        this.actionError.set(null);
        this.actionSuccess.set(null);

        this.adminUserService.updateActiveStatus(
            user.id,
            active
        )
            .pipe(
                finalize(() => {
                    this.userActionId.set(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: updatedUser => {
                    this.users.update(
                        current =>
                            current.map(
                                item =>
                                    item.id === updatedUser.id
                                        ? updatedUser
                                        : item
                            )
                    );

                    if (active) {
                        this.actionSuccess.set(
                            `La cuenta de ${updatedUser.name} ${updatedUser.surname} se ha reactivado correctamente.`
                        );
                    } else {
                        this.actionSuccess.set(
                            `La cuenta de ${updatedUser.name} ${updatedUser.surname} se ha desactivado correctamente.`
                        );
                    }
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error modificando el estado del usuario:',
                        error
                    );

                    this.actionError.set(
                        this.getActiveStatusErrorMessage(error)
                    );
                }
            });
    }

    private getActiveStatusErrorMessage(
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
            return 'No se puede modificar el estado de la cuenta.';
        }

        if (error.status === 403) {
            return 'No tienes permiso para modificar esta cuenta.';
        }

        if (error.status === 404) {
            return 'El usuario indicado no existe.';
        }

        if (error.status === 409) {
            return 'No puedes desactivar tu propia cuenta de administrador.';
        }

        return 'No se ha podido modificar el estado de la cuenta.';
    }
}