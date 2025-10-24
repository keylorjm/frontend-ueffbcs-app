import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { CursoService } from '../../services/curso.service';
import { AnioLectivoService, AnioLectivo } from '../../services/anio-lectivo.service';
import { UsuarioService, Usuario } from '../../services/usuario.service';
import { MateriaService, Materia } from '../../services/materia.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    // Material
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule,
  ],
  template: `
  <div class="wrap">
    <!-- Header -->
    <div class="header">
      <div class="titles">
        <h1 class="title">Gestión de Cursos</h1>
        <p class="subtitle">Administra cursos, tutores, materias y estudiantes</p>
      </div>

      <div class="actions">
        <button mat-stroked-button class="btn-outline" (click)="cargar()" matTooltip="Recargar listado">
          <mat-icon>refresh</mat-icon>
          Recargar
        </button>

        <button mat-raised-button color="primary" class="btn-primary" (click)="toggleForm()">
          <mat-icon>{{ mostrarFormulario ? 'arrow_back' : 'add' }}</mat-icon>
          {{ mostrarFormulario ? 'Volver' : 'Agregar Curso' }}
        </button>
      </div>
    </div>

    <!-- LISTA -->
    <mat-card *ngIf="!mostrarFormulario" class="card">
      <mat-card-content>

        <div class="table-wrap">
          <table mat-table [dataSource]="data" class="modern-table">

            <!-- Curso -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Curso</th>
              <td mat-cell *matCellDef="let c">
                <div class="cell-strong">{{ c.nombre }}</div>
              </td>
            </ng-container>

            <!-- Año -->
            <ng-container matColumnDef="anioLectivo">
              <th mat-header-cell *matHeaderCellDef>Año</th>
              <td mat-cell *matCellDef="let c">
                <span class="pill pill-info">{{ c.anioLectivo?.nombre || '—' }}</span>
              </td>
            </ng-container>

            <!-- Tutor -->
            <ng-container matColumnDef="tutor">
              <th mat-header-cell *matHeaderCellDef>Tutor</th>
              <td mat-cell *matCellDef="let c">
                <div class="muted">
                  {{ c.profesorTutor?.nombre || c.profesorTutor?.correo || '—' }}
                </div>
              </td>
            </ng-container>

            <!-- Materias -->
            <ng-container matColumnDef="materias">
              <th mat-header-cell *matHeaderCellDef>Materias</th>
              <td mat-cell *matCellDef="let c">
                <mat-chip-set>
                  <mat-chip>{{ c.materias?.length || 0 }}</mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>

            <!-- Estudiantes -->
            <ng-container matColumnDef="estudiantes">
              <th mat-header-cell *matHeaderCellDef>Estudiantes</th>
              <td mat-cell *matCellDef="let c">
                <mat-chip-set>
                  <mat-chip>{{ c.estudiantes?.length || 0 }}</mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>

            <!-- Acciones -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="th-actions">Acciones</th>
              <td mat-cell *matCellDef="let c" class="td-actions">
                <button mat-icon-button color="accent" (click)="editar(c)" matTooltip="Editar">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="eliminar(c)" matTooltip="Eliminar">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="row-hover"></tr>
          </table>

          <div *ngIf="!data?.length" class="empty">
            <mat-icon>inventory_2</mat-icon>
            <p>No hay cursos registrados</p>
            <button mat-stroked-button color="primary" (click)="toggleForm()">
              <mat-icon>add</mat-icon> Crear el primero
            </button>
          </div>
        </div>
      </mat-card-content>
    </mat-card>

    <!-- FORM -->
    <mat-card *ngIf="mostrarFormulario" class="card">
      <mat-card-content>
        <form #f="ngForm" (ngSubmit)="guardar(f)" class="form">
          <input type="hidden" [(ngModel)]="form._id" name="_id" />

          <div class="form-grid">
            <!-- Nombre -->
            <mat-form-field appearance="outline">
              <mat-label>Nombre del curso</mat-label>
              <input matInput name="nombre" [(ngModel)]="form.nombre" required placeholder="Ej. 3ro Bachillerato A" />
              <mat-icon matSuffix>class</mat-icon>
              <mat-hint>Identificador visible para todos</mat-hint>
            </mat-form-field>

            <!-- Año lectivo -->
            <mat-form-field appearance="outline">
              <mat-label>Año lectivo</mat-label>
              <mat-select name="anioLectivo" [(ngModel)]="form.anioLectivo" required>
                <mat-option [value]="" disabled>Seleccione…</mat-option>
                <mat-option *ngFor="let a of anios" [value]="a._id">{{ a.nombre }}</mat-option>
              </mat-select>
              <mat-icon matSuffix>calendar_month</mat-icon>
            </mat-form-field>

            <!-- Tutor -->
            <mat-form-field appearance="outline">
              <mat-label>Tutor</mat-label>
              <mat-select name="profesorTutor" [(ngModel)]="form.profesorTutor" required>
                <mat-option [value]="" disabled>Seleccione…</mat-option>
                <mat-option *ngFor="let p of profesores" [value]="p._id">
                  {{ p.nombre }} ({{ p.correo }})
                </mat-option>
              </mat-select>
              <mat-icon matSuffix>person</mat-icon>
            </mat-form-field>

            <!-- Materias -->
            <mat-form-field appearance="outline" class="col-span-2">
              <mat-label>Materias</mat-label>
              <mat-select name="materias" [(ngModel)]="form.materias" multiple required>
                <mat-option *ngFor="let m of materias" [value]="m._id">
                  {{ m.nombre }} — {{ m.profesor?.nombre || 'Sin prof.' }}
                </mat-option>
              </mat-select>
              <mat-hint>Seleccione una o varias materias</mat-hint>
            </mat-form-field>

            <!-- Estudiantes -->
            <mat-form-field appearance="outline" class="col-span-2">
              <mat-label>Estudiantes</mat-label>
              <mat-select name="estudiantes" [(ngModel)]="form.estudiantes" multiple required>
                <mat-option *ngFor="let e of estudiantes" [value]="e.uid || e.uid">
                  {{ e.nombre }} — {{ e.cedula }}
                </mat-option>
              </mat-select>
              <mat-hint>Puede seleccionar varios</mat-hint>
            </mat-form-field>
          </div>

          <mat-divider class="soft-divider"></mat-divider>

          <div class="form-actions">
            <button mat-raised-button color="primary" type="submit" class="btn-primary">
              <mat-icon>{{ form._id ? 'save' : 'add' }}</mat-icon>
              {{ form._id ? 'Actualizar' : 'Crear' }}
            </button>

            <button mat-stroked-button type="button" (click)="reset(f)" class="btn-outline">
              <mat-icon>undo</mat-icon>
              Limpiar
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  </div>
  `,
  styles: [`
    /* Layout base */
    .wrap {
      padding: 20px;
      display: grid;
      gap: 20px;
    }

    /* Header */
    .header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
    }
    .titles .title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: .2px;
    }
    .titles .subtitle {
      margin: 2px 0 0 0;
      color: #6b7280;
      font-size: 13px;
    }
    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      align-items: center;
    }
    .btn-primary mat-icon,
    .btn-outline mat-icon {
      margin-right: 6px;
    }

    /* Card */
    .card {
      border-radius: 16px;
      box-shadow: 0 6px 24px rgba(2, 6, 23, 0.06);
      overflow: hidden;
    }

    /* Tabla moderna */
    .table-wrap { width: 100%; overflow: auto; }
    table.modern-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 8px;
    }
    .modern-table th {
      font-weight: 600;
      font-size: 12px;
      letter-spacing: .4px;
      color: #6b7280;
      text-transform: uppercase;
      border-bottom: 1px solid #e5e7eb;
    }
    .modern-table td, .modern-table th {
      padding: 12px 16px;
      background: transparent;
    }
    .row-hover td {
      background: #fff;
      border-top: 1px solid #f3f4f6;
      border-bottom: 1px solid #f3f4f6;
    }
    .row-hover:hover td {
      background: #f9fafb;
    }
    .cell-strong {
      font-weight: 600;
      color: #111827;
    }
    .muted { color: #4b5563; }

    .th-actions { text-align: right; }
    .td-actions {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
    }

    /* Pills */
    .pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
    }
    .pill-info {
      background: #eef2ff;
      color: #3730a3;
      border: 1px solid #e0e7ff;
    }

    /* Empty state */
    .empty {
      padding: 32px;
      text-align: center;
      color: #6b7280;
      display: grid;
      gap: 10px;
      justify-items: center;
      border: 1px dashed #e5e7eb;
      border-radius: 14px;
      margin-top: 12px;
    }
    .empty mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #9ca3af;
    }

    /* Formulario */
    .form { display: grid; gap: 14px; }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .col-span-2 { grid-column: span 2; }

    @media (max-width: 860px) {
      .form-grid { grid-template-columns: 1fr; }
      .col-span-2 { grid-column: auto; }
    }

    .soft-divider { margin: 6px 0 2px 0; }

    .form-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding-top: 4px;
    }

    /* Botones */
    .btn-outline {
      border-color: #e5e7eb !important;
      background: #fff;
    }
    .btn-outline:hover { background: #f9fafb; }

    .btn-primary {
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(59, 130, 246, .25);
    }
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

  mostrarFormulario = false;

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

  toggleForm() {
    this.mostrarFormulario = !this.mostrarFormulario;
    if (!this.mostrarFormulario) this.resetForm();
  }

  cargar() {
    this.cursosSrv.getAll().subscribe((c) => (this.data = c || []));
    this.anioSrv.getAll().subscribe((a) => (this.anios = a || []));
    this.usuarioSrv.getProfesores?.name; // placeholder to avoid accidental changes
    this.usuarioSrv.getProfesores().subscribe((p) => (this.profesores = p || []));
    this.materiaSrv.getAll().subscribe((r: any) => (this.materias = r?.materias || r || []));
    this.estSrv.getAll().subscribe((e) => (this.estudiantes = e || []));
  }

  editar(curso: any) {
    this.mostrarFormulario = true;
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
      next: () => {
        this.snack.open('Curso eliminado', 'Cerrar', { duration: 2500 });
        this.cargar();
      },
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
      anioLectivo: this.form.anioLectivo,
      profesorTutor: this.form.profesorTutor,
      materias: this.form.materias,
      estudiantes: this.form.estudiantes,
    };

    const obs = this.form._id
      ? this.cursosSrv.update(this.form._id, dto)
      : this.cursosSrv.create(dto);

    obs.subscribe({
      next: () => {
        this.snack.open('Guardado con éxito', 'Cerrar', { duration: 2500 });
        this.reset(f);
        this.mostrarFormulario = false;
        this.cargar();
      },
      error: (e) =>
        this.snack.open(e?.error?.msg || 'Error al guardar', 'Cerrar', { duration: 3000 }),
    });
  }

  reset(f: NgForm) {
    f.resetForm();
    this.resetForm();
  }

  private resetForm() {
    this.form = {
      _id: '',
      nombre: '',
      anioLectivo: '',
      profesorTutor: '',
      materias: [],
      estudiantes: [],
    };
  }
}
