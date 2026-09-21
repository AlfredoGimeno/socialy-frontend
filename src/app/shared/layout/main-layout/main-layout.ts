import {Component,computed,inject} from '@angular/core';
import {RouterLink,RouterLinkActive,RouterOutlet} from '@angular/router';
import {AuthService} from '../../../core/auth/services/auth.service';
import {getHomeRoute} from '../../../core/auth/utils/role-home';

@Component({
  selector: 'app-main-layout',

  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],

  templateUrl: './main-layout.html',

  styleUrl: './main-layout.scss'
})
export class MainLayout {

  private readonly authService = inject(AuthService);
  readonly session = this.authService.session;
  readonly isAuthenticated = this.authService.isAuthenticated;

  readonly dashboardRoute =
    computed(() => {

      const session = this.session();

      if (!session) {
        return '/login';
      }

      return getHomeRoute(
        session.role
      );
    });

  logout(): void {

    this.authService.logout();
  }
}