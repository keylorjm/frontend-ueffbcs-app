import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Materia, MateriaService } from '../../services/materia.service';
import { Usuario, UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  template: `
  <div class="container">
    <div class="header">
      <h1>📚 Gestión de Materias</h1>
      <button mat-raised-button color="primary" (click)="mostrarFormulario = true" *ngIf="!mostrarFormulario">
        <mat-icon>add</mat-icon> Agregar Materia
      </button>
    </div>

    <!-- FORMULARIO -->
    <mat-card class="form-card" *ngIf="mostrarFormulario">
      <div class="form-header">
        <h2>{{ form._id ? 'Editar Materia' : 'Nueva Materia' }}</h2>
        <button mat-icon-button color="warn" (click)="cancelar()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form #f="ngForm" (ngSubmit)="guardar(f)" class="form">
        <input type="hidden" [(ngModel)]="form._id" name="_id" />

        <div class="row">
          <label>Nombre</label>
          <input type="text" name="nombre" [(ngModel)]="form.nombre" required placeholder="Ej. Matemáticas" />
        </div>

        <div class="row">
          <label>Descripción</label>
          <input type="text" name="descripcion" [(ngModel)]="form.descripcion" placeholder="Breve descripción" />
        </div>

        <div class="row">
          <label>Profesor</label>
          <select name="profesor" [(ngModel)]="form.profesor" required>
            <option [ngValue]="''" disabled>Seleccione...</option>
            <option *ngFor="let p of profesores" [ngValue]="p._id">
              {{ p.nombre }} ({{ p.correo }})
            </option>
          </select>
        </div>

        <div class="actions">
          <button mat-raised-button color="primary" type="submit">
            {{ form._id ? 'Actualizar' : 'Guardar' }}
          </button>
          <button mat-stroked-button type="button" (click)="cancelar()">Cancelar</button>
        </div>
      </form>
    </mat-card>

    <!-- LISTA DE MATERIAS -->
    <mat-card class="table-card" *ngIf="!mostrarFormulario">
      <div class="table-header">
        <h2>📋 Lista de Materias</h2>
      </div>

      <div class="loader" *ngIf="loading">
        <mat-spinner diameter="50"></mat-spinner>
      </div>

      <table mat-table [dataSource]="data" class="mat-elevation-z8" *ngIf="!loading && data?.length">
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Materia</th>
          <td mat-cell *matCellDef="let m">{{ m.nombre }}</td>
        </ng-container>

        <ng-container matColumnDef="profesor">
          <th mat-header-cell *matHeaderCellDef>Profesor</th>
          <td mat-cell *matCellDef="let m">{{ m.profesor?.nombre || m.profesor?.correo || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef>Acciones</th>
          <td mat-cell *matCellDef="let m">
            <button mat-icon-button color="accent" (click)="editar(m)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="eliminar(m)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols"></tr>
      </table>

      <p *ngIf="!loading && !data?.length" class="no-data">No hay materias registradas.</p>
    </mat-card>
  </div>
  `,
  styles: [`
    .container {
      padding: 24px;
      max-width: 900px;
      margin: auto;
      display: grid;
      gap: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h1 {
      font-size: 28px;
      color: #1a237e;
      margin: 0;
    }

    .form-card, .table-card {
      padding: 20px;
      border-radius: 16px;
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .form { display: grid; gap: 12px; }
    .row { display: grid; gap: 4px; }

    input, select {
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 15px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 12px;
    }

    table {
      width: 100%;
      margin-top: 10px;
    }

    .loader {
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    .no-data {
      text-align: center;
      color: gray;
      padding: 20px;
    }
  `]
})
export class MateriasComponent implements OnInit {
  private materiaSrv = inject(MateriaService);
  private usuarioSrv = inject(UsuarioService);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  data: Materia[] = [];
  profesores: Usuario[] = [];
  loading = false;
  mostrarFormulario = false;

  form: any = { _id: '', nombre: '', descripcion: '', profesor: '' };
  cols = ['nombre', 'profesor', 'acciones'];

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading = true;
    this.usuarioSrv.getProfesores().subscribe(p => {
      this.profesores = p || [];
      this.cdr.detectChanges();
    });

    this.materiaSrv.getAll().subscribe({
      next: (res: any) => {
        this.data = res?.materias || res || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.snack.open('Error al cargar materias', 'Cerrar', { duration: 3000 });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  editar(m: any) {
    this.form = {
      _id: m._id || m.uid,
      nombre: m.nombre,
      descripcion: m.descripcion,
      profesor: m.profesor?._id || m.profesor
    };
    this.mostrarFormulario = true;
  }

  eliminar(m: any) {
    if (!confirm('¿Eliminar materia?')) return;
    this.materiaSrv.delete(m._id || m.uid).subscribe({
      next: () => { this.snack.open('Eliminado', 'Cerrar', { duration: 2500 }); this.cargar(); },
      error: () => this.snack.open('Error al eliminar', 'Cerrar', { duration: 3000 }),
    });
  }

  guardar(f: NgForm) {
    if (f.invalid) {
      this.snack.open('Complete el formulario', 'Cerrar', { duration: 3000 });
      return;
    }

    const dto = {
      nombre: this.form.nombre,
      descripcion: this.form.descripcion,
      profesor: this.form.profesor
    };

    const obs = this.form._id
      ? this.materiaSrv.update(this.form._id, dto)
      : this.materiaSrv.create(dto);

    obs.subscribe({
      next: () => {
        this.snack.open('Guardado correctamente', 'Cerrar', { duration: 2500 });
        this.cancelar();
        this.cargar();
      },
      error: (e) =>
        this.snack.open(e?.error?.msg || 'Error al guardar', 'Cerrar', { duration: 3000 }),
    });
  }

  cancelar() {
    this.form = { _id: '', nombre: '', descripcion: '', profesor: '' };
    this.mostrarFormulario = false;
  }
}
