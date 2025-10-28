// src/app/components/anio-lectivo-admin/anio-lectivo-admin.component.ts
import { Component, inject, signal, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';

import { AnioLectivoService, AnioLectivo } from '../../services/anio-lectivo.service';
import { map } from 'rxjs/operators';

type UIAnio = AnioLectivo & { anioInicio?: number; anioFin?: number };

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
    MatProgressBarModule,
    MatDividerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatChipsModule,
  ],
  template: `
    <section class="wrap">
      <!-- Header -->
      <div class="header">
        <div class="title-wrap">
          <h1 class="title">Años lectivos</h1>
          <span class="subtitle">Administra periodos académicos y marca el actual</span>
        </div>
        <div class="actions">
          <div class="search">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              class="search-input"
              placeholder="Buscar por nombre o año…"
              [value]="filtro()"
              (input)="filtro.set($any($event.target).value)"
            />
            <button
              class="search-clear"
              *ngIf="filtro()"
              (click)="filtro.set('')"
              aria-label="Limpiar"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <button mat-icon-button (click)="recargar()" [disabled]="isBusy()" matTooltip="Refrescar">
            <mat-icon>refresh</mat-icon>
          </button>

          <button
            mat-raised-button
            color="primary"
            class="btn-primary"
            (click)="abrirCrear()"
            [disabled]="isBusy()"
          >
            <mat-icon>add</mat-icon>
            Agregar
          </button>
        </div>
      </div>

      <!-- Card contenedor -->
      <mat-card class="card mat-elevation-z1">
        <mat-progress-bar *ngIf="isBusy()" mode="indeterminate"></mat-progress-bar>

        <!-- Tabla estilo captura -->
        <div class="table-wrap table-slim">
          <table
            mat-table
            [dataSource]="filtrados()"
            [trackBy]="trackById"
            class="table compact modern-table"
          >
            <!-- Nombre -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let r">
                <div class="cell-nombre">
                  <span class="nombre">{{ r.nombre }}</span>
                  <span *ngIf="r.actual" class="pill pill-blue">Actual</span>
                </div>
              </td>
            </ng-container>

            <!-- Año -->
            <ng-container matColumnDef="rango">
              <th mat-header-cell *matHeaderCellDef>Año</th>
              <td mat-cell *matCellDef="let r">
                {{ r.anioInicio ?? year(r.fechaInicio) }} — {{ r.anioFin ?? year(r.fechaFin) }}
              </td>
            </ng-container>

            <!-- Estado -->
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let r">
                <span
                  class="pill"
                  [class.pill-green]="r.activo !== false"
                  [class.pill-gray]="r.activo === false"
                >
                  {{ r.activo === false ? 'Inactivo' : 'Activo' }}
                </span>
              </td>
            </ng-container>

            <!-- Acciones -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="text-right">Acciones</th>
              <td mat-cell *matCellDef="let r" class="text-right actions-cell">
                <button
                  mat-icon-button
                  color="primary"
                  class="icon-btn"
                  (click)="editar(r)"
                  [disabled]="isBusy()"
                  matTooltip="Editar"
                >
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="warn"
                  class="icon-btn"
                  (click)="confirmarEliminar(r)"
                  [disabled]="isBusy()"
                  matTooltip="Eliminar"
                >
                  <mat-icon>delete</mat-icon>
                </button>

                <button
                  mat-stroked-button
                  color="primary"
                  class="mark-btn"
                  (click)="marcarComoActual(r)"
                  [disabled]="isBusy() || r.actual"
                >
                  <mat-icon class="leading-icon" [class.blue]="!r.actual">check_circle</mat-icon>
                  Marcar actual
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

            <tr *ngIf="!isBusy() && filtrados().length === 0">
              <td [attr.colspan]="displayedColumns.length" class="empty-state">
                No hay años lectivos registrados.
              </td>
            </tr>
          </table>
        </div>
      </mat-card>
    </section>

    <!-- ========== DIÁLOGO: Formulario suave (look de la captura) ========== -->
    <ng-template #dialogForm>
      <form [formGroup]="form" (ngSubmit)="guardar()" class="soft-form compact" novalidate>
        <div class="soft-panel small">
          <div class="soft-header">
            <div class="soft-title">
              {{ editId() ? 'Editar Año Lectivo' : 'Nuevo Año Lectivo' }}
            </div>
            <button
              type="button"
              class="soft-close"
              (click)="cerrarDialog()"
              [disabled]="isBusy()"
              aria-label="Cerrar"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="soft-body compact">
            <label class="soft-label" for="nombre">Nombre</label>
            <input
              id="nombre"
              class="ui-input"
              formControlName="nombre"
              placeholder="Ej. 2025 - 2026"
              maxlength="25"
            />
            <div class="soft-hint">Formato: <strong>AAAA - AAAA</strong></div>

            <label class="soft-label" for="anioInicio">Año inicio</label>
            <input
              id="anioInicio"
              type="number"
              class="ui-input"
              formControlName="anioInicio"
              placeholder="2025"
              (input)="autoNombre()"
            />

            <label class="soft-label" for="anioFin">Año fin</label>
            <input
              id="anioFin"
              type="number"
              class="ui-input"
              formControlName="anioFin"
              placeholder="2026"
              (input)="autoNombre()"
            />

            <div class="soft-errors">
              <div class="soft-error" *ngIf="form.errors?.['rango']">
                El año fin debe ser mayor o igual al año inicio.
              </div>
            </div>
          </div>

          <div class="soft-footer compact">
            <button type="submit" class="btn-soft-primary" [disabled]="form.invalid || isBusy()">
              Guardar
            </button>
            <button
              type="button"
              class="btn-outline"
              (click)="cerrarDialog()"
              [disabled]="isBusy()"
            >
              Cancelar
            </button>
          </div>
        </div>
      </form>
    </ng-template>

    <!-- ========== DIÁLOGO: Confirmar eliminación ========== -->
    <ng-template #dialogConfirm let-data>
      <div class="confirm">
        <div class="confirm-header">
          <mat-icon color="warn">warning</mat-icon>
          <div class="confirm-title">Eliminar año lectivo</div>
        </div>

        <div class="confirm-body">
          ¿Seguro que deseas eliminar "<strong>{{ data?.nombre }}</strong>"?
          Esta acción no se puede deshacer.
        </div>

        <div class="confirm-footer">
          <button mat-button class="btn-outline" mat-dialog-close="false">Cancelar</button>
          <button mat-raised-button color="warn" class="btn-soft-primary" mat-dialog-close="true">
            Eliminar
          </button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [
    `
      /* ----- Layout general ----- */
      .wrap {
        max-width: 980px;
        margin: 24px auto;
        padding: 0 12px;
      }
      .header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }
      .title-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .title {
        font-size: 28px;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.02em;
      }
      .subtitle {
        color: #6b7280;
        font-size: 13px;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .btn-primary {
        border-radius: 12px;
        padding-inline: 14px;
        height: 40px;
      }

      .card {
        border-radius: 18px;
        padding: 0;
        overflow: hidden;
        position: relative;
      }

      /* ----- Search (custom, ligera) ----- */
      .search {
        position: relative;
        width: 300px;
        min-width: 220px;
      }
      .search-input {
        width: 100%;
        height: 40px;
        border-radius: 12px;
        padding: 0 36px 0 36px;
        border: 1px solid #e5e7eb;
        background: #fff;
        outline: none;
      }
      .search-input:focus {
        border-color: #c7d2fe;
        box-shadow: 0 0 0 3px #e0e7ff;
      }
      .search-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: #6b7280;
      }
      .search-clear {
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        height: 32px;
        width: 32px;
        border: none;
        background: transparent;
        border-radius: 8px;
        cursor: pointer;
        color: #6b7280;
      }

      /* ----- Tabla estilo captura ----- */
      .table-wrap {
        background: #fff;
      }
      .modern-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }
      .modern-table th.mat-header-cell {
        background: #f7f7fb;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.02em;
        border-bottom: 1px solid #e5e7eb;
        padding: 10px 14px;
        color: #111827;
      }
      .modern-table td.mat-cell {
        padding: 12px 14px;
        border-bottom: 1px solid #e5e7eb;
      }
      .modern-table tr.mat-row:hover td {
        background: #fafafa;
      }
      .text-right {
        text-align: right;
      }
      .table-slim .compact th.mat-header-cell,
      .table-slim .compact td.mat-cell {
        padding: 12px 14px;
      }

      .cell-nombre {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .nombre {
        color: #111827;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 12px;
        line-height: 18px;
        border: 1px solid transparent;
      }
      .pill-blue {
        background: #e8efff;
        color: #1e40af;
        border-color: #dbe5ff;
      }
      .pill-green {
        background: #e8f7ee;
        color: #166534;
        border-color: #d9f0e4;
      }
      .pill-gray {
        background: #f3f4f6;
        color: #374151;
        border-color: #e5e7eb;
      }

      .actions-cell {
        white-space: nowrap;
      }
      .icon-btn {
        margin-right: 2px;
      }
      .mark-btn {
        margin-left: 8px;
        border-radius: 12px;
        padding-inline: 12px;
        height: 36px;
        border-color: #d1d5db;
      }
      .mark-btn[disabled] {
        color: #9ca3af !important;
        border-color: #e5e7eb !important;
      }
      .leading-icon {
        margin-right: 6px;
        font-variation-settings: 'FILL' 0;
      }
      .leading-icon.blue {
        color: #1d4ed8;
        font-variation-settings: 'FILL' 1;
      }

      .empty-state {
        padding: 18px;
        text-align: center;
        color: #6b7280;
      }

      /* ==== Versión compacta del diálogo ==== */
      .soft-panel.small {
        padding: 18px 22px 16px;
        max-width: 500px;
        margin: auto;
        background: #f8f8fb;
        border-radius: 20px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
      }

      /* Header */
      .soft-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2px 4px 8px;
        margin-bottom: 4px;
      }
      .soft-title {
        font-size: 21px;
        font-weight: 800;
        color: #111827;
      }
      .soft-close {
        height: 34px;
        width: 34px;
        border: none;
        background: transparent;
        border-radius: 8px;
        cursor: pointer;
        color: #374151;
      }
      .soft-close:hover {
        background: #f3f4f6;
      }

      /* Cuerpo */
      .soft-body.compact {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 4px 2px 10px;
      }

      .soft-label {
        font-weight: 600;
        color: #111827;
        font-size: 13.5px;
        margin-top: 6px;
      }

      .ui-input {
        height: 38px;
        border-radius: 10px;
        padding: 0 12px;
        font-size: 14px;
        border: 1px solid #e5e7eb;
        background: #fff;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .ui-input:focus {
        border-color: #93c5fd;
        box-shadow: 0 0 0 3px #dbeafe;
        outline: none;
      }

      .soft-hint {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 6px;
        margin-top: -2px;
      }

      .soft-error {
        color: #b91c1c;
        font-size: 12px;
        margin-top: -2px;
      }

      .soft-errors {
        margin-top: 2px;
      }

      /* Footer */
      .soft-footer.compact {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid #e5e7eb;
      }

      /* Botones */
      .btn-soft-primary {
        height: 36px;
        padding: 0 18px;
        border-radius: 18px;
        font-size: 14px;
        font-weight: 600;
        color: #1d4ed8;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        transition: all 0.2s ease;
      }
      .btn-soft-primary:hover:not(:disabled) {
        background: #f9fafb;
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
      }

      .btn-outline {
        height: 36px;
        padding: 0 18px;
        border-radius: 18px;
        font-size: 14px;
        font-weight: 600;
        color: #1e3a8a;
        border: 1px solid #94a3b8;
        background: transparent;
        transition: all 0.2s ease;
      }
      .btn-outline:hover:not(:disabled) {
        background: #f1f5f9;
        border-color: #64748b;
      }

      /* Dialog confirm por consistencia */
      .confirm {
        width: min(92vw, 420px);
      }
      .confirm-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
      }
      .confirm-title {
        font-size: 16px;
      }
      .confirm-body {
        color: #6b7280;
        margin: 8px 0 12px;
      }
      .confirm-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
    `,
  ],
})
export class AnioLectivoAdminComponent implements OnInit {
  private readonly svc = inject(AnioLectivoService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  @ViewChild('dialogForm', { static: true }) dialogFormTpl!: TemplateRef<unknown>;
  @ViewChild('dialogConfirm', { static: true }) dialogConfirmTpl!: TemplateRef<unknown>;

  isBusy = signal(false);
  items = signal<UIAnio[]>([]);
  editId = signal<string | null>(null);

  displayedColumns = ['nombre', 'rango', 'estado', 'acciones'];
  filtro = signal<string>('');

  // Form tipado y nonNullable
  form = this.fb.nonNullable.group(
    {
      nombre: this.fb.nonNullable.control<string>('', {
        validators: [Validators.required, Validators.minLength(4)],
      }),
      anioInicio: this.fb.nonNullable.control<string>('', {
        validators: [Validators.required, Validators.pattern(/^[0-9]{4}$/)],
      }),
      anioFin: this.fb.nonNullable.control<string>('', {
        validators: [Validators.required, Validators.pattern(/^[0-9]{4}$/)],
      }),
    },
    {
      validators: (fg) => {
        const ini = Number(fg.get('anioInicio')?.value);
        const fin = Number(fg.get('anioFin')?.value);
        return isFinite(ini) && isFinite(fin) && fin < ini ? { rango: true } : null;
      },
    }
  );

  get c() {
    return this.form.controls;
  }

  ngOnInit(): void {
    this.cargar();
  }

  // Helpers
  trackById = (_: number, r: UIAnio) => r._id ?? r.nombre;

  // Datos
  recargar(): void {
    this.cargar(true);
  }
  private cargar(showSnack = false): void {
    this.isBusy.set(true);
    this.svc
      .getAll()
      .pipe(
        map((rows) =>
          (rows ?? []).map(
            (r) =>
              ({
                ...r,
                anioInicio: this.year(r.fechaInicio),
                anioFin: this.year(r.fechaFin),
              } as UIAnio)
          )
        )
      )
      .subscribe({
        next: (rows) => {
          this.items.set(rows);
          if (showSnack) this.snack.open('Datos actualizados', 'OK', { duration: 1500 });
          this.isBusy.set(false);
        },
        error: (e) => {
          this.isBusy.set(false);
          this.snack.open(e?.error?.message || 'Error cargando años lectivos', 'Cerrar', {
            duration: 3000,
          });
        },
      });
  }

 year(v?: string): number | undefined {
  if (!v) return undefined;
  const m = /^(\d{4})/.exec(v);
  return m ? Number(m[1]) : undefined;
}

  private asStr(v?: number): string {
    return v == null ? '' : String(v);
  }

  // Filtro
  filtrados(): UIAnio[] {
    const q = this.filtro().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter((r) => {
      const nombre = (r.nombre || '').toLowerCase();
      const rango = `${r.anioInicio ?? this.year(r.fechaInicio)} ${
        r.anioFin ?? this.year(r.fechaFin)
      }`.toLowerCase();
      return nombre.includes(q) || rango.includes(q);
    });
  }

  // Dialog
  private dialogRef?: any;

  abrirCrear(): void {
    this.editId.set(null);
    this.form.reset();
    this.dialogRef = this.dialog.open(this.dialogFormTpl, {
      panelClass: 'dialog-panel',
      autoFocus: 'dialog',
    });
  }
  cerrarDialog(): void {
    this.dialogRef?.close();
  }

  editar(r: UIAnio): void {
    this.editId.set(r._id ?? null);
    this.form.patchValue({
      nombre: r.nombre,
      anioInicio: this.asStr(r.anioInicio ?? this.year(r.fechaInicio)),
      anioFin: this.asStr(r.anioFin ?? this.year(r.fechaFin)),
    });
    this.dialogRef = this.dialog.open(this.dialogFormTpl, {
      panelClass: 'dialog-panel',
      autoFocus: 'dialog',
    });
  }

  autoNombre(): void {
    const ini = this.form.value.anioInicio;
    const fin = this.form.value.anioFin;
    if (/^\d{4}$/.test(String(ini)) && /^\d{4}$/.test(String(fin))) {
      const current = String(this.form.value.nombre || '');
      const suggested = `${ini} - ${fin}`;
      if (!current || /^\d{4}\s*-\s*\d{4}$/.test(current)) {
        this.form.patchValue({ nombre: suggested }, { emitEvent: false });
      }
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.snack.open('Revisa los campos del formulario.', 'Cerrar', { duration: 2000 });
      return;
    }
    const payload = {
      nombre: String(this.form.value.nombre),
      anioInicio: Number(this.form.value.anioInicio),
      anioFin: Number(this.form.value.anioFin),
    };
    this.isBusy.set(true);
    const id = this.editId();
    const obs = id ? this.svc.update(id, payload) : this.svc.create(payload);
    obs.subscribe({
      next: () => {
        this.snack.open(id ? 'Año lectivo actualizado' : 'Año lectivo creado', 'OK', {
          duration: 1500,
        });
        this.form.reset();
        this.cerrarDialog();
        this.cargar();
      },
      error: (e) => {
        this.isBusy.set(false);
        this.snack.open(e?.error?.message || 'Error guardando', 'Cerrar', { duration: 3000 });
      },
    });
  }

  confirmarEliminar(r: AnioLectivo): void {
    const ref = this.dialog.open(this.dialogConfirmTpl, { data: { nombre: r.nombre } });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) this.eliminar(r);
    });
  }

  eliminar(r: AnioLectivo): void {
    // Validación defensiva del id
    if (!r?._id) {
      this.snack.open('No se encontró el identificador del registro.', 'Cerrar', { duration: 2500 });
      return;
    }
    this.isBusy.set(true);
    this.svc.delete(r._id).subscribe({
      next: () => {
        this.snack.open('Eliminado', 'OK', { duration: 1500 });
        this.cargar();
      },
      error: (e) => {
        this.isBusy.set(false);
        this.snack.open(e?.error?.message || 'Error eliminando', 'Cerrar', { duration: 3000 });
      },
    });
  }

  marcarComoActual(r: AnioLectivo): void {
    if (r.actual) return;
    this.isBusy.set(true);
    this.svc.setActual(r._id).subscribe({
      next: () => {
        this.snack.open('"' + r.nombre + '" marcado como actual', 'OK', { duration: 1500 });
        this.cargar();
      },
      error: (e) => {
        this.isBusy.set(false);
        this.snack.open(e?.error?.message || 'Error al marcar como actual', 'Cerrar', {
          duration: 3000,
        });
      },
    });
  }
}
