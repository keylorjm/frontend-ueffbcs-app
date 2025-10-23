// src/app/components/anio-lectivo-admin/anio-lectivo-admin.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AnioLectivoService, AnioLectivo } from '../../services/anio-lectivo.service';

@Component({
  selector: 'app-anio-lectivo-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule
  ],
  template: `
  <mat-card class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold">Gestión de Años Lectivos</h2>
      <button mat-raised-button color="primary" (click)="recargar()" [disabled]="isBusy()">
        <mat-icon>refresh</mat-icon>
        Recargar
      </button>
    </div>

    <!-- FORMULARIO -->
    <form class="grid md:grid-cols-4 gap-4 items-end mb-6" [formGroup]="form" (ngSubmit)="guardar()">
      <mat-form-field appearance="outline">
        <mat-label>Nombre</mat-label>
        <input matInput formControlName="nombre" placeholder="Ej: 2025 - 2026" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Año Inicio</mat-label>
        <input matInput type="number" formControlName="anioInicio" placeholder="2025" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Año Fin</mat-label>
        <input matInput type="number" formControlName="anioFin" placeholder="2026" />
      </mat-form-field>

      <div class="flex gap-2">
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || isBusy()">
          <mat-icon>save</mat-icon>
          {{ editId() ? 'Actualizar' : 'Crear' }}
        </button>
        <button mat-button type="button" (click)="cancelarEdicion()" [disabled]="!editId() || isBusy()">
          Cancelar
        </button>
      </div>
    </form>

    <mat-progress-bar *ngIf="isBusy()" mode="indeterminate"></mat-progress-bar>

    <!-- TABLA -->
    <div class="overflow-auto">
      <table mat-table [dataSource]="items()" class="w-full">
        <!-- Nombre -->
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef> Nombre </th>
          <td mat-cell *matCellDef="let r"> {{ r.nombre }} </td>
        </ng-container>

        <!-- Rango -->
        <ng-container matColumnDef="rango">
          <th mat-header-cell *matHeaderCellDef> Rango </th>
          <td mat-cell *matCellDef="let r">
            {{ r.anioInicio }} — {{ r.anioFin }}
          </td>
        </ng-container>

        <!-- Estado -->
        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef> Estado </th>
          <td mat-cell *matCellDef="let r">
            <span class="px-2 py-1 rounded"
                  [class.bg-green-100]="r.estado"
                  [class.text-green-800]="r.estado"
                  [class.bg-gray-100]="!r.estado"
                  [class.text-gray-800]="!r.estado">
              {{ r.estado ? 'Activo' : 'Inactivo' }}
            </span>
          </td>
        </ng-container>

        <!-- Acciones -->
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef class="text-right"> Acciones </th>
          <td mat-cell *matCellDef="let r" class="text-right">
            <button mat-icon-button color="primary" (click)="editar(r)" [disabled]="isBusy()">
              <mat-icon>edit</mat-icon>
            </button>

            <button mat-icon-button color="warn" (click)="eliminar(r)" [disabled]="isBusy()">
              <mat-icon>delete</mat-icon>
            </button>

            <button mat-raised-button color="accent" class="ml-2"
                    (click)="marcarComoActual(r)" [disabled]="isBusy() || r.estado">
              <mat-icon>check_circle</mat-icon>
              Marcar actual
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>
    </div>
  </mat-card>
  `,
  styles: [`
    :host { display:block; }
    table { min-width: 700px; }
  `]
})
export class AnioLectivoAdminComponent implements OnInit {
  private readonly svc = inject(AnioLectivoService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);

  isBusy = signal(false);
  items = signal<AnioLectivo[]>([]);
  editId = signal<string | null>(null);

  displayedColumns = ['nombre', 'rango', 'estado', 'acciones'];

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(4)]],
    anioInicio: ['', [Validators.required]],
    anioFin: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  recargar(): void {
    this.cargar(true);
  }

  private cargar(showSnack = false): void {
    this.isBusy.set(true);
    this.svc.getAll().subscribe({
      next: (rows) => {
        this.items.set(rows ?? []);
        if (showSnack) this.snack.open('Datos actualizados', 'OK', { duration: 1500 });
        this.isBusy.set(false);
      },
      error: (e) => {
        this.isBusy.set(false);
        this.snack.open(e?.error?.message || 'Error cargando años lectivos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  editar(r: AnioLectivo): void {
    this.editId.set(r._id ?? r.uid ?? null);
    this.form.patchValue({
      nombre: r.nombre,
      anioInicio: String(r.fechaInicio),
      anioFin: String(r.fechaFin),
    });
  }

  cancelarEdicion(): void {
    this.editId.set(null);
    this.form.reset();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snack.open('Complete todos los campos.', 'Cerrar', { duration: 2000 });
      return;
    }

    const payload = {
      nombre: String(this.form.value.nombre),
      anioInicio: Number(this.form.value.anioInicio),
      anioFin: Number(this.form.value.anioFin),
      estado: false, // por defecto inactivo
    };

    this.isBusy.set(true);
    const id = this.editId();

    const obs = id
      ? this.svc.update(id, payload)
      : this.svc.create(payload);

    obs.subscribe({
      next: () => {
        this.snack.open(id ? 'Año lectivo actualizado' : 'Año lectivo creado', 'OK', { duration: 1500 });
        this.cancelarEdicion();
        this.cargar();
      },
      error: (e) => {
        this.isBusy.set(false);
        this.snack.open(e?.error?.message || 'Error guardando', 'Cerrar', { duration: 3000 });
      }
    });
  }

  eliminar(r: AnioLectivo): void {
    if (!confirm(`¿Eliminar el año lectivo "${r.nombre}"?`)) return;
    this.isBusy.set(true);
    this.svc.delete(r._id ?? r.uid ?? '').subscribe({
      next: () => {
        this.snack.open('Eliminado', 'OK', { duration: 1500 });
        this.cargar();
      },
      error: (e) => {
        this.isBusy.set(false);
        this.snack.open(e?.error?.message || 'Error eliminando', 'Cerrar', { duration: 3000 });
      }
    });
  }

  /**
   * 🔥 Marca un año lectivo como actual y desactiva los demás.
   */
  marcarComoActual(r: AnioLectivo): void {
    if (r.estado) return;
    this.isBusy.set(true);

    // Paso 1: Desactivar todos los demás
    const otros = this.items().filter(x => (x._id ?? x.uid) !== (r._id ?? r.uid));
    const desactivar = otros.map(o =>
      this.svc.update(o._id ?? o.uid ?? '', { estado: false })
    );

    // Paso 2: Activar el seleccionado
    const activar = this.svc.update(r._id ?? r.uid ?? '', { estado: true });

    Promise.all([...desactivar.map(obs => obs.toPromise()), activar.toPromise()])
      .then(() => {
        this.snack.open(`"${r.nombre}" marcado como actual`, 'OK', { duration: 1500 });
        this.cargar();
      })
      .catch((e) => {
        this.snack.open(e?.error?.message || 'Error al marcar como actual', 'Cerrar', { duration: 3000 });
        this.isBusy.set(false);
      });
  }
}
