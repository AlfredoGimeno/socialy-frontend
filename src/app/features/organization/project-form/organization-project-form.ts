import {Component,computed,DestroyRef,inject,OnInit,signal} from '@angular/core';
import {FormBuilder,ReactiveFormsModule,ValidatorFn,AbstractControl,ValidationErrors,Validators} from '@angular/forms';
import {HttpErrorResponse} from '@angular/common/http';
import {ActivatedRoute,Router,RouterLink} from '@angular/router';
import {finalize,forkJoin} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CategoryService} from '../../../core/categories/services/category.service';
import {OrganizationService} from '../../../core/organizations/services/organization.service';
import {ProjectService} from '../../../core/projects/services/project.service';
import {Category} from '../../../core/projects/models/category';
import {Organization} from '../../../core/organizations/models/organization';
import {Project} from '../../../core/projects/models/project';
import {ProjectStatus} from '../../../core/projects/models/project-status';
import {CreateProjectRequest} from '../../../core/projects/models/create-project-request';
import {UpdateProjectRequest} from '../../../core/projects/models/update-project-request';

const projectDateValidator:ValidatorFn = (control:AbstractControl): ValidationErrors | null => {

    const startDate = control.get('startDate')?.value;

    const endDate =control.get('endDate')?.value;

    if (!startDate || !endDate) {

      return null;
    }

    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {

      return {
        invalidDateRange: true
      };
    }

    return null;
  };

