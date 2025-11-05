// src/app/components/estudiantes/estudiantes.component.ts
import {
  Component,
  AfterViewInit,
  ViewChild,
  inject,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import {
  of,
  catchError,
  tap,
  Subject,
  switchMap,
  BehaviorSubject,
  Subscription,
  startWith,
} from 'rxjs';
import Swal from 'sweetalert2';

import { Estudiante, EstudianteService } from '../../services/estudiante.service';
import { EstudianteFormularioComponent } from '../estudiante-formulario/estudiante-formulario';
import { MatCard } from "@angular/material/card";

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatCard
],
  template: `
    <section class="wrap">
      <!-- Header -->
      <div class="header">
        <div class="title-wrap">
          <h1 class="title">Gestión de Estudiantes</h1>
          <span class="subtitle">Crea, importa y administra estudiantes</span>
        </div>

        <div class="actions">
          <!-- Search custom (soft) -->
          <div class="search">
            <mat-icon class="search-icon" aria-hidden="true">search</mat-icon>
            <input
              class="search-input"
              placeholder="Buscar por nombre, email, cédula o celular…"
              (input)="applyFilter($event)"
              autocomplete="off"
            />
            <button
              class="search-clear"
              *ngIf="hasFilter"
              (click)="clearFilter()"
              aria-label="Limpiar búsqueda">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <button mat-icon-button matTooltip="Refrescar" (click)="reload()">
            <mat-icon>refresh</mat-icon>
          </button>

          <div class="upload-wrap">
            <input type="file" #fileInput accept=".xlsx" hidden (change)="onExcelSelected($event)" />
            <button mat-stroked-button class="btn-stroked" (click)="fileInput.click()">
              <mat-icon>upload</mat-icon>
              Subir Excel
            </button>
          </div>

          <button mat-raised-button color="primary" class="btn-primary" (click)="abrirFormulario()">
            <mat-icon>add_box</mat-icon>
            Crear Estudiante
          </button>
        </div>
      </div>

      <!-- Card contenedor -->
      <mat-card class="card mat-elevation-z1">
        <mat-progress-bar *ngIf="(isLoading$ | async)" mode="indeterminate"></mat-progress-bar>

        <!-- Toolbar secundaria: resultados -->
        <div class="toolbar">
          <span class="results" *ngIf="dataSource.data?.length">
            {{ dataSource.filteredData.length }} resultado(s)
          </span>
        </div>

        <!-- Tabla estilo “modern-table” -->
        <div class="table-wrap table-slim" [class.center]="!dataSource.data.length && !(isLoading$ | async)">
          <table mat-table [dataSource]="dataSource" class="table compact modern-table">

            <!-- Nombre -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let e">{{ e.nombre }}</td>
            </ng-container>

            <!-- Email -->
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let e"><span class="muted">{{ e.email }}</span></td>
            </ng-container>

            <!-- Cédula -->
            <ng-container matColumnDef="cedula">
              <th mat-header-cell *matHeaderCellDef>Cédula</th>
              <td mat-cell *matCellDef="let e"><span class="mono">{{ e.cedula }}</span></td>
            </ng-container>

            <!-- Celular -->
            <ng-container matColumnDef="celular">
              <th mat-header-cell *matHeaderCellDef>Celular</th>
              <td mat-cell *matCellDef="let e">{{ e.celular }}</td>
            </ng-container>

            <!-- Acciones -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="text-right">Acciones</th>
              <td mat-cell *matCellDef="let e" class="text-right actions-cell">
                <button mat-icon-button color="primary" class="icon-btn" matTooltip="Editar" (click)="abrirFormulario(e)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" class="icon-btn" matTooltip="Eliminar" (click)="eliminarEstudiante(e.uid!)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

            <!-- Empty -->
            <tr *ngIf="!(isLoading$ | async) && dataSource.filteredData.length === 0">
              <td class="empty-cell" [attr.colspan]="displayedColumns.length">
                <div class="empty-state">
                  <mat-icon>group_off</mat-icon>
                  <div>
                    <h3>Sin resultados</h3>
                    <p>Prueba ajustando tu búsqueda o limpia el filtro.</p>
                    <button mat-stroked-button class="btn-outline" (click)="clearFilter()">Limpiar búsqueda</button>
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <div *ngIf="(isLoading$ | async) && !dataSource.data?.length" class="loading">
            <mat-spinner diameter="48"></mat-spinner>
            <p>Cargando estudiantes...</p>
          </div>
        </div>

        <mat-paginator
          [length]="dataSource.filteredData.length"
          [pageSize]="10"
          [pageSizeOptions]="[5,10,25,50]"
          aria-label="Paginación">
        </mat-paginator>
      </mat-card>
    </section>
  `,
  styles: [`
    /* ----- Layout general (soft/compact) ----- */
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
    .title-wrap { display: flex; flex-direction: column; gap: 4px; }
    .title { font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
    .subtitle { color: #6b7280; font-size: 13px; }
    .actions { display: flex; align-items: center; gap: 10px; }

    /* Botones */
    .btn-primary { border-radius: 12px; padding-inline: 14px; height: 40px; }
    .btn-stroked { border-radius: 12px; height: 36px; border-color: #d1d5db; }
    .btn-outline {
      height: 36px; padding: 0 18px; border-radius: 18px; font-size: 14px; font-weight: 600;
      color: #1e3a8a; border: 1px solid #94a3b8; background: transparent; transition: all .2s ease;
    }
    .btn-outline:hover { background: #f1f5f9; border-color: #64748b; }

    /* Card */
    .card {
      border-radius: 18px;
      padding: 0;
      overflow: hidden;
      position: relative;
    }

    /* Search (custom, ligera) */
    .search { position: relative; width: 300px; min-width: 220px; }
    .search-input {
      width: 100%; height: 40px; border-radius: 12px;
      padding: 0 36px 0 36px; border: 1px solid #e5e7eb; background: #fff; outline: none;
    }
    .search-input:focus { border-color: #c7d2fe; box-shadow: 0 0 0 3px #e0e7ff; }
    .search-icon {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #6b7280;
    }
    .search-clear {
      position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
      height: 32px; width: 32px; border: none; background: transparent; border-radius: 8px; cursor: pointer; color: #6b7280;
    }

    /* Toolbar secundaria */
    .toolbar { display: flex; align-items: center; justify-content: flex-end; padding: 10px 12px; }
    .results { font-size: 12px; color: #6b7280; }

    /* Tabla moderna */
    .table-wrap { background: #fff; position: relative; overflow: auto; }
    .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .modern-table th.mat-header-cell {
      background: #f7f7fb; font-weight: 700; font-size: 13px; letter-spacing: 0.02em;
      border-bottom: 1px solid #e5e7eb; padding: 10px 14px; color: #111827;
    }
    .modern-table td.mat-cell {
      padding: 12px 14px; border-bottom: 1px solid #e5e7eb;
    }
    .modern-table tr.mat-row:hover td { background: #fafafa; }
    .table-slim .compact th.mat-header-cell,
    .table-slim .compact td.mat-cell { padding: 12px 14px; }
    .text-right { text-align: right; }

    .actions-cell { white-space: nowrap; }
    .icon-btn { margin-right: 2px; }

    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", monospace; }
    .muted { color: #6b7280; }

    /* Empty state */
    .empty-cell { padding: 14px; }
    .empty-state {
      display: grid; grid-template-columns: 40px 1fr; gap: 12px; align-items: center;
      padding: 18px; border: 1px dashed #e5e7eb; border-radius: 12px; color: #6b7280; background: #fbfbfb;
    }
    .empty-state mat-icon { font-size: 28px; height: 28px; width: 28px; opacity: .7; }

    /* Loading */
    .loading { display: grid; justify-content: center; align-items: center; gap: 8px; padding: 24px; color: #6b7280; }

    /* Paginador */
    mat-paginator { border-top: 1px solid #e5e7eb; }
  `],
})
export class EstudiantesComponent implements OnInit, AfterViewInit, OnDestroy {
  private estudianteService = inject(EstudianteService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  displayedColumns: string[] = ['nombre', 'email', 'cedula', 'celular', 'acciones'];

  private loading$$ = new BehaviorSubject<boolean>(false);
  isLoading$ = this.loading$$.asObservable();

  private reload$$ = new Subject<void>();
  private dataSubscription?: Subscription;

  public dataSource = new MatTableDataSource<Estudiante>([]);
  public hasFilter = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    // Filtro que busca en múltiples campos
    this.dataSource.filterPredicate = (data: Estudiante, filter: string) => {
      const term = (filter || '').trim().toLowerCase();
      const v = (x: any) => (x ?? '').toString().toLowerCase();
      return (
        v(data.nombre).includes(term) ||
        v(data.email).includes(term) ||
        v(data.cedula).includes(term) ||
        v(data.celular).includes(term)
      );
    };

    this.dataSubscription = this.reload$$
      .pipe(
        tap(() => this.loading$$.next(true)),
        switchMap(() => this.estudianteService.getAll()),
        tap((estudiantes) => {
          this.dataSource.data = estudiantes ?? [];
          this.loading$$.next(false);
          if (this.paginator) this.paginator.firstPage();
          if (this.hasFilter) this.dataSource.filter = this.dataSource.filter;
          this.cdr.detectChanges();
        }),
        catchError((err) => {
          this.loading$$.next(false);
          this.dataSource.data = [];
          this.cdr.detectChanges();

          Swal.fire({
            title: 'Error de Conexión ❌',
            text: 'Error al cargar estudiantes. Verifique la conexión o el servicio.',
            icon: 'error',
            confirmButtonText: 'Reintentar'
          }).then(() => this.reload());

          return of(null);
        })
      )
      .subscribe();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    setTimeout(() => this.reload(), 0);
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }

  // ---- Búsqueda (con input custom) ----
  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.dataSource.filter = value.trim().toLowerCase();
    this.hasFilter = !!value;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  clearFilter(): void {
    this.dataSource.filter = '';
    this.hasFilter = false;
    const input = document.querySelector('.search-input') as HTMLInputElement | null;
    if (input) input.value = '';
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  // ---- Acciones UI / CRUD ----
  reload(): void {
    this.reload$$.next();
  }

  onExcelSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) { input.value = ''; return; }

    Swal.fire({
      title: '¿Confirmar Importación?',
      text: `¿Desea importar los estudiantes desde el archivo "${file.name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, importar',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Importando...',
          text: 'Por favor espere, el proceso puede tardar unos segundos.',
          didOpen: () => Swal.showLoading(),
          allowOutsideClick: false,
          allowEscapeKey: false
        });

        this.estudianteService.importarExcel(file, { dryRun: false, allowUpdate: false }).subscribe({
          next: (res) => {
            Swal.close();
            const { summary } = res || {};
            const created = summary?.created ?? 0;
            const updated = summary?.updated ?? 0;
            const errors = summary?.errors ?? 0;

            const title = errors > 0 ? 'Importación con Errores ⚠️' : 'Importación Exitosa ✅';
            const icon: 'success' | 'warning' = errors > 0 ? 'warning' : 'success';
            const html = `
              <div style="text-align: left;">
                <p><strong>Resultado del proceso:</strong></p>
                <ul>
                  <li><strong>Creados:</strong> ${created}</li>
                  <li><strong>Actualizados:</strong> ${updated}</li>
                  <li><strong>Errores:</strong> ${errors}</li>
                </ul>
              </div>
            `;

            Swal.fire({ title, html, icon, confirmButtonText: 'Aceptar' });
            this.reload();
          },
          error: (err) => {
            Swal.close();
            const msg = err?.error?.message || 'Error desconocido al importar estudiantes.';
            Swal.fire({ title: 'Error de Importación ❌', text: msg, icon: 'error', confirmButtonText: 'Entendido' });
          },
        });
      }

      input.value = '';
    });
  }

  abrirFormulario(estudiante?: Estudiante): void {
    const dialogRef = this.dialog.open(EstudianteFormularioComponent, {
      width: '500px',
      data: estudiante,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) this.reload();
    });
  }

  eliminarEstudiante(id: string): void {
    if (!id) {
      Swal.fire('Error de Validación', 'ID de estudiante no válido.', 'error');
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción es irreversible y eliminará al estudiante permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.estudianteService.delete(id).subscribe({
          next: () => {
            Swal.fire('¡Eliminado!', 'El estudiante ha sido eliminado con éxito.', 'success');
            this.reload();
          },
          error: () => {
            Swal.fire('Error', 'Hubo un error al intentar eliminar el estudiante.', 'error');
          },
        });
      }
    });
  }
}
