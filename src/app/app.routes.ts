import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { guestGuard } from './core/auth/guards/guest.guard';
import { roleGuard } from './core/auth/guards/role.guard';
import { UserRole } from './core/auth/models/user-role';

export const routes: Routes = [
    {
        path: 'login',
        canActivate: [
            guestGuard
        ],
        loadComponent: () =>
            import('./features/auth/login/login').then(
                module => module.Login
            )
    },
    {
        path: 'register',
        canActivate: [
            guestGuard
        ],
        loadComponent: () =>
            import('./features/auth/register/register').then(
                module => module.Register
            )
    },
    {
        path: '',
        loadComponent: () =>
            import('./shared/layout/main-layout/main-layout').then(
                module => module.MainLayout
            ),
        children: [
            {
                path: 'projects',
                loadComponent: () =>
                    import('./features/projects/project-list/project-list').then(
                        module => module.ProjectList
                    )
            },
            {
                path: 'projects/:id',
                loadComponent: () =>
                    import('./features/projects/project-detail/project-detail').then(
                        module => module.ProjectDetail
                    )
            },
            {
                path: 'volunteer',
                canActivate: [
                    authGuard,
                    roleGuard
                ],
                data: {
                    roles: [
                        UserRole.VOLUNTEER
                    ]
                },
                loadComponent: () =>
                    import('./features/volunteer/volunteer-dashboard/volunteer-dashboard').then(
                        module => module.VolunteerDashboard
                    )
            },
            {
                path: 'organization',
                canActivate: [
                    authGuard,
                    roleGuard
                ],
                data: {
                    roles: [
                        UserRole.ORGANIZATION
                    ]
                },
                loadComponent: () =>
                    import('./features/organization/organization-dashboard/organization-dashboard').then(
                        module => module.OrganizationDashboard
                    )
            },
            {
                path: 'organization/projects/new',
                canActivate: [
                    authGuard,
                    roleGuard
                ],
                data: {
                    roles: [
                        UserRole.ORGANIZATION
                    ]
                },
                loadComponent: () =>
                    import('./features/organization/project-form/organization-project-form').then(
                        module => module.OrganizationProjectForm
                    )
            },
            {
                path: 'organization/projects/:id/edit',
                canActivate: [
                    authGuard,
                    roleGuard
                ],
                data: {
                    roles: [
                        UserRole.ORGANIZATION
                    ]
                },
                loadComponent: () =>
                    import('./features/organization/project-form/organization-project-form').then(
                        module => module.OrganizationProjectForm
                    )
            },
            {
                path: 'organization/projects/:id/manage',
                canActivate: [
                    authGuard,
                    roleGuard
                ],
                data: {
                    roles: [
                        UserRole.ORGANIZATION
                    ]
                },
                loadComponent: () =>
                    import('./features/organization/project-management/organization-project-management').then(
                        module => module.OrganizationProjectManagement
                    )
            },
            {
                path: 'organization/activities/:id/participants',
                canActivate: [
                    authGuard,
                    roleGuard
                ],
                data: {
                    roles: [
                        UserRole.ORGANIZATION
                    ]
                },
                loadComponent: () =>
                    import('./features/organization/activity-participants/organization-activity-participants').then(
                        module => module.OrganizationActivityParticipants
                    )
            },
            {
                path: 'admin',
                canActivate: [
                    authGuard,
                    roleGuard
                ],
                data: {
                    roles: [
                        UserRole.ADMIN
                    ],
                    title: 'Administración'
                },
                loadComponent: () =>
                    import('./features/dashboard/dashboard').then(
                        module => module.Dashboard
                    )
            },
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'projects'
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'projects'
    }
];