import { Component, AfterViewInit, ViewChild, inject, signal, effect } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import {
  of,
  catchError,
  tap,
  Subject,
  switchMap,
  startWith,
  BehaviorSubject,
  map,
} from 'rxjs';
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
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    TitleCasePipe,
  ],
  template: `
    <div class="wrap">
      <div class="header">
        <div class="titles">
          <h1>Gestión de Usuarios</h1>
          <p class="subtitle">Administra cuentas, roles y accesos</p>
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
            <mat-icon>person_add</mat-icon>
            Crear Usuario
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
              [formControl]="searchCtrl"
              placeholder="Buscar por cédula, nombre, correo o rol"
              autocomplete="off"
            />
            <button
              *ngIf="searchCtrl.value"
              matSuffix
              mat-icon-button
              (click)="clearSearch()"
              aria-label="Limpiar búsqueda">
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>
          <span class="results" *ngIf="dataSource.data?.length">
            {{ dataSource.filteredData.length }} resultado(s)
          </span>
        </div>

        <div class="table-wrap">
          <table mat-table [dataSource]="dataSource" class="modern-table mat-elevation-z2">
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
                <div class="name-cell">
                  <mat-icon class="avatar" aria-hidden="true">account_circle</mat-icon>
                  <span>{{ e.nombre }}</span>
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
              <th mat-header-cell *matHeaderCellDef class="center">Acciones</th>
              <td mat-cell *matCellDef="let e" class="center">
                <button mat-icon-button color="primary" matTooltip="Editar" (click)="abrirFormulario(e)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" matTooltip="Eliminar" (click)="eliminarUsuario(e._id)">
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
                    <p>Intenta cambiar tu búsqueda o limpia el filtro.</p>
                    <button mat-stroked-button (click)="clearSearch()">
                      Limpiar búsqueda
                    </button>
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
    .toolbar { display: flex; align-items: center; gap: 12px; padding: 12px; }
    .search { flex: 1; min-width: 260px; }
    .results { font-size: 12px; color: #6b7280; }

    .table-wrap { overflow: auto; }
    .modern-table { width: 100%; border-spacing: 0; }
    th[mat-header-cell] { font-weight: 600; color: #374151; background: #fafafa; }
    td[mat-cell], th[mat-header-cell] { padding: 10px 12px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Liberation Mono", monospace; }
    .muted { color: #6b7280; }
    .center { text-align: center; }
    .name-cell { display: flex; align-items: center; gap: 8px; }
    .avatar { opacity: .6; }

    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      line-height: 18px;
      background: #eef2ff;
      color: #4338ca;
      border: 1px solid #e0e7ff;
    }
    .pill.admin { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
    .pill.profesor { background: #ecfccb; color: #3f6212; border-color: #d9f99d; }
    .pill.estudiante { background: #e0f2fe; color: #075985; border-color: #bae6fd; }

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
    }
    .empty-state mat-icon { font-size: 32px; height: 32px; width: 32px; opacity: .7; }
    mat-paginator { border-top: 1px solid #f0f0f0; }
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
    // Configurar filtro custom (busca en múltiples campos)
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

    // Vincular paginador
    this.dataSource.paginator = this.paginator;

    // Actualizar filtro onChange
    this.searchCtrl.valueChanges.pipe(startWith(this.searchCtrl.value)).subscribe(value => {
      this.applyFilter(value);
    });

    // Cargar datos
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
              // Reset paginación al cargar
              if (this.paginator) this.paginator.firstPage();
              // Reaplicar filtro si existe
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

  // --- Acciones UI ---
  reload(): void {
    this.reload$$.next();
  }

  clearSearch(): void {
    this.searchCtrl.setValue('');
    // Mantener foco UX si lo deseas: setTimeout(() => (document.querySelector('input[matInput]') as HTMLInputElement)?.focus());
  }

  applyFilter(value: string): void {
    this.dataSource.filter = (value ?? '').trim().toLowerCase();
    // Al filtrar, ir a la primera página para evitar quedarte en páginas vacías
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  roleClass(rol?: string): string {
    const r = (rol ?? '').toLowerCase();
    if (r.includes('admin')) return 'pill admin';
    if (r.includes('profe')) return 'pill profesor';
    if (r.includes('estud')) return 'pill estudiante';
    return 'pill';
    }

  // --- Importar usuarios desde Excel ---
  onExcelSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      input.value = '';
      return;
    }

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
          didOpen: () => {
            Swal.showLoading();
          },
          allowOutsideClick: false,
          allowEscapeKey: false
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
              </div>
            `;

            Swal.fire({ title, html, icon, confirmButtonText: 'Aceptar' });
            this.reload();
          },
          error: (err) => {
            Swal.close();
            console.error('Error al importar Excel:', err);
            const msg = err?.error?.message || 'Error desconocido al importar usuarios.';
            Swal.fire({
              title: 'Error de Importación ❌',
              text: msg,
              icon: 'error',
              confirmButtonText: 'Entendido'
            });
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

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.reload();
    });
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
          next: () => {
            Swal.fire('¡Eliminado!', 'El usuario ha sido eliminado con éxito.', 'success');
            this.reload();
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            Swal.fire('Error', 'Hubo un error al intentar eliminar el usuario.', 'error');
          },
        });
      }
    });
  }
}
