import { UserRole } from '../models/user-role';

export function getHomeRoute(role: UserRole): string {

  switch (role) {

    case UserRole.VOLUNTEER:
      return '/volunteer';

    case UserRole.ORGANIZATION:
      return '/organization';

    case UserRole.ADMIN:
      return '/admin';

    default:
      return '/login';
  }
}