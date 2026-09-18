import {Routes} from '@angular/router';
import {authGuard} from './core/auth/guards/auth.guard';
import {guestGuard} from './core/auth/guards/guest.guard';
import {roleGuard} from './core/auth/guards/role.guard';
import {UserRole} from './core/auth/models/user-role';

export const routes:Routes = [

  {
    path: 'login',

    canActivate: [
      guestGuard
    ],

    loadComponent:
      () =>
        import(
          './features/auth/login/login'
        ).then(
          module =>
            module.Login
        )
  },

  {
    path: 'register',

    canActivate: [
      guestGuard
    ],

    loadComponent:
      () =>
        import(
          './features/auth/register/register'
        ).then(
          module =>
            module.Register
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
      ],

      title:
        'Área de voluntariado'
    },

    loadComponent:
      () =>
        import(
          './features/dashboard/dashboard'
        ).then(
          module =>
            module.Dashboard
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
      ],

      title:
        'Área de organización'
    },

    loadComponent:
      () =>
        import(
          './features/dashboard/dashboard'
        ).then(
          module =>
            module.Dashboard
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

      title:
        'Administración'
    },

    loadComponent:
      () =>
        import(
          './features/dashboard/dashboard'
        ).then(
          module =>
            module.Dashboard
        )
  },

  {
    path: '',

    pathMatch: 'full',

    redirectTo: 'login'
  },

  {
    path: '**',

    redirectTo: 'login'
  }

];