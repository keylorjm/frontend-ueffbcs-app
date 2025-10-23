import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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

import { Usuario, UsuarioService } from '../../services/usuario.service';
import { UsuarioFormularioComponent } from '../usuario-formulario/usuario-formulario';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    TitleCasePipe,
  ],
  template: `
    <div class="container">
      <h1>Gestión de Usuarios</h1>

      <div class="actions">
        <button mat-raised-button color="primary" (click)="abrirFormulario()">
          <mat-icon>person_add</mat-icon>
          Crear Usuario
        </button>

        <input type="file" #fileInput accept=".xlsx" hidden (change)="onExcelSelected($event)" />
        <button mat-raised-button color="accent" (click)="fileInput.click()">
          <mat-icon>upload</mat-icon>
          Subir Excel
        </button>
      </div>

      <div *ngIf="isLoading$ | async; else tableContent" class="loading-spinner">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Cargando usuarios...</p>
      </div>

      <ng-template #tableContent>
        <table mat-table [dataSource]="(usuarios$ | async)!" class="mat-elevation-z8">

          <!-- Cédula -->
          <ng-container matColumnDef="cedula">
            <th mat-header-cell *matHeaderCellDef>Cédula</th>
            <td mat-cell *matCellDef="let element">{{ element.cedula }}</td>
          </ng-container>

          <!-- Nombre -->
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let element">{{ element.nombre }}</td>
          </ng-container>

          <!-- Correo -->
          <ng-container matColumnDef="correo">
            <th mat-header-cell *matHeaderCellDef>Correo</th>
            <td mat-cell *matCellDef="let element">{{ element.correo }}</td>
          </ng-container>

          <!-- Rol -->
          <ng-container matColumnDef="rol">
            <th mat-header-cell *matHeaderCellDef>Rol</th>
            <td mat-cell *matCellDef="let element">{{ element.rol | titlecase }}</td>
          </ng-container>

          <!-- Acciones -->
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let element">
              <button mat-icon-button color="accent" (click)="abrirFormulario(element)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="eliminarUsuario(element._id)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

          <ng-template matNoDataRowDef>
            <tr class="mat-row mat-no-data-row">
              <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                No se encontraron usuarios.
              </td>
            </tr>
          </ng-template>
        </table>
      </ng-template>
    </div>
  `,
  styles: [`
    .container { padding: 20px; }
    .actions { margin-bottom: 20px; text-align: right; display:flex; gap:8px; justify-content:flex-end; }
    .loading-spinner {
      display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px;
    }
  `],
})
export class Usuarios implements AfterViewInit {
  private usuarioService = inject(UsuarioService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Ahora incluye CÉDULA
  displayedColumns: string[] = ['cedula', 'nombre', 'correo', 'rol', 'acciones'];

  private loading$$ = new Subject<boolean>();
  isLoading$ = this.loading$$.pipe(startWith(false));

  private reload$$ = new Subject<void>();
  private usuarios$$ = new BehaviorSubject<Usuario[]>([]);
  usuarios$ = this.usuarios$$.asObservable();

  ngAfterViewInit(): void {
    this.reload$$
      .pipe(
        startWith(null),
        switchMap(() => {
          setTimeout(() => this.loading$$.next(true), 0);
          return this.usuarioService.getAll().pipe(
            map((response: any) => {
              const dataArray = response.usuarios || response.data || response;
              return Array.isArray(dataArray) ? dataArray : [];
            }),
            tap((usuarios) => {
              this.loading$$.next(false);
              this.usuarios$$.next(usuarios);
            }),
            catchError((err) => {
              this.loading$$.next(false);
              console.error('Error al cargar usuarios:', err);
              this.snackBar.open(
                'Error al cargar usuarios. Verifique la conexión o sus permisos.',
                'Cerrar',
                { duration: 5000 }
              );
              this.usuarios$$.next([]);
              return of(null);
            })
          );
        })
      )
      .subscribe();
  }

  // --- Importar usuarios desde Excel ---
  onExcelSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!confirm('¿Desea importar usuarios desde este archivo Excel?')) return;

    // ⚠️ Ajuste: no permitimos actualizar usuarios existentes (por cédula)
    this.usuarioService.importarExcel(file, { dryRun: false }).subscribe({
      next: (res) => {
        const { summary } = res;
        const created = summary?.created ?? 0;
        const skipped = summary?.skipped ?? 0;
        const errors = summary?.errors ?? 0;

        this.snackBar.open(
          `Importación completa. Creados: ${created}, Saltados: ${skipped}, Errores: ${errors}`,
          'Cerrar',
          { duration: 5000 }
        );
        this.reload$$.next();
      },
      error: (err) => {
        console.error('Error al importar Excel:', err);
        const msg = err?.error?.message || 'Error al importar usuarios.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });

    input.value = '';
  }

  abrirFormulario(usuario?: Usuario): void {
    const dialogRef = this.dialog.open(UsuarioFormularioComponent, {
      width: '500px',
      data: usuario || null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.reload$$.next();
    });
  }

  eliminarUsuario(id: string): void {
    if (!confirm('¿Está seguro de que desea eliminar este usuario? Esta acción es irreversible.')) return;

    this.usuarioService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Usuario eliminado con éxito.', 'Cerrar', { duration: 3000 });
        this.reload$$.next();
      },
      error: (err) => {
        this.snackBar.open('Error al eliminar el usuario.', 'Cerrar', { duration: 5000 });
        console.error('Error al eliminar:', err);
      },
    });
  }
}
