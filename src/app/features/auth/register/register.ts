import {Component,DestroyRef,inject,OnInit,signal} from '@angular/core';
import {AbstractControl,FormBuilder,ReactiveFormsModule,ValidationErrors,ValidatorFn,Validators} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {Router,RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AuthService} from '../../../core/auth/services/auth.service';
import {AccountType} from '../../../core/auth/models/account-type';
import {RegisterRequest} from '../../../core/auth/models/register-request';
import {OrganizationRegisterRequest} from '../../../core/auth/models/organization-register-request';
import {getHomeRoute} from '../../../core/auth/utils/role-home';

const passwordsMatchValidator:
  ValidatorFn =(control: AbstractControl): ValidationErrors | null => {

    const password =
      control.get('password')?.value;

    const confirmPassword =
      control.get(
        'confirmPassword'
      )?.value;

    if (
      !password ||
      !confirmPassword
    ) {
      return null;
    }

    if (
      password !==
      confirmPassword
    ) {
      return {
        passwordsDoNotMatch: true
      };
    }

    return null;
  };

@Component({
  selector: 'app-register',

  imports: [
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl:'./register.html',

  styleUrl:'./register.scss'
})
export class Register implements OnInit {

  private readonly formBuilder = inject(FormBuilder);

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  readonly AccountType = AccountType;

  readonly loading = signal(false);

  readonly errorMessage = signal<string | null>(null);

  readonly form =
    this.formBuilder
      .nonNullable
      .group({

        accountType: [
          AccountType.VOLUNTEER,
          [
            Validators.required
          ]
        ],

        name: [
          '',
          [
            Validators.required,
            Validators.maxLength(100)
          ]
        ],

        surname: [
          '',
          [
            Validators.required,
            Validators.maxLength(150)
          ]
        ],

        email: [
          '',
          [
            Validators.required,
            Validators.email,
            Validators.maxLength(150)
          ]
        ],

        phone: [
          '',
          [
            Validators.maxLength(20)
          ]
        ],

        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(100)
          ]
        ],

        confirmPassword: [
          '',
          [
            Validators.required
          ]
        ],

        organization:
          this.formBuilder
            .nonNullable
            .group({

              name: [
                '',
                [
                  Validators.maxLength(
                    150
                  )
                ]
              ],

              description: [
                ''
              ],

              email: [
                '',
                [
                  Validators.email,
                  Validators.maxLength(
                    150
                  )
                ]
              ],

              phone: [
                '',
                [
                  Validators.maxLength(
                    20
                  )
                ]
              ],

              address: [
                '',
                [
                  Validators.maxLength(
                    255
                  )
                ]
              ],

              city: [
                '',
                [
                  Validators.maxLength(
                    100
                  )
                ]
              ],

              province: [
                '',
                [
                  Validators.maxLength(
                    100
                  )
                ]
              ],

              postalCode: [
                '',
                [
                  Validators.maxLength(
                    20
                  )
                ]
              ],

              website: [
                '',
                [
                  Validators.maxLength(
                    255
                  )
                ]
              ]

            })

      }, {
        validators:
          passwordsMatchValidator
      });

  ngOnInit(): void {

    this.updateOrganizationValidators(
      this.form.controls
        .accountType.value
    );

    this.form.controls
      .accountType
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(accountType => {

        this.updateOrganizationValidators(
          accountType
        );
      });
  }

  get accountType() {
    return this.form.controls.accountType;
  }

  get name() {
    return this.form.controls.name;
  }

  get surname() {
    return this.form.controls.surname;
  }

  get email() {
    return this.form.controls.email;
  }

  get phone() {
    return this.form.controls.phone;
  }

  get password() {
    return this.form.controls.password;
  }

  get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  get organizationForm() {
    return this.form.controls.organization;
  }

  get isOrganization():
    boolean {

    return (
      this.accountType.value ===
      AccountType.ORGANIZATION
    );
  }

  submit(): void {

    this.errorMessage.set(null);

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;
    }

    this.loading.set(true);

    const formValue = this.form.getRawValue();

    const request:RegisterRequest = {

      accountType:formValue.accountType,

      name:formValue.name.trim(),

      surname:formValue.surname.trim(),

      email:formValue.email
          .trim()
          .toLowerCase(),

      password:formValue.password,

      phone:this.toNullableString(
          formValue.phone
        ),

      organization:this.buildOrganizationRequest(
          formValue.accountType
        )
    };

    this.authService
      .register(request)
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

        error: (
          error: HttpErrorResponse
        ) => {

          this.errorMessage.set(
            this.getErrorMessage(
              error
            )
          );
        }

      });
  }

  private buildOrganizationRequest(accountType: AccountType):OrganizationRegisterRequest | null {

    if (accountType !== AccountType.ORGANIZATION) {
      return null;
    }

    const organization = this.organizationForm.getRawValue();

    return {

      name:organization.name.trim(),

      description:this.toNullableString(
          organization.description
        ),

      email:organization.email
          .trim()
          .toLowerCase(),

      phone:this.toNullableString(
          organization.phone
        ),

      address:this.toNullableString(
          organization.address
        ),

      city:this.toNullableString(
          organization.city
        ),

      province:this.toNullableString(
          organization.province
        ),

      postalCode:this.toNullableString(
          organization.postalCode
        ),

      website:this.toNullableString(
          organization.website
        )
    };
  }

  private updateOrganizationValidators(accountType: AccountType): void {

    const organizationName = this.organizationForm.controls.name;

    const organizationEmail = this.organizationForm.controls.email;

    if (accountType === AccountType.ORGANIZATION) {

      organizationName.setValidators([
          Validators.required,
          Validators.maxLength(150)
        ]);

      organizationEmail.setValidators([
          Validators.required,
          Validators.email,
          Validators.maxLength(150)
        ]);

    } else {

      organizationName.setValidators([
          Validators.maxLength(150)
        ]);

      organizationEmail.setValidators([
          Validators.email,
          Validators.maxLength(150)
        ]);
    }

    organizationName.updateValueAndValidity();

    organizationEmail.updateValueAndValidity();
  }

  private toNullableString(value: string): string | null {

    const trimmed = value.trim();

    return (
      trimmed.length > 0
        ? trimmed
        : null
    );
  }

  private getErrorMessage(error: HttpErrorResponse): string {

    if (error.status === 0) {

      return (
        'No se puede conectar con el servidor.'
      );
    }

    if (error.status === 409) {

      if (typeof error.error?.detail === 'string') {
        return error.error.detail;
      }

      return (
        'El email indicado ya está registrado.'
      );
    }

    if (error.status === 400) {

      if (typeof error.error?.detail === 'string') {
        return error.error.detail;
      }

      return (
        'Los datos introducidos no son válidos.'
      );
    }

    return (
      'Se ha producido un error durante el registro.'
    );
  }
}