// src/app/components/anio-lectivo-admin/anio-lectivo-admin.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { AnioLectivoService, AnioLectivo } from '../../services/anio-lectivo.service';

@Component({
  selector: 'app-anio-lectivo-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <div class="header">
        <div class="eyebrow">
          <mat-icon>calendar_today</mat-icon>
          Años lectivos
        </div>
        <h2>Gestión de años lectivos</h2>
      </div>

      <div class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput [(ngModel)]="form.nombre" placeholder="Sierra 2025-2026" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha inicio (ISO)</mat-label>
          <input matInput [(ngModel)]="form.fechaInicio" placeholder="2025-09-01" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha fin (ISO)</mat-label>
          <input matInput [(ngModel)]="form.fechaFin" placeholder="2026-07-15" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Orden</mat-label>
          <input matInput type="number" [(ngModel)]="form.orden" placeholder="1" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Estado</mat-label>
          <mat-select [(ngModel)]="form.activo">
            <mat-option [value]="true">Activo</mat-option>
            <mat-option [value]="false">Inactivo</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="actions">
          <button mat-flat-button color="primary" (click)="guardar()">
            <mat-icon>save</mat-icon>
            {{ editId ? 'Actualizar' : 'Crear' }}
          </button>
          <button mat-stroked-button (click)="limpiar()">
            <mat-icon>clear</mat-icon>
            Limpiar
          </button>
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="table">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Orden</th>
              <th>Actual</th>
              <th>Activo</th>
              <th style="width:260px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of anios()">
              <td>{{ a.nombre }}</td>
              <td>{{ a.fechaInicio | date: 'yyyy-MM-dd' }}</td>
              <td>{{ a.fechaFin    | date: 'yyyy-MM-dd' }}</td>
              <td>{{ a.orden ?? 0 }}</td>
              <td>{{ a.actual ? 'Sí' : 'No' }}</td>
              <td>{{ a.activo ? 'Sí' : 'No' }}</td>
              <td class="row-actions">
                <button mat-button (click)="editar(a)">
                  <mat-icon>edit</mat-icon>
                  Editar
                </button>
                <button mat-button color="primary" [disabled]="a.actual" (click)="hacerActual(a)">
                  <mat-icon>star</mat-icon>
                  Hacer actual
                </button>
                <button mat-button color="warn" (click)="eliminar(a)">
                  <mat-icon>delete</mat-icon>
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 8px; }
    .card { padding: 16px; }
    .eyebrow {
      display:flex;
      align-items:center;
      gap:6px;
      text-transform:uppercase;
      color:#666;
      font-size:12px;
    }
    .header h2 { margin: 4px 0 12px; }
    .form-grid {
      display:grid;
      grid-template-columns: repeat(3, minmax(220px, 1fr));
      gap:12px;
      align-items:end;
      margin-bottom:12px;
    }
    .actions { display:flex; gap:8px; }
    .table table {
      width:100%;
      border-collapse: collapse;
    }
    .table th, .table td {
      padding:8px;
      border-bottom:1px solid #e0e0e0;
      text-align:left;
    }
    .row-actions {
      display:flex;
      gap:6px;
      flex-wrap: wrap;
    }
  `],
})
export class AnioLectivoAdminComponent implements OnInit {
  private srv = inject(AnioLectivoService);
  private sb  = inject(MatSnackBar);

  anios = signal<AnioLectivo[]>([]);
  editId: string | null = null;

  form: Partial<AnioLectivo> = {
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
    activo: true,
    orden: undefined,
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.srv.getAll().subscribe({
      next: (rs) =>
        this.anios.set((rs ?? []).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))),
      error: () => this.anios.set([]),
    });
  }

  limpiar(): void {
    this.editId = null;
    this.form = {
      nombre: '',
      fechaInicio: '',
      fechaFin: '',
      activo: true,
      orden: undefined,
    };
  }

  editar(a: AnioLectivo): void {
    this.editId = a._id;
    this.form = {
      nombre: a.nombre,
      fechaInicio: a.fechaInicio?.slice(0, 10),
      fechaFin: a.fechaFin?.slice(0, 10),
      activo: a.activo ?? true,
      orden: a.orden ?? undefined,
    };
  }

  guardar(): void {
    const payload: any = { ...this.form };

    if (!payload.nombre || !payload.fechaInicio || !payload.fechaFin) {
      this.sb.open('Nombre y fechas son obligatorios', 'Cerrar', { duration: 2200 });
      return;
    }

    // Si no se escribió orden, calculamos max+1
    if (payload.orden == null || payload.orden === '') {
      const maxOrden = this.anios().reduce((max, a) => {
        const v = a.orden ?? 0;
        return v > max ? v : max;
      }, 0);
      payload.orden = maxOrden + 1;
    } else {
      payload.orden = Number(payload.orden) || 0;
    }

    if (this.editId) {
      // UPDATE
      this.srv.update(this.editId, payload).subscribe({
        next: () => {
          this.sb.open('Año actualizado', 'Cerrar', { duration: 1800 });
          // Evitar ExpressionChanged -> movemos cambios al siguiente tick
          setTimeout(() => {
            this.limpiar();
            this.load();
          });
        },
        error: (e) => {
          const status = e?.status;
          const msg = e?.error?.message;
          if (status === 409) {
            this.sb.open(
              msg ?? 'Conflicto: ya existe un año con ese nombre u orden',
              'Cerrar',
              { duration: 3000 }
            );
          } else {
            this.sb.open(msg ?? 'Error al actualizar', 'Cerrar', {
              duration: 2500,
            });
          }
        },
      });
    } else {
      // CREATE
      this.srv.create(payload).subscribe({
        next: () => {
          this.sb.open('Año creado', 'Cerrar', { duration: 1800 });
          // Evitar ExpressionChanged
          setTimeout(() => {
            this.limpiar();
            this.load();
          });
        },
        error: (e) => {
          const status = e?.status;
          const msg = e?.error?.message;
          if (status === 409) {
            this.sb.open(
              msg ?? 'Conflicto: ya existe un año con ese nombre u orden',
              'Cerrar',
              { duration: 3000 }
            );
          } else {
            this.sb.open(msg ?? 'Error al crear', 'Cerrar', {
              duration: 2500,
            });
          }
        },
      });
    }
  }

  hacerActual(a: AnioLectivo): void {
    this.srv.setActual(a._id).subscribe({
      next: () => {
        this.sb.open('Año marcado como actual', 'Cerrar', { duration: 1800 });
        // De nuevo, diferimos para evitar NG0100
        setTimeout(() => this.load());
      },
      error: (e) =>
        this.sb.open(
          e?.error?.message ?? 'No se pudo marcar como actual',
          'Cerrar',
          { duration: 2500 }
        ),
    });
  }

  eliminar(a: AnioLectivo): void {
    if (!confirm(`Eliminar ${a.nombre}?`)) return;
    this.srv.delete(a._id).subscribe({
      next: () => {
        this.sb.open('Eliminado', 'Cerrar', { duration: 1800 });
        setTimeout(() => this.load());
      },
      error: (e) =>
        this.sb.open(e?.error?.message ?? 'No se pudo eliminar', 'Cerrar', {
          duration: 2500,
        }),
    });
  }
}
