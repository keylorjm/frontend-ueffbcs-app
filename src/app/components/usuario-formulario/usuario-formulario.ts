import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Usuario, ROLES_DISPONIBLES, UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-usuario-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar Usuario' : 'Crear Usuario' }}</h2>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form">
      <!-- Nombre -->
      <mat-form-field appearance="outline" class="field">
        <mat-label>Nombre</mat-label>
        <input matInput formControlName="nombre" />
        <mat-error *ngIf="form.controls['nombre'].hasError('required')">
          El nombre es obligatorio
        </mat-error>
      </mat-form-field>

      <!-- Cédula -->
      <mat-form-field appearance="outline" class="field">
        <mat-label>Cédula</mat-label>
        <input matInput formControlName="cedula" />
        <mat-hint>8 a 13 dígitos</mat-hint>
        <mat-error *ngIf="form.controls['cedula'].hasError('required')">
          La cédula es obligatoria
        </mat-error>
        <mat-error *ngIf="form.controls['cedula'].hasError('pattern')">
          Formato inválido: solo números (8–13 dígitos)
        </mat-error>
      </mat-form-field>

      <!-- Correo -->
      <mat-form-field appearance="outline" class="field">
        <mat-label>Correo</mat-label>
        <input matInput formControlName="correo" />
        <mat-error *ngIf="form.controls['correo'].hasError('required')">
          El correo es obligatorio
        </mat-error>
        <mat-error *ngIf="form.controls['correo'].hasError('email')">
          Correo inválido
        </mat-error>
      </mat-form-field>

      <!-- Rol -->
      <mat-form-field appearance="outline" class="field">
        <mat-label>Rol</mat-label>
        <mat-select formControlName="rol">
          <mat-option *ngFor="let r of roles" [value]="r.value">{{ r.viewValue }}</mat-option>
        </mat-select>
        <mat-error *ngIf="form.controls['rol'].hasError('required')">
          El rol es obligatorio
        </mat-error>
      </mat-form-field>

      <!-- Clave -->
      <mat-form-field appearance="outline" class="field">
        <mat-label>{{ isEdit ? 'Cambiar clave (opcional)' : 'Clave' }}</mat-label>
        <input matInput [type]="showPass ? 'text' : 'password'" formControlName="clave" />
        <button mat-icon-button matSuffix type="button" (click)="showPass = !showPass">
          <mat-icon>{{ showPass ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
        <mat-hint *ngIf="isEdit">Dejar en blanco para mantener la actual</mat-hint>
        <mat-error *ngIf="form.controls['clave'].hasError('required') && !isEdit">
          La clave es obligatoria
        </mat-error>
        <mat-error *ngIf="form.controls['clave'].hasError('minlength')">
          Mínimo 6 caracteres
        </mat-error>
      </mat-form-field>

      <div class="actions">
        <button mat-stroked-button type="button" (click)="close()">Cancelar</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving">
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .form { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
    .field { width: 100%; }
    .actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    @media (max-width: 720px) { .form { grid-template-columns: 1fr; } }
  `]
})
export class UsuarioFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(UsuarioService);
  private snack = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<UsuarioFormularioComponent>);
  constructor(@Inject(MAT_DIALOG_DATA) public data: Usuario | null) {}

  form!: FormGroup;
  isEdit = false;
  saving = false;
  showPass = false;

  roles = ROLES_DISPONIBLES;

  ngOnInit(): void {
    this.isEdit = !!this.data;

    this.form = this.fb.group({
      nombre: [this.data?.nombre ?? '', [Validators.required]],
      cedula: [this.data?.cedula ?? '', [Validators.required, Validators.pattern(/^\d{8,13}$/)]],
      correo: [this.data?.correo ?? '', [Validators.required, Validators.email]],
      rol:    [this.data?.rol ?? 'profesor', [Validators.required]],
      // Clave: requerida en crear, opcional en editar
      clave:  ['',
        this.isEdit
          ? [Validators.minLength(6)]
          : [Validators.required, Validators.minLength(6)]
      ],
    });
  }

  close(ok = false) {
    this.dialogRef.close(ok);
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;

    const { nombre, cedula, correo, rol, clave } = this.form.value;

    if (this.isEdit && this.data?._id) {
      // En edición: si clave viene vacía, no la enviamos (backend no la cambia)
      const payload: Partial<Usuario> = { nombre, cedula, correo, rol };
      if (clave && String(clave).trim().length >= 6) {
        (payload as any).clave = clave;
      }

      this.api.update(this.data._id, payload).subscribe({
        next: () => {
          this.snack.open('Usuario actualizado correctamente', 'Cerrar', { duration: 2500 });
          this.saving = false;
          this.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.handleError(err);
        },
      });
    } else {
      // Crear: clave obligatoria
      const payload: Usuario = {
        _id: '', // backend asigna
        nombre,
        cedula,
        correo,
        rol,
        clave,
      };

      this.api.create(payload).subscribe({
        next: () => {
          this.snack.open('Usuario creado correctamente', 'Cerrar', { duration: 2500 });
          this.saving = false;
          this.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.handleError(err);
        },
      });
    }
  }

  private handleError(err: any) {
    console.error('Error guardando usuario:', err);

    // Mensajes comunes de duplicado (Mongo unique)
    const message: string =
      err?.error?.msg ||
      err?.error?.message ||
      (typeof err?.error === 'string' ? err.error : '') ||
      'Error al guardar.';

    if (/cedula/i.test(message)) {
      this.snack.open('La cédula ya está registrada.', 'Cerrar', { duration: 3500 });
      return;
    }
    if (/correo|email/i.test(message)) {
      this.snack.open('El correo ya está registrado.', 'Cerrar', { duration: 3500 });
      return;
    }
    if (/duplicate key/i.test(message)) {
      // Buscar la clave duplicada en el mensaje
      const duplicated = /dup key.*\{.*: "?([^"}]+)"?\}/i.exec(message)?.[1];
      const field = /cedula/.test(message) ? 'cédula' : /correo|email/.test(message) ? 'correo' : 'algún campo único';
      this.snack.open(`Duplicado: ${field}${duplicated ? ` (${duplicated})` : ''}.`, 'Cerrar', { duration: 4000 });
      return;
    }

    this.snack.open(message, 'Cerrar', { duration: 4000 });
  }
}
