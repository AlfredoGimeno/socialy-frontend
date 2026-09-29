import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminUser } from '../../../core/admin/models/admin-user';
import { AdminUserService } from '../../../core/admin/services/admin-user.service';
import { UserRole } from '../../../core/auth/models/user-role';

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
    private readonly destroyRef = inject(DestroyRef);

    readonly UserRole = UserRole;

    readonly users = signal<AdminUser[]>([]);

    readonly loading = signal(true);
    readonly errorMessage = signal<string | null>(null);

    readonly searchTerm = signal('');
    readonly roleFilter = signal<RoleFilter>('ALL');
    readonly statusFilter = signal<StatusFilter>('ALL');

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

    private loadUsers(): void {
        this.loading.set(true);
        this.errorMessage.set(null);

        this.adminUserService.getUsers()
            .pipe(
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: users => {
                    this.users.set(users);
                    this.loading.set(false);
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error cargando usuarios:',
                        error
                    );

                    this.loading.set(false);

                    this.errorMessage.set(
                        'No se ha podido cargar la gestión de usuarios.'
                    );
                }
            });
    }
}