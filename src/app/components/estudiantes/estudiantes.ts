// src/app/components/estudiantes/estudiantes.component.ts

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
import { Observable, of, catchError, tap, Subject, switchMap, BehaviorSubject, Subscription } from 'rxjs'; 

import { Estudiante, EstudianteService } from '../../services/estudiante.service'; 
import { EstudianteFormularioComponent } from '../estudiante-formulario/estudiante-formulario'; 

@Component({
  selector: 'app-estudiantes',
  standalone: true,
  imports: [
    CommonModule, // 🛑 CRÍTICO: Necesario para *ngIf
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatDialogModule, 
    MatProgressSpinnerModule, // Necesario para mat-spinner
    
  ],
  template: `
    <div class="container">
      <h1>Gestión de Estudiantes</h1>

      <div class="actions">
        <button mat-raised-button color="primary" (click)="abrirFormulario()">
          <mat-icon>add_box</mat-icon>
          Crear Estudiante
        </button>
      </div>

      <div *ngIf="(isLoading$ | async) || (dataSource.length === 0 && !(isLoading$ | async))" class="loading-spinner">
        
        <ng-container *ngIf="isLoading$ | async">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Cargando estudiantes...</p>
        </ng-container>
        
        <ng-container *ngIf="!(isLoading$ | async) && dataSource.length === 0">
            <p>No se encontraron estudiantes.</p>
        </ng-container>
      </div>

      <div *ngIf="dataSource.length > 0">
          <table mat-table [dataSource]="dataSource" class="mat-elevation-z8">
              
              <ng-container matColumnDef="nombre">
                <th mat-header-cell *matHeaderCellDef> Nombre </th>
                <td mat-cell *matCellDef="let element"> {{ element.nombre }} </td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef> Email </th>
                <td mat-cell *matCellDef="let element"> {{ element.email }} </td>
              </ng-container>

              <ng-container matColumnDef="cedula">
                <th mat-header-cell *matHeaderCellDef> Cédula </th>
                <td mat-cell *matCellDef="let element"> {{ element.cedula }} </td>
              </ng-container>

              <ng-container matColumnDef="celular">
                <th mat-header-cell *matHeaderCellDef> Celular </th>
                <td mat-cell *matCellDef="let element"> {{ element.celular }} </td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef> Acciones </th>
                <td mat-cell *matCellDef="let element">
                  <button mat-icon-button color="accent" (click)="abrirFormulario(element)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="eliminarEstudiante(element.uid!)">
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
export class EstudiantesComponent implements OnInit, AfterViewInit, OnDestroy {
  private estudianteService = inject(EstudianteService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  // 🛑 Necesario para forzar la detección de cambios de mat-table
  private cdr = inject(ChangeDetectorRef); 

  displayedColumns: string[] = ['nombre', 'email', 'cedula', 'celular', 'acciones'];
  
  private loading$$ = new BehaviorSubject<boolean>(false);
  isLoading$ = this.loading$$.asObservable();

  private reload$$ = new Subject<void>();
  
  public dataSource: Estudiante[] = []; 
  private dataSubscription: Subscription | undefined; 

  constructor() {}

  ngOnInit(): void {
    // 1. Configuración del flujo de datos
    this.dataSubscription = this.reload$$.pipe(
        tap(() => this.loading$$.next(true)), 
        switchMap(() => this.estudianteService.getAll()), // Llamada a la API
        tap(estudiantes => {
            // 2. Manejo de datos y actualización
            this.dataSource = estudiantes; 
            this.loading$$.next(false);
            // 🛑 CRÍTICO: Forzar la actualización de la vista inmediatamente después de cargar los datos
            this.cdr.detectChanges(); 
        }),
        catchError(err => {
            this.snackBar.open('Error al cargar estudiantes.', 'Cerrar', { duration: 5000 });
            this.dataSource = []; 
            this.loading$$.next(false);
            this.cdr.detectChanges(); 
            return of(null); 
        })
    ).subscribe();
  }
  
  ngAfterViewInit(): void {
    // 3. Disparo de carga inicial
    // 🛑 CRÍTICO: Esto inicia el flujo en ngOnInit y asegura que la lista cargue al inicio.
    setTimeout(() => {
        this.reload$$.next(); 
    }, 0); 
  }
  
  ngOnDestroy(): void {
      this.dataSubscription?.unsubscribe();
  }
  
  // LÓGICA DEL DIÁLOGO (CREACIÓN/EDICIÓN)
  abrirFormulario(estudiante?: Estudiante): void {
    const dialogRef = this.dialog.open(EstudianteFormularioComponent, { 
      width: '500px',
      data: estudiante 
    });

    // 4. Lógica de recarga después de cerrar el modal
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) { 
        this.reload$$.next(); // Dispara la recarga de la lista
      }
    });
  }

  // LÓGICA DE ELIMINACIÓN
  eliminarEstudiante(id: string): void {
    console.log("ID recibido para eliminar:", id);
      if (!confirm('¿Está seguro de que desea eliminar este estudiante?')) return;
      this.estudianteService.delete(id).subscribe({
        next: () => {
          this.snackBar.open('Estudiante eliminado con éxito.', 'Cerrar', { duration: 3000 });
          this.reload$$.next(); 
        },
        error: (err) => {
          this.snackBar.open('Error al eliminar el estudiante.', 'Cerrar', { duration: 5000 });
          console.error('Error al eliminar:', err);
        }
      });
  }
}