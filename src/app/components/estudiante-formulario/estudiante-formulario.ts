// src/app/components/estudiante-formulario/estudiante-formulario.component.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Estudiante, EstudianteService } from '../../services/estudiante.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-estudiante-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar Estudiante' : 'Crear Estudiante' }}</h2>
    
    <form [formGroup]="estudianteForm" (ngSubmit)="guardar()" class="form-container">
      <mat-dialog-content>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre Completo</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej: Juan Pérez">
          <mat-error *ngIf="estudianteForm.get('nombre')?.hasError('required')">
            El nombre es obligatorio.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Correo Electrónico</mat-label>
          <input matInput formControlName="email" placeholder="Ej: juan.perez@clase.com">
          <mat-error *ngIf="estudianteForm.get('email')?.hasError('required')">
            El correo es obligatorio.
          </mat-error>
          <mat-error *ngIf="estudianteForm.get('email')?.hasError('email')">
            El formato del correo no es válido.
          </mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Cédula</mat-label>
          <input matInput formControlName="cedula" placeholder="Ej: 1712345678">
          <mat-error *ngIf="estudianteForm.get('cedula')?.hasError('required')">
            La cédula es obligatoria.
          </mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Celular</mat-label>
          <input matInput formControlName="celular" placeholder="Ej: 0998765432">
          <mat-error *ngIf="estudianteForm.get('celular')?.hasError('required')">
            El celular es obligatorio.
          </mat-error>
        </mat-form-field>

      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancelar</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="estudianteForm.invalid">
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
export class EstudianteFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private estudianteService = inject(EstudianteService);
  private snackBar = inject(MatSnackBar);
  
  private dialogRef: MatDialogRef<EstudianteFormularioComponent> = inject(MatDialogRef); 
  public data: Estudiante | undefined = inject(MAT_DIALOG_DATA, { optional: true }); 

  // 🛑 NUEVOS CONTROLES AÑADIDOS
  public estudianteForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    cedula: ['', Validators.required], 
    celular: ['', Validators.required], 
  });

  ngOnInit(): void {
    if (this.data) {
      this.estudianteForm.patchValue(this.data);
    }
  }

  guardar(): void {
    if (this.estudianteForm.invalid) {
      this.estudianteForm.markAllAsTouched();
      return;
    }

    const estudianteData: Estudiante = this.estudianteForm.value;
    
    const saveObservable = this.data && this.data.uid
      ? this.estudianteService.update(this.data.uid, estudianteData) 
      : this.estudianteService.create(estudianteData);             

    saveObservable.subscribe({
      next: () => {
        const msg = this.data ? 'Estudiante actualizado con éxito.' : 'Estudiante creado con éxito.';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true); 
      },
      error: (err) => {
        const errorMsg = err.error?.msg || 'Error al guardar el estudiante.';
        this.snackBar.open(errorMsg, 'Cerrar', { duration: 5000 });
        console.error('Error al guardar:', err);
      }
    });
  }
}