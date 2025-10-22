// src/app/components/usuarios/usuarios.component.ts

import { Component, AfterViewInit, inject } from '@angular/core'; 
import { CommonModule, TitleCasePipe } from '@angular/common'; 
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, of, catchError, tap, Subject, switchMap, startWith, BehaviorSubject, map } from 'rxjs'; 

import { Usuario,UsuarioService } from '../../services/usuario.service';
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
    TitleCasePipe
  ],
  template: `
    <div class="container">
      <h1>Gestion de Usuarios</h1>

      <div class="actions">
        <button mat-raised-button color="primary" (click)="abrirFormulario()">
          <mat-icon>person_add</mat-icon>
          Crear Usuario
        </button>
      </div>

      <div *ngIf="isLoading$ | async; else tableContent" class="loading-spinner">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Cargando usuarios...</p>
      </div>

      <ng-template #tableContent>
        <table mat-table [dataSource]="(usuarios$ | async)!" class="mat-elevation-z8">
          
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef> Nombre </th>
            <td mat-cell *matCellDef="let element"> {{ element.nombre }} </td>
          </ng-container>

          <ng-container matColumnDef="correo">
            <th mat-header-cell *matHeaderCellDef> Correo </th>
            <td mat-cell *matCellDef="let element"> {{ element.correo }} </td>
          </ng-container>

          <ng-container matColumnDef="rol">
            <th mat-header-cell *matHeaderCellDef> Rol </th>
            <td mat-cell *matCellDef="let element"> {{ element.rol | titlecase }} </td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef> Acciones </th>
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
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          
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
    .actions { margin-bottom: 20px; text-align: right; }
    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
    }
  `]
})
export class Usuarios implements AfterViewInit {
  private usuarioService = inject(UsuarioService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['nombre', 'correo', 'rol', 'acciones'];
  
  private loading$$ = new Subject<boolean>();
  isLoading$ = this.loading$$.pipe(startWith(false));

  private reload$$ = new Subject<void>();
  
  // 馃洃 BehaviorSubject: Garantiza que siempre hay un valor inicial (el array vac铆o)
  private usuarios$$ = new BehaviorSubject<Usuario[]>([]);
  usuarios$ = this.usuarios$$.asObservable(); 

  isNoData(data: Usuario[]): boolean {
    return !data || data.length === 0;
  }

  // Usamos ngAfterViewInit para asegurar que la tabla est茅 inicializada antes de la suscripci贸n
  ngAfterViewInit(): void {
    this.reload$$.pipe(
      startWith(null), 
      switchMap(() => {
        
        // Soluci贸n NG0100: Usa setTimeout(0) para retrasar el estado de carga
        setTimeout(() => {
            this.loading$$.next(true); 
        }, 0);
        
        return this.usuarioService.getAll().pipe(
            // 馃洃 CR脥TICO: Este 'map' fuerza la extracci贸n del arreglo desde la respuesta del backend.
            // Ajusta 'response.usuarios' si tu propiedad se llama diferente (ej., response.data)
            map((response: any) => {
                const dataArray = response.usuarios || response.data || response;
                // Devolvemos el array, o un array vac铆o si no es un array
                return Array.isArray(dataArray) ? dataArray : [];
            }),
            
            tap(usuarios => {
                this.loading$$.next(false);
                this.usuarios$$.next(usuarios); // Actualiza el BehaviorSubject con el array puro
            }),
            catchError(err => {
                this.loading$$.next(false);
                console.error('Error al cargar usuarios:', err);
                this.snackBar.open('Error al cargar usuarios. Verifique la conexi贸n o sus permisos.', 'Cerrar', { duration: 5000 });
                this.usuarios$$.next([]); 
                return of(null); 
            })
        );
      })
    ).subscribe(); 
  }

  abrirFormulario(usuario?: Usuario): void {
    const dialogRef = this.dialog.open(UsuarioFormularioComponent, {
      width: '500px',
      data: usuario || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reload$$.next(); 
      }
    });
  }

  eliminarUsuario(id: string): void {
    if (!confirm('驴Est谩 seguro de que desea eliminar este usuario? Esta acci贸n es irreversible.')) {
      return;
    }

    this.usuarioService.delete(id).subscribe({
      next: () => {
        this.snackBar.open('Usuario eliminado con 茅xito.', 'Cerrar', { duration: 3000 });
        this.reload$$.next(); 
      },
      error: (err) => {
        this.snackBar.open('Error al eliminar el usuario.', 'Cerrar', { duration: 5000 });
        console.error('Error al eliminar:', err);
      }
    });
  }
}