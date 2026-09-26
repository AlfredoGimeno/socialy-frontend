import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { Activity } from '../../../core/activities/models/activity';
import { ActivityService } from '../../../core/activities/services/activity.service';
import { ActivityParticipant } from '../../../core/activity-participants/models/activity-participant';
import { AttendanceStatus } from '../../../core/activity-participants/models/attendance-status';
import { UpdateAttendanceStatusRequest } from '../../../core/activity-participants/models/update-attendance-status-request';
import { ActivityParticipantService } from '../../../core/activity-participants/services/activity-participant.service';
import { Project } from '../../../core/projects/models/project';
import { ProjectService } from '../../../core/projects/services/project.service';

@Component({
    selector: 'app-organization-activity-participants',
    imports: [
        DatePipe,
        RouterLink
    ],
    templateUrl: './organization-activity-participants.html',
    styleUrl: './organization-activity-participants.scss'
})
export class OrganizationActivityParticipants implements OnInit {

    private readonly route = inject(ActivatedRoute);
    private readonly activityService = inject(ActivityService);
    private readonly projectService = inject(ProjectService);
    private readonly activityParticipantService = inject(ActivityParticipantService);
    private readonly destroyRef = inject(DestroyRef);

    readonly AttendanceStatus = AttendanceStatus;

    readonly activity = signal<Activity | null>(null);
    readonly project = signal<Project | null>(null);
    readonly participants = signal<ActivityParticipant[]>([]);

    readonly loading = signal(true);
    readonly errorMessage = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly actionParticipantId = signal<number | null>(null);

    readonly registeredParticipants = computed(() => {
        return this.participants().filter(
            participant =>
                participant.attendanceStatus === AttendanceStatus.REGISTERED
        );
    });

    readonly attendedParticipants = computed(() => {
        return this.participants().filter(
            participant =>
                participant.attendanceStatus === AttendanceStatus.ATTENDED
        );
    });

    readonly absentParticipants = computed(() => {
        return this.participants().filter(
            participant =>
                participant.attendanceStatus === AttendanceStatus.ABSENT
        );
    });

    ngOnInit(): void {
        const idParameter = this.route.snapshot.paramMap.get('id');

        if (!idParameter) {
            this.showInvalidActivityError();
            return;
        }

        const activityId = Number(idParameter);

        if (Number.isNaN(activityId) || activityId <= 0) {
            this.showInvalidActivityError();
            return;
        }

        this.loadActivity(activityId);
    }

    attendanceStatusLabel(status: AttendanceStatus): string {
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

    activityLocation(activity: Activity): string {
        if (
            activity.location &&
            activity.location.trim().length > 0
        ) {
            return activity.location;
        }

        return 'Ubicación por determinar';
    }

    markAttended(participant: ActivityParticipant): void {
        this.updateAttendance(
            participant,
            AttendanceStatus.ATTENDED
        );
    }

    markAbsent(participant: ActivityParticipant): void {
        this.updateAttendance(
            participant,
            AttendanceStatus.ABSENT
        );
    }

    isActionLoading(participantId: number): boolean {
        return this.actionParticipantId() === participantId;
    }

    private loadActivity(activityId: number): void {
        this.loading.set(true);
        this.errorMessage.set(null);

        forkJoin({
            activity: this.activityService.getActivityById(activityId),
            projects: this.projectService.getMyProjects()
        })
            .pipe(
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: result => {
                    const activity = result.activity;

                    const ownedProject = result.projects.find(
                        project =>
                            project.id === activity.project.id
                    );

                    if (!ownedProject) {
                        this.loading.set(false);

                        this.errorMessage.set(
                            'La actividad no pertenece a un proyecto de esta organización.'
                        );

                        return;
                    }

                    this.activity.set(activity);
                    this.project.set(ownedProject);

                    this.loadParticipants(activityId);
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error cargando la actividad:',
                        error
                    );

                    this.loading.set(false);

                    if (error.status === 404) {
                        this.errorMessage.set(
                            'La actividad indicada no existe.'
                        );

                        return;
                    }

                    this.errorMessage.set(
                        'No se ha podido cargar la actividad.'
                    );
                }
            });
    }

    private loadParticipants(activityId: number): void {
        this.activityParticipantService.getActivityParticipants(activityId)
            .pipe(
                finalize(() => {
                    this.loading.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: participants => {
                    this.participants.set(
                        this.sortParticipants(participants)
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error cargando participantes:',
                        error
                    );

                    if (error.status === 403) {
                        this.errorMessage.set(
                            'No tienes permiso para consultar los participantes de esta actividad.'
                        );

                        return;
                    }

                    this.errorMessage.set(
                        'No se han podido cargar los participantes de la actividad.'
                    );
                }
            });
    }

    private updateAttendance(
        participant: ActivityParticipant,
        status: AttendanceStatus
    ): void {
        if (participant.attendanceStatus === status) {
            return;
        }

        this.actionParticipantId.set(participant.id);
        this.actionError.set(null);

        const request: UpdateAttendanceStatusRequest = {
            attendanceStatus: status,
            observations: participant.observations
        };

        this.activityParticipantService.updateAttendance(
            participant.id,
            request
        )
            .pipe(
                finalize(() => {
                    this.actionParticipantId.set(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: updatedParticipant => {
                    this.participants.update(
                        current =>
                            this.sortParticipants(
                                current.map(
                                    item =>
                                        item.id === updatedParticipant.id
                                            ? updatedParticipant
                                            : item
                                )
                            )
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error actualizando asistencia:',
                        error
                    );

                    this.actionError.set(
                        this.getAttendanceErrorMessage(error)
                    );
                }
            });
    }

    private sortParticipants(
        participants: ActivityParticipant[]
    ): ActivityParticipant[] {
        return [
            ...participants
        ].sort(
            (first, second) => {
                const firstName =
                    `${first.user.surname} ${first.user.name}`.toLocaleLowerCase();

                const secondName =
                    `${second.user.surname} ${second.user.name}`.toLocaleLowerCase();

                return firstName.localeCompare(secondName);
            }
        );
    }

    private getAttendanceErrorMessage(
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
            return 'No se puede modificar la asistencia con el estado actual.';
        }

        if (error.status === 403) {
            return 'No tienes permiso para gestionar la asistencia de este participante.';
        }

        if (error.status === 404) {
            return 'La participación indicada no existe.';
        }

        if (error.status === 409) {
            return 'No se ha podido actualizar la asistencia porque el estado ha cambiado.';
        }

        return 'No se ha podido actualizar la asistencia.';
    }

    private showInvalidActivityError(): void {
        this.loading.set(false);

        this.errorMessage.set(
            'El identificador de la actividad no es válido.'
        );
    }
}