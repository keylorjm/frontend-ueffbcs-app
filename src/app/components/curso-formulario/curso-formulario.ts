import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Añadido MatSnackBarModule
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; 
import { MatOptionModule } from '@angular/material/core'; // Añadido MatOptionModule

import { Curso, CursoService,  } from '../../services/curso.service';
import { UsuarioService } from '../../services/usuario.service';
import { Materia, MateriaService } from '../../services/materia.service';
import { Estudiante, EstudianteService } from '../../services/estudiante.service';
import { Observable, BehaviorSubject, of, forkJoin } from 'rxjs'; // Importación completa
import { catchError } from 'rxjs/operators'; // Importación necesaria

// Interfaz Temporal más robusta para manejar objetos populados con _id o uid
interface RelacionItem {
    uid?: string;
    _id?: string;
}

@Component({
  selector: 'app-curso-formulario',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatOptionModule // Aseguramos que todos estén importados
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar Curso' : 'Crear Curso' }}</h2>
    
    <div *ngIf="isLoading$ | async" class="loading-overlay">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Cargando datos y opciones...</p>
    </div>

    <form *ngIf="!(isLoading$ | async)" [formGroup]="cursoForm" (ngSubmit)="guardar()" class="form-container">
      <mat-dialog-content>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del Curso</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej: 1er Bachillerato - A">
          <mat-error *ngIf="cursoForm.get('nombre')?.hasError('required')">
            El nombre es obligatorio.
          </mat-error>
        </mat-form-field>

        <!-- 1. SELECT: Profesor Tutor (Unico) -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Profesor Tutor</mat-label>
          <mat-select formControlName="profesorTutor" required>
            <!-- Usamos prof._id como valor -->
            <mat-option *ngFor="let prof of profesores" [value]="prof._id">
              {{ prof.nombre }} {{ prof.apellido || '' }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="cursoForm.get('profesorTutor')?.hasError('required')">
            Debe seleccionar un profesor tutor.
          </mat-error>
        </mat-form-field>

        <!-- 2. SELECT: Materias (Múltiple) -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Materias Asignadas</mat-label>
          <mat-select formControlName="materias" multiple>
            <!-- Usamos mat.uid como valor -->
            <mat-option *ngFor="let mat of todasMaterias" [value]="mat.uid">
              {{ mat.nombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- 3. SELECT: Estudiantes (Múltiple) -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Estudiantes</mat-label>
          <mat-select formControlName="estudiantes" multiple>
            <!-- Usamos est.uid como valor -->
            <mat-option *ngFor="let est of todosEstudiantes" [value]="est.uid">
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
    .full-width { width: 100%; margin-bottom: 10px; }
    .loading-overlay { 
      min-height: 300px; 
      display: flex; 
      flex-direction: column; 
      justify-content: center; 
      align-items: center; 
    }
  `]
})
export class CursoFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cursoService = inject(CursoService);
  private usuarioService = inject(UsuarioService);
  private materiaService = inject(MateriaService);
  private estudianteService = inject(EstudianteService);
  private snackBar = inject(MatSnackBar);
  
  private dialogRef: MatDialogRef<CursoFormularioComponent> | null = inject(MatDialogRef, { optional: true }); 
  public data: Curso | undefined = inject(MAT_DIALOG_DATA, { optional: true }); 

  public cursoForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    // Aseguramos que el profesorTutor sea el ID (string)
    profesorTutor: ['', Validators.required],
    // Aseguramos que las relaciones sean arrays de IDs (string[])
    materias: [[]], 
    estudiantes: [[]]
  });

  public profesores: any[] = [];
  public todasMaterias: Materia[] = [];
  public todosEstudiantes: Estudiante[] = [];
  
  private isLoading$$ = new BehaviorSubject<boolean>(true);
  public isLoading$ = this.isLoading$$.asObservable();

  ngOnInit(): void {
    if (!this.dialogRef) {
      console.warn("ADVERTENCIA: CursoFormularioComponent debe usarse dentro de un MatDialog.");
    }
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading$$.next(true);

    // Utilizamos forkJoin para cargar todas las listas de selección a la vez
    forkJoin([
      this.usuarioService.getProfesores(),
      this.materiaService.getAll(),
      this.estudianteService.getAll()
    ]).pipe(
      catchError(err => {
        this.snackBar.open('Error al cargar opciones (profesores, materias o estudiantes).', 'Cerrar', { duration: 5000 });
        console.error('Error forkJoin:', err);
        this.isLoading$$.next(false);
        return of([[], [], []]);
      })
    ).subscribe(([profesores, materias, estudiantes]) => {
      this.profesores = profesores;
      this.todasMaterias = materias;
      this.todosEstudiantes = estudiantes;

      // 🛑 CLAVE: Una vez que las opciones están disponibles, inicializamos el formulario con los datos existentes
      if (this.data) {
        this.inicializarFormularioEdicion();
      }

      this.isLoading$$.next(false);
    });
  }

  /**
   * Función de ayuda para extraer el ID de un elemento de relación, 
   * manejando IDs como string (sin poblar) o como objetos (poblados).
   */
  private extractRelationId(item: RelacionItem | string | undefined | null): string | undefined {
    if (typeof item === 'string') {
        return item; // Es un ID sin poblar (string)
    }
    if (item) {
        // Es un objeto poblado. Priorizamos UID (usado en el mat-select) o _id.
        return item.uid || item._id; 
    }
    return undefined;
  }
  
  inicializarFormularioEdicion(): void {
    if (!this.data) return;

    // 1. Profesor Tutor ID (Maneja string o el objeto populado con .uid o _id)
    const tutorObject = this.data.profesorTutor as any; 
    
    const tutorId = typeof this.data.profesorTutor === 'string' 
      ? this.data.profesorTutor
      // El mat-select para profesores usa prof._id, por lo tanto, priorizamos _id
      : tutorObject._id ?? tutorObject.uid; 

    // 2. Materias IDs: Utilizamos la nueva función de extracción para obtener todos los IDs.
    const materiasIds = (this.data.materias as (RelacionItem | string)[] ?? [])
      // Mapeamos usando la función que maneja strings y objetos.
      .map(this.extractRelationId) 
      .filter(id => !!id) as string[]; // Aseguramos que solo haya strings válidos

    // 3. Estudiantes IDs: Utilizamos la nueva función de extracción.
    const estudiantesIds = (this.data.estudiantes as (RelacionItem | string)[] ?? [])
      // Mapeamos usando la función que maneja strings y objetos.
      .map(this.extractRelationId)
      .filter(id => !!id) as string[]; // Aseguramos que solo haya strings válidos

    // Asignamos los valores preexistentes al formulario
    this.cursoForm.patchValue({
      nombre: this.data.nombre,
      // Debe coincidir con el valor de la opción (prof._id)
      profesorTutor: tutorId ?? '', 
      materias: materiasIds ?? [], 
      estudiantes: estudiantesIds ?? []
    });
  }

  guardar(): void {
    if (this.cursoForm.invalid) {
      this.cursoForm.markAllAsTouched();
      this.snackBar.open('Por favor, complete todos los campos requeridos.', 'Cerrar', { duration: 3000 });
      return;
    }

    const formValue = this.cursoForm.value;
    
    // La data enviada al servicio debe consistir solo en IDs
    const cursoData: Partial<Curso> = {
        nombre: formValue.nombre,
        profesorTutor: formValue.profesorTutor, // ID (_id)
        materias: formValue.materias, // Array de IDs (uid/ObjectId)
        estudiantes: formValue.estudiantes // Array de IDs (uid/ObjectId)
    };
    
    const saveObservable = this.data && this.data.uid
      ? this.cursoService.update(this.data.uid, cursoData) 
      : this.cursoService.create(cursoData);             

    saveObservable.subscribe({
      next: () => {
        const msg = this.data ? 'Curso actualizado con éxito.' : 'Curso creado con éxito.';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        this.dialogRef?.close(true); 
      },
      error: (err) => {
        const errorMsg = err.error?.msg || 'Error al guardar el curso. Revise la consola.';
        this.snackBar.open(errorMsg, 'Cerrar', { duration: 5000 });
        console.error('Error al guardar el curso:', err);
      }
    });
  }
}
