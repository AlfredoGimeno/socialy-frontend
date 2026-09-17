import {
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';

import {
  ActivatedRoute
} from '@angular/router';

import {
  AuthService
} from '../../core/auth/services/auth.service';

import {
  UserProfile
} from '../../core/auth/models/user-profile';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard
  implements OnInit {

  readonly auth =
    inject(AuthService);

  private readonly route =
    inject(ActivatedRoute);

  readonly session =
    this.auth.session;

  readonly title =
    this.route.snapshot.data[
      'title'
    ] as string;

  readonly profile =
    signal<UserProfile | null>(
      null
    );

  readonly loadingProfile =
    signal(true);

  readonly profileError =
    signal<string | null>(
      null
    );

  ngOnInit(): void {

    this.auth
      .getCurrentUser()
      .subscribe({

        next: user => {

          this.profile.set(user);

          this.loadingProfile.set(
            false
          );
        },

        error: () => {

          this.profileError.set(
            'No se ha podido cargar el usuario.'
          );

          this.loadingProfile.set(
            false
          );
        }

      });
  }

  logout(): void {
    this.auth.logout();
  }
}