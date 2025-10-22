// src/app/components/materia-formulario/materia-formulario.component.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select'; // 🛑 Para el dropdown de profesores

import { Materia, MateriaService, Profesor } from '../../services/materia.service'; // Importar Materia y Profesor
import { Usuario, UsuarioService } from '../../services/usuario.service'; // Importar el nuevo servicio de Usuario
import { Observable, BehaviorSubject, of, Subscription } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'app-materia-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule // 🛑 Añadir MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar Materia' : 'Crear Materia' }}</h2>
    
    <form [formGroup]="materiaForm" (ngSubmit)="guardar()" class="form-container">
      <mat-dialog-content>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre de la Materia</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej: Matemáticas Avanzadas">
          <mat-error *ngIf="materiaForm.get('nombre')?.hasError('required')">
            El nombre es obligatorio.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcion" placeholder="Ej: Estudio de cálculo, álgebra lineal..." rows="3"></textarea>
          <mat-error *ngIf="materiaForm.get('descripcion')?.hasError('required')">
            La descripción es obligatoria.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Profesor</mat-label>
          <mat-select formControlName="profesor" required>
            <mat-option *ngIf="isProfesoresLoading$ | async">Cargando profesores...</mat-option>
            <mat-option *ngIf="!(isProfesoresLoading$ | async) && profesores.length === 0">No hay profesores disponibles</mat-option>
            <mat-option *ngFor="let prof of profesores" [value]="prof._id">
              {{ prof.nombre }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="materiaForm.get('profesor')?.hasError('required')">
            Debe seleccionar un profesor.
          </mat-error>
        </mat-form-field>

      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancelar</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="materiaForm.invalid || (isProfesoresLoading$ | async)">
          <mat-icon>{{ data ? 'save' : 'add' }}</mat-icon>
          {{ data ? 'Guardar Cambios' : 'Crear' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
    }
    .full-width {
      width: 100%;
      margin-bottom: 10px;
    }
  `]
})
export class MateriaFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private materiaService = inject(MateriaService);
  private usuarioService = inject(UsuarioService); // Inyectar el nuevo servicio
  private snackBar = inject(MatSnackBar);
  
  private dialogRef: MatDialogRef<MateriaFormularioComponent> = inject(MatDialogRef); 
  public data: Materia | undefined = inject(MAT_DIALOG_DATA, { optional: true }); 

  public materiaForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    profesor: ['', Validators.required], // Almacenará el UID del profesor
  });

  public profesores: Usuario[] = [];
  private profesoresLoading$$ = new BehaviorSubject<boolean>(true);
  public isProfesoresLoading$ = this.profesoresLoading$$.asObservable();
  private profesoresSubscription: Subscription | undefined;

  ngOnInit(): void {
    this.cargarProfesores();

    if (this.data) {
      this.materiaForm.patchValue({
        nombre: this.data.nombre,
        descripcion: this.data.descripcion,
       
        profesor: this.data.profesor?._id 
      });
    }
  }

  ngOnDestroy(): void {
    this.profesoresSubscription?.unsubscribe();
  }

  cargarProfesores(): void {
    this.profesoresLoading$$.next(true);
    this.profesoresSubscription = this.usuarioService.getProfesores().pipe(
      tap(profesores => {
        this.profesores = profesores;
        this.profesoresLoading$$.next(false);
      }),
      catchError(err => {
        this.snackBar.open('Error al cargar la lista de profesores.', 'Cerrar', { duration: 5000 });
        this.profesores = [];
        this.profesoresLoading$$.next(false);
        console.error('Error cargando profesores:', err);
        return of([]);
      })
    ).subscribe();
  }

  guardar(): void {
    if (this.materiaForm.invalid) {
      this.materiaForm.markAllAsTouched();
      return;
    }

    // Asegurarse de enviar el UID del profesor, no el objeto completo
    const materiaData: Partial<Materia> = {
        nombre: this.materiaForm.get('nombre')?.value,
        descripcion: this.materiaForm.get('descripcion')?.value,
        profesor: this.materiaForm.get('profesor')?.value // Esto ya es el UID
    };
    
    const saveObservable = this.data && this.data.uid
      ? this.materiaService.update(this.data.uid, materiaData) 
      : this.materiaService.create(materiaData);             

    saveObservable.subscribe({
      next: () => {
        const msg = this.data ? 'Materia actualizada con éxito.' : 'Materia creada con éxito.';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true); 
      },
      error: (err) => {
        const errorMsg = err.error?.msg || 'Error al guardar la materia.';
        this.snackBar.open(errorMsg, 'Cerrar', { duration: 5000 });
        console.error('Error al guardar:', err);
      }
    });
  }
}