import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AnioLectivoService, AnioLectivo } from '../../services/anio-lectivo.service';
import { formatDate } from '@angular/common';

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
      <h2 class="text-xl font-semibold">Años lectivos</h2>
      <button mat-raised-button color="primary" (click)="recargar()" [disabled]="isBusy()">
        <mat-icon>refresh</mat-icon>
        Recargar
      </button>
    </div>

    <form class="grid md:grid-cols-4 gap-4 items-end mb-6" [formGroup]="form" (ngSubmit)="guardar()">
      <mat-form-field appearance="outline">
        <mat-label>Nombre</mat-label>
        <input matInput formControlName="nombre" placeholder="2025 - 2026" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Fecha inicio</mat-label>
        <input matInput type="date" formControlName="fechaInicio" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Fecha fin</mat-label>
        <input matInput type="date" formControlName="fechaFin" />
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
            {{ toDate(r.fechaInicio) | date:'dd/MM/yyyy' }} — {{ toDate(r.fechaFin) | date:'dd/MM/yyyy' }}
          </td>
        </ng-container>

        <!-- Actual -->
        <ng-container matColumnDef="actual">
          <th mat-header-cell *matHeaderCellDef> Actual </th>
          <td mat-cell *matCellDef="let r">
            <span class="px-2 py-1 rounded"
                  [class.bg-green-100]="r.actual"
                  [class.text-green-800]="r.actual"
                  [class.bg-gray-100]="!r.actual"
                  [class.text-gray-800]="!r.actual">
              {{ r.actual ? 'Sí' : 'No' }}
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
                    (click)="marcarComoActual(r)" [disabled]="isBusy() || r.actual">
              <mat-icon>check_circle</mat-icon>
              Actual
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
    table { min-width: 680px; }
  `]
})
export class AnioLectivoAdminComponent implements OnInit {
  private readonly svc = inject(AnioLectivoService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);

  isBusy = signal(false);
  items = signal<AnioLectivo[]>([]);
  editId = signal<string | null>(null);

  displayedColumns = ['nombre', 'rango', 'actual', 'acciones'];

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(4)]],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
  });

  ngOnInit(): void {
    this.cargar();
  }

  toDate(d: string | Date): Date {
    return typeof d === 'string' ? new Date(d) : d;
  }

  recargar(): void {
    this.cargar(true);
  }

  private cargar(showSnack = false): void {
    this.isBusy.set(true);
    this.svc.listar().subscribe({
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
    this.editId.set(r._id);
    const fi = this.toDate(r.fechaInicio);
    const ff = this.toDate(r.fechaFin);
    this.form.patchValue({
      nombre: r.nombre,
      fechaInicio: formatDate(fi, 'yyyy-MM-dd', 'en-US'),
      fechaFin: formatDate(ff, 'yyyy-MM-dd', 'en-US'),
    });
  }

  cancelarEdicion(): void {
    this.editId.set(null);
    this.form.reset();
  }

  guardar(): void {
    if (this.form.invalid) return;
    const payload = {
      nombre: this.form.value.nombre!,
      fechaInicio: this.form.value.fechaInicio!,
      fechaFin: this.form.value.fechaFin!,
    };

    this.isBusy.set(true);

    const id = this.editId();
    const obs = id ? this.svc.actualizar(id, payload) : this.svc.crear(payload);

    obs.subscribe({
      next: () => {
        this.snack.open(id ? 'Actualizado' : 'Creado', 'OK', { duration: 1500 });
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
    this.svc.eliminar(r._id).subscribe({
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

  marcarComoActual(r: AnioLectivo): void {
    if (r.actual) return; // idempotencia en UI
    this.isBusy.set(true);
    this.svc.marcarActual(r._id).subscribe({
      next: () => {
        this.snack.open(`"${r.nombre}" marcado como actual`, 'OK', { duration: 1500 });
        this.cargar();
      },
      error: (e) => {
        this.isBusy.set(false);
        this.snack.open(e?.error?.message || 'Error al marcar como actual', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
