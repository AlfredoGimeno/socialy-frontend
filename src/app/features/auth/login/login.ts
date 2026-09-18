import {Component,inject,signal} from '@angular/core';
import {ReactiveFormsModule,FormBuilder,Validators} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {Router,RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {AuthService} from '../../../core/auth/services/auth.service';
import {LoginRequest} from '../../../core/auth/models/login-request';
import {getHomeRoute} from '../../../core/auth/utils/role-home';

@Component({
  selector: 'app-login',

  imports: [
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl:'./login.html',

  styleUrl:'./login.scss'
})
export class Login {

  private readonly formBuilder = inject(FormBuilder);

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly errorMessage = signal<string | null>(null);

  readonly form =
    this.formBuilder
      .nonNullable
      .group({

        email: [
          '',
          [
            Validators.required,
            Validators.email
          ]
        ],

        password: [
          '',
          [
            Validators.required
          ]
        ]

      });

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  submit(): void {

    this.errorMessage.set(null);

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;
    }

    this.loading.set(true);

    const request:LoginRequest = this.form.getRawValue();

    this.authService
      .login(request)
      .pipe(

        finalize(() => {
          this.loading.set(false);
        })

      )
      .subscribe({
        next: response => {
          void this.router
            .navigateByUrl(
              getHomeRoute(
                response.role
              )
            );
        },

        error: (error: HttpErrorResponse) => {

          this.errorMessage.set(
            this.getErrorMessage(
              error
            )
          );
        }

      });
  }

  private getErrorMessage(error: HttpErrorResponse): string {

    if (error.status === 0) {

      return (
        'No se puede conectar con el servidor.'
      );
    }

    if (error.status === 401) {

      return (
        'El email o la contraseña no son correctos.'
      );
    }

    if (error.status === 403) {

      return (
        'La cuenta no tiene permiso para iniciar sesión.'
      );
    }

    if (error.status === 400) {

      return (
        'Los datos introducidos no son válidos.'
      );
    }

    return (
      'Se ha producido un error. Inténtalo de nuevo.'
    );
  }
}