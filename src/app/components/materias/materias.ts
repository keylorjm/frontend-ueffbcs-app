import { Component, OnInit, AfterViewInit, inject, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

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
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  template: `
    <section class="wrap">
      <!-- Header -->
      <div class="header">
        <div class="title-wrap">
          <h1 class="title">Gestión de Materias</h1>
          <span class="subtitle">Crea, filtra y administra asignaturas</span>
        </div>

        <div class="actions">
          <!-- Search custom -->
          <div class="search">
            <mat-icon class="search-icon" aria-hidden="true">search</mat-icon>
            <input
              class="search-input"
              placeholder="Buscar por nombre, profesor o descripción…"
              [value]="filtroTexto"
              (input)="aplicarFiltro(($any($event.target).value || '').toString())"
              autocomplete="off"
            />
            <button
              class="search-clear"
              *ngIf="filtroTexto"
              (click)="limpiarFiltro()"
              aria-label="Limpiar">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <button mat-icon-button matTooltip="Refrescar" (click)="cargar()">
            <mat-icon>refresh</mat-icon>
          </button>

          <button
            mat-raised-button
            color="primary"
            class="btn-primary"
            (click)="mostrarFormulario = true"
            *ngIf="!mostrarFormulario">
            <mat-icon>add</mat-icon>
            Agregar
          </button>
        </div>
      </div>

      <!-- ===== FORMULARIO (soft-panel small) ===== -->
      <mat-card class="card" *ngIf="mostrarFormulario">
        <div class="soft-panel small">
          <div class="soft-header">
            <div class="soft-title">
              {{ form._id ? 'Editar Materia' : 'Nueva Materia' }}
            </div>
            <button type="button" class="soft-close" (click)="cancelar()" aria-label="Cerrar">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form #f="ngForm" (ngSubmit)="guardar(f)" class="soft-body compact" novalidate>
            <input type="hidden" [(ngModel)]="form._id" name="_id" />

            <label class="soft-label" for="nombre">Nombre</label>
            <input
              id="nombre"
              class="ui-input"
              name="nombre"
              [(ngModel)]="form.nombre"
              required
              placeholder="Ej. Matemáticas"
            />

            <label class="soft-label" for="descripcion">Descripción</label>
            <input
              id="descripcion"
              class="ui-input"
              name="descripcion"
              [(ngModel)]="form.descripcion"
              placeholder="Breve descripción"
            />

            <label class="soft-label" for="profesor">Profesor</label>
            <mat-select id="profesor" name="profesor" [(ngModel)]="form.profesor" required class="ui-select">
              <mat-option [value]="''" disabled>Seleccione…</mat-option>
              <mat-option *ngFor="let p of profesores" [value]="p._id">
                {{ p.nombre }} ({{ p.correo }})
              </mat-option>
            </mat-select>

            <div class="soft-footer compact">
              <button type="submit" class="btn-soft-primary" [disabled]="f.invalid">
                <mat-icon class="leading-icon">save</mat-icon>
                {{ form._id ? 'Actualizar' : 'Guardar' }}
              </button>
              <button type="button" class="btn-outline" (click)="cancelar()">Cancelar</button>
            </div>
          </form>
        </div>
      </mat-card>

      <!-- ===== LISTA ===== -->
      <mat-card class="card mat-elevation-z1" *ngIf="!mostrarFormulario">
        <div class="toolbar">
          <span class="results" *ngIf="dataSource.data?.length">
            {{ dataSource.filteredData.length }} resultado(s)
          </span>
        </div>

        <div class="loader" *ngIf="loading">
          <mat-spinner diameter="48"></mat-spinner>
          <p class="muted">Cargando materias…</p>
        </div>

        <div class="table-wrap table-slim" *ngIf="!loading">
          <table
            mat-table
            [dataSource]="dataSource"
            matSort
            class="table compact modern-table"
            *ngIf="dataSource?.data?.length">

            <!-- Nombre -->
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Materia</th>
              <td mat-cell *matCellDef="let m">
                <div class="cell-nombre">
                  <span class="nombre">{{ (m.nombre || '—') }}</span>
                </div>
                <div class="muted small">{{ m.descripcion || 'Sin descripción' }}</div>
              </td>
            </ng-container>

            <!-- Profesor -->
            <ng-container matColumnDef="profesor">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Profesor</th>
              <td mat-cell *matCellDef="let m">
                <div class="nombre">{{ m.profesor?.nombre || '—' }}</div>
                <div class="mono muted small">{{ m.profesor?.correo || '' }}</div>
              </td>
            </ng-container>

            <!-- Acciones -->
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef class="text-right">Acciones</th>
              <td mat-cell *matCellDef="let m" class="text-right actions-cell">
                <button mat-icon-button color="primary" class="icon-btn" matTooltip="Editar" (click)="editar(m)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" class="icon-btn" matTooltip="Eliminar" (click)="eliminar(m)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns" class="data-row"></tr>
          </table>

          <div *ngIf="!dataSource?.data?.length" class="empty-state">
            <mat-icon>inbox</mat-icon>
            <div>
              <h3>Sin registros</h3>
              <p>Agrega una materia o cambia tu búsqueda.</p>
              <button mat-stroked-button class="btn-outline" (click)="limpiarFiltro()">Limpiar búsqueda</button>
            </div>
          </div>
        </div>

        <mat-paginator
          *ngIf="!loading && dataSource?.data?.length"
          [pageSize]="10"
          [pageSizeOptions]="[5,10,25,50]"
          showFirstLastButtons>
        </mat-paginator>
      </mat-card>
    </section>
  `,
  styles: [`
    /* ----- Layout general ----- */
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
    .btn-primary { border-radius: 12px; padding-inline: 14px; height: 40px; }
    .btn-outline {
      height: 36px; padding: 0 18px; border-radius: 18px; font-size: 14px; font-weight: 600;
      color: #1e3a8a; border: 1px solid #94a3b8; background: transparent; transition: all .2s ease;
    }
    .btn-outline:hover { background: #f1f5f9; border-color: #64748b; }

    /* Card */
    .card {
      border-radius: 18px;
      padding: 0;
      overflow: hidden;
      position: relative;
    }

    /* Toolbar secundaria */
    .toolbar { display: flex; align-items: center; justify-content: flex-end; padding: 10px 12px; }
    .results { font-size: 12px; color: #6b7280; }

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

    /* Soft panel (form) */
    .soft-panel.small {
      padding: 18px 22px 16px;
      max-width: 500px;
      margin: 14px auto;
      background: #f8f8fb;
      border-radius: 20px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 8px 20px rgba(0,0,0,.08);
    }
    .soft-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 2px 4px 8px; margin-bottom: 4px;
    }
    .soft-title { font-size: 21px; font-weight: 800; color: #111827; }
    .soft-close { height: 34px; width: 34px; border: none; background: transparent; border-radius: 8px; cursor: pointer; color: #374151; }
    .soft-close:hover { background: #f3f4f6; }
    .soft-body.compact { display: flex; flex-direction: column; gap: 10px; padding: 4px 2px 10px; }
    .soft-label { font-weight: 600; color: #111827; font-size: 13.5px; margin-top: 6px; }
    .ui-input {
      height: 38px; border-radius: 10px; padding: 0 12px; font-size: 14px;
      border: 1px solid #e5e7eb; background: #fff; transition: border-color .2s, box-shadow .2s;
    }
    .ui-input:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px #dbeafe; outline: none; }
    .ui-select .mat-mdc-select-trigger { height: 38px; align-items: center; }
    .soft-footer.compact {
      display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb;
    }
    .btn-soft-primary {
      height: 36px; padding: 0 18px; border-radius: 18px; font-size: 14px; font-weight: 600;
      color: #1d4ed8; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 2px 4px rgba(0,0,0,.04);
      display: inline-flex; align-items: center; gap: 6px;
    }
    .leading-icon { font-variation-settings: 'FILL' 0; }

    /* Tabla moderna */
    .table-wrap { background: #fff; }
    .modern-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .modern-table th.mat-header-cell {
      background: #f7f7fb; font-weight: 700; font-size: 13px; letter-spacing: .02em;
      border-bottom: 1px solid #e5e7eb; padding: 10px 14px; color: #111827;
    }
    .modern-table td.mat-cell {
      padding: 12px 14px; border-bottom: 1px solid #e5e7eb;
    }
    .modern-table tr.mat-row:hover td { background: #fafafa; }
    .table-slim .compact th.mat-header-cell,
    .table-slim .compact td.mat-cell { padding: 12px 14px; }
    .text-right { text-align: right; }
    .actions-cell { white-space: nowrap; }
    .icon-btn { margin-right: 2px; }

    /* Tipografía utilitaria */
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .muted { color: #6b7280; }
    .small { font-size: 12.5px; }

    /* Empty state */
    .empty-state {
      display: grid; grid-template-columns: 40px 1fr; gap: 12px; align-items: center;
      padding: 18px; border: 1px dashed #e5e7eb; border-radius: 12px; color: #6b7280; background: #fbfbfb;
      margin: 12px;
    }
    .empty-state mat-icon { font-size: 28px; height: 28px; width: 28px; opacity: .7; }

    /* Loader */
    .loader { display: grid; justify-content: center; align-items: center; gap: 8px; padding: 24px; }

    /* Paginador */
    mat-paginator { border-top: 1px solid #e5e7eb; }
  `],
})
export class MateriasComponent implements OnInit, AfterViewInit {
  private materiaSrv = inject(MateriaService);
  private usuarioSrv = inject(UsuarioService);
  private snack = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  data: Materia[] = [];
  dataSource = new MatTableDataSource<Materia>([]);
  profesores: Usuario[] = [];
  loading = false;
  mostrarFormulario = false;

  filtroTexto = '';

  form: any = { _id: '', nombre: '', descripcion: '', profesor: '' };
  displayedColumns = ['nombre', 'profesor', 'acciones'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    // Filtro por nombre, profesor.nombre/correo y descripción
    this.dataSource.filterPredicate = (m: Materia, filtro: string) => {
      const f = (filtro || '').trim().toLowerCase();
      const profesorNombre = (m as any)?.profesor?.nombre || '';
      const profesorCorreo = (m as any)?.profesor?.correo || '';
      return (
        (m.nombre || '').toLowerCase().includes(f) ||
        (m.descripcion || '').toLowerCase().includes(f) ||
        profesorNombre.toLowerCase().includes(f) ||
        profesorCorreo.toLowerCase().includes(f)
      );
    };
    this.cargar();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
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
        this.dataSource.data = this.data;
        if (this.paginator) this.paginator.firstPage();
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

  aplicarFiltro(valor: string) {
    this.filtroTexto = valor || '';
    this.dataSource.filter = this.filtroTexto.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  limpiarFiltro() {
    this.aplicarFiltro('');
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
