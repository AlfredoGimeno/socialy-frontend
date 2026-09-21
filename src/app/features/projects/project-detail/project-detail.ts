import {Component,DestroyRef,inject,OnInit,signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormBuilder,ReactiveFormsModule,Validators} from '@angular/forms';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {finalize,forkJoin} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ProjectService} from '../../../core/projects/services/project.service';
import {ActivityService} from '../../../core/activities/services/activity.service';
import {ApplicationService} from '../../../core/applications/services/application.service';
import {AuthService} from '../../../core/auth/services/auth.service';
import {Project} from '../../../core/projects/models/project';
import {ProjectStatus} from '../../../core/projects/models/project-status';
import {Activity} from '../../../core/activities/models/activity';
import {VolunteerApplication} from '../../../core/applications/models/volunteer-application';
import {ApplicationStatus} from '../../../core/applications/models/application-status';
import {CreateApplicationRequest} from '../../../core/applications/models/create-application-request';
import {UserRole} from '../../../core/auth/models/user-role';

@Component({
  selector: 'app-project-detail',

  imports: [
    RouterLink,
    DatePipe,
    ReactiveFormsModule
  ],

  templateUrl: './project-detail.html',

  styleUrl: './project-detail.scss'
})
export class ProjectDetail implements OnInit {

  private readonly route = inject(ActivatedRoute);

  private readonly projectService = inject(ProjectService);

  private readonly activityService = inject(ActivityService);

  private readonly applicationService = inject(ApplicationService);

  private readonly authService = inject(AuthService);

  private readonly formBuilder = inject(FormBuilder);

  private readonly destroyRef = inject(DestroyRef);

  readonly ApplicationStatus = ApplicationStatus;

  readonly UserRole = UserRole;

  readonly session = this.authService.session;

  readonly project = signal<Project | null>(null);

  readonly activities = signal<Activity[]>([]);

  readonly myApplication = signal<VolunteerApplication | null>(null);

  readonly loading = signal(true);

  readonly applicationLoading = signal(false);

  readonly applicationSubmitting = signal(false);

  readonly errorMessage = signal<string | null>(null);

  readonly applicationError = signal<string | null>(null);

  readonly applicationSuccess = signal<string | null>(null);

  readonly applicationForm = this.formBuilder.nonNullable.group({

        motivation: [
          '',
          [
            Validators.maxLength(1000)
          ]
        ]

      });

  ngOnInit(): void {

    const idParameter = this.route.snapshot.paramMap.get('id');

    if (!idParameter) {

      this.showInvalidIdError();

      return;
    }

    const projectId = Number(idParameter);

    if (Number.isNaN(projectId) || projectId <= 0) {

      this.showInvalidIdError();

      return;
    }

    this.loadProject(projectId);
  }

  get isAuthenticated():
    boolean {

    return this.session() !== null;
  }

  get isVolunteer():
    boolean {

    return (this.session()?.role === UserRole.VOLUNTEER);
  }

  statusLabel(status: ProjectStatus): string {

    switch (status) {

      case ProjectStatus.OPEN:
        return 'Abierto';

      case ProjectStatus.CLOSED:
        return 'Cerrado';

      case ProjectStatus.FINISHED:
        return 'Finalizado';

      case ProjectStatus.CANCELLED:
        return 'Cancelado';

      default:
        return status;
    }
  }

  applicationStatusLabel(status: ApplicationStatus): string {

    switch (status) {

      case ApplicationStatus.PENDING:
        return 'Pendiente';

      case ApplicationStatus.ACCEPTED:
        return 'Aceptada';

      case ApplicationStatus.REJECTED:
        return 'Rechazada';

      case ApplicationStatus.CANCELLED:
        return 'Cancelada';

      default:
        return status;
    }
  }

