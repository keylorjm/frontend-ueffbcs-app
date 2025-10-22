import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { catchError, switchMap, tap, map, finalize, timeout, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Curso, CursoService } from '../../services/curso.service';
import { CursoFormularioComponent } from '../curso-formulario/curso-formulario';
import { CursoDetalleComponent } from '../curso-detalle-component/curso-detalle-component'; // 🛑 1. IMPORTAR DETALLES
import { UsuarioService } from '../../services/usuario.service';

// Definición mínima de Usuario/Profesor.
export interface ProfesorCompleto {
  _id: string;
  nombre: string;
  apellido?: string;
}

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  template: `
    <div class="p-6">
      <mat-card class="shadow-lg rounded-xl">
        <mat-card-header class="flex justify-between items-center p-4">
          <mat-card-title class="text-2xl font-bold text-gray-800">
            Gestión de Cursos
          </mat-card-title>
          <button mat-flat-button color="primary" (click)="abrirFormulario()">
            <mat-icon>add</mat-icon>
            Nuevo Curso
          </button>
        </mat-card-header>

        <mat-card-content class="mt-4 relative min-h-[200px]">
          <!-- Spinner de Carga (Posición discreta y más pequeño) -->
          <div *ngIf="isLoading$ | async" class="absolute top-4 right-4 z-20">
            <mat-spinner diameter="30" color="primary"></mat-spinner>
          </div>

          <!-- Contenido de la Tabla -->
          <div *ngIf="dataSource$ | async as cursos">
            <!-- Mensaje de Sin Datos -->
            <div
              *ngIf="cursos.length === 0 && !(isLoading$ | async)"
              class="p-8 text-center text-gray-500"
            >
              <p class="text-lg">No hay cursos registrados todavía.</p>
              <p>Usa el botón "Nuevo Curso" para empezar.</p>
            </div>

            <!-- Tabla de Cursos -->
            <table
              mat-table
              [dataSource]="cursos"
              class="w-full shadow-md rounded-lg overflow-hidden"
              *ngIf="cursos.length > 0"
            >
              <!-- Columna: Nombre -->
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let element">
                  <span class="font-medium text-gray-900">{{ element.nombre }}</span>
                </td>
              </ng-container>

              <!-- Columna: Profesor Tutor (Muestra el nombre enriquecido) -->
              <ng-container matColumnDef="profesorTutor">
                <th mat-header-cell *matHeaderCellDef>Tutor</th>
                <td mat-cell *matCellDef="let element">
                  <span
                    *ngIf="element.profesorTutor as tutor; else noTutor"
                    class="font-medium text-gray-700"
                  >
                    {{ tutor.nombre }}
                  </span>
                  <ng-template #noTutor> N/A </ng-template>
                </td>
              </ng-container>

              <!-- Columna: Materias (Conteo) -->
              <ng-container matColumnDef="materias">
                <th mat-header-cell *matHeaderCellDef>Materias</th>
                <td mat-cell *matCellDef="let element">
                  {{ element.materias?.length || 0 }}
                </td>
              </ng-container>

              <!-- Columna: Estudiantes (Conteo) -->
              <ng-container matColumnDef="estudiantes">
                <th mat-header-cell *matHeaderCellDef>Estudiantes</th>
                <td mat-cell *matCellDef="let element">
                  {{ element.estudiantes?.length || 0 }}
                </td>
              </ng-container>

              <!-- Columna: Acciones -->
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let element">
                  <!-- Botón VER (abre abrirDetalles) -->
                  <button
                    mat-icon-button
                    color="primary"
                    (click)="abrirDetalles(element)"
                    matTooltip="Ver detalle del curso"
                  >
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    color="accent"
                    (click)="abrirFormulario(element)"
                    [disabled]="!element.uid"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    color="warn"
                    (click)="eliminarCurso(element)"
                    [disabled]="!element.uid"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columnasVisibles"></tr>
              <tr mat-row *matRowDef="let row; columns: columnasVisibles"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .mat-mdc-table {
        border-collapse: separate;
        border-spacing: 0 8px;
      }
      .mat-mdc-row {
        background: #ffffff;
        border-radius: 8px;
        transition: box-shadow 0.2s;
      }
      .mat-mdc-row:hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      .mat-mdc-header-cell {
        font-weight: 600;
        color: #4a5568;
        font-size: 0.9rem;
      }
      /* Ajuste para spinner superpuesto */
      mat-card-content {
        position: relative;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CursosComponent implements OnInit {
  private dialog = inject(MatDialog);
  private cursoService = inject(CursoService);
  private usuarioService = inject(UsuarioService);
  private cdr = inject(ChangeDetectorRef);

  // Loading
  public isLoading$$ = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoading$$.asObservable();

  // Trigger de recarga
  public reload$$ = new BehaviorSubject<void>(undefined);

  // Fuente de datos
  public dataSource$: Observable<Curso[]> = new Observable<Curso[]>();

  public columnasVisibles: string[] = [
    'nombre',
    'profesorTutor',
    'materias',
    'estudiantes',
    'acciones',
  ];
  constructor(private router: Router) {}
  ngOnInit(): void {
    this.dataSource$ = this.reload$$.pipe(
      // Encender spinner y marcar para chequeo (OnPush)
      tap(() => {
        this.isLoading$$.next(true);
        this.cdr.markForCheck();
      }),
      switchMap(() =>
        forkJoin({
          cursos: this.cursoService.getAll().pipe(
            timeout(5000),
            catchError((err) => {
              console.error('Error al obtener cursos o timeout:', err);
              return of([] as Curso[]);
            })
          ),
          profesores: this.usuarioService.getProfesores().pipe(
            timeout(5000),
            catchError((err) => {
              console.error('Error al obtener profesores o timeout:', err);
              return of([] as ProfesorCompleto[]);
            })
          ),
        }).pipe(
          map(({ cursos, profesores }) => {
            const profesorMap = new Map<string, ProfesorCompleto>();
            (profesores || []).forEach((p) => profesorMap.set(p._id, p));

            const cursosEnriquecidos: Curso[] = (cursos || []).map((curso) => {
              let profesorId: string | undefined;

              if (typeof curso.profesorTutor === 'string') {
                profesorId = curso.profesorTutor;
              } else if ((curso.profesorTutor as ProfesorCompleto)?._id) {
                profesorId = (curso.profesorTutor as ProfesorCompleto)._id;
              }

              const profesorCompleto = profesorId ? profesorMap.get(profesorId) : undefined;

              return {
                ...curso,
                // Asignamos el objeto completo del profesor para la tabla
                profesorTutor: profesorCompleto || curso.profesorTutor,
              } as Curso;
            });

            return cursosEnriquecidos;
          }),
          catchError((err) => {
            console.error('❌ ERROR al combinar datos de cursos y profesores.', err);
            return of([] as Curso[]);
          }),
          finalize(() => {
            // Apagar spinner siempre (éxito o error)
            this.isLoading$$.next(false);
            this.cdr.markForCheck();
          }),
          // Opcional: compartir la última emisión si hay múltiples suscriptores
          shareReplay(1)
        )
      )
    );

    // Dispara la carga inicial
    this.reload$$.next();
  }

  abrirDetalles(element: any): void {
    const id = element?._id ?? element?.uid ?? element?.id ?? null;

    // Debug opcional
    // console.log('abrirDetalles -> element:', element, 'id:', id);

    if (!id) {
      console.error('No hay ID de curso para cargar detalles.');
      return;
    }
    this.router.navigate(['/app/curso-detalle', id]); // cambia el prefijo si no usas /app
  }

  abrirFormulario(curso?: Curso): void {
    const dialogRef = this.dialog.open(CursoFormularioComponent, {
      width: '600px',
      data: curso, // modo edición si viene curso
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.reload$$.next();
      }
    });
  }

  eliminarCurso(curso: Curso): void {
    if (!curso.uid) {
      console.error('No se pudo eliminar: ID de curso no definido.');
      return;
    }

    if (confirm(`¿Estás seguro de eliminar el curso ${curso.nombre}?`)) {
      this.cursoService.delete(curso.uid).subscribe({
        next: () => {
          console.log(`Curso ${curso.nombre} eliminado.`);
          this.reload$$.next();
        },
        error: (err) => {
          console.error('Error al eliminar curso:', err);
        },
      });
    }
  }
}
