// src/app/components/profesor-notas-curso/profesor-notas-curso.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';
import { CalificacionService, Trimestre, BulkTrimestrePayload10 } from '../../services/calificacion.service';

type MateriaAsignada = { materiaId: string; materiaNombre: string };

type RowVM = {
  estudianteId: string;
  estudianteNombre: string;
  /** UI: 0..10 directo */
  promedioTrimestral: number | null;
};

@Component({
  standalone: true,
  selector: 'app-profesor-notas-curso',
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSelectModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule,
    MatIconModule, MatDividerModule, MatTableModule, MatProgressBarModule, MatTooltipModule
  ],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <div class="header">
        <div class="title-block">
          <div class="eyebrow"><mat-icon>grading</mat-icon> Registro de calificaciones</div>
          <h2 class="title">Notas por Curso (Trimestrales)</h2>
          <p class="sub">Ingrese la <b>Nota Trimestral</b> en escala 0–10. La tabla es compacta para agilizar la captura.</p>
        </div>
        <div class="actions">
          <button mat-stroked-button class="btn-outline" (click)="recargar()" matTooltip="Volver a cargar datos del curso">
            <mat-icon>refresh</mat-icon>
            <span>Recargar</span>
          </button>
          <button mat-flat-button color="primary" class="btn-primary" (click)="guardar()" [disabled]="guardando() || !rows().length">
            <mat-icon>save</mat-icon>
            <span>{{ guardando() ? 'Guardando...' : 'Guardar' }}</span>
          </button>
        </div>
      </div>

      <mat-divider class="soft-divider"></mat-divider>

      <div class="filters">
        <mat-form-field appearance="outline" class="ff dense">
          <mat-label>Curso</mat-label>
          <mat-select [(ngModel)]="cursoId" name="cursoId" (selectionChange)="onCursoChange()" required>
            <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">{{ c.nombre }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field *ngIf="materiasAsignadas().length > 1" appearance="outline" class="ff dense">
          <mat-label>Materia</mat-label>
          <mat-select [(ngModel)]="materiaId" name="materiaId" (selectionChange)="cargarTabla()" required>
            <mat-option *ngFor="let m of materiasAsignadas()" [value]="m.materiaId">{{ m.materiaNombre }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ff dense">
          <mat-label>Trimestre</mat-label>
          <mat-select [(ngModel)]="trimestre" name="trimestre" (selectionChange)="cargarTabla()" required>
            <mat-option [value]="'T1'">Primer Trimestre</mat-option>
            <mat-option [value]="'T2'">Segundo Trimestre</mat-option>
            <mat-option [value]="'T3'">Tercer Trimestre</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ff dense search">
          <mat-label>Buscar estudiante</mat-label>
          <input
            matInput
            [ngModel]="q()"
            (ngModelChange)="q.set($event); onSearchChange()"
            placeholder="Escriba un nombre…"
          />
          <button *ngIf="q()" matSuffix mat-icon-button aria-label="Limpiar búsqueda" (click)="clearSearch()"><mat-icon>close</mat-icon></button>
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

      <div class="table-wrap" *ngIf="viewRows().length; else noRows">
        <table mat-table [dataSource]="viewRows()" class="modern-table compact mat-elevation-z1" aria-label="Tabla de estudiantes y notas">
          <ng-container matColumnDef="n">
            <th mat-header-cell *matHeaderCellDef class="sticky center">#</th>
            <td mat-cell *matCellDef="let r; let i = index" class="muted center">{{ pageStart() + i + 1 }}</td>
          </ng-container>

          <ng-container matColumnDef="est">
            <th mat-header-cell *matHeaderCellDef class="sticky">Estudiante</th>
            <td mat-cell *matCellDef="let r">
              <div class="student-cell">
                <div class="avatar" aria-hidden="true">{{ r.estudianteNombre?.[0] || 'E' }}</div>
                <div class="student-name" [matTooltip]="r.estudianteNombre">{{ r.estudianteNombre }}</div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="prom">
            <th mat-header-cell *matHeaderCellDef class="sticky">Nota Trimestral</th>
            <td mat-cell *matCellDef="let r">
              <mat-form-field appearance="outline" class="cell-ff dense">
                <mat-label>0 a 10</mat-label>
                <input
                  matInput
                  type="number"
                  inputmode="decimal"
                  min="0"
                  max="10"
                  step="0.1"
                  [(ngModel)]="r.promedioTrimestral"
                  (ngModelChange)="onNotaChange(r)"
                />
              </mat-form-field>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" class="row"></tr>
        </table>

        <div class="table-footer">
          <div class="pager">
            <div class="range">Mostrando {{ pageStart()+1 }}–{{ pageEnd() }} de {{ filteredCount() }}</div>
            <div class="pager-controls">
              <mat-form-field appearance="outline" class="size-ff dense">
                <mat-label>Filas</mat-label>
                <mat-select [(ngModel)]="pageSize" (selectionChange)="onPageSizeChange()">
                  <mat-option [value]="10">10</mat-option>
                  <mat-option [value]="25">25</mat-option>
                  <mat-option [value]="50">50</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-icon-button (click)="firstPage()" [disabled]="pageIndex() === 0" aria-label="Primera página"><mat-icon>first_page</mat-icon></button>
              <button mat-icon-button (click)="prevPage()" [disabled]="pageIndex() === 0" aria-label="Página anterior"><mat-icon>chevron_left</mat-icon></button>
              <button mat-icon-button (click)="nextPage()" [disabled]="(pageIndex()+1) >= totalPages()" aria-label="Página siguiente"><mat-icon>chevron_right</mat-icon></button>
              <button mat-icon-button (click)="lastPage()" [disabled]="(pageIndex()+1) >= totalPages()" aria-label="Última página"><mat-icon>last_page</mat-icon></button>
            </div>
          </div>

          <div class="footer-actions">
            <button mat-stroked-button class="btn-outline" (click)="recargar()">
              <mat-icon>refresh</mat-icon>
              Recargar
            </button>
            <button mat-flat-button color="primary" class="btn-primary" (click)="guardar()" [disabled]="guardando() || !rows().length">
              <mat-icon>save</mat-icon>
              {{ guardando() ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>

      <ng-template #noRows>
        <div class="empty">
          <div class="empty-icon">📋</div>
          <div class="empty-title">No hay estudiantes cargados</div>
          <div class="empty-sub">Seleccione <b>Curso</b>, (si aplica) <b>Materia</b> y <b>Trimestre</b> para visualizar la tabla.</div>
          <button mat-stroked-button class="btn-outline mt-8" (click)="recargar()">
            <mat-icon>refresh</mat-icon>
            Intentar de nuevo
          </button>
        </div>
      </ng-template>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 16px; max-width: 1100px; margin: 0 auto; }
    .card { padding: 16px; border-radius: 16px; display: grid; gap: 12px; }
    .header { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
    .title-block .eyebrow { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; letter-spacing: .3px; opacity: .8; }
    .title { margin: 0; font-size: 20px; font-weight: 700; }
    .sub { margin: 0; opacity: .8; font-size: 12.5px; }
    .actions { display: inline-flex; gap: 8px; align-items: center; }
    .btn-primary mat-icon, .btn-outline mat-icon { margin-right: 6px; }
    .soft-divider { opacity: .45; }
    .filters { display: grid; grid-template-columns: repeat(4, minmax(210px, 1fr)); gap: 10px; align-items: end; }
    .ff { width: 100%; }
    .dense .mat-mdc-form-field-infix { padding-top: 6px !important; padding-bottom: 6px !important; }
    .dense .mat-mdc-text-field-wrapper { --mdc-filled-text-field-container-height: 36px; }
    .search .mat-mdc-form-field-infix { padding-right: 0; }
    .table-wrap { margin-top: 4px; overflow: auto; border-radius: 12px; border: 1px solid #EAEAEA; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
    .modern-table th { background: #F9FAFB; font-weight: 600; color: #2f2f2f; }
    .modern-table th, .modern-table td { padding: 6px 10px; }
    .modern-table.compact .row { height: 36px; }
    .modern-table .sticky { position: sticky; top: 0; z-index: 1; }
    .modern-table .row:nth-child(odd) td { background: #FFFFFF; }
    .modern-table .row:nth-child(even) td { background: #FBFBFD; }
    .center { text-align: center; }
    .muted { opacity: .7; }
    .student-cell { display: flex; align-items: center; gap: 8px; min-width: 200px; }
    .avatar { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: #EEF2FF; font-weight: 700; font-size: 11px; }
    .student-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cell-ff { width: 110px; }
    .cell-ff .mat-mdc-form-field-infix { padding-top: 0 !important; padding-bottom: 0 !important; }
    .table-footer { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; padding: 10px; border-top: 1px solid #EEE; background: #FFF; }
    .pager { display: flex; align-items: center; gap: 10px; }
    .range { font-size: 12px; opacity: .8; }
    .pager-controls { display: inline-flex; align-items: center; gap: 4px; }
    .size-ff { width: 110px; }
    .footer-actions { display: inline-flex; gap: 8px; }
    .empty { padding: 28px 14px; display: grid; place-items: center; text-align: center; gap: 6px; color: #555; }
    .empty-icon { font-size: 40px; }
    .empty-title { font-weight: 700; }
    .mt-8 { margin-top: 8px; }
    @media (max-width: 1200px) { .filters { grid-template-columns: repeat(3, minmax(210px, 1fr)); } }
    @media (max-width: 900px)  { .filters { grid-template-columns: 1fr 1fr; } .student-cell { min-width: 160px; } }
    @media (max-width: 600px)  {
      .header { grid-template-columns: 1fr; }
      .actions { justify-content: flex-start; }
      .filters { grid-template-columns: 1fr; }
      .cell-ff { width: 100px; }
      .table-footer { grid-template-columns: 1fr; gap: 8px; }
      .pager { justify-content: space-between; width: 100%; }
    }
  `]
})
export class ProfesorNotasCursoComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSrv = inject(CursoService);
  private estuSrv = inject(EstudianteService);
  public caliSrv = inject(CalificacionService);

  // Estado base
  cursos = signal<any[]>([]);
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);

  // Selección
  cursoId = '';
  materiaId = '';
  trimestre: Trimestre = 'T1';

  // Detalle curso
  cursoDetalle = signal<any | null>(null);

  // Tabla
  cols: string[] = ['n','est','prom'];
  rows = signal<RowVM[]>([]);

  // Búsqueda / paginación
  q = signal<string>('');
  pageSize = signal<number>(25);
  pageIndex = signal<number>(0);

  ngOnInit(): void {
    this.auth.ensureUserLoaded().subscribe(() => {
      const me = this.auth.getuser()?.id ?? '';
      this.cursoSrv.listar().subscribe({
        next: (res: any) => {
          const all = res?.data ?? res ?? [];
          const mios = all.filter((c: any) =>
            (c.materias ?? []).some((m: any) => this.asId(m?.profesor) === me)
          );
          this.cursos.set(mios);
          if (mios.length === 1) {
            this.cursoId = this.asId(mios[0]._id);
            this.onCursoChange();
          }
        },
        error: () => this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 })
      });
    });
  }

  // ===== Helpers de ID/OID =====
  private validOid(id: string): boolean {
    return /^[a-fA-F0-9]{24}$/.test(id);
  }

  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      // prioriza _id, pero prueba uid, id, value
      return String(val._id ?? val.uid ?? val.id ?? val.value ?? '');
    }
    return String(val);
  }

  // ===== Derivados =====
  cursoSel = computed(() => (this.cursos() ?? []).find(c => this.asId(c._id) === this.cursoId));
  anioLectivoId = computed(() => this.asId(this.cursoDetalle()?.anioLectivo || this.cursoSel()?.anioLectivo));

  materiasAsignadas = computed<MateriaAsignada[]>(() => {
    const me = this.auth.getuser()?.id ?? '';
    const mats = (this.cursoDetalle()?.materias ?? this.cursoSel()?.materias ?? [])
      .filter((m: any) => this.asId(m?.profesor) === me)
      .map((m: any) => ({
        materiaId: this.asId(m?.materia),
        materiaNombre: m?.materia?.nombre ?? m?.materia ?? '—'
      }));
    return mats;
  });

  // Búsqueda + paginación
  filteredRows = computed(() => {
    const term = (this.q() || '').trim().toLowerCase();
    const base = this.rows();
    if (!term) return base;
    return base.filter(r => (r.estudianteNombre || '').toLowerCase().includes(term));
  });
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())));
  pageStart = computed(() => this.pageIndex() * this.pageSize());
  pageEnd = computed(() => Math.min(this.filteredRows().length, this.pageStart() + this.pageSize()));
  viewRows = computed(() => this.filteredRows().slice(this.pageStart(), this.pageEnd()));
  filteredCount = computed(() => this.filteredRows().length);

  // ===== Handlers =====
  onCursoChange(): void {
    this.cursoDetalle.set(null);
    this.rows.set([]);
    this.materiaId = '';
    this.resetPaging();
    if (!this.cursoId) return;

    this.cargando.set(true);
    this.cursoSrv.obtener(this.cursoId).subscribe({
      next: (res: any) => {
        const c = res?.data ?? res ?? null;
        this.cursoDetalle.set(c);

        // Si estudiantes son IDs, enriquecemos con nombres en frontend
        const est = (c?.estudiantes ?? []) as any[];
        const vienenIds = est.length > 0 && typeof est[0] === 'string';

        if (vienenIds) {
          this.estuSrv.getAllMap().subscribe((mapa) => {
            const enriquecidos = est.map((id: string) => {
              const e: Estudiante | undefined = mapa.get(id);
              // IMPORTANTE: guarda tanto _id como uid para que asId los encuentre
              return e
                ? { _id: id, uid: id, nombre: e.nombre, email: e.email }
                : { _id: id, uid: id, nombre: id };
            });

            const reconstruido = { ...(this.cursoDetalle() ?? {}), estudiantes: enriquecidos };
            this.cursoDetalle.set(reconstruido);

            const mats = this.materiasAsignadas();
            this.materiaId = mats.length === 1 ? mats[0].materiaId : '';
            this.cargarTabla();
            this.cargando.set(false);
          });
        } else {
          const mats = this.materiasAsignadas();
          this.materiaId = mats.length === 1 ? mats[0].materiaId : '';
          this.cargarTabla();
          this.cargando.set(false);
        }
      },
      error: () => { this.cargando.set(false); this.sb.open('No se pudo cargar el detalle del curso', 'Cerrar', { duration: 3000 }); }
    });
  }

  recargar(): void {
    if (!this.cursoId) return;
    this.onCursoChange();
  }

  onSearchChange(): void { this.pageIndex.set(0); }
  clearSearch(): void { this.q.set(''); this.pageIndex.set(0); }
  onPageSizeChange(): void { this.pageIndex.set(0); }
  prevPage(): void { if (this.pageIndex() > 0) this.pageIndex.set(this.pageIndex() - 1); }
  nextPage(): void { if ((this.pageIndex() + 1) < this.totalPages()) this.pageIndex.set(this.pageIndex() + 1); }
  firstPage(): void { this.pageIndex.set(0); }
  lastPage(): void { this.pageIndex.set(this.totalPages() - 1); }
  private resetPaging(): void { this.pageIndex.set(0); this.pageSize.set(25); this.q.set(''); }

  /** Construye la tabla con estudiantes y prellena notas */
  cargarTabla(): void {
    this.rows.set([]);
    this.resetPaging();
    if (!this.cursoDetalle() || !this.trimestre) return;
    if (this.materiasAsignadas().length > 1 && !this.materiaId) return;

    const estudiantes: any[] = this.cursoDetalle()?.estudiantes ?? [];
    const base: RowVM[] = (estudiantes ?? []).map((e: any, idx: number): RowVM => {
      const id = this.asId(e);
      const nombre =
        (typeof e === 'object' && (e?.nombre || e?.fullname || e?.email)) ?
          (e.nombre ?? e.fullname ?? e.email) :
          (id || `Estudiante ${idx + 1}`);

      return { estudianteId: id, estudianteNombre: String(nombre), promedioTrimestral: null };
    }).sort((a: RowVM, b: RowVM) => a.estudianteNombre.localeCompare(b.estudianteNombre));

    if (!base.length) { this.rows.set([]); return; }

    this.cargando.set(true);
    this.caliSrv.obtenerNotas({
      cursoId: this.asId(this.cursoDetalle()?._id),
      anioLectivoId: this.anioLectivoId(),
      materiaId: this.materiaId || this.materiasAsignadas()[0]?.materiaId || '',
      trimestre: this.trimestre,
    }).subscribe({
      next: (res) => {
        const idx = new Map<string, any>();
        (res?.estudiantes ?? []).forEach((it: any) => idx.set(it.estudianteId, it));
        const merged = base.map((r: RowVM): RowVM => {
          const prev = idx.get(r.estudianteId);
          const prom10 = typeof prev?.promedioTrimestral === 'number' ? prev.promedioTrimestral : null;
          return { ...r, promedioTrimestral: prom10 };
        });
        this.rows.set(merged);
        this.cargando.set(false);
      },
      error: () => { this.rows.set(base); this.cargando.set(false); }
    });
  }

  onNotaChange(r: RowVM): void {
    if (r.promedioTrimestral == null) return;
    const v = Number(r.promedioTrimestral);
    if (isNaN(v)) r.promedioTrimestral = null as any;
    else r.promedioTrimestral = Math.min(10, Math.max(0, v));
  }

  guardar(): void {
    const anioId = this.anioLectivoId();
    const materia = this.materiaId || this.materiasAsignadas()[0]?.materiaId || '';
    const cId = this.cursoId;

    // Validaciones de IDs principales (para evitar 400)
    if (!this.validOid(cId) || !this.validOid(anioId) || !this.validOid(materia)) {
      console.warn('[ProfesorNotasCurso] IDs inválidos:', { cursoId: cId, anioLectivoId: anioId, materiaId: materia });
      this.sb.open('IDs inválidos (curso / año lectivo / materia)', 'Cerrar', { duration: 3500 });
      return;
    }

    if (!this.rows().length) {
      this.sb.open('No hay estudiantes para guardar', 'Cerrar', { duration: 2500 });
      return;
    }

    // Valida notas 0..10
    const invalNota = this.rows().some((r: RowVM) => {
      const n = r.promedioTrimestral;
      return n != null && (isNaN(Number(n)) || Number(n) < 0 || Number(n) > 10);
    });
    if (invalNota) {
      this.sb.open('Cada nota debe estar entre 0 y 10.', 'Cerrar', { duration: 3000 });
      return;
    }

    // Filtra filas con estudianteId no-OID para evitar “estudianteId inválido”
    const filasInvalidas = this.rows().filter(r => !this.validOid(r.estudianteId));
    if (filasInvalidas.length) {
      console.warn('[ProfesorNotasCurso] Filas ignoradas por ID no válido:', filasInvalidas.map(f => f.estudianteNombre));
      this.sb.open(`Se ignoraron ${filasInvalidas.length} estudiante(s) con ID inválido.`, 'Cerrar', { duration: 4000 });
    }

    const filasValidas = this.rows().filter(r => this.validOid(r.estudianteId));

    if (!filasValidas.length) {
      this.sb.open('Todos los estudiantes tienen ID inválido. Nada que guardar.', 'Cerrar', { duration: 3500 });
      return;
    }

    const tableRows = filasValidas.map((r: RowVM) => ({
      estudianteId: r.estudianteId,
      promedioTrimestral: r.promedioTrimestral == null ? null : Number(r.promedioTrimestral),
    }));

    const payload: BulkTrimestrePayload10 = this.caliSrv.buildBulkPayload({
      cursoId: cId,
      anioLectivoId: anioId,
      materiaId: materia,
      trimestre: this.trimestre,
      tableRows
    });

    this.guardando.set(true);
    this.caliSrv.cargarTrimestreBulk(payload).subscribe({
      next: (r) => { this.guardando.set(false); this.sb.open(r?.message ?? 'Notas guardadas', 'Cerrar', { duration: 2500 }); this.cargarTabla(); },
      error: (e) => { this.guardando.set(false); this.sb.open(e?.error?.message ?? 'Error al guardar', 'Cerrar', { duration: 3500 }); }
    });
  }
}
