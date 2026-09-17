import {inject} from '@angular/core';
import {CanActivateFn,Router} from '@angular/router';
import {AuthStorageService} from '../services/auth-storage.service';
import {getHomeRoute} from '../utils/role-home';

export const guestGuard:CanActivateFn = () => {

    const storage = inject(AuthStorageService);

    const router = inject(Router);

    const session = storage.getSession();

    if (!session) {
      return true;
    }

    return router.createUrlTree([
      getHomeRoute(
        session.role
      )
    ]);
  };