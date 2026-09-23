import {Component,computed,DestroyRef,inject,OnInit,signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {finalize,forkJoin} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AuthService} from '../../../core/auth/services/auth.service';
import {OrganizationService} from '../../../core/organizations/services/organization.service';
import {ProjectService} from '../../../core/projects/services/project.service';
import {Organization} from '../../../core/organizations/models/organization';
import {Project} from '../../../core/projects/models/project';
import {ProjectStatus} from '../../../core/projects/models/project-status';

@Component({
  selector: 'app-organization-dashboard',

  imports: [
    RouterLink,
    DatePipe
  ],

  templateUrl: './organization-dashboard.html',

  styleUrl: './organization-dashboard.scss'
})
export class OrganizationDashboard implements OnInit {

  private readonly authService = inject(AuthService);

  private readonly organizationService = inject(OrganizationService);

  private readonly projectService = inject(ProjectService);

  private readonly destroyRef = inject(DestroyRef);

  readonly ProjectStatus = ProjectStatus;

  readonly session = this.authService.session;

  readonly organization = signal<Organization | null>(null);

  readonly projects = signal<Project[]>([]);

  readonly loading = signal(true);

  readonly errorMessage =signal<string | null>(null);

  readonly openProjects = computed(() => {

      return this.projects()
        .filter(
          project =>
            project.status ===
            ProjectStatus.OPEN
        );
    });

  readonly closedProjects = computed(() => {

      return this.projects()
        .filter(
          project =>
            project.status ===
            ProjectStatus.CLOSED
        );
    });

  readonly finishedProjects = computed(() => {

      return this.projects()
        .filter(
          project =>
            project.status ===
            ProjectStatus.FINISHED
        );
    });

  readonly cancelledProjects = computed(() => {

      return this.projects()
        .filter(
          project =>
            project.status ===
            ProjectStatus.CANCELLED
        );
    });

  readonly isVerified = computed(() => {

      return (
        this.organization()
          ?.verified === true
      );
    });

  ngOnInit(): void {

    this.loadDashboard();
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

  projectLocation(project: Project): string {

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

    if (
      parts.length > 0
    ) {

      return parts.join(
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

  private loadDashboard():
    void {

    this.loading.set(
      true
    );

    this.errorMessage.set(
      null
    );

    forkJoin({

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

          this.organization.set(
            result.organization
          );

          this.projects.set(
            result.projects
          );
        },

        error: (
          error:
            HttpErrorResponse
        ) => {

          console.error(
            'Error cargando el área de organización:',
            error
          );

          this.errorMessage.set(
            'No se ha podido cargar el área de la organización.'
          );
        }

      });
  }
}