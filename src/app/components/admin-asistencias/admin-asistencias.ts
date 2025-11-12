// src/app/components/admin-asistencias/admin-asistencias.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// Servicios
import { AnioLectivoService, AnioLectivo } from '../../services/anio-lectivo.service';
import { CursoService } from '../../services/curso.service';
import { MateriaService, Materia } from '../../services/materia.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';
import { AsistenciaService, Trimestre } from '../../services/asistencia.service';

interface CursoLite {
  _id: string;
  nombre?: string;
  anioLectivo?: string | { _id: string };
  materias?: Array<any>;
  estudiantes?: Array<any>;
  alumnos?: Array<any>;
  inscritos?: Array<any>;
  matriculas?: Array<{ estudiante: any }>;
}

interface EstudianteLite { _id: string; nombre?: string; apellidos?: string; nombres?: string; }
interface MateriaFlat   { id: string;   nombre: string; }

interface FilaAsistencia {
  estudianteId: string;
  nombre: string;
  justificadas: number;     // >= 0
  injustificadas: number;   // >= 0
}

@Component({
  selector: 'app-admin-asistencias',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSelectModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDividerModule, MatSnackBarModule,
    MatProgressBarModule
  ],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <div class="header">
        <div class="eyebrow"><mat-icon>event_busy</mat-icon> Registro de asistencias (Admin)</div>
        <h2>Selecciona contexto y edita asistencias del trimestre</h2>
      </div>
      <mat-divider class="soft-divider"></mat-divider>

      <div class="filters">
        <!-- Año lectivo -->
        <mat-form-field appearance="outline" class="ff">
          <mat-label>Año lectivo</mat-label>
          <mat-select [(ngModel)]="anioId" (selectionChange)="onAnioChange()">
            <mat-option *ngFor="let a of anios()" [value]="a._id">{{ a.nombre }}</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Curso -->
        <mat-form-field appearance="outline" class="ff">
          <mat-label>Curso</mat-label>
          <mat-select [(ngModel)]="cursoId" (selectionChange)="onCursoChange()">
            <mat-option *ngFor="let c of cursos()" [value]="c._id">
              {{ c.nombre ?? c._id }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Materia -->
        <mat-form-field appearance="outline" class="ff">
          <mat-label>Materia</mat-label>
          <mat-select [(ngModel)]="materiaId" (selectionChange)="onMateriaOrTrimestreChange()">
            <mat-option *ngFor="let m of materiasFlat()" [value]="m.id">
              {{ m.nombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Trimestre -->
        <mat-form-field appearance="outline" class="ff small">
          <mat-label>Trimestre</mat-label>
          <mat-select [(ngModel)]="trimestre" (selectionChange)="onMateriaOrTrimestreChange()">
            <mat-option value="T1">T1</mat-option>
            <mat-option value="T2">T2</mat-option>
            <mat-option value="T3">T3</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Días laborables del trimestre -->
        <mat-form-field appearance="outline" class="ff small">
          <mat-label>Días laborables</mat-label>
          <input matInput type="number" min="0" [(ngModel)]="diasLaborables">
        </mat-form-field>
        <button mat-button (click)="guardarLaborables()" [disabled]="!contextOk()">Guardar días</button>

        <button mat-flat-button color="primary"
          (click)="guardarTabla()"
          [disabled]="guardando() || !contextOk() || !rows().length">
          <mat-icon>save</mat-icon>
          <span>{{ guardando() ? 'Guardando...' : 'Guardar todo' }}</span>
        </button>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

      <!-- Tabla editable de asistencias -->
      <div class="table-wrap" *ngIf="rows().length">
        <table class="grid">
          <thead>
            <tr>
              <th style="width:40%">Estudiante</th>
              <th style="width:15%">Justificadas</th>
              <th style="width:15%">Injustificadas</th>
              <th style="width:15%">Total faltas</th>
              <th style="width:15%">% inasistencia</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of rows(); let i = index">
              <td>{{ r.nombre }}</td>
              <td>
                <input class="num" type="number" min="0"
                  [ngModel]="r.justificadas"
                  (ngModelChange)="onJustChange(i, $event)"/>
              </td>
              <td>
                <input class="num" type="number" min="0"
                  [ngModel]="r.injustificadas"
                  (ngModelChange)="onInjChange(i, $event)"/>
              </td>
              <td>{{ r.justificadas + r.injustificadas }}</td>
              <td>{{ porcentajeInasistencia(r) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="table-actions">
          <button mat-button (click)="ponerTodos('just', 0)">Justificadas = 0</button>
          <button mat-button (click)="ponerTodos('inj', 0)">Injustificadas = 0</button>
          <button mat-button (click)="ponerTodos('ambas', 0)">Ambas = 0</button>
        </div>
      </div>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 8px; }
    .card { padding: 16px; }
    .header { margin-bottom: 8px; }
    .eyebrow { display:flex; align-items:center; gap:6px; color:#666; font-size:12px; text-transform:uppercase; }
    .filters { display:grid; grid-template-columns: repeat(6, minmax(160px, 1fr)); gap: 12px; align-items:end; }
    .ff { width: 100%; }
    .ff.small { max-width: 180px; }
    .soft-divider { margin: 10px 0 16px; }
    .table-wrap { margin-top: 16px; }
    .grid { width:100%; border-collapse: collapse; }
    .grid th, .grid td { border-bottom: 1px solid #e0e0e0; padding: 8px; text-align: left; }
    .grid th { font-weight: 600; background: #fafafa; }
    input.num { width: 110px; padding: 6px 8px; }
    .table-actions { margin-top: 8px; display:flex; gap: 8px; }
  `]
})
export class AdminAsistenciasComponent implements OnInit {
  private anioSrv = inject(AnioLectivoService);
  private cursoSrv = inject(CursoService);
  private materiaSrv = inject(MateriaService);
  private estSrv = inject(EstudianteService);
  private asisSrv = inject(AsistenciaService);
  private sb = inject(MatSnackBar);

  // datos
  anios        = signal<AnioLectivo[]>([]);
  cursos       = signal<CursoLite[]>([]);
  estudiantes  = signal<EstudianteLite[]>([]);
  materiasFlat = signal<MateriaFlat[]>([]);
  rows         = signal<FilaAsistencia[]>([]);

  // selección
  anioId: string | null = null;
  cursoId: string | null = null;
  materiaId: string | null = null;
  trimestre: Trimestre = 'T1';

  // config trimestre
  diasLaborables: number | null = null;

  // ui
  cargando  = signal<boolean>(false);
  guardando = signal<boolean>(false);

  ngOnInit(): void {
    this.anioSrv.getAll().subscribe({
      next: (rs: AnioLectivo[]) => this.anios.set(rs ?? []),
      error: () => this.anios.set([]),
    });
  }

  // ======== Cambios de selección ========

  onAnioChange(): void {
    if (!this.anioId) return;
    // reset dependientes
    this.cursos.set([]); this.estudiantes.set([]); this.materiasFlat.set([]); this.rows.set([]);
    this.cursoId = this.materiaId = null;
    this.diasLaborables = null;

    this.cursoSrv.listar().subscribe({
      next: (res: unknown) => {
        const all = this.normalizeArray<CursoLite>(res, 'data'); // [] o {data:[]}
        const anio = this.anioId!;
        const delAnio = all.filter((c: CursoLite) =>
          c?.anioLectivo === anio ||
          (typeof c?.anioLectivo === 'object' && (c.anioLectivo as { _id: string })?._id === anio)
        );
        this.cursos.set(delAnio);
      },
      error: () => this.cursos.set([]),
    });
  }

  onCursoChange(): void {
    if (!this.cursoId) return;
    this.cargando.set(true);
    this.materiaId = null;
    this.rows.set([]);
    this.diasLaborables = null;

    this.cursoSrv.obtener(this.cursoId).subscribe({
      next: (detRaw: any) => {
        const det = this.unwrapData(detRaw);

        // -------- MATERIAS --------
        const materiasRaw: any[] = Array.isArray(det?.materias) ? det.materias : [];
        const prelim: MateriaFlat[] = materiasRaw
          .map((m: any): MateriaFlat => {
            if (m?.materia && typeof m.materia === 'object')
              return { id: String(m.materia._id), nombre: String(m.materia.nombre ?? '') };
            if (typeof m?.materia === 'string') return { id: m.materia, nombre: '' };
            if (typeof m === 'string') return { id: m, nombre: '' };
            if (m?._id || m?.uid) return { id: String(m._id ?? m.uid), nombre: String(m?.nombre ?? '') };
            return { id: String(m?.materia?._id ?? ''), nombre: String(m?.materiaNombre ?? m?.materia?.nombre ?? '') };
          })
          .filter((x: MateriaFlat) => !!x.id);

        if (!prelim.some(p => !p.nombre)) {
          this.materiasFlat.set(prelim);
        } else {
          this.materiaSrv.getAll().subscribe({
            next: (res: any) => {
              const catalogo: Materia[] = Array.isArray(res) ? res
                                   : (res && Array.isArray(res.materias)) ? res.materias
                                   : [];
              const byId = new Map<string, Materia>(catalogo.map((x: Materia) => [String(x._id ?? x.uid ?? ''), x]));
              const completado: MateriaFlat[] = prelim.map(p => ({ id: p.id, nombre: p.nombre || (byId.get(p.id)?.nombre ?? p.id) }));
              this.materiasFlat.set(completado);
            },
            error: () => this.materiasFlat.set(prelim.map(p => ({ id: p.id, nombre: p.nombre || p.id })))
          });
        }

        // -------- ESTUDIANTES --------
        const { objects, ids } = this.extractStudents(det);

        if (objects.length) {
          this.estudiantes.set(this.normalizeStudentObjects(objects));
          this.cargando.set(false);
          return;
        }

        if (ids.length) {
          this.estSrv.pickManyByIds(ids).subscribe({
            next: (arr: Estudiante[]) => {
              const norm: EstudianteLite[] = (arr ?? [])
                .map((e: Estudiante): EstudianteLite => ({ _id: String(e._id ?? e.uid ?? ''), nombre: e.nombre }))
                .filter((e: EstudianteLite) => !!e._id);
              this.estudiantes.set(norm);
              this.cargando.set(false);
            },
            error: () => {
              // fallback: mostrar IDs para no bloquear
              this.estudiantes.set(ids.map((id: string): EstudianteLite => ({ _id: id })));
              this.cargando.set(false);
            }
          });
          return;
        }

        // Fallback: intentar con el curso listado en memoria
        const delListado = this.cursos().find((c: CursoLite) => c._id === this.cursoId);
        if (delListado) {
          const fromList = this.extractStudents(delListado);
          if (fromList.objects.length) {
            this.estudiantes.set(this.normalizeStudentObjects(fromList.objects));
          } else if (fromList.ids.length) {
            this.estSrv.pickManyByIds(fromList.ids).subscribe({
              next: (arr: Estudiante[]) => {
                const norm: EstudianteLite[] = (arr ?? [])
                  .map((e: Estudiante): EstudianteLite => ({ _id: String(e._id ?? e.uid ?? ''), nombre: e.nombre }))
                  .filter((e: EstudianteLite) => !!e._id);
                this.estudiantes.set(norm);
              },
              error: () => this.estudiantes.set(fromList.ids.map((id: string): EstudianteLite => ({ _id: id })))
            });
          } else {
            this.estudiantes.set([]);
          }
        } else {
          this.estudiantes.set([]);
        }

        this.cargando.set(false);
      },
      error: () => {
        this.materiasFlat.set([]);
        this.estudiantes.set([]);
        this.cargando.set(false);
      },
    });
  }

  onMateriaOrTrimestreChange(): void {
    this.rows.set([]);
    this.diasLaborables = null;
    if (this.contextOk() && this.estudiantes().length) {
      this.loadDiasLaborables();
      this.loadFaltasToTable();
    }
  }

  // ======== Días laborables ========

  private loadDiasLaborables(): void {
    this.asisSrv.getDiasLaborables({
      cursoId: this.cursoId!, anioLectivoId: this.anioId!, materiaId: this.materiaId!, trimestre: this.trimestre
    }).subscribe({
      next: (r) => this.diasLaborables = (r?.diasLaborables ?? null),
      error: () => this.diasLaborables = null
    });
  }

  guardarLaborables(): void {
    if (!this.contextOk() || this.diasLaborables == null || this.diasLaborables < 0) {
      this.sb.open('Verifica el contexto y los días laborables (>= 0)', 'Cerrar', { duration: 2500 });
      return;
    }
    this.asisSrv.setDiasLaborables({
      cursoId: this.cursoId!, anioLectivoId: this.anioId!, materiaId: this.materiaId!,
      trimestre: this.trimestre, diasLaborables: Math.max(0, Math.floor(Number(this.diasLaborables)))
    }).subscribe({
      next: () => this.sb.open('Días laborables guardados', 'Cerrar', { duration: 1800 }),
      error: () => this.sb.open('No se pudieron guardar los días laborables', 'Cerrar', { duration: 2500 })
    });
  }

  // ======== Faltas → Tabla editable ========

  private loadFaltasToTable(): void {
    this.cargando.set(true);
    this.asisSrv.obtenerFaltas({
      cursoId: this.cursoId!, anioLectivoId: this.anioId!, materiaId: this.materiaId!, trimestre: this.trimestre
    }).subscribe({
      next: (res: any) => {
        const existentes: Array<{estudianteId: string; faltasJustificadas: number; faltasInjustificadas: number}> =
          Array.isArray(res?.estudiantes) ? res.estudiantes : [];

        // índice de nombre para todos los estudiantes del curso
        const nameIndex = new Map<string, string>(
          this.estudiantes().map(e => [
            e._id,
            e.nombre ?? (e.apellidos ? (e.nombres ? (e.apellidos + ' ' + e.nombres) : e.apellidos) : e._id),
          ])
        );

        const mapJust = new Map<string, number>(existentes.map(r => [String(r.estudianteId), Math.max(0, Number(r.faltasJustificadas) || 0)]));
        const mapInj  = new Map<string, number>(existentes.map(r => [String(r.estudianteId), Math.max(0, Number(r.faltasInjustificadas) || 0)]));

        // construye filas para TODOS los estudiantes
        const tabla: FilaAsistencia[] = this.estudiantes().map(e => ({
          estudianteId: e._id,
          nombre: nameIndex.get(e._id) || e._id,
          justificadas: mapJust.get(e._id) ?? 0,
          injustificadas: mapInj.get(e._id) ?? 0
        }));

        tabla.sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.rows.set(tabla);
        this.cargando.set(false);
      },
      error: () => {
        // si falla, crea tabla vacía con 0s
        const tabla: FilaAsistencia[] = this.estudiantes().map(e => ({
          estudianteId: e._id,
          nombre: e.nombre ?? e._id,
          justificadas: 0,
          injustificadas: 0
        }));
        tabla.sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.rows.set(tabla);
        this.cargando.set(false);
      }
    });
  }

  onJustChange(index: number, value: any): void {
    const v = this.clampNonNegInt(value);
    const copy = this.rows().slice();
    copy[index] = { ...copy[index], justificadas: v };
    this.rows.set(copy);
  }

  onInjChange(index: number, value: any): void {
    const v = this.clampNonNegInt(value);
    const copy = this.rows().slice();
    copy[index] = { ...copy[index], injustificadas: v };
    this.rows.set(copy);
  }

  ponerTodos(which: 'just' | 'inj' | 'ambas', v: number): void {
    const val = this.clampNonNegInt(v);
    const copy = this.rows().map(r => {
      if (which === 'just') return { ...r, justificadas: val };
      if (which === 'inj')  return { ...r, injustificadas: val };
      return { ...r, justificadas: val, injustificadas: val };
    });
    this.rows.set(copy);
  }

  guardarTabla(): void {
    if (!this.contextOk() || !this.rows().length) return;

    const payload = {
      cursoId: this.cursoId!,
      anioLectivoId: this.anioId!,
      materiaId: this.materiaId!,
      trimestre: this.trimestre,
      rows: this.rows().map(r => ({
        estudianteId: r.estudianteId,
        faltasJustificadas: this.clampNonNegInt(r.justificadas),
        faltasInjustificadas: this.clampNonNegInt(r.injustificadas),
      }))
    };

    this.guardando.set(true);
    this.asisSrv.guardarFaltasBulk(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.sb.open('Asistencias guardadas correctamente', 'Cerrar', { duration: 2200 });
        // refresca tabla desde servidor
        this.loadFaltasToTable();
      },
      error: (e: any) => {
        this.guardando.set(false);
        this.sb.open(e?.error?.message ?? 'Error al guardar', 'Cerrar', { duration: 3500 });
      }
    });
  }

  // ======== Helpers ========

  contextOk(): boolean {
    return !!(this.anioId && this.cursoId && this.materiaId && this.trimestre);
  }

  porcentajeInasistencia(r: FilaAsistencia): string {
    if (!this.diasLaborables || this.diasLaborables <= 0) return '—';
    const total = r.justificadas + r.injustificadas;
    const pct = (total / this.diasLaborables) * 100;
    return `${pct.toFixed(1)}%`;
  }

  /** clamp a entero >= 0 */
  private clampNonNegInt(n: any): number {
    const v = Math.floor(Number(n ?? 0));
    if (Number.isNaN(v) || v < 0) return 0;
    return v;
  }

  /** Normaliza respuestas [] o {clave: []} */
  private normalizeArray<T>(res: unknown, arrayKey: 'data' | 'materias'): T[] {
    if (Array.isArray(res)) return res as T[];
    if (res && typeof res === 'object' && Array.isArray((res as any)[arrayKey])) {
      return (res as any)[arrayKey] as T[];
    }
    return [];
  }

  /** Si la API devuelve { ok, data }, retorna data; si no, el propio objeto */
  private unwrapData<T = any>(res: any): T {
    if (res && typeof res === 'object' && 'data' in res && res.data) return res.data as T;
    return res as T;
  }

  /** Extrae estudiantes (objetos o IDs) en múltiples formas de curso */
  private extractStudents(det: any): { objects: any[]; ids: string[] } {
    const pools: any[] = []
      .concat(Array.isArray(det?.estudiantes) ? det.estudiantes : [])
      .concat(Array.isArray(det?.alumnos) ? det.alumnos : [])
      .concat(Array.isArray(det?.inscritos) ? det.inscritos : [])
      .concat(Array.isArray(det?.matriculas) ? det.matriculas.map((m: any) => m?.estudiante).filter(Boolean) : []);

    const objects: any[] = [];
    const ids: string[] = [];

    for (const e of pools) {
      if (e && typeof e === 'object' && (e._id || e.uid)) {
        objects.push(e);
      } else if (e && typeof e === 'object' && e.estudiante && (e.estudiante._id || e.estudiante.uid)) {
        objects.push(e.estudiante);
      } else if (typeof e === 'string') {
        ids.push(e);
      }
    }

    // de-dup
    const seenObj = new Set<string>();
    const uniqObjects = objects.filter((o: any) => {
      const key = String(o._id ?? o.uid ?? '');
      if (!key || seenObj.has(key)) return false;
      seenObj.add(key);
      return true;
    });
    const uniqIds = Array.from(new Set(ids.map((id: string) => String(id))));
    return { objects: uniqObjects, ids: uniqIds };
  }

  /** Normaliza objetos de estudiante poblados a { _id, nombre? } */
  private normalizeStudentObjects(arr: any[]): EstudianteLite[] {
    return (arr ?? [])
      .map((s: any): EstudianteLite => ({
        _id: String(s._id ?? s.uid ?? ''),
        nombre: typeof s.nombre === 'string' ? s.nombre : undefined,
        apellidos: typeof s.apellidos === 'string' ? s.apellidos : undefined,
        nombres: typeof s.nombres === 'string' ? s.nombres : undefined,
      }))
      .filter((s: EstudianteLite) => !!s._id);
  }
}
