import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UserProfile } from '../../../core/auth/models/user-profile';
import { UserRole } from '../../../core/auth/models/user-role';
import { UpdateUserProfileRequest } from '../../../core/auth/models/update-user-profile-request';
import { AuthService } from '../../../core/auth/services/auth.service';
import { getHomeRoute } from '../../../core/auth/utils/role-home';
import { UserProfileService } from '../../../core/profile/services/user-profile.service';

@Component({
    selector: 'app-user-profile',
    imports: [
        ReactiveFormsModule,
        RouterLink
    ],
    templateUrl: './user-profile.html',
    styleUrl: './user-profile.scss'
})
export class UserProfileComponent implements OnInit {

    private readonly formBuilder = inject(FormBuilder);
    private readonly userProfileService = inject(UserProfileService);
    private readonly authService = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);

    readonly UserRole = UserRole;

    readonly profile = signal<UserProfile | null>(null);

    readonly loading = signal(true);
    readonly saving = signal(false);

    readonly errorMessage = signal<string | null>(null);
    readonly saveError = signal<string | null>(null);
    readonly saveSuccess = signal<string | null>(null);

    readonly profileForm = this.formBuilder.nonNullable.group({
        name: [
            '',
            [
                Validators.required
            ]
        ],
        surname: [
            '',
            [
                Validators.required
            ]
        ],
        phone: ['']
    });

    ngOnInit(): void {
        this.loadProfile();
    }

    saveProfile(): void {
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }

        const formValue = this.profileForm.getRawValue();

        const name = formValue.name.trim();
        const surname = formValue.surname.trim();

        if (name.length === 0) {
            this.profileForm.controls.name.setErrors({
                required: true
            });

            this.profileForm.controls.name.markAsTouched();

            return;
        }

        if (surname.length === 0) {
            this.profileForm.controls.surname.setErrors({
                required: true
            });

            this.profileForm.controls.surname.markAsTouched();

            return;
        }

        const request: UpdateUserProfileRequest = {
            name,
            surname,
            phone: this.toNullableString(
                formValue.phone
            )
        };

        this.saving.set(true);
        this.saveError.set(null);
        this.saveSuccess.set(null);

        this.userProfileService.updateProfile(
            request
        )
            .pipe(
                finalize(() => {
                    this.saving.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: updatedProfile => {
                    this.profile.set(
                        updatedProfile
                    );

                    this.profileForm.reset({
                        name: updatedProfile.name,
                        surname: updatedProfile.surname,
                        phone: updatedProfile.phone ?? ''
                    });

                    this.authService.updateSessionProfile(
                        updatedProfile
                    );

                    this.saveSuccess.set(
                        'Tu perfil se ha actualizado correctamente.'
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error actualizando perfil:',
                        error
                    );

                    this.saveError.set(
                        this.getSaveErrorMessage(error)
                    );
                }
            });
    }

    roleLabel(
        role: UserRole
    ): string {
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

    homeRoute(): string {
        const profile = this.profile();

        if (!profile) {
            return '/projects';
        }

        return getHomeRoute(
            profile.role
        );
    }

    initials(): string {
        const profile = this.profile();

        if (!profile) {
            return '';
        }

        const nameInitial = profile.name
            .charAt(0)
            .toUpperCase();

        const surnameInitial = profile.surname
            .charAt(0)
            .toUpperCase();

        return `${nameInitial}${surnameInitial}`;
    }

    private loadProfile(): void {
        this.loading.set(true);
        this.errorMessage.set(null);

        this.userProfileService.getProfile()
            .pipe(
                finalize(() => {
                    this.loading.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: profile => {
                    this.profile.set(
                        profile
                    );

                    this.profileForm.reset({
                        name: profile.name,
                        surname: profile.surname,
                        phone: profile.phone ?? ''
                    });
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error cargando perfil:',
                        error
                    );

                    if (error.status === 401) {
                        this.errorMessage.set(
                            'Tu sesión ha caducado. Vuelve a iniciar sesión.'
                        );

                        return;
                    }

                    this.errorMessage.set(
                        'No se ha podido cargar tu perfil.'
                    );
                }
            });
    }

    private toNullableString(
        value: string
    ): string | null {
        const trimmed = value.trim();

        return trimmed.length > 0
            ? trimmed
            : null;
    }

    private getSaveErrorMessage(
        error: HttpErrorResponse
    ): string {
        if (error.status === 0) {
            return 'No se puede conectar con el servidor.';
        }

        if (typeof error.error?.detail === 'string') {
            return error.error.detail;
        }

        if (typeof error.error?.message === 'string') {
            return error.error.message;
        }

        if (error.status === 400) {
            return 'Los datos introducidos no son válidos.';
        }

        if (error.status === 401) {
            return 'Tu sesión ha caducado. Vuelve a iniciar sesión.';
        }

        if (error.status === 403) {
            return 'No puedes modificar este perfil.';
        }

        return 'No se ha podido actualizar tu perfil.';
    }
}