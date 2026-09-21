import {Routes} from '@angular/router';
import {authGuard} from './core/auth/guards/auth.guard';
import {guestGuard} from './core/auth/guards/guest.guard';
import {roleGuard} from './core/auth/guards/role.guard';
import {UserRole} from './core/auth/models/user-role';

export const routes:
  Routes = [

  /*
   * AUTENTICACIÓN
   *
   * Login y registro quedan fuera del
   * layout principal porque ya tienen
   * su propio diseño a pantalla completa.
   */
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

  /*
   * APLICACIÓN PRINCIPAL
   */
  {
    path: '',

    loadComponent:
      () =>
        import(
          './shared/layout/main-layout/main-layout'
        ).then(
          module =>
            module.MainLayout
        ),

    children: [

      /*
       * CATÁLOGO PÚBLICO
       */
      {
        path: 'projects',

        loadComponent:
          () =>
            import(
              './features/projects/project-list/project-list'
            ).then(
              module =>
                module.ProjectList
            )
      },

      /*
       * DETALLE PÚBLICO
       */
      {
        path: 'projects/:id',

        loadComponent:
          () =>
            import(
              './features/projects/project-detail/project-detail'
            ).then(
              module =>
                module.ProjectDetail
            )
      },

      /*
       * ÁREA DE VOLUNTARIO
       */
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

      /*
       * ÁREA DE ORGANIZACIÓN
       */
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

      /*
       * ÁREA DE ADMINISTRACIÓN
       */
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

      /*
       * PORTADA
       */
      {
        path: '',

        pathMatch: 'full',

        redirectTo: 'projects'
      }

    ]
  },

  /*
   * CUALQUIER URL DESCONOCIDA
   */
  {
    path: '**',

    redirectTo: 'projects'
  }

];