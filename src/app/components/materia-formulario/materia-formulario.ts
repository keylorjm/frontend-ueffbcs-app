// src/app/components/materia-formulario/materia-formulario.component.ts

import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

import { Materia, MateriaService } from '../../services/materia.service';
import { Usuario, UsuarioService } from '../../services/usuario.service';

import { BehaviorSubject, Subscription, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'app-materia-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatOptionModule,
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
          <textarea
            matInput
            formControlName="descripcion"
            placeholder="Ej: Cálculo diferencial e integral, álgebra lineal…"
            rows="3"
          ></textarea>
          <mat-error *ngIf="materiaForm.get('descripcion')?.hasError('required')">
            La descripción es obligatoria.
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Profesor</mat-label>
          <mat-select formControlName="profesor" required>
            <mat-option *ngIf="isProfesoresLoading$ | async">Cargando profesores…</mat-option>
            <mat-option *ngIf="!(isProfesoresLoading$ | async) && profesores.length === 0" [disabled]="true">
              No hay profesores disponibles
            </mat-option>
            <mat-option *ngFor="let prof of profesores" [value]="prof._id">
              {{ prof.nombre }} — {{ prof.correo }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="materiaForm.get('profesor')?.hasError('required')">
            Debe seleccionar un profesor.
          </mat-error>
        </mat-form-field>

      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button
          mat-raised-button
          color="primary"
          type="submit"
          [disabled]="materiaForm.invalid || (isProfesoresLoading$ | async)"
        >
          <mat-icon>{{ data ? 'save' : 'add' }}</mat-icon>
          {{ data ? 'Guardar Cambios' : 'Crear' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-container { display: flex; flex-direction: column; }
    .full-width { width: 100%; margin-bottom: 12px; }
  `]
})
export class MateriaFormularioComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private materiaService = inject(MateriaService);
  private usuarioService = inject(UsuarioService);
  private snackBar = inject(MatSnackBar);
  private dialogRef: MatDialogRef<MateriaFormularioComponent> = inject(MatDialogRef);
  public data: Materia | undefined = inject(MAT_DIALOG_DATA, { optional: true });

  public materiaForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: ['', Validators.required],
    profesor: ['', Validators.required],
  });

  public profesores: Usuario[] = [];
  private profesoresLoading$$ = new BehaviorSubject<boolean>(true);
  public isProfesoresLoading$ = this.profesoresLoading$$.asObservable();
  private profesoresSubscription?: Subscription;

  ngOnInit(): void {
    this.cargarProfesores();

    if (this.data) {
      const profesorId = (this.data as any)?.profesor?._id || (this.data as any)?.profesor || '';
      this.materiaForm.patchValue({
        nombre: this.data.nombre,
        descripcion: this.data.descripcion,
        profesor: profesorId,
      });
    }
  }

  ngOnDestroy(): void {
    this.profesoresSubscription?.unsubscribe();
  }

  private cargarProfesores(): void {
    this.profesoresLoading$$.next(true);
    this.profesoresSubscription = this.usuarioService.getProfesores().pipe(
      tap((profes) => {
        this.profesores = Array.isArray(profes) ? profes : [];
        this.profesoresLoading$$.next(false);
      }),
      catchError((err) => {
        console.error('Error cargando profesores:', err);
        this.snackBar.open('Error al cargar la lista de profesores.', 'Cerrar', { duration: 5000 });
        this.profesores = [];
        this.profesoresLoading$$.next(false);
        return of([]);
      })
    ).subscribe();
  }

  guardar(): void {
    if (this.materiaForm.invalid) {
      this.materiaForm.markAllAsTouched();
      return;
    }

    const nombre = this.materiaForm.get('nombre')?.value ?? '';
    const profesor = this.materiaForm.get('profesor')?.value ?? '';
    const descripcion = this.materiaForm.get('descripcion')?.value ?? '';

    // ✅ garantizamos que 'nombre' y 'profesor' son string antes de pasar al servicio
    const payload = {
      nombre: String(nombre),
      descripcion: descripcion || '',
      profesor: String(profesor),
    };

    const id = (this.data as any)?.uid || (this.data as any)?._id;

    const obs = id
      ? this.materiaService.update(String(id), payload)
      : this.materiaService.create(payload);

    obs.subscribe({
      next: () => {
        const msg = id ? 'Materia actualizada con éxito.' : 'Materia creada con éxito.';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error al guardar materia:', err);
        const backendMsg =
          err?.error?.msg ||
          err?.error?.message ||
          (err?.status === 409 ? 'Nombre de materia duplicado.' : null);

        this.snackBar.open(backendMsg || 'Error al guardar la materia.', 'Cerrar', { duration: 5000 });
      }
    });
  }
}
