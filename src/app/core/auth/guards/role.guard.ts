import { inject } from '@angular/core';
import {CanActivateFn,Router} from '@angular/router';
import {UserRole} from '../models/user-role';
import {AuthStorageService} from '../services/auth-storage.service';
import {getHomeRoute} from '../utils/role-home';

interface RoleRouteData {
  roles?: UserRole[];
}

export const roleGuard: CanActivateFn = (route) => {

    const storage = inject(AuthStorageService);
    const router = inject(Router);
    const session = storage.getSession();

    if (!session) {
      return router.createUrlTree(
        ['/login']
      );
    }

    const routeData = route.data as RoleRouteData;
    const allowedRoles = routeData.roles;

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    if (allowedRoles.includes(session.role)) {
      return true;
    }

    return router.createUrlTree([
      getHomeRoute(
        session.role
      )
    ]);
  };