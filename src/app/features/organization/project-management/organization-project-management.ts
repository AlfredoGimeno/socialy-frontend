import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { Activity } from '../../../core/activities/models/activity';
import { CreateActivityRequest } from '../../../core/activities/models/create-activity-request';
import { UpdateActivityRequest } from '../../../core/activities/models/update-activity-request';
import { ActivityService } from '../../../core/activities/services/activity.service';
import { ApplicationStatus } from '../../../core/applications/models/application-status';
import { UpdateApplicationStatusRequest } from '../../../core/applications/models/update-application-status-request';
import { VolunteerApplication } from '../../../core/applications/models/volunteer-application';
import { ApplicationService } from '../../../core/applications/services/application.service';
import { Project } from '../../../core/projects/models/project';
import { ProjectStatus } from '../../../core/projects/models/project-status';
import { ProjectService } from '../../../core/projects/services/project.service';

@Component({
    selector: 'app-organization-project-management',
    imports: [
        DatePipe,
        ReactiveFormsModule,
        RouterLink
    ],
    templateUrl: './organization-project-management.html',
    styleUrl: './organization-project-management.scss'
})
export class OrganizationProjectManagement implements OnInit {

    private readonly route = inject(ActivatedRoute);
    private readonly formBuilder = inject(FormBuilder);
    private readonly projectService = inject(ProjectService);
    private readonly activityService = inject(ActivityService);
    private readonly applicationService = inject(ApplicationService);
    private readonly destroyRef = inject(DestroyRef);

    readonly ProjectStatus = ProjectStatus;
    readonly ApplicationStatus = ApplicationStatus;

    readonly project = signal<Project | null>(null);
    readonly activities = signal<Activity[]>([]);
    readonly applications = signal<VolunteerApplication[]>([]);

    readonly loading = signal(true);
    readonly errorMessage = signal<string | null>(null);

    readonly showActivityForm = signal(false);
    readonly editingActivityId = signal<number | null>(null);
    readonly savingActivity = signal(false);
    readonly deletingActivityId = signal<number | null>(null);
    readonly activityError = signal<string | null>(null);

    readonly applicationActionId = signal<number | null>(null);
    readonly applicationError = signal<string | null>(null);

    readonly pendingApplications = computed(() => {
        return this.applications().filter(
            application => application.status === ApplicationStatus.PENDING
        );
    });

    readonly acceptedApplications = computed(() => {
        return this.applications().filter(
            application => application.status === ApplicationStatus.ACCEPTED
        );
    });

    readonly rejectedApplications = computed(() => {
        return this.applications().filter(
            application => application.status === ApplicationStatus.REJECTED
        );
    });

    readonly cancelledApplications = computed(() => {
        return this.applications().filter(
            application => application.status === ApplicationStatus.CANCELLED
        );
    });

    readonly activityForm = this.formBuilder.nonNullable.group({
        title: [
            '',
            [
                Validators.required,
                Validators.maxLength(150)
            ]
        ],
        description: [''],
        activityDate: [
            '',
            [
                Validators.required
            ]
        ],
        location: [
            '',
            [
                Validators.maxLength(150)
            ]
        ],
        maxParticipants: this.formBuilder.control<number | null>(
            null,
            [
                Validators.min(1)
            ]
        )
    });

