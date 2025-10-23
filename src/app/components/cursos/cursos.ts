import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CursoService } from '../../services/curso.service';
import { AnioLectivoService, AnioLectivo } from '../../services/anio-lectivo.service';
import { UsuarioService, Usuario } from '../../services/usuario.service';
import { MateriaService, Materia } from '../../services/materia.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule, MatSelectModule],
  template: `
  <div class="container">
    <h1>Gestión de Cursos</h1>

    <form #f="ngForm" (ngSubmit)="guardar(f)" class="form">
      <input type="hidden" [(ngModel)]="form._id" name="_id" />

      <div class="row">
        <label>Nombre</label>
        <input type="text" name="nombre" [(ngModel)]="form.nombre" required />
      </div>

      <div class="row">
        <label>Año Lectivo</label>
        <select name="anioLectivo" [(ngModel)]="form.anioLectivo" required>
          <option [ngValue]="''" disabled>Seleccione...</option>
          <option *ngFor="let a of anios" [ngValue]="a._id">{{ a.nombre }}</option>
        </select>
      </div>

      <div class="row">
        <label>Tutor</label>
        <select name="profesorTutor" [(ngModel)]="form.profesorTutor" required>
          <option [ngValue]="''" disabled>Seleccione...</option>
          <option *ngFor="let p of profesores" [ngValue]="p._id">{{ p.nombre }} ({{ p.correo }})</option>
        </select>
      </div>

      <div class="row">
        <label>Materias</label>
        <select name="materias" [(ngModel)]="form.materias" multiple size="6" required>
          <option *ngFor="let m of materias" [ngValue]="m._id">
            {{ m.nombre }} — {{ m.profesor?.nombre || 'Sin prof.' }}
          </option>
        </select>
      </div>

      <div class="row">
        <label>Estudiantes</label>
        <select name="estudiantes" [(ngModel)]="form.estudiantes" multiple size="8" required>
          <option *ngFor="let e of estudiantes" [ngValue]="e.uid || e.uid">
            {{ e.nombre }} — {{ e.cedula }}
          </option>
        </select>
      </div>

      <div class="actions">
        <button mat-raised-button color="primary" type="submit">{{ form._id ? 'Actualizar' : 'Crear' }}</button>
        <button mat-raised-button type="button" (click)="reset(f)">Limpiar</button>
      </div>
    </form>

    <table mat-table [dataSource]="data" class="mat-elevation-z8" *ngIf="data?.length">
      <ng-container matColumnDef="nombre">
        <th mat-header-cell *matHeaderCellDef>Curso</th>
        <td mat-cell *matCellDef="let c">{{ c.nombre }}</td>
      </ng-container>

      <ng-container matColumnDef="anioLectivo">
        <th mat-header-cell *matHeaderCellDef>Año</th>
        <td mat-cell *matCellDef="let c">{{ c.anioLectivo?.nombre || '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="tutor">
        <th mat-header-cell *matHeaderCellDef>Tutor</th>
        <td mat-cell *matCellDef="let c">{{ c.profesorTutor?.nombre || c.profesorTutor?.correo || '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="materias">
        <th mat-header-cell *matHeaderCellDef>Materias</th>
        <td mat-cell *matCellDef="let c">{{ c.materias?.length || 0 }}</td>
      </ng-container>

      <ng-container matColumnDef="estudiantes">
        <th mat-header-cell *matHeaderCellDef>Estudiantes</th>
        <td mat-cell *matCellDef="let c">{{ c.estudiantes?.length || 0 }}</td>
      </ng-container>

      <ng-container matColumnDef="acciones">
        <th mat-header-cell *matHeaderCellDef>Acciones</th>
        <td mat-cell *matCellDef="let c">
          <button mat-icon-button color="accent" (click)="editar(c)"><mat-icon>edit</mat-icon></button>
          <button mat-icon-button color="warn" (click)="eliminar(c)"><mat-icon>delete</mat-icon></button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols"></tr>
    </table>
  </div>
  `,
  styles: [`
    .container { padding: 20px; }
    .form { display: grid; gap: 10px; margin-bottom: 16px; max-width: 900px; }
    .row { display: grid; gap: 4px; }
    .actions { display: flex; gap: 8px; }
    select[multiple] { min-height: 140px; }
  `],
})
export class CursosComponent implements OnInit {
  private cursosSrv = inject(CursoService);
  private anioSrv = inject(AnioLectivoService);
  private usuarioSrv = inject(UsuarioService);
  private materiaSrv = inject(MateriaService);
  private estSrv = inject(EstudianteService);
  private snack = inject(MatSnackBar);

  data: any[] = [];

  anios: AnioLectivo[] = [];
  profesores: Usuario[] = [];
  materias: any[] = [];
  estudiantes: Estudiante[] = [];

  form: any = {
    _id: '',
    nombre: '',
    anioLectivo: '',
    profesorTutor: '',
    materias: [] as string[],
    estudiantes: [] as string[],
  };

  cols = ['nombre', 'anioLectivo', 'tutor', 'materias', 'estudiantes', 'acciones'];

  ngOnInit(): void {
    this.cargar();
  }

  cargar() {
    this.cursosSrv.getAll().subscribe((c) => (this.data = c || []));
    this.anioSrv.getAll().subscribe((a) => (this.anios = a || []));
    this.usuarioSrv.getProfesores().subscribe((p) => (this.profesores = p || []));
    this.materiaSrv.getAll().subscribe((r: any) => (this.materias = r?.materias || r || []));
    this.estSrv.getAll().subscribe((e) => (this.estudiantes = e || []));
  }

  editar(curso: any) {
    this.form = {
      _id: curso._id,
      nombre: curso.nombre,
      anioLectivo: curso.anioLectivo?._id || curso.anioLectivo,
      profesorTutor: curso.profesorTutor?._id || curso.profesorTutor,
      materias: (curso.materias || []).map((m: any) => m._id || m),
      estudiantes: (curso.estudiantes || []).map((e: any) => e._id || e.uid || e),
    };
  }

  eliminar(curso: any) {
    if (!confirm('¿Eliminar curso?')) return;
    this.cursosSrv.delete(curso._id).subscribe({
      next: () => { this.snack.open('Curso eliminado', 'Cerrar', { duration: 2500 }); this.cargar(); },
      error: () => this.snack.open('Error al eliminar', 'Cerrar', { duration: 3000 }),
    });
  }

  guardar(f: NgForm) {
    if (f.invalid) { this.snack.open('Complete el formulario', 'Cerrar', { duration: 3000 }); return; }
    const dto = {
      nombre: this.form.nombre,
      anioLectivo: this.form.anioLectivo,
      profesorTutor: this.form.profesorTutor,
      materias: this.form.materias,
      estudiantes: this.form.estudiantes,
    };

    const obs = this.form._id
      ? this.cursosSrv.update(this.form._id, dto)
      : this.cursosSrv.create(dto);

    obs.subscribe({
      next: () => { this.snack.open('Guardado', 'Cerrar', { duration: 2500 }); this.reset(f); this.cargar(); },
      error: (e) => this.snack.open(e?.error?.msg || 'Error al guardar', 'Cerrar', { duration: 3000 }),
    });
  }

  reset(f: NgForm) {
    f.resetForm();
    this.form = { _id: '', nombre: '', anioLectivo: '', profesorTutor: '', materias: [], estudiantes: [] };
  }
}
