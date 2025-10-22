// src/app/components/usuarios/usuario-formulario/usuario-formulario.component.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Usuario, UsuarioService, ROLES_DISPONIBLES } from '../../services/usuario.service'; 

@Component({
  selector: 'app-usuario-formulario',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatSelectModule, 
    MatButtonModule,
    MatDialogModule 
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar Usuario' : 'Crear Usuario' }}</h2>
    <form [formGroup]="usuarioForm" (ngSubmit)="guardar()" class="form-container">
      <mat-dialog-content>

        <mat-form-field appearance="outline">
          <mat-label>Nombre Completo</mat-label>
          <input matInput formControlName="nombre" required>
          <mat-error *ngIf="usuarioForm.get('nombre')?.invalid && usuarioForm.get('nombre')?.touched">
            El nombre es obligatorio.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Correo Electrónico</mat-label>
          <input matInput formControlName="correo" type="email" required>
          <mat-error *ngIf="usuarioForm.get('correo')?.invalid && usuarioForm.get('correo')?.touched">
            Ingrese un correo válido.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" *ngIf="!data">
          <mat-label>Contraseña</mat-label>
          <input matInput formControlName="clave" type="password" [required]="!data">
          <mat-error *ngIf="usuarioForm.get('clave')?.invalid && usuarioForm.get('clave')?.touched">
            La contraseña es obligatoria.
          </mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="rol" required>
            <mat-option *ngFor="let rol of roles" [value]="rol.value">
              {{ rol.viewValue }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="usuarioForm.get('rol')?.invalid && usuarioForm.get('rol')?.touched">
            El rol es obligatorio.
          </mat-error>
        </mat-form-field>
        
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cancelar</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="usuarioForm.invalid">
          {{ data ? 'Guardar Cambios' : 'Crear Usuario' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      min-width: 400px;
    }
    mat-form-field {
      width: 100%;
      margin-bottom: 10px;
    }
  `]
})
export class UsuarioFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usuarioService = inject(UsuarioService);
  private snackBar = inject(MatSnackBar);
  
  public dialogRef: MatDialogRef<UsuarioFormularioComponent> | null = 
    inject(MatDialogRef, { optional: true }); 
  
  public data: Usuario | null = inject(MAT_DIALOG_DATA, { optional: true });

  usuarioForm!: FormGroup;
  roles = ROLES_DISPONIBLES;

  ngOnInit(): void {
    const isEdit = !!this.data;

    this.usuarioForm = this.fb.group({
      nombre: [this.data?.nombre || '', Validators.required],
      correo: [this.data?.correo || '', [Validators.required, Validators.email]],
      // Solo pedimos la clave en la creación. En edición, se envía un objeto sin clave.
      clave: ['', isEdit ? [] : Validators.required], 
      rol: [this.data?.rol || 'estudiante', Validators.required]
    });
  }

  guardar(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    const userData = this.usuarioForm.value;
    
    // Si estamos editando, eliminamos la clave si no fue modificada
    if (this.data && !userData.clave) {
      delete userData.clave;
    }

    const operation$ = this.data
      ? this.usuarioService.update(this.data._id, userData)
      : this.usuarioService.create(userData);

    operation$.subscribe({
      next: () => {
        const message = this.data ? 'Usuario actualizado con éxito.' : 'Usuario creado con éxito.';
        this.snackBar.open(message, 'Cerrar', { duration: 3000 });
        
        if (this.dialogRef) {
            this.dialogRef.close(true);
        }
      },
      error: (err) => {
        let errorMessage = 'Error al guardar el usuario.';
        // Mostrar mensaje de error más específico si el backend lo proporciona
        if (err.error && err.error.error) {
            errorMessage += ` Detalle: ${err.error.error}`;
        }
        this.snackBar.open(errorMessage, 'Cerrar', { duration: 7000 });
        console.error(err);
      }
    });
  }
}