@Component({
  selector: 'app-organization-project-form',

  imports: [
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl: './organization-project-form.html',

  styleUrl: './organization-project-form.scss'
})
export class OrganizationProjectForm
  implements OnInit {

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly categoryService =
    inject(CategoryService);

  private readonly organizationService =
    inject(OrganizationService);

  private readonly projectService =
    inject(ProjectService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly ProjectStatus =
    ProjectStatus;

  readonly categories =
    signal<Category[]>([]);

  readonly organization =
    signal<Organization | null>(
      null
    );

  readonly editingProjectId =
    signal<number | null>(
      null
    );

  readonly loading =
    signal(true);

  readonly saving =
    signal(false);

  readonly errorMessage =
    signal<string | null>(
      null
    );

  readonly isEditMode =
    computed(() => {

      return (
        this.editingProjectId() !==
        null
      );
    });

  readonly form =
    this.formBuilder.group(
      {

        categoryId:
          this.formBuilder
            .control<number | null>(
              null,
              [
                Validators.required
              ]
            ),

        title:
          this.formBuilder
            .nonNullable
            .control(
              '',
              [
                Validators.required,
                Validators.maxLength(
                  150
                )
              ]
            ),

        description:
          this.formBuilder
            .nonNullable
            .control(
              '',
              [
                Validators.required
              ]
            ),

        requirements:
          this.formBuilder
            .nonNullable
            .control(
              ''
            ),

        location:
          this.formBuilder
            .nonNullable
            .control(
              '',
              [
                Validators.maxLength(
                  150
                )
              ]
            ),

        city:
          this.formBuilder
            .nonNullable
            .control(
              '',
              [
                Validators.maxLength(
                  100
                )
              ]
            ),

        province:
          this.formBuilder
            .nonNullable
            .control(
              '',
              [
                Validators.maxLength(
                  100
                )
              ]
            ),

        startDate:
          this.formBuilder
            .nonNullable
            .control(
              '',
              [
                Validators.required
              ]
            ),

        endDate:
          this.formBuilder
            .nonNullable
            .control(
              '',
              [
                Validators.required
              ]
            ),

        maxVolunteers:
          this.formBuilder
            .control<number | null>(
              null,
              [
                Validators.min(1)
              ]
            ),

        status:
          this.formBuilder
            .nonNullable
            .control(
              ProjectStatus.OPEN,
              [
                Validators.required
              ]
            )

      },
      {
        validators:
          projectDateValidator
      }
    );

  ngOnInit(): void {

    const idParameter =
      this.route.snapshot
        .paramMap
        .get('id');

    if (idParameter) {

      const projectId =
        Number(idParameter);

      if (
        Number.isNaN(projectId) ||
        projectId <= 0
      ) {

        this.loading.set(
          false
        );

        this.errorMessage.set(
          'El identificador del proyecto no es válido.'
        );

        return;
      }

      this.editingProjectId.set(
        projectId
      );
    }

    this.loadData();
  }

  save(): void {

    if (
      this.form.invalid
    ) {

      this.form.markAllAsTouched();

      return;
    }

    const currentOrganization =
      this.organization();

    if (
      !currentOrganization
    ) {

      return;
    }

    if (
      !currentOrganization.verified
    ) {

      this.errorMessage.set(
        'La organización debe estar verificada para gestionar proyectos.'
      );

      return;
    }

    const formValue =
      this.form.getRawValue();

    if (
      formValue.categoryId ===
      null
    ) {

      return;
    }

    this.saving.set(
      true
    );

    this.errorMessage.set(
      null
    );

    const createRequest:
      CreateProjectRequest = {

      categoryId:
        formValue.categoryId,

      title:
        formValue.title.trim(),

      description:
        formValue.description.trim(),

      requirements:
        this.toNullableString(
          formValue.requirements
        ),

      location:
        this.toNullableString(
          formValue.location
        ),

      city:
        this.toNullableString(
          formValue.city
        ),

      province:
        this.toNullableString(
          formValue.province
        ),

      startDate:
        formValue.startDate,

      endDate:
        formValue.endDate,

      maxVolunteers:
        formValue.maxVolunteers
    };

    const projectId =
      this.editingProjectId();

    if (
      projectId === null
    ) {

      this.createProject(
        createRequest
      );

      return;
    }

    const updateRequest:
      UpdateProjectRequest = {

      ...createRequest,

      status:
        formValue.status
    };

    this.updateProject(
      projectId,
      updateRequest
    );
  }

  private loadData(): void {

    this.loading.set(
      true
    );

    this.errorMessage.set(
      null
    );

    const projectId =
      this.editingProjectId();

    if (
      projectId === null
    ) {

      forkJoin({

        categories:
          this.categoryService
            .getCategories(),

        organization:
          this.organizationService
            .getMine()

      })
        .pipe(
          finalize(() => {

            this.loading.set(
              false
            );

          }),

          takeUntilDestroyed(
            this.destroyRef
          )
        )
        .subscribe({

          next: result => {

            this.categories.set(
              result.categories
            );

            this.organization.set(
              result.organization
            );

            if (
              !result.organization
                .verified
            ) {

              this.errorMessage.set(
                'La organización todavía no está verificada y no puede crear proyectos.'
              );
            }
          },

          error: (
            error:
              HttpErrorResponse
          ) => {

            console.error(
              'Error preparando el formulario:',
              error
            );

            this.errorMessage.set(
              'No se ha podido preparar el formulario del proyecto.'
            );
          }

        });

      return;
    }

    forkJoin({

      categories:
        this.categoryService
          .getCategories(),

      organization:
        this.organizationService
          .getMine(),

      projects:
        this.projectService
          .getMyProjects()

    })
      .pipe(

        finalize(() => {

          this.loading.set(
            false
          );

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: result => {

          this.categories.set(
            result.categories
          );

          this.organization.set(
            result.organization
          );

          if (
            !result.organization
              .verified
          ) {

            this.errorMessage.set(
              'La organización todavía no está verificada y no puede modificar proyectos.'
            );

            return;
          }

          const project =
            result.projects.find(
              item =>
                item.id ===
                projectId
            );

          if (!project) {

            this.errorMessage.set(
              'El proyecto no existe o no pertenece a esta organización.'
            );

            return;
          }

          this.fillForm(
            project
          );
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cargando el proyecto:',
            error
          );

          this.errorMessage.set(
            'No se ha podido cargar el proyecto.'
          );
        }

      });
  }

  private fillForm(
    project: Project
  ): void {

    this.form.patchValue({

      categoryId:
        project.category?.id ??
        null,

      title:
        project.title,

      description:
        project.description,

      requirements:
        project.requirements ??
        '',

      location:
        project.location ??
        '',

      city:
        project.city ??
        '',

      province:
        project.province ??
        '',

      startDate:
        project.startDate,

      endDate:
        project.endDate,

      maxVolunteers:
        project.maxVolunteers,

      status:
        project.status

    });
  }

  private createProject(
    request:
      CreateProjectRequest
  ): void {

    this.projectService
      .createProject(
        request
      )
      .pipe(

        finalize(() => {

          this.saving.set(
            false
          );

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: () => {

          void this.router.navigate(
            ['/organization']
          );
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error creando el proyecto:',
            error
          );

          this.errorMessage.set(
            this.getSaveErrorMessage(
              error
            )
          );
        }

      });
  }

  private updateProject(
    projectId: number,
    request:
      UpdateProjectRequest
  ): void {

    this.projectService
      .updateProject(
        projectId,
        request
      )
      .pipe(

        finalize(() => {

          this.saving.set(
            false
          );

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: () => {

          void this.router.navigate(
            ['/organization']
          );
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error actualizando el proyecto:',
            error
          );

          this.errorMessage.set(
            this.getSaveErrorMessage(
              error
            )
          );
        }

      });
  }

  private toNullableString(
    value: string
  ): string | null {

    const trimmed =
      value.trim();

    return (
      trimmed.length > 0
        ? trimmed
        : null
    );
  }

  private getSaveErrorMessage(
    error:
      HttpErrorResponse
  ): string {

    if (
      error.status === 0
    ) {

      return (
        'No se puede conectar con el servidor.'
      );
    }

    if (
      typeof error.error?.detail ===
      'string'
    ) {

      return error.error.detail;
    }

    if (
      typeof error.error?.message ===
      'string'
    ) {

      return error.error.message;
    }

    if (
      error.status === 400
    ) {

      return (
        'Los datos del proyecto no son válidos.'
      );
    }

    if (
      error.status === 403
    ) {

      return (
        'La organización no tiene permiso para gestionar este proyecto. Comprueba que esté verificada.'
      );
    }

    if (
      error.status === 404
    ) {

      return (
        'El proyecto indicado no existe.'
      );
    }

    return (
      'No se ha podido guardar el proyecto.'
    );
  }
}