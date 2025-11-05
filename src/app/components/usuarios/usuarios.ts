import { Component, AfterViewInit, ViewChild, inject } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { of, catchError, tap, Subject, switchMap, startWith, BehaviorSubject, map } from 'rxjs';
import Swal from 'sweetalert2';
import { Usuario, UsuarioService } from '../../services/usuario.service';
import { UsuarioFormularioComponent } from '../usuario-formulario/usuario-formulario';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatTooltipModule,
    TitleCasePipe,
  ],
  template: `
    <section class="wrap">
      <!-- Header -->
      <div class="header">
        <div class="title-wrap">
          <h1 class="title">Gestión de Usuarios</h1>
          <span class="subtitle">Administra cuentas, roles y accesos</span>
        </div>

        <div class="actions">
          <!-- Search custom (soft) -->
          <div class="search">
            <mat-icon class="search-icon" aria-hidden="true">search</mat-icon>
            <input
              class="search-input"
              placeholder="Buscar por cédula, nombre, correo o rol…"
              [value]="searchCtrl.value"
              (input)="searchCtrl.setValue(($any($event.target).value || '').toString())"
              autocomplete="off"
            />
            <button
              class="search-clear"
              *ngIf="searchCtrl.value"
              (click)="clearSearch()"
              aria-label="Limpiar búsqueda">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <button mat-icon-button (click)="reload()" matTooltip="Refrescar">
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
            <mat-icon>person_add</mat-icon>
            Crear Usuario
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
        <div class="table-wrap table-slim">
          <table mat-table [dataSource]="dataSource" class="table compact modern-table">

            <!-- Cédula -->
            <ng-container matColumnDef="cedula">
              <th mat-header-cell *matHeaderCellDef>Cédula</th>
              <td mat-cell *matCellDef="let e">
                <span class="mono">{{ e.cedula }}</span>
              </td>
            </ng-container>

            <!-- Nombre -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let e">
                <div class="cell-nombre">
                  <mat-icon class="avatar">account_circle</mat-icon>
                  <span class="nombre">{{ e.nombre }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Correo -->
            <ng-container matColumnDef="correo">
              <th mat-header-cell *matHeaderCellDef>Correo</th>
              <td mat-cell *matCellDef="let e">
                <span class="muted">{{ e.correo }}</span>
              </td>
            </ng-container>

            <!-- Rol -->
            <ng-container matColumnDef="rol">
              <th mat-header-cell *matHeaderCellDef>Rol</th>
              <td mat-cell *matCellDef="let e">
                <span class="pill" [ngClass]="roleClass(e.rol)">{{ e.rol | titlecase }}</span>
              </td>
            </ng-container>

            <!-- Acciones -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="text-right">Acciones</th>
              <td mat-cell *matCellDef="let e" class="text-right actions-cell">
                <button mat-icon-button color="primary" class="icon-btn" matTooltip="Editar" (click)="abrirFormulario(e)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" class="icon-btn" matTooltip="Eliminar" (click)="eliminarUsuario(e._id)">
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
                    <p>Intenta cambiar tu búsqueda o limpia el filtro.</p>
                    <button mat-stroked-button class="btn-outline" (click)="clearSearch()">Limpiar búsqueda</button>
                  </div>
                </div>
              </td>
            </tr>
          </table>
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
    .btn-primary {
      border-radius: 12px;
      padding-inline: 14px;
      height: 40px;
    }
    .btn-stroked {
      border-radius: 12px;
      height: 36px;
      border-color: #d1d5db;
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
      transition: all .2s ease;
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
    .table-wrap { background: #fff; }
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

    .cell-nombre { display: inline-flex; align-items: center; gap: 8px; }
    .nombre { color: #111827; }
    .avatar { opacity: .7; }

    .actions-cell { white-space: nowrap; }
    .icon-btn { margin-right: 2px; }

    /* Pills (consistentes con guía) */
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 2px 10px; border-radius: 999px; font-size: 12px; line-height: 18px;
      border: 1px solid transparent;
      background: #f3f4f6; color: #374151; border-color: #e5e7eb; /* default gris */
    }
    .pill.admin {
      background: #ffe8e8; color: #b91c1c; border-color: #ffd4d4; /* warn suave */
    }
    .pill.profesor {
      background: #e8f7ee; color: #166534; border-color: #d9f0e4; /* verde guía */
    }
    .pill.estudiante {
      background: #e8efff; color: #1e40af; border-color: #dbe5ff; /* azul guía */
    }

    /* Tipos y misc */
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", monospace; }
    .muted { color: #6b7280; }

    /* Empty state */
    .empty-cell { padding: 14px; }
    .empty-state {
      display: grid; grid-template-columns: 40px 1fr; gap: 12px; align-items: center;
      padding: 18px; border: 1px dashed #e5e7eb; border-radius: 12px; color: #6b7280; background: #fbfbfb;
    }
    .empty-state mat-icon { font-size: 28px; height: 28px; width: 28px; opacity: .7; }

    /* Paginador */
    mat-paginator { border-top: 1px solid #e5e7eb; }
  `],
})
export class Usuarios implements AfterViewInit {
  private usuarioService = inject(UsuarioService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['cedula', 'nombre', 'correo', 'rol', 'acciones'];

  private loading$$ = new Subject<boolean>();
  isLoading$ = this.loading$$.pipe(startWith(false));

  private reload$$ = new Subject<void>();
  private usuarios$$ = new BehaviorSubject<Usuario[]>([]);
  usuarios$ = this.usuarios$$.asObservable();

  dataSource = new MatTableDataSource<Usuario>([]);
  searchCtrl = new FormControl<string>('', { nonNullable: true });

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit(): void {
    this.dataSource.filterPredicate = (data: Usuario, filter: string) => {
      const term = filter.trim().toLowerCase();
      const safe = (v: any) => (v ?? '').toString().toLowerCase();
      return (
        safe(data.cedula).includes(term) ||
        safe(data.nombre).includes(term) ||
        safe(data.correo).includes(term) ||
        safe(data.rol).includes(term)
      );
    };

    this.dataSource.paginator = this.paginator;

    this.searchCtrl.valueChanges.pipe(startWith(this.searchCtrl.value)).subscribe(value => {
      this.applyFilter(value);
    });

    this.reload$$
      .pipe(
        startWith(null),
        switchMap(() => {
          setTimeout(() => this.loading$$.next(true), 0);
          return this.usuarioService.getAll().pipe(
            map((response: any) => {
              const dataArray = response.usuarios || response.data || response;
              return Array.isArray(dataArray) ? (dataArray as Usuario[]) : [];
            }),
            tap((usuarios) => {
              this.loading$$.next(false);
              this.usuarios$$.next(usuarios);
              this.dataSource.data = usuarios ?? [];
              if (this.paginator) this.paginator.firstPage();
              this.applyFilter(this.searchCtrl.value);
            }),
            catchError((err) => {
              this.loading$$.next(false);
              console.error('Error al cargar usuarios:', err);
              Swal.fire({
                title: 'Error de Conexión ❌',
                text: 'Error al cargar usuarios. Verifique la conexión o sus permisos.',
                icon: 'error',
                confirmButtonText: 'Reintentar'
              }).then(() => this.reload());
              this.usuarios$$.next([]);
              this.dataSource.data = [];
              return of(null);
            })
          );
        })
      )
      .subscribe();
  }

  reload(): void { this.reload$$.next(); }

  clearSearch(): void {
    this.searchCtrl.setValue('');
  }

  applyFilter(value: string): void {
    this.dataSource.filter = (value ?? '').trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  roleClass(rol?: string): string {
    const r = (rol ?? '').toLowerCase();
    if (r.includes('admin')) return 'admin';
    if (r.includes('profe')) return 'profesor';
    if (r.includes('estud')) return 'estudiante';
    return '';
  }

  onExcelSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) { input.value = ''; return; }

    Swal.fire({
      title: '¿Confirmar Importación?',
      text: `¿Desea importar los usuarios desde el archivo "${file.name}"?`,
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
          didOpen: () => { Swal.showLoading(); },
          allowOutsideClick: false, allowEscapeKey: false
        });

        this.usuarioService.importarExcel(file, { dryRun: false }).subscribe({
          next: (res) => {
            Swal.close();
            const { summary } = res;
            const created = summary?.created ?? 0;
            const skipped = summary?.skipped ?? 0;
            const errors = summary?.errors ?? 0;
            const title = errors > 0 ? 'Importación con Errores ⚠️' : 'Importación Exitosa ✅';
            const icon: 'success' | 'warning' = errors > 0 ? 'warning' : 'success';
            const html = `
              <div style="text-align: left;">
                <p><strong>Resultado del proceso:</strong></p>
                <ul>
                  <li><strong>Creados:</strong> ${created}</li>
                  <li><strong>Saltados:</strong> ${skipped}</li>
                  <li><strong>Errores:</strong> ${errors}</li>
                </ul>
              </div>`;
            Swal.fire({ title, html, icon, confirmButtonText: 'Aceptar' });
            this.reload();
          },
          error: (err) => {
            Swal.close();
            console.error('Error al importar Excel:', err);
            const msg = err?.error?.message || 'Error desconocido al importar usuarios.';
            Swal.fire({ title: 'Error de Importación ❌', text: msg, icon: 'error', confirmButtonText: 'Entendido' });
          },
        });
      }
      input.value = '';
    });
  }

  abrirFormulario(usuario?: Usuario): void {
    const dialogRef = this.dialog.open(UsuarioFormularioComponent, {
      width: '520px',
      data: usuario || null,
      panelClass: 'soft-dialog'
    });
    dialogRef.afterClosed().subscribe((result) => { if (result) this.reload(); });
  }

  eliminarUsuario(id: string): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción es irreversible y eliminará el usuario permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.usuarioService.delete(id).subscribe({
          next: () => { Swal.fire('¡Eliminado!', 'El usuario ha sido eliminado con éxito.', 'success'); this.reload(); },
          error: (err) => { console.error('Error al eliminar:', err); Swal.fire('Error', 'Hubo un error al intentar eliminar el usuario.', 'error'); },
        });
      }
    });
  }
}