    ngOnInit(): void {
        const idParameter = this.route.snapshot.paramMap.get('id');

        if (!idParameter) {
            this.showInvalidProjectError();
            return;
        }

        const projectId = Number(idParameter);

        if (Number.isNaN(projectId) || projectId <= 0) {
            this.showInvalidProjectError();
            return;
        }

        this.loadProject(projectId);
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

    projectLocation(project: Project): string {
        const parts = [
            project.city,
            project.province
        ].filter(
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

    openCreateActivityForm(): void {
        this.editingActivityId.set(null);
        this.activityError.set(null);

        this.activityForm.reset({
            title: '',
            description: '',
            activityDate: '',
            location: '',
            maxParticipants: null
        });

        this.showActivityForm.set(true);
    }

    openEditActivityForm(activity: Activity): void {
        this.editingActivityId.set(activity.id);
        this.activityError.set(null);

        this.activityForm.reset({
            title: activity.title,
            description: activity.description ?? '',
            activityDate: this.toDateTimeLocalValue(activity.activityDate),
            location: activity.location ?? '',
            maxParticipants: activity.maxParticipants
        });

        this.showActivityForm.set(true);
    }

    closeActivityForm(): void {
        this.showActivityForm.set(false);
        this.editingActivityId.set(null);
        this.activityError.set(null);

        this.activityForm.reset({
            title: '',
            description: '',
            activityDate: '',
            location: '',
            maxParticipants: null
        });
    }

    saveActivity(): void {
        const currentProject = this.project();

        if (!currentProject) {
            return;
        }

        if (this.activityForm.invalid) {
            this.activityForm.markAllAsTouched();
            return;
        }

        const formValue = this.activityForm.getRawValue();

        this.savingActivity.set(true);
        this.activityError.set(null);

        const editingActivityId = this.editingActivityId();

        if (editingActivityId === null) {
            const request: CreateActivityRequest = {
                projectId: currentProject.id,
                title: formValue.title.trim(),
                description: this.toNullableString(formValue.description),
                activityDate: formValue.activityDate,
                location: this.toNullableString(formValue.location),
                maxParticipants: formValue.maxParticipants
            };

            this.activityService.createActivity(request)
                .pipe(
                    finalize(() => {
                        this.savingActivity.set(false);
                    }),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe({
                    next: activity => {
                        this.activities.update(current => {
                            const result = [
                                ...current,
                                activity
                            ];

                            return this.sortActivities(result);
                        });

                        this.closeActivityForm();
                    },
                    error: (error: HttpErrorResponse) => {
                        console.error('Error creando actividad:', error);

                        this.activityError.set(
                            this.getActivityErrorMessage(error)
                        );
                    }
                });

            return;
        }

        const request: UpdateActivityRequest = {
            title: formValue.title.trim(),
            description: this.toNullableString(formValue.description),
            activityDate: formValue.activityDate,
            location: this.toNullableString(formValue.location),
            maxParticipants: formValue.maxParticipants
        };

        this.activityService.updateActivity(
            editingActivityId,
            request
        )
            .pipe(
                finalize(() => {
                    this.savingActivity.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: updatedActivity => {
                    this.activities.update(current => {
                        const result = current.map(
                            activity =>
                                activity.id === updatedActivity.id
                                    ? updatedActivity
                                    : activity
                        );

                        return this.sortActivities(result);
                    });

                    this.closeActivityForm();
                },
                error: (error: HttpErrorResponse) => {
                    console.error('Error actualizando actividad:', error);

                    this.activityError.set(
                        this.getActivityErrorMessage(error)
                    );
                }
            });
    }

    deleteActivity(activity: Activity): void {
        const confirmed = window.confirm(
            `¿Seguro que quieres eliminar la actividad "${activity.title}"?`
        );

        if (!confirmed) {
            return;
        }

        this.deletingActivityId.set(activity.id);
        this.activityError.set(null);

        this.activityService.deleteActivity(activity.id)
            .pipe(
                finalize(() => {
                    this.deletingActivityId.set(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.activities.update(
                        current =>
                            current.filter(
                                item => item.id !== activity.id
                            )
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error('Error eliminando actividad:', error);

                    this.activityError.set(
                        this.getActivityErrorMessage(error)
                    );
                }
            });
    }

    acceptApplication(application: VolunteerApplication): void {
        this.changeApplicationStatus(
            application,
            ApplicationStatus.ACCEPTED
        );
    }

    rejectApplication(application: VolunteerApplication): void {
        this.changeApplicationStatus(
            application,
            ApplicationStatus.REJECTED
        );
    }

    isApplicationActionLoading(applicationId: number): boolean {
        return this.applicationActionId() === applicationId;
    }

    isActivityDeleting(activityId: number): boolean {
        return this.deletingActivityId() === activityId;
    }

    private loadProject(projectId: number): void {
        this.loading.set(true);
        this.errorMessage.set(null);

        this.projectService.getMyProjects()
            .pipe(
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: projects => {
                    const project = projects.find(
                        item => item.id === projectId
                    );

                    if (!project) {
                        this.loading.set(false);

                        this.errorMessage.set(
                            'El proyecto no existe o no pertenece a esta organización.'
                        );

                        return;
                    }

                    this.project.set(project);
                    this.loadProjectManagementData(projectId);
                },
                error: (error: HttpErrorResponse) => {
                    console.error('Error comprobando el proyecto:', error);

                    this.loading.set(false);

                    this.errorMessage.set(
                        'No se ha podido comprobar el proyecto.'
                    );
                }
            });
    }

    private loadProjectManagementData(projectId: number): void {
        forkJoin({
            activities: this.activityService.getActivitiesByProject(projectId),
            applications: this.applicationService.getProjectApplications(projectId)
        })
            .pipe(
                finalize(() => {
                    this.loading.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: result => {
                    this.activities.set(
                        this.sortActivities(result.activities)
                    );

                    this.applications.set(
                        result.applications
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error cargando la gestión del proyecto:',
                        error
                    );

                    this.errorMessage.set(
                        'No se ha podido cargar la información de gestión del proyecto.'
                    );
                }
            });
    }

    private changeApplicationStatus(
        application: VolunteerApplication,
        status: ApplicationStatus
    ): void {
        if (application.status !== ApplicationStatus.PENDING) {
            return;
        }

        this.applicationActionId.set(application.id);
        this.applicationError.set(null);

        const request: UpdateApplicationStatusRequest = {
            status,
            observations: null
        };

        this.applicationService.updateApplicationStatus(
            application.id,
            request
        )
            .pipe(
                finalize(() => {
                    this.applicationActionId.set(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: updatedApplication => {
                    this.applications.update(
                        current =>
                            current.map(
                                item =>
                                    item.id === updatedApplication.id
                                        ? updatedApplication
                                        : item
                            )
                    );
                },
                error: (error: HttpErrorResponse) => {
                    console.error(
                        'Error modificando el estado de la solicitud:',
                        error
                    );

                    this.applicationError.set(
                        this.getApplicationErrorMessage(error)
                    );
                }
            });
    }

    private sortActivities(activities: Activity[]): Activity[] {
        return [
            ...activities
        ].sort(
            (first, second) =>
                new Date(first.activityDate).getTime() -
                new Date(second.activityDate).getTime()
        );
    }

    private toNullableString(value: string): string | null {
        const trimmed = value.trim();

        return trimmed.length > 0
            ? trimmed
            : null;
    }

    private toDateTimeLocalValue(value: string): string {
        if (!value) {
            return '';
        }

        return value.length >= 16
            ? value.substring(0, 16)
            : value;
    }

    private getActivityErrorMessage(error: HttpErrorResponse): string {
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
            return 'Los datos de la actividad no son válidos.';
        }

        if (error.status === 403) {
            return 'No tienes permiso para gestionar esta actividad.';
        }

        if (error.status === 404) {
            return 'La actividad indicada no existe.';
        }

        if (error.status === 409) {
            return 'La operación no puede realizarse con el estado actual de la actividad.';
        }

        return 'No se ha podido realizar la operación sobre la actividad.';
    }

    private getApplicationErrorMessage(error: HttpErrorResponse): string {
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
            return 'La solicitud no se puede modificar al estado indicado.';
        }

        if (error.status === 403) {
            return 'No tienes permiso para gestionar esta solicitud.';
        }

        if (error.status === 404) {
            return 'La solicitud indicada no existe.';
        }

        if (error.status === 409) {
            return 'No se ha podido actualizar la solicitud. Comprueba las plazas disponibles del proyecto.';
        }

        return 'No se ha podido actualizar la solicitud.';
    }

    private showInvalidProjectError(): void {
        this.loading.set(false);

        this.errorMessage.set(
            'El identificador del proyecto no es válido.'
        );
    }
}