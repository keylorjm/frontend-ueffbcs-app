// src/app/components/admin-notas/admin-notas.ts
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

// Servicios (tus propios)
import { AnioLectivoService, AnioLectivo } from '../../services/anio-lectivo.service';
import { CursoService } from '../../services/curso.service';
import { MateriaService, Materia } from '../../services/materia.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';
import { CalificacionService, Trimestre } from '../../services/calificacion.service';

// Tipos locales
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
interface NotaRow       { estudianteId: string; nombre: string; nota: number | null; }

@Component({
  selector: 'app-admin-notas',
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
        <div class="eyebrow"><mat-icon>grading</mat-icon> Registro de calificaciones (Admin)</div>
        <h2>Selecciona contexto y edita las notas del trimestre</h2>
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

        <button mat-flat-button color="primary"
          (click)="guardarTabla()"
          [disabled]="guardando() || !anioId || !cursoId || !materiaId || !rows().length">
          <mat-icon>save</mat-icon>
          <span>{{ guardando() ? 'Guardando...' : 'Guardar todo' }}</span>
        </button>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

      <!-- Tabla editable de estudiantes/nota -->
      <div class="table-wrap" *ngIf="rows().length">
        <table class="grid">
          <thead>
            <tr>
              <th style="width:60%">Estudiante</th>
              <th style="width:20%">Nota (0..10)</th>
              <th style="width:20%">Cualitativa</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of rows(); let i = index">
              <td>{{ r.nombre }}</td>
              <td>
                <input class="num"
                       type="number"
                       [ngModel]="r.nota"
                       (ngModelChange)="onNotaChange(i, $event)"
                       min="0" max="10" step="0.1" />
              </td>
              <td>{{ cualitativa(r.nota) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="table-actions">
          <button mat-button (click)="ponerTodos(null)">Borrar todas</button>
          <button mat-button (click)="ponerTodos(0)">Poner 0 a vacías</button>
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
    .filters { display:grid; grid-template-columns: repeat(5, minmax(160px, 1fr)); gap: 12px; align-items:end; }
    .ff { width: 100%; }
    .ff.small { max-width: 200px; }
    .soft-divider { margin: 10px 0 16px; }
    .table-wrap { margin-top: 16px; }
    .grid { width:100%; border-collapse: collapse; }
    .grid th, .grid td { border-bottom: 1px solid #e0e0e0; padding: 8px; text-align: left; }
    .grid th { font-weight: 600; background: #fafafa; }
    input.num { width: 120px; padding: 6px 8px; }
    .table-actions { margin-top: 8px; display:flex; gap: 8px; }
  `]
})
export class AdminNotasComponent implements OnInit {
  private anioSrv = inject(AnioLectivoService);
  private cursoSrv = inject(CursoService);
  private materiaSrv = inject(MateriaService);
  private estSrv = inject(EstudianteService);
  private caliSrv = inject(CalificacionService);
  private sb = inject(MatSnackBar);

  // datos
  anios        = signal<AnioLectivo[]>([]);
  cursos       = signal<CursoLite[]>([]);
  estudiantes  = signal<EstudianteLite[]>([]);
  materiasFlat = signal<MateriaFlat[]>([]);
  rows         = signal<NotaRow[]>([]); // tabla editable

  // selección
  anioId: string | null = null;
  cursoId: string | null = null;
  materiaId: string | null = null;
  trimestre: Trimestre = 'T1';

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
          // completa nombres con catálogo (tu getAll puede ser [] o {materias:[]})
          this.materiaSrv.getAll().subscribe({
            next: (res: any) => {
              const catalogo: Materia[] = Array.isArray(res) ? res
                                   : (res && Array.isArray(res.materias)) ? res.materias
                                   : [];
              const byId = new Map<string, Materia>(catalogo.map((x: Materia) => [String(x._id ?? x.uid ?? ''), x]));
              const completado: MateriaFlat[] = prelim.map(p => ({ id: p.id, nombre: p.nombre || (byId.get(p.id)?.nombre ?? p.id) }));
              this.materiasFlat.set(completado);
            },
            error: () => {
              this.materiasFlat.set(prelim.map(p => ({ id: p.id, nombre: p.nombre || p.id })));
            }
          });
        }

        // -------- ESTUDIANTES --------
        const { objects, ids } = this.extractStudents(det);

        if (objects.length) {
          this.estudiantes.set(this.normalizeStudentObjects(objects));
          this.cargando.set(false);
          // No cargamos notas hasta que elija materia/trimestre
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
    // cuando hay curso + materia (y trimestre actual), carga las notas existentes
    this.rows.set([]);
    if (this.anioId && this.cursoId && this.materiaId && this.trimestre && this.estudiantes().length) {
      this.loadNotasToTable();
    }
  }

  // ======== Notas → Tabla editable ========

  private loadNotasToTable(): void {
    this.cargando.set(true);

    this.caliSrv.obtenerNotas({
      cursoId: this.cursoId!,
      anioLectivoId: this.anioId!,
      materiaId: this.materiaId!,
      trimestre: this.trimestre,
    }).subscribe({
      next: (res: any) => {
        const existentes: Array<{ estudianteId: string; estudianteNombre?: string; promedioTrimestral: number | null }> =
          Array.isArray(res?.estudiantes) ? res.estudiantes : [];

        // índice de nombres desde la lista de estudiantes del curso
        const nameIndex = new Map<string, string>(
          this.estudiantes().map(e => [
            e._id,
            e.nombre ?? (e.apellidos ? (e.nombres ? (e.apellidos + ' ' + e.nombres) : e.apellidos) : e._id),
          ])
        );

        // mapa de notas existentes
        const mapNota = new Map<string, number | null>(
          existentes.map(r => [String(r.estudianteId), (r.promedioTrimestral == null ? null : Number(r.promedioTrimestral))])
        );

        // construye las filas para TODOS los estudiantes del curso
        const tabla: NotaRow[] = this.estudiantes().map(e => ({
          estudianteId: e._id,
          nombre: nameIndex.get(e._id) || e._id,
          nota: mapNota.has(e._id) ? (mapNota.get(e._id) as number | null) : null
        }));

        // orden por nombre
        tabla.sort((a, b) => a.nombre.localeCompare(b.nombre));

        this.rows.set(tabla);
        this.cargando.set(false);
      },
      error: () => {
        // si falla el GET, igual muestra tabla vacía (nota = null)
        const tabla: NotaRow[] = this.estudiantes().map(e => ({
          estudianteId: e._id,
          nombre: e.nombre ?? e._id,
          nota: null
        }));
        tabla.sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.rows.set(tabla);
        this.cargando.set(false);
      }
    });
  }

  // Cambios en una celda
  onNotaChange(index: number, value: any): void {
    const parsed = this.clamp10(value);
    const copy = this.rows().slice();
    copy[index] = { ...copy[index], nota: parsed };
    this.rows.set(copy);
  }

  // Acciones masivas
  ponerTodos(v: number | null): void {
    const copy = this.rows().map(r => ({ ...r, nota: v === null ? null : this.clamp10(v) as number }));
    this.rows.set(copy);
  }

  // Guardar en bloque
  guardarTabla(): void {
    if (!this.anioId || !this.cursoId || !this.materiaId || !this.trimestre) return;

    // Construye payload 0..10 (respeta nulls)
    const payload = {
      cursoId: this.cursoId!,
      anioLectivoId: this.anioId!,
      materiaId: this.materiaId!,
      trimestre: this.trimestre,
      rows: this.rows().map(r => ({
        estudianteId: r.estudianteId,
        promedioTrimestral: r.nota == null ? null : this.clamp10(r.nota)
      }))
    };

    this.guardando.set(true);
    this.caliSrv.cargarTrimestreBulk(payload as any).subscribe({
      next: () => {
        this.guardando.set(false);
        this.sb.open('Notas guardadas correctamente', 'Cerrar', { duration: 2200 });
        // recarga desde servidor para reflejar lo persistido
        this.loadNotasToTable();
      },
      error: (e: any) => {
        this.guardando.set(false);
        this.sb.open(e?.error?.message ?? 'Error al guardar', 'Cerrar', { duration: 3500 });
      }
    });
  }

  // ======== Helpers ========

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

  /** Cualitativa estándar 0..10 */
  cualitativa(n0_10: number | null): string {
    if (n0_10 == null || Number.isNaN(Number(n0_10))) return 'Sin registro';
    const n = Number(n0_10);
    if (n >= 9) return 'Excelente';
    if (n >= 8) return 'Muy Bueno';
    if (n >= 7) return 'Bueno';
    if (n >= 6) return 'Regular';
    return 'Insuficiente';
  }

  /** clamp [0,10] o null si vacío/NaN */
  private clamp10(n: any): number | null {
    if (n === '' || n === null || n === undefined) return null;
    const v = Number(n);
    if (Number.isNaN(v)) return null;
    return Math.max(0, Math.min(10, v));
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
