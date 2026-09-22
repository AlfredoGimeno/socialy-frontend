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
import {ActivityParticipantService} from '../../../core/activity-participants/services/activity-participant.service';
import {AuthService} from '../../../core/auth/services/auth.service';
import {Project} from '../../../core/projects/models/project';
import {ProjectStatus} from '../../../core/projects/models/project-status';
import {Activity} from '../../../core/activities/models/activity';
import {VolunteerApplication} from '../../../core/applications/models/volunteer-application';
import {ApplicationStatus} from '../../../core/applications/models/application-status';
import {CreateApplicationRequest} from '../../../core/applications/models/create-application-request';
import {UserRole} from '../../../core/auth/models/user-role';
import {ActivityParticipant} from '../../../core/activity-participants/models/activity-participant';
import {AttendanceStatus} from '../../../core/activity-participants/models/attendance-status';
import {RegisterActivityRequest} from '../../../core/activity-participants/models/register-activity-request';

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
export class ProjectDetail
  implements OnInit {

  private readonly route =
    inject(ActivatedRoute);

  private readonly projectService =
    inject(ProjectService);

  private readonly activityService =
    inject(ActivityService);

  private readonly applicationService =
    inject(ApplicationService);

  private readonly activityParticipantService =
    inject(ActivityParticipantService);

  private readonly authService =
    inject(AuthService);

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly ApplicationStatus =
    ApplicationStatus;

  readonly AttendanceStatus =
    AttendanceStatus;

  readonly UserRole =
    UserRole;

  readonly session =
    this.authService.session;

  readonly project =
    signal<Project | null>(
      null
    );

  readonly activities =
    signal<Activity[]>([]);

  readonly myApplication =
    signal<VolunteerApplication | null>(
      null
    );

  readonly myActivityParticipations =
    signal<ActivityParticipant[]>(
      []
    );

  readonly loading =
    signal(true);

  readonly applicationLoading =
    signal(false);

  readonly applicationSubmitting =
    signal(false);

  readonly activityParticipationsLoading =
    signal(false);

  readonly activityActionId =
    signal<number | null>(
      null
    );

  readonly errorMessage =
    signal<string | null>(
      null
    );

  readonly applicationError =
    signal<string | null>(
      null
    );

  readonly applicationSuccess =
    signal<string | null>(
      null
    );

  readonly activityParticipationLoadError =
    signal<string | null>(
      null
    );

  readonly activityActionError =
    signal<{
      activityId: number;
      message: string;
    } | null>(
      null
    );

  readonly applicationForm =
    this.formBuilder
      .nonNullable
      .group({

        motivation: [
          '',
          [
            Validators.maxLength(
              1000
            )
          ]
        ]

      });

  ngOnInit(): void {

    const idParameter =
      this.route.snapshot
        .paramMap
        .get('id');

    if (!idParameter) {

      this.showInvalidIdError();

      return;
    }

    const projectId =
      Number(idParameter);

    if (
      Number.isNaN(projectId) ||
      projectId <= 0
    ) {

      this.showInvalidIdError();

      return;
    }

    this.loadProject(
      projectId
    );
  }

  get isAuthenticated():
    boolean {

    return (
      this.session() !== null
    );
  }

  get isVolunteer():
    boolean {

    return (
      this.session()?.role ===
      UserRole.VOLUNTEER
    );
  }

  get isAcceptedVolunteer():
    boolean {

    return (
      this.isVolunteer &&
      this.myApplication()?.status ===
        ApplicationStatus.ACCEPTED
    );
  }

  statusLabel(
    status: ProjectStatus
  ): string {

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

  applicationStatusLabel(
    status: ApplicationStatus
  ): string {

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

  attendanceStatusLabel(
    status: AttendanceStatus
  ): string {

    switch (status) {

      case AttendanceStatus.REGISTERED:
        return 'Inscrito';

      case AttendanceStatus.ATTENDED:
        return 'Asistió';

      case AttendanceStatus.ABSENT:
        return 'Ausente';

      default:
        return status;
    }
  }

  locationLabel(
    project: Project
  ): string {

    const parts =
      [
        project.city,
        project.province
      ]
        .filter(
          (
            value
          ): value is string =>
            value !== null &&
            value.trim().length > 0
        );

    if (parts.length > 0) {

      return parts.join(', ');
    }

    if (
      project.location &&
      project.location
        .trim()
        .length > 0
    ) {

      return project.location;
    }

    return 'Ubicación por determinar';
  }

  activityLocationLabel(
    activity: Activity
  ): string {

    if (
      activity.location &&
      activity.location
        .trim()
        .length > 0
    ) {

      return activity.location;
    }

    return 'Ubicación por determinar';
  }

  activityParticipation(
    activityId: number
  ): ActivityParticipant | null {

    return (
      this.myActivityParticipations()
        .find(
          participation =>
            participation.activity.id ===
              activityId
        )
      ??
      null
    );
  }

  isActivityPast(
    activity: Activity
  ): boolean {

    const activityTime =
      new Date(
        activity.activityDate
      ).getTime();

    return (
      activityTime <=
      Date.now()
    );
  }

  isActivityActionLoading(
    activityId: number
  ): boolean {

    return (
      this.activityActionId() ===
      activityId
    );
  }

  activityErrorFor(
    activityId: number
  ): string | null {

    const error =
      this.activityActionError();

    if (
      !error ||
      error.activityId !==
        activityId
    ) {

      return null;
    }

    return error.message;
  }

  submitApplication(): void {

    const currentProject =
      this.project();

    if (!currentProject) {
      return;
    }

    if (!this.isVolunteer) {
      return;
    }

    if (
      currentProject.status !==
      ProjectStatus.OPEN
    ) {
      return;
    }

    if (this.myApplication()) {
      return;
    }

    if (
      this.applicationForm.invalid
    ) {

      this.applicationForm
        .markAllAsTouched();

      return;
    }

    this.applicationError.set(
      null
    );

    this.applicationSuccess.set(
      null
    );

    this.applicationSubmitting.set(
      true
    );

    const formValue =
      this.applicationForm
        .getRawValue();

    const motivation =
      formValue.motivation
        .trim();

    const request:
      CreateApplicationRequest = {

      projectId:
        currentProject.id,

      motivation:
        motivation.length > 0
          ? motivation
          : null
    };

    this.applicationService
      .createApplication(
        request
      )
      .pipe(

        finalize(() => {

          this.applicationSubmitting
            .set(false);

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: application => {

          this.myApplication.set(
            application
          );

          this.applicationForm.reset();

          this.applicationSuccess.set(
            'Tu solicitud se ha enviado correctamente.'
          );
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error enviando solicitud:',
            error
          );

          this.applicationError.set(
            this.getApplicationErrorMessage(
              error
            )
          );
        }

      });
  }

  registerForActivity(
    activity: Activity
  ): void {

    if (
      !this.isAcceptedVolunteer
    ) {
      return;
    }

    if (
      this.isActivityPast(
        activity
      )
    ) {
      return;
    }

    if (
      this.activityParticipation(
        activity.id
      )
    ) {
      return;
    }

    this.activityActionError.set(
      null
    );

    this.activityActionId.set(
      activity.id
    );

    const request:
      RegisterActivityRequest = {

      activityId:
        activity.id
    };

    this.activityParticipantService
      .register(
        request
      )
      .pipe(

        finalize(() => {

          this.activityActionId.set(
            null
          );

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: participation => {

          this.myActivityParticipations
            .update(
              current => [
                ...current,
                participation
              ]
            );
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error inscribiéndose en la actividad:',
            error
          );

          this.activityActionError.set({
            activityId:
              activity.id,

            message:
              this.getActivityErrorMessage(
                error
              )
          });
        }

      });
  }

  unregisterFromActivity(
    participation:
      ActivityParticipant
  ): void {

    if (
      participation
        .attendanceStatus !==
      AttendanceStatus.REGISTERED
    ) {
      return;
    }

    if (
      this.isActivityPast(
        participation.activity
      )
    ) {
      return;
    }

    this.activityActionError.set(
      null
    );

    this.activityActionId.set(
      participation.activity.id
    );

    this.activityParticipantService
      .unregister(
        participation.id
      )
      .pipe(

        finalize(() => {

          this.activityActionId.set(
            null
          );

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: () => {

          this.myActivityParticipations
            .update(
              current =>
                current.filter(
                  item =>
                    item.id !==
                    participation.id
                )
            );
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cancelando la inscripción:',
            error
          );

          this.activityActionError.set({
            activityId:
              participation
                .activity
                .id,

            message:
              this.getActivityErrorMessage(
                error
              )
          });
        }

      });
  }

  private loadProject(
    projectId: number
  ): void {

    this.loading.set(
      true
    );

    this.errorMessage.set(
      null
    );

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

          this.project.set(
            result.project
          );

          this.activities.set(
            result.activities
          );

          this.loading.set(
            false
          );

          if (
            this.isVolunteer
          ) {

            this.loadMyApplication(
              projectId
            );
          }
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cargando el proyecto:',
            error
          );

          if (
            error.status === 404
          ) {

            this.errorMessage.set(
              'El proyecto que buscas no existe.'
            );

          } else {

            this.errorMessage.set(
              'No se ha podido cargar el proyecto.'
            );
          }

          this.loading.set(
            false
          );
        }

      });
  }

  private loadMyApplication(
    projectId: number
  ): void {

    this.applicationLoading.set(
      true
    );

    this.applicationService
      .getMyApplications()
      .pipe(

        finalize(() => {

          this.applicationLoading.set(
            false
          );

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: applications => {

          const application =
            applications.find(
              item =>
                item.project.id ===
                projectId
            );

          this.myApplication.set(
            application ?? null
          );

          if (
            application?.status ===
            ApplicationStatus.ACCEPTED
          ) {

            this.loadMyActivityParticipations(
              projectId
            );

          } else {

            this.myActivityParticipations.set(
              []
            );
          }
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cargando las solicitudes del usuario:',
            error
          );

          this.applicationError.set(
            'No se ha podido consultar el estado de tu solicitud.'
          );
        }

      });
  }

  private loadMyActivityParticipations(
    projectId: number
  ): void {

    this.activityParticipationsLoading
      .set(true);

    this.activityParticipationLoadError
      .set(null);

    this.activityParticipantService
      .getMyParticipations()
      .pipe(

        finalize(() => {

          this.activityParticipationsLoading
            .set(false);

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: participations => {

          const projectActivityIds =
            new Set(
              this.activities()
                .map(
                  activity =>
                    activity.id
                )
            );

          const projectParticipations =
            participations.filter(
              participation =>
                projectActivityIds.has(
                  participation
                    .activity
                    .id
                )
            );

          this.myActivityParticipations
            .set(
              projectParticipations
            );
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cargando las participaciones en actividades:',
            error
          );

          this.activityParticipationLoadError
            .set(
              'No se han podido consultar tus inscripciones en las actividades.'
            );
        }

      });
  }

  private getApplicationErrorMessage(
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
      error.status === 409
    ) {

      return (
        'Ya existe una solicitud para este proyecto.'
      );
    }

    if (
      error.status === 400
    ) {

      return (
        'No se puede enviar la solicitud con los datos actuales.'
      );
    }

    if (
      error.status === 403
    ) {

      return (
        'No tienes permiso para realizar esta acción.'
      );
    }

    return (
      'No se ha podido enviar la solicitud.'
    );
  }

  private getActivityErrorMessage(
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
      error.status === 409
    ) {

      return (
        'No se puede realizar la inscripción. Puede que ya estés inscrito o que no queden plazas disponibles.'
      );
    }

    if (
      error.status === 400
    ) {

      return (
        'No es posible realizar esta acción sobre la actividad.'
      );
    }

    if (
      error.status === 403
    ) {

      return (
        'No tienes permiso para participar en esta actividad.'
      );
    }

    return (
      'No se ha podido realizar la operación.'
    );
  }

  private showInvalidIdError():
    void {

    this.loading.set(
      false
    );

    this.errorMessage.set(
      'El identificador del proyecto no es válido.'
    );
  }
}