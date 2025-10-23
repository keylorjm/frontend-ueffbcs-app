// src/app/components/curso-formulario/curso-formulario.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatOptionModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { Curso, CursoService } from '../../services/curso.service';
import { UsuarioService } from '../../services/usuario.service';
import { Materia, MateriaService } from '../../services/materia.service';
import { Estudiante, EstudianteService } from '../../services/estudiante.service';
import { BehaviorSubject, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnioLectivoService, AnioLectivo } from '../../services/anio-lectivo.service';

@Component({
  selector: 'app-curso-formulario',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatOptionModule,FormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar Curso' : 'Crear Curso' }}</h2>

    <div *ngIf="isLoading$ | async" class="loading-overlay">
      <mat-spinner diameter="50"></mat-spinner>
      <p>Cargando datos...</p>
    </div>

    <form *ngIf="!(isLoading$ | async)" [formGroup]="cursoForm" (ngSubmit)="guardar()" class="form-container">
      <mat-dialog-content>

        <!-- Nombre -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del Curso</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej: 1ro Bachillerato - A">
          <mat-error *ngIf="cursoForm.get('nombre')?.hasError('required')">
            El nombre es obligatorio.
          </mat-error>
        </mat-form-field>

        <!-- Año lectivo -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Año Lectivo</mat-label>
          <mat-select formControlName="anioLectivo" required>
            <mat-option *ngFor="let a of aniosLectivos" [value]="a.uid ?? a._id">
              {{ a.nombre }} ({{ a.fechaInicio }} - {{ a.fechaFin }})
            </mat-option>
          </mat-select>
          <mat-error *ngIf="cursoForm.get('anioLectivo')?.hasError('required')">
            Debe seleccionar un año lectivo.
          </mat-error>
        </mat-form-field>

        <!-- Profesor tutor -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Profesor Tutor</mat-label>
          <mat-select formControlName="profesorTutor" required>
            <mat-option *ngFor="let prof of profesores" [value]="prof._id">
              {{ prof.nombre }} {{ prof.apellido || '' }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="cursoForm.get('profesorTutor')?.hasError('required')">
            Debe seleccionar un profesor tutor.
          </mat-error>
        </mat-form-field>

        <!-- Materias -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Materias Asignadas</mat-label>
          <mat-select formControlName="materias" multiple>
            <mat-option *ngFor="let mat of todasMaterias" [value]="mat.uid ?? mat._id">
              {{ mat.nombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Estudiantes -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Estudiantes</mat-label>
          <mat-select formControlName="estudiantes" multiple>
            <mat-option *ngFor="let est of todosEstudiantes" [value]="est.uid ?? est.uid">
              {{ est.nombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancelar</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="cursoForm.invalid">
          <mat-icon>{{ data ? 'save' : 'add' }}</mat-icon>
          {{ data ? 'Guardar Cambios' : 'Crear Curso' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-container { display: flex; flex-direction: column; }
    .full-width { width: 100%; margin-bottom: 12px; }
    .loading-overlay {
      min-height: 280px;
      display: flex; flex-direction: column;
      justify-content: center; align-items: center;
    }
  `]
})
export class CursoFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cursoService = inject(CursoService);
  private usuarioService = inject(UsuarioService);
  private materiaService = inject(MateriaService);
  private estudianteService = inject(EstudianteService);
  private anioLectivoService = inject(AnioLectivoService);
  private snackBar = inject(MatSnackBar);
  private dialogRef: MatDialogRef<CursoFormularioComponent> | null = inject(MatDialogRef, { optional: true });

  public data: Curso | undefined = inject(MAT_DIALOG_DATA, { optional: true });

  public cursoForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    anioLectivo: ['', Validators.required],
    profesorTutor: ['', Validators.required],
    materias: [[]],
    estudiantes: [[]],
  });

  public profesores: any[] = [];
  public todasMaterias: Materia[] = [];
  public todosEstudiantes: Estudiante[] = [];
  public aniosLectivos: AnioLectivo[] = [];

  private isLoading$$ = new BehaviorSubject<boolean>(true);
  public isLoading$ = this.isLoading$$.asObservable();

  ngOnInit(): void {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.isLoading$$.next(true);

    forkJoin([
      this.usuarioService.getProfesores(),
      this.materiaService.getAll(),
      this.estudianteService.getAll(),
      this.anioLectivoService.getAll()
    ]).pipe(
      catchError(err => {
        console.error('Error cargando datos:', err);
        this.snackBar.open('Error al cargar datos.', 'Cerrar', { duration: 4000 });
        this.isLoading$$.next(false);
        return of([[], [], [], []]);
      })
    ).subscribe(([profesores, materias, estudiantes, aniosLectivos]) => {
      this.profesores = profesores ?? [];
      this.todasMaterias = materias ?? [];
      this.todosEstudiantes = estudiantes ?? [];
      this.aniosLectivos = aniosLectivos ?? [];

      if (this.data) this.inicializarFormularioEdicion();

      this.isLoading$$.next(false);
    });
  }

  private inicializarFormularioEdicion(): void {
    if (!this.data) return;

    const tutorId = typeof this.data.profesorTutor === 'string'
      ? this.data.profesorTutor
      : (this.data.profesorTutor as any)?._id ?? (this.data.profesorTutor as any)?.uid ?? '';

    const materiasIds = (this.data.materias ?? []).map((m: any) => m._id ?? m.uid ?? m);
    const estudiantesIds = (this.data.estudiantes ?? []).map((e: any) => e._id ?? e.uid ?? e);
    const anioLectivoId = (this.data as any).anioLectivo?._id ?? (this.data as any).anioLectivo?.uid ?? '';

    this.cursoForm.patchValue({
      nombre: this.data.nombre ?? '',
      profesorTutor: tutorId,
      materias: materiasIds,
      estudiantes: estudiantesIds,
      anioLectivo: anioLectivoId,
    });
  }

  guardar(): void {
    if (this.cursoForm.invalid) {
      this.cursoForm.markAllAsTouched();
      this.snackBar.open('Complete todos los campos obligatorios.', 'Cerrar', { duration: 3000 });
      return;
    }

    const form = this.cursoForm.value;
    const payload = {
      nombre: String(form.nombre),
      anioLectivo: String(form.anioLectivo),
      profesorTutor: String(form.profesorTutor),
      materias: (form.materias ?? []).map(String),
      estudiantes: (form.estudiantes ?? []).map(String),
    };

    const req$ = this.data && (this.data as any).uid
      ? this.cursoService.update((this.data as any).uid, payload)
      : this.cursoService.create(payload);

    req$.subscribe({
      next: () => {
        const msg = this.data ? 'Curso actualizado con éxito.' : 'Curso creado con éxito.';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        this.dialogRef?.close(true);
      },
      error: (err) => {
        const msg = err?.error?.msg || 'Error al guardar el curso.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
        console.error('Error al guardar curso:', err);
      },
    });
  }
}
