import {Component,computed,DestroyRef,inject,OnInit,signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {forkJoin,finalize} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AuthService} from '../../../core/auth/services/auth.service';
import {ApplicationService} from '../../../core/applications/services/application.service';
import {ActivityParticipantService} from '../../../core/activity-participants/services/activity-participant.service';
import {VolunteerApplication} from '../../../core/applications/models/volunteer-application';
import {ApplicationStatus} from '../../../core/applications/models/application-status';
import {ActivityParticipant} from '../../../core/activity-participants/models/activity-participant';
import {AttendanceStatus} from '../../../core/activity-participants/models/attendance-status';

@Component({
  selector: 'app-volunteer-dashboard',

  imports: [
    RouterLink,
    DatePipe
  ],

  templateUrl: './volunteer-dashboard.html',

  styleUrl: './volunteer-dashboard.scss'
})
export class VolunteerDashboard
  implements OnInit {

  private readonly authService =
    inject(AuthService);

  private readonly applicationService =
    inject(ApplicationService);

  private readonly activityParticipantService =
    inject(ActivityParticipantService);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly ApplicationStatus =
    ApplicationStatus;

  readonly AttendanceStatus =
    AttendanceStatus;

  readonly session =
    this.authService.session;

  readonly applications =
    signal<VolunteerApplication[]>(
      []
    );

  readonly participations =
    signal<ActivityParticipant[]>(
      []
    );

  readonly loading =
    signal(true);

  readonly errorMessage =
    signal<string | null>(
      null
    );

  readonly applicationActionId =
    signal<number | null>(
      null
    );

  readonly activityActionId =
    signal<number | null>(
      null
    );

  readonly actionError =
    signal<string | null>(
      null
    );

  readonly pendingApplications =
    computed(() => {

      return this.applications()
        .filter(
          application =>
            application.status ===
            ApplicationStatus.PENDING
        );
    });

  readonly acceptedApplications =
    computed(() => {

      return this.applications()
        .filter(
          application =>
            application.status ===
            ApplicationStatus.ACCEPTED
        );
    });

  readonly upcomingParticipations =
    computed(() => {

      const now =
        Date.now();

      return this.participations()
        .filter(
          participation => {

            const activityDate =
              new Date(
                participation
                  .activity
                  .activityDate
              ).getTime();

            return (
              activityDate > now &&
              participation
                .attendanceStatus ===
                AttendanceStatus.REGISTERED
            );
          }
        )
        .sort(
          (first, second) => {

            const firstDate =
              new Date(
                first.activity.activityDate
              ).getTime();

            const secondDate =
              new Date(
                second.activity.activityDate
              ).getTime();

            return (
              firstDate -
              secondDate
            );
          }
        );
    });

  readonly pastParticipations =
    computed(() => {

      const now =
        Date.now();

      return this.participations()
        .filter(
          participation => {

            const activityDate =
              new Date(
                participation
                  .activity
                  .activityDate
              ).getTime();

            return (
              activityDate <= now ||
              participation
                .attendanceStatus ===
                AttendanceStatus.ATTENDED ||
              participation
                .attendanceStatus ===
                AttendanceStatus.ABSENT
            );
          }
        )
        .sort(
          (first, second) => {

            const firstDate =
              new Date(
                first.activity.activityDate
              ).getTime();

            const secondDate =
              new Date(
                second.activity.activityDate
              ).getTime();

            return (
              secondDate -
              firstDate
            );
          }
        );
    });

  ngOnInit(): void {

    this.loadVolunteerData();
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

  projectLocation(
    application: VolunteerApplication
  ): string {

    const project =
      application.project;

    const locationParts =
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

    if (
      locationParts.length > 0
    ) {

      return locationParts.join(
        ', '
      );
    }

    if (
      project.location &&
      project.location
        .trim()
        .length > 0
    ) {

      return project.location;
    }

    return (
      'Ubicación por determinar'
    );
  }

  activityLocation(
    participation:
      ActivityParticipant
  ): string {

    const location =
      participation
        .activity
        .location;

    if (
      location &&
      location.trim().length > 0
    ) {

      return location;
    }

    return (
      'Ubicación por determinar'
    );
  }

  cancelApplication(
    application:
      VolunteerApplication
  ): void {

    if (
      application.status !==
      ApplicationStatus.PENDING
    ) {
      return;
    }

    this.actionError.set(
      null
    );

    this.applicationActionId.set(
      application.id
    );

    this.applicationService
      .cancelApplication(
        application.id
      )
      .pipe(

        finalize(() => {

          this.applicationActionId.set(
            null
          );

        }),

        takeUntilDestroyed(
          this.destroyRef
        )

      )
      .subscribe({

        next: () => {

          this.applications.update(
            current =>
              current.map(
                item => {

                  if (
                    item.id !==
                    application.id
                  ) {

                    return item;
                  }

                  return {
                    ...item,

                    status:
                      ApplicationStatus.CANCELLED
                  };
                }
              )
          );
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cancelando la solicitud:',
            error
          );

          this.actionError.set(
            this.getActionErrorMessage(
              error
            )
          );
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

    const activityDate =
      new Date(
        participation
          .activity
          .activityDate
      ).getTime();

    if (
      activityDate <=
      Date.now()
    ) {

      return;
    }

    this.actionError.set(
      null
    );

    this.activityActionId.set(
      participation.id
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

          this.participations.update(
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
            'Error cancelando la inscripción a la actividad:',
            error
          );

          this.actionError.set(
            this.getActionErrorMessage(
              error
            )
          );
        }

      });
  }

  isApplicationActionLoading(
    applicationId: number
  ): boolean {

    return (
      this.applicationActionId() ===
      applicationId
    );
  }

  isActivityActionLoading(
    participationId: number
  ): boolean {

    return (
      this.activityActionId() ===
      participationId
    );
  }

  private loadVolunteerData():
    void {

    this.loading.set(
      true
    );

    this.errorMessage.set(
      null
    );

    forkJoin({

      applications:
        this.applicationService
          .getMyApplications(),

      participations:
        this.activityParticipantService
          .getMyParticipations()

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

          this.applications.set(
            result.applications
          );

          this.participations.set(
            result.participations
          );
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cargando el área de voluntariado:',
            error
          );

          this.errorMessage.set(
            'No se ha podido cargar tu área de voluntariado.'
          );
        }

      });
  }

  private getActionErrorMessage(
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
        'No se puede realizar esta acción en el estado actual.'
      );
    }

    if (
      error.status === 403
    ) {

      return (
        'No tienes permiso para realizar esta acción.'
      );
    }

    if (
      error.status === 409
    ) {

      return (
        'No se ha podido completar la operación porque el estado ha cambiado.'
      );
    }

    return (
      'No se ha podido completar la operación.'
    );
  }
}