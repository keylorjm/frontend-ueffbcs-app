// src/app/components/materias/materias.component.ts

import { Component, AfterViewInit, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; 
// Angular Material
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; 

// RxJS
import { of, catchError, tap, Subject, switchMap, BehaviorSubject, Subscription } from 'rxjs'; 

import { Materia, MateriaService } from '../../services/materia.service'; 
import { MateriaFormularioComponent } from '../materia-formulario/materia-formulario'; 

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [
    CommonModule, // 🛑 CRÍTICO
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatDialogModule, 
    MatProgressSpinnerModule    
  ],
  template: `
    <div class="container">
      <h1>Gestión de Materias</h1>

      <div class="actions">
        <button mat-raised-button color="primary" (click)="abrirFormulario()">
          <mat-icon>add_box</mat-icon>
          Crear Materia
        </button>
      </div>

      <div *ngIf="(isLoading$ | async) || (dataSource.length === 0 && !(isLoading$ | async))" class="loading-spinner">
        
        <ng-container *ngIf="isLoading$ | async">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Cargando materias...</p>
        </ng-container>
        
        <ng-container *ngIf="!(isLoading$ | async) && dataSource.length === 0">
            <p>No se encontraron materias.</p>
        </ng-container>
      </div>

      <div *ngIf="dataSource.length > 0">
          <table mat-table [dataSource]="dataSource" class="mat-elevation-z8">
              
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef> Nombre </th>
                <td mat-cell *matCellDef="let element"> {{ element.nombre }} </td>
              </ng-container>
              
              <ng-container matColumnDef="descripcion">
                <th mat-header-cell *matHeaderCellDef> Descripción </th>
                <td mat-cell *matCellDef="let element"> {{ element.descripcion }} </td>
              </ng-container>
              
              <ng-container matColumnDef="profesor">
                <th mat-header-cell *matHeaderCellDef> Profesor </th>
                <td mat-cell *matCellDef="let element"> 
                    {{ element.profesor?.nombre || 'N/A' }} 
                </td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef> Acciones </th>
                <td mat-cell *matCellDef="let element">
                  <button mat-icon-button color="accent" (click)="abrirFormulario(element)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="eliminarMateria(element.uid!)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
      </div>
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
export class MateriasComponent implements OnInit, AfterViewInit, OnDestroy {
  private materiaService = inject(MateriaService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  // 🛑 CRÍTICO: Inyección para forzar la actualización de la tabla
  private cdr = inject(ChangeDetectorRef); 

  displayedColumns: string[] = ['nombre', 'descripcion', 'profesor', 'acciones'];
  
  private loading$$ = new BehaviorSubject<boolean>(false);
  isLoading$ = this.loading$$.asObservable();

  // Patrón de Recarga
  private reload$$ = new Subject<void>();
  
  public dataSource: Materia[] = []; 
  private dataSubscription: Subscription | undefined; 

  ngOnInit(): void {
    // Patrón de Recarga: Suscripción que escucha el disparo
    this.dataSubscription = this.reload$$.pipe(
        tap(() => this.loading$$.next(true)), 
        switchMap(() => this.materiaService.getAll()), 
        tap(materias => {
            this.dataSource = materias; 
            this.loading$$.next(false);
            this.cdr.detectChanges(); // 🛑 CLAVE 1: Forzar actualización
        }),
        catchError(err => {
            this.snackBar.open('Error al cargar materias. Revise su backend.', 'Cerrar', { duration: 5000 });
            this.dataSource = []; 
            this.loading$$.next(false);
            this.cdr.detectChanges(); // 🛑 CLAVE 2: Forzar actualización incluso con error
            return of(null); 
        })
    ).subscribe();
  }
  
  ngAfterViewInit(): void {
    // 🛑 CRÍTICO: Disparo de carga inicial
    setTimeout(() => {
        this.reload$$.next(); 
    }, 0); 
  }
  
  ngOnDestroy(): void {
      this.dataSubscription?.unsubscribe();
  }
  
  abrirFormulario(materia?: Materia): void {
    const dialogRef = this.dialog.open(MateriaFormularioComponent, { 
      width: '500px',
      data: materia 
    });

    dialogRef.afterClosed().subscribe(result => {
      // Si la operación de guardar fue exitosa
      if (result === true) { 
        this.reload$$.next(); // Recarga la lista
      }
    });
  }

  eliminarMateria(id: string): void {
      if (!confirm('¿Está seguro de que desea eliminar esta materia?')) return;
      this.materiaService.delete(id).subscribe({
        next: () => {
          this.snackBar.open('Materia eliminada con éxito.', 'Cerrar', { duration: 3000 });
          this.reload$$.next(); // Recarga la lista
        },
        error: (err) => {
          this.snackBar.open('Error al eliminar la materia.', 'Cerrar', { duration: 5000 });
          console.error('Error al eliminar:', err);
        }
      });
  }
}