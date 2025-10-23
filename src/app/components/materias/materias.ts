import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Materia, MateriaService } from '../../services/materia.service';
import { Usuario, UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule, MatSelectModule],
  template: `
  <div class="container">
    <h1>Gestión de Materias</h1>

    <form #f="ngForm" (ngSubmit)="guardar(f)" class="form">
      <input type="hidden" [(ngModel)]="form._id" name="_id" />

      <div class="row">
        <label>Nombre</label>
        <input type="text" name="nombre" [(ngModel)]="form.nombre" required />
      </div>

      <div class="row">
        <label>Descripción</label>
        <input type="text" name="descripcion" [(ngModel)]="form.descripcion" />
      </div>

      <div class="row">
        <label>Profesor</label>
        <select name="profesor" [(ngModel)]="form.profesor" required>
          <option [ngValue]="''" disabled>Seleccione...</option>
          <option *ngFor="let p of profesores" [ngValue]="p._id">{{ p.nombre }} ({{ p.correo }})</option>
        </select>
      </div>

      <div class="actions">
        <button mat-raised-button color="primary" type="submit">{{ form._id ? 'Actualizar' : 'Crear' }}</button>
        <button mat-raised-button type="button" (click)="reset(f)">Limpiar</button>
      </div>
    </form>

    <table mat-table [dataSource]="data" class="mat-elevation-z8" *ngIf="data?.length">
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
          <button mat-icon-button color="accent" (click)="editar(m)"><mat-icon>edit</mat-icon></button>
          <button mat-icon-button color="warn" (click)="eliminar(m)"><mat-icon>delete</mat-icon></button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols"></tr>
    </table>
  </div>
  `,
  styles: [`
    .container { padding: 20px; }
    .form { display: grid; gap: 10px; margin-bottom: 16px; max-width: 640px; }
    .row { display: grid; gap: 4px; }
    .actions { display: flex; gap: 8px; }
    table { margin-top: 16px; }
  `],
})
export class MateriasComponent implements OnInit {
  private materiaSrv = inject(MateriaService);
  private usuarioSrv = inject(UsuarioService);
  private snack = inject(MatSnackBar);

  data: any[] = [];
  profesores: Usuario[] = [];

  form: any = {
    _id: '',
    nombre: '',
    descripcion: '',
    profesor: ''
  };

  cols = ['nombre', 'profesor', 'acciones'];

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.usuarioSrv.getProfesores().subscribe(p => this.profesores = p || []);
    this.materiaSrv.getAll().subscribe((res: any) => {
      this.data = res?.materias || res || [];
    });
  }

  editar(m: any) {
    this.form = {
      _id: m._id || m.uid,
      nombre: m.nombre,
      descripcion: m.descripcion,
      profesor: m.profesor?._id || m.profesor // populate o id
    };
  }

  eliminar(m: any) {
    if (!confirm('¿Eliminar materia?')) return;
    this.materiaSrv.delete(m._id || m.uid).subscribe({
      next: () => { this.snack.open('Eliminado', 'Cerrar', { duration: 2500 }); this.cargar(); },
      error: () => this.snack.open('Error al eliminar', 'Cerrar', { duration: 3000 }),
    });
  }

  guardar(f: NgForm) {
    if (f.invalid) { this.snack.open('Complete el formulario', 'Cerrar', { duration: 3000 }); return; }
    const dto = { nombre: this.form.nombre, descripcion: this.form.descripcion, profesor: this.form.profesor };

    const obs = this.form._id
      ? this.materiaSrv.update(this.form._id, dto)
      : this.materiaSrv.create(dto);

    obs.subscribe({
      next: () => { this.snack.open('Guardado', 'Cerrar', { duration: 2500 }); this.reset(f); this.cargar(); },
      error: (e) => this.snack.open(e?.error?.msg || 'Error al guardar', 'Cerrar', { duration: 3000 }),
    });
  }

  reset(f: NgForm) {
    f.resetForm();
    this.form = { _id: '', nombre: '', descripcion: '', profesor: '' };
  }
}