  locationLabel(project: Project): string {

    const parts =
      [
        project.city,
        project.province
      ]
        .filter(
          (value): value is string =>
            value !== null &&
            value.trim().length > 0
        );

    if (parts.length > 0) {

      return parts.join(', ');
    }

    if (project.location && project.location.trim().length > 0) {

      return project.location;
    }

    return 'Ubicación por determinar';
  }

  activityLocationLabel(activity: Activity): string {

    if (activity.location && activity.location.trim().length > 0) {

      return activity.location;
    }

    return 'Ubicación por determinar';
  }

  submitApplication(): void {

    const currentProject = this.project();

    if (!currentProject) {
      return;
    }

    if (!this.isVolunteer) {
      return;
    }

    if (currentProject.status !== ProjectStatus.OPEN) {
      return;
    }

    if (this.myApplication()) {
      return;
    }

    if (this.applicationForm.invalid) {

      this.applicationForm.markAllAsTouched();

      return;
    }

    this.applicationError.set(null);

    this.applicationSuccess.set(null);

    this.applicationSubmitting.set(true);

    const formValue = this.applicationForm.getRawValue();

    const motivation = formValue.motivation.trim();

    const request: CreateApplicationRequest = {

      projectId: currentProject.id,

      motivation: motivation.length > 0 ? motivation : null
    };

    this.applicationService.createApplication(request)
      .pipe(

        finalize(() => {

          this.applicationSubmitting.set(false);

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: application => {

          this.myApplication.set(application);

          this.applicationForm.reset();

          this.applicationSuccess.set('Tu solicitud se ha enviado correctamente.');
        },

        error: (error: HttpErrorResponse) => {

          console.error('Error enviando solicitud:', error);

          this.applicationError.set(this.getApplicationErrorMessage(error));
        }

      });
  }

  private loadProject(projectId: number): void {

    this.loading.set(true);

    this.errorMessage.set(null);

    forkJoin({

      project:
        this.projectService
          .getProjectById(
            projectId
          ),

      activities:
        this.activityService
          .getActivitiesByProject(
            projectId
          )

    })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: result => {

          this.project.set(result.project);

          this.activities.set(result.activities);

          this.loading.set(false);

          if (this.isVolunteer) {

            this.loadMyApplication(projectId);
          }
        },

        error: (error: HttpErrorResponse) => {

          console.error('Error cargando el proyecto:',error);

          if (error.status === 404) {

            this.errorMessage.set('El proyecto que buscas no existe.');

          } else {

            this.errorMessage.set('No se ha podido cargar el proyecto.');
          }

          this.loading.set(false);
        }

      });
  }

  private loadMyApplication(projectId: number): void {

    this.applicationLoading.set(true);

    this.applicationService
      .getMyApplications()
      .pipe(

        finalize(() => {

          this.applicationLoading.set(false);

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: applications => {

          const application = applications.find(item => item.project.id === projectId);

          this.myApplication.set(application ?? null);
        },

        error: (error: HttpErrorResponse) => {

          console.error('Error cargando las solicitudes del usuario:', error);

          this.applicationError.set('No se ha podido consultar el estado de tu solicitud.');
        }

      });
  }

  private getApplicationErrorMessage(error: HttpErrorResponse): string {

    if (error.status === 0) {

      return ('No se puede conectar con el servidor.');
    }

    if (typeof error.error?.detail === 'string') {

      return error.error.detail;
    }

    if (typeof error.error?.message === 'string') {

      return error.error.message;
    }

    if (error.status === 409) {

      return ('Ya existe una solicitud para este proyecto.');
    }

    if (error.status === 400) {

      return ('No se puede enviar la solicitud con los datos actuales.');
    }

    if (error.status === 403) {

      return ('No tienes permiso para realizar esta acción.');
    }

    return ('No se ha podido enviar la solicitud.');
  }

  private showInvalidIdError():
    void {

    this.loading.set(false);

    this.errorMessage.set('El identificador del proyecto no es válido.');
  }
}