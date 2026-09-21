import {Component,DestroyRef,inject,OnInit,signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ProjectService} from '../../../core/projects/services/project.service';
import {Project} from '../../../core/projects/models/project';
import {ProjectStatus} from '../../../core/projects/models/project-status';

@Component({
  selector: 'app-project-list',

  imports: [
    RouterLink,
    DatePipe
  ],

  templateUrl: './project-list.html',

  styleUrl: './project-list.scss'
})
export class ProjectList
  implements OnInit {

  private readonly projectService = inject(ProjectService);

  private readonly destroyRef = inject(DestroyRef);

  readonly projects = signal<Project[]>([]);

  readonly loading = signal(true);

  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {

    this.loadProjects();
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

  locationLabel(project: Project): string {

    const parts =
      [
        project.city,
        project.province
      ]
        .filter(
          value =>
            value !== null &&
            value.trim().length > 0
        );

    if (parts.length > 0) {

      return parts.join(', ');
    }

    if (
      project.location &&
      project.location.trim().length > 0
    ) {

      return project.location;
    }

    return 'Ubicación por determinar';
  }

  private loadProjects(): void {

    this.loading.set(true);

    this.errorMessage.set(null);

    this.projectService
      .getProjects()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: projects => {

          this.projects.set(
            projects
          );

          this.loading.set(false);
        },

        error: (error: HttpErrorResponse) => {

          console.error(
            'Error cargando proyectos:',
            error
          );

          this.errorMessage.set(
            'No se han podido cargar los proyectos.'
          );

          this.loading.set(false);
        }

      });
  }
}