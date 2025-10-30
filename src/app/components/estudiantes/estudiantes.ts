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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
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

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="wrap">
      <div class="header">
        <div class="titles">
          <h1>Gestión de Estudiantes</h1>
          <p class="subtitle">Crea, importa y administra estudiantes</p>
        </div>

        <div class="header-actions">
          <button mat-icon-button matTooltip="Refrescar" (click)="reload()">
            <mat-icon>refresh</mat-icon>
          </button>

          <div class="upload-wrap">
            <input type="file" #fileInput accept=".xlsx" hidden (change)="onExcelSelected($event)" />
            <button mat-stroked-button (click)="fileInput.click()">
              <mat-icon>upload</mat-icon>
              Subir Excel
            </button>
          </div>

          <button mat-flat-button color="primary" (click)="abrirFormulario()">
            <mat-icon>add_box</mat-icon>
            Crear Estudiante
          </button>
        </div>
      </div>

      <mat-card class="card">
        <mat-progress-bar *ngIf="(isLoading$ | async)" mode="indeterminate"></mat-progress-bar>

        <div class="toolbar">
          <mat-form-field appearance="outline" class="search">
            <mat-icon matPrefix>search</mat-icon>
            <input
              matInput
              placeholder="Buscar por nombre, email, cédula o celular"
              (keyup)="applyFilter($event)"
              autocomplete="off"
            />
            <button
              *ngIf="hasFilter"
              matSuffix
              mat-icon-button
              (click)="clearFilter()"
              aria-label="Limpiar búsqueda">
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>

          <span class="results" *ngIf="dataSource.data?.length">
            {{ dataSource.filteredData.length }} resultado(s)
          </span>
        </div>

        <div class="table-wrap" [class.center]="!dataSource.data.length && !(isLoading$ | async)">
          <table mat-table [dataSource]="dataSource" class="modern-table mat-elevation-z2">

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
              <th mat-header-cell *matHeaderCellDef class="center">Acciones</th>
              <td mat-cell *matCellDef="let e" class="center">
                <button mat-icon-button color="primary" matTooltip="Editar" (click)="abrirFormulario(e)" matTooltip="Editar">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" matTooltip="Eliminar" (click)="eliminarEstudiante(e.uid!)" matTooltip="Eliminar">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

            <tr class="mat-row empty" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                <div class="empty-state">
                  <mat-icon>group_off</mat-icon>
                  <div>
                    <h3>Sin resultados</h3>
                    <p>Prueba ajustando tu búsqueda o limpia el filtro.</p>
                    <button mat-stroked-button (click)="clearFilter()">Limpiar búsqueda</button>
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
          aria-label="Paginación"
        ></mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .wrap { padding: 20px; display: grid; gap: 16px; }
    .header { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px; }
    .titles h1 { margin: 0; font-weight: 700; }
    .subtitle { margin: 2px 0 0; color: #6b7280; font-size: 13px; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .upload-wrap { display: flex; }

    .card { border-radius: 16px; overflow: hidden; }
    .toolbar { display: flex; align-items: center; gap: 12px; padding: 12px; background: #fafafa; border-bottom: 1px solid #f0f0f0; }
    .search { flex: 1; min-width: 260px; }
    .results { font-size: 12px; color: #6b7280; }

    .table-wrap { position: relative; overflow: auto; }
    .modern-table { width: 100%; border-spacing: 0; }
    th[mat-header-cell] { font-weight: 600; color: #374151; background: #fcfcfc; }
    td[mat-cell], th[mat-header-cell] { padding: 10px 12px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", monospace; }
    .muted { color: #6b7280; }
    .center { text-align: center; }

    .empty-state {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 12px;
      align-items: center;
      padding: 18px;
      border: 1px dashed #e5e7eb;
      border-radius: 12px;
      color: #6b7280;
      background: #fbfbfb;
      margin: 12px;
    }
    .empty-state mat-icon { font-size: 32px; height: 32px; width: 32px; opacity: .7; }

    .loading { display: grid; justify-content: center; align-items: center; gap: 8px; padding: 24px; color: #6b7280; }

    mat-paginator { border-top: 1px solid #f0f0f0; background: #f9fafb; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; }
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

  // Ahora usamos MatTableDataSource para filtro + paginación
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
          // Reset de paginación al recargar datos
          if (this.paginator) this.paginator.firstPage();
          // Reaplicar filtro si existía
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
    // Primera carga
    setTimeout(() => this.reload(), 0);
  }

  ngOnDestroy(): void {
    this.dataSubscription?.unsubscribe();
  }

  // ---- Búsqueda ----
  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.dataSource.filter = value.trim().toLowerCase();
    this.hasFilter = !!value;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  clearFilter(): void {
    this.dataSource.filter = '';
    this.hasFilter = false;
    // Limpia el input visible
    const input = document.querySelector('.toolbar input[matInput]') as HTMLInputElement | null;
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

    if (!file) {
      input.value = '';
      return;
    }

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
