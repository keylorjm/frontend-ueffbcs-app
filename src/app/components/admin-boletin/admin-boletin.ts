import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Curso, CursoService } from '../../services/curso.service';
import {
  CalificacionService,
  Trimestre,
  CalificacionRow,
} from '../../services/calificacion.service';
import { AnioLectivoService } from '../../services/anio-lectivo.service';

/* ====== utils ====== */
function fmt(n: number | null | undefined): string {
  return n == null || isNaN(Number(n)) ? '—' : Number(n).toFixed(2);
}
// Escala con + (ajústala si tu institución usa otra):
function cualiFromFinal(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '';
  const p = Number(n);
  if (p >= 9.5) return 'A+';
  if (p >= 9.0) return 'A';
  if (p >= 8.5) return 'B+';
  if (p >= 8.0) return 'B';
  if (p >= 7.5) return 'C+';
  if (p >= 7.0) return 'C';
  return 'D';
}
function obsFromFinal(n: number | null | undefined): string {
  if (n == null || isNaN(Number(n))) return '—';
  return Number(n) >= 7 ? 'APROBADO' : 'SUPLETORIO';
}
function today(): string {
  return new Date().toLocaleDateString();
}
type Estado = 'idle' | 'cargando' | 'ok' | 'error';
type Modo = 'trimestre' | 'final';

type Fila = {
  asignatura: string;
  T1?: number | null;
  T2?: number | null;
  T3?: number | null;
  promedio?: number | null; // para vista trimestral y final
  observacion?: string; // solo final
  cualitativa?: string; // solo final
};

type AlumnoSlim = {
  _id?: string;
  uid?: string;
  nombre?: string;
  apellido?: string;
  cedula?: string;
};

@Component({
  selector: 'app-admin-boletin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div class="toolbar no-print">
      <h2>Impresión de Boletín</h2>
      <form [formGroup]="form" class="filters">
        <div class="row">
          <div class="control">
            <label>Tipo de reporte</label>
            <select formControlName="modo" (change)="onModoChange()">
              <option value="trimestre">Trimestral</option>
              <option value="final">Boletín Final</option>
            </select>
          </div>

          <div class="control" *ngIf="form.controls.modo.value === 'trimestre'">
            <label>Trimestre</label>
            <select formControlName="trimestre">
              <option value="">— Selecciona —</option>
              <option value="T1">I</option>
              <option value="T2">II</option>
              <option value="T3">III</option>
            </select>
          </div>

          <div class="control">
            <label>Curso</label>
            <select formControlName="cursoId">
              <option value="">— Selecciona —</option>
              <option *ngFor="let c of cursos()" [value]="id(c)">{{ c.nombre }}</option>
            </select>
          </div>

          <div class="control">
            <label>Cédula</label>
            <input formControlName="cedula" placeholder="Ej: 0102030405" />
          </div>

          <div class="buttons">
            <button type="button" (click)="buscar()">Buscar</button>
            <button
              type="button"
              class="primary"
              [disabled]="filas().length === 0"
              (click)="imprimir()"
            >
              Imprimir
            </button>
          </div>
        </div>
      </form>
      <p *ngIf="estado() === 'cargando'">Cargando…</p>
    </div>

    <!-- Hoja A4 -->
    <div class="sheet A4" *ngIf="filas().length > 0">
      <!-- Encabezado simple; reemplaza con tus logos si deseas -->
      <div class="head">
        <div class="left">
          <div class="brand">MINISTERIO DE EDUCACIÓN</div>
          <div class="ue">UNIDAD EDUCATIVA “FRAY BARTOLOMÉ DE LAS CASAS - SALASACA”</div>
          <div class="slogan">¡Buenos Cristianos, Buenos Ciudadanos!</div>
        </div>
        <div class="right">
          <div><b>Fecha:</b> {{ fecha() }}</div>
          <div><b>Año Lectivo:</b> {{ anioLectivoNombre() || '—' }}</div>
        </div>
      </div>

      <div class="meta">
        <div><b>Curso:</b> {{ cursoActual()?.nombre || '—' }}</div>
        <div><b>Tutor:</b> {{ tutorNombre() || '—' }}</div>
        <div>
          <b>Estudiante:</b> {{ alumnoNombreCompleto() }}
          <span class="muted">(C.I.: {{ alumno().cedula || '—' }})</span>
        </div>
        <div *ngIf="form.controls.modo.value === 'trimestre'">
          <b>Trimestre:</b> {{ etiquetaTrimestre(form.controls.trimestre.value) }}
        </div>
      </div>

      <!-- Tabla: Trimestral -->
      <table class="tabla" *ngIf="form.controls.modo.value === 'trimestre'">
        <thead>
          <tr>
            <th class="asig">ASIGNATURA</th>
            <th>I</th>
            <th>II</th>
            <th>III</th>
            <th class="prom">PROMEDIO TRIMESTRE</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let f of filas()">
            <td class="asig">{{ f.asignatura }}</td>
            <td class="num">{{ fmt(f.T1) }}</td>
            <td class="num">{{ fmt(f.T2) }}</td>
            <td class="num">{{ fmt(f.T3) }}</td>
            <td class="num strong">{{ fmt(f.promedio) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td class="asig"><b>PROMEDIO</b></td>
            <td class="num">{{ fmt(promedios().T1) }}</td>
            <td class="num">{{ fmt(promedios().T2) }}</td>
            <td class="num">{{ fmt(promedios().T3) }}</td>
            <td class="num strong">{{ fmt(promedios().seleccionado) }}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Tabla: Final (como tu imagen) -->
      <table class="tabla final" *ngIf="form.controls.modo.value === 'final'">
        <thead>
          <tr>
            <th class="asig">ASIGNATURA</th>
            <th>NOTA PRIMER TRIMESTRE</th>
            <th>NOTA SEGUNDO TRIMESTRE</th>
            <th>NOTA TERCER TRIMESTRE</th>
            <th class="prom gray">Promedio Trimestral</th>
            <th class="obs">Observaciones</th>
            <th class="cuali">Calificación Cualitativa</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let f of filas()">
            <td class="asig">{{ f.asignatura }}</td>
            <td class="num">{{ fmt(f.T1) }}</td>
            <td class="num">{{ fmt(f.T2) }}</td>
            <td class="num">{{ fmt(f.T3) }}</td>
            <td class="num strong gray">{{ fmt(f.promedio) }}</td>
            <td class="obs">{{ f.observacion || '—' }}</td>
            <td class="cuali">{{ f.cualitativa || '—' }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td class="asig"><b>PROMEDIO FINAL</b></td>
            <td class="num">{{ fmt(promedios().T1) }}</td>
            <td class="num">{{ fmt(promedios().T2) }}</td>
            <td class="num">{{ fmt(promedios().T3) }}</td>
            <td class="num strong gray">{{ fmt(promedios().final) }}</td>
            <td class="obs">{{ obsFromFinal(promedios().final) }}</td>
            <td class="cuali">{{ cualiFromFinal(promedios().final) }}</td>
          </tr>
        </tfoot>
      </table>

      <div class="firma">
        <div>______________________________</div>
        <div>TUTOR / A</div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .no-print {
        display: block;
      }
      @media print {
        .no-print {
          display: none !important;
        }
        .sheet {
          box-shadow: none;
          margin: 0;
        }
      }
      .toolbar {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
      }
      .filters .row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: end;
      }
      .control {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 220px;
      }
      .control input,
      .control select {
        padding: 6px 8px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
      }
      .buttons {
        display: flex;
        gap: 8px;
      }
      .buttons button {
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        background: #fff;
        border-radius: 6px;
        cursor: pointer;
      }
      .buttons .primary {
        background: #2563eb;
        color: #fff;
        border-color: #2563eb;
      }

      .sheet.A4 {
        width: 210mm;
        min-height: 297mm;
        background: #fff;
        margin: 16px auto;
        padding: 14mm 12mm;
        box-shadow: 0 0 0.5cm rgba(0, 0, 0, 0.1);
      }
      .head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .brand {
        font-weight: 700;
      }
      .ue {
        font-weight: 800;
      }
      .slogan {
        opacity: 0.8;
      }
      .right {
        text-align: right;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px 12px;
        margin: 10px 0 12px;
      }
      .muted {
        opacity: 0.8;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }
      .tabla th,
      .tabla td {
        border: 1px solid #00000040;
        padding: 6px 8px;
      }
      .tabla thead th {
        background: #f9fafb;
        font-weight: 700;
        text-align: center;
      }
      .tabla .asig {
        width: 36%;
      }
      .tabla .num {
        text-align: center;
      }
      .tabla .strong {
        font-weight: 700;
      }
      .final .gray {
        background: #e5e7eb;
      }
      .obs {
        width: 18%;
      }
      .cuali {
        width: 14%;
      }

      .firma {
        margin-top: 28px;
        text-align: center;
      }
    `,
  ],
})
export class AdminBoletinComponent implements OnInit {
  private snack = inject(MatSnackBar);
  private cursoService = inject(CursoService);
  private califService = inject(CalificacionService);
  private anioSvc = inject(AnioLectivoService);
  public readonly fmt = fmt;
  public readonly cualiFromFinal = cualiFromFinal;
  public readonly obsFromFinal = obsFromFinal;
  estado = signal<Estado>('idle');
  cursos = signal<Curso[]>([]);
  anioLectivoId = signal<string>('');
  anioLectivoNombre = signal<string>('');
  fecha = signal<string>(today());
  tutorNombre = signal<string>('');
  alumno = signal<AlumnoSlim>({});
  filas = signal<Fila[]>([]);
  promedios = signal<{
    T1?: number | null;
    T2?: number | null;
    T3?: number | null;
    seleccionado?: number | null;
    final?: number | null;
  }>({});

  form = new FormGroup({
    modo: new FormControl<Modo>('final', { nonNullable: true }),
    trimestre: new FormControl<Trimestre | ''>('' as any),
    cursoId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    cedula: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    // cursos
    this.cursoService.getAll?.().subscribe({
      next: (cs) => this.cursos.set(cs ?? []),
      error: () => this.cursos.set([]),
    });
    // año lectivo
    this.anioSvc.obtenerActual?.().subscribe({
      next: (al: any) => {
        const id = al?.uid ?? al?._id ?? '';
        const nom = al?.nombre ?? '';
        if (id) this.anioLectivoId.set(id);
        if (nom) this.anioLectivoNombre.set(nom);
      },
      error: () => {},
    });
  }

  imprimir() {
    window.print();
  }
  id(x: any) {
    return x?._id ?? x?.uid ?? '';
  }
  etiquetaTrimestre(t: any) {
    return t === 'T1' ? 'I' : t === 'T2' ? 'II' : t === 'T3' ? 'III' : '—';
  }
  alumnoNombreCompleto = computed(() => {
    const a = this.alumno();
    const nom = `${a.apellido ?? ''} ${a.nombre ?? ''}`.trim();
    return nom || '—';
  });
  cursoActual = computed(() => {
    const id = this.form.controls.cursoId.value;
    return this.cursos().find((c) => this.id(c) === id);
  });

  onModoChange() {
    // limpiar trimestre si se pasa a final
    if (this.form.controls.modo.value === 'final') {
      this.form.controls.trimestre.setValue('' as any);
    }
  }

  buscar() {
    if (this.form.invalid) {
      this.snack.open('Completa Curso y Cédula (y Trimestre si es reporte trimestral)', 'Cerrar', {
        duration: 2200,
      });
      return;
    }
    const modo = this.form.controls.modo.value;
    const tri = this.form.controls.trimestre.value as Trimestre;
    const cursoId = this.form.controls.cursoId.value;
    const cedula = (this.form.controls.cedula.value || '').trim();
    const alId = this.anioLectivoId();

    if (modo === 'trimestre' && !tri) {
      this.snack.open('Selecciona el Trimestre', 'Cerrar', { duration: 1800 });
      return;
    }
    if (!/^\d{8,13}$/.test(cedula)) {
      this.snack.open('Cédula inválida', 'Cerrar', { duration: 1800 });
      return;
    }
    if (!alId) {
      this.snack.open('No hay Año Lectivo actual', 'Cerrar', { duration: 2000 });
      return;
    }

    this.estado.set('cargando');

    // 1) cargar curso
    this.cursoService.getById(cursoId).subscribe({
      next: (curso) => {
        // tutor
        const t = (curso as any)?.profesorTutor;
        const tNom = (t?.apellido ? `${t.apellido} ` : '') + (t?.nombre ?? '');
        this.tutorNombre.set(tNom.trim());

        const estArr: any[] = (curso as any)?.estudiantes ?? [];
        const est = estArr.find((e) => (e?.cedula ?? e?.ci ?? e?.dni ?? '').toString() === cedula);
        if (!est) {
          this.estado.set('error');
          this.filas.set([]);
          this.promedios.set({});
          this.snack.open('Estudiante no encontrado en el curso', 'Cerrar', { duration: 2200 });
          return;
        }
        this.alumno.set({
          _id: est._id ?? est.uid,
          uid: est.uid ?? est._id,
          nombre: est.nombre,
          apellido: est.apellido,
          cedula: est.cedula ?? est.ci ?? est.dni,
        });

        const materias: any[] = (curso as any)?.materias ?? [];
        const materiaIds = materias.map((m) => this.id(m));
        const nombresPorId = new Map<string, string>(
          materias.map((m) => [this.id(m), m?.nombre ?? m?.titulo ?? 'Materia'])
        );

        if (modo === 'trimestre') {
          this.obtenerFilasTrimestrales(cursoId, alId, materiaIds, tri, cedula, nombresPorId);
        } else {
          this.obtenerFilasFinales(cursoId, alId, materiaIds, cedula, nombresPorId);
        }
      },
      error: () => {
        this.estado.set('error');
        this.snack.open('No se pudo cargar el curso', 'Cerrar', { duration: 2200 });
      },
    });
  }

  /* ====== datos: trimestral ====== */
  private async obtenerFilasTrimestrales(
    cursoId: string,
    alId: string,
    materiaIds: string[],
    tri: Trimestre,
    cedula: string,
    nombres: Map<string, string>
  ) {
    const filas: Fila[] = [];
    for (const mId of materiaIds) {
      const nombre = nombres.get(mId) ?? 'Materia';
      try {
        const rows = await this.califService
          .obtenerNotas({ cursoId, anioLectivoId: alId, materiaId: mId, trimestre: tri })
          .toPromise();
        const row = (rows ?? []).find((r: CalificacionRow) => {
          const ced =
            (r as any)?.estudiante?.cedula ??
            (r as any)?.estudiante?.ci ??
            (r as any)?.estudiante?.dni ??
            '';
          return String(ced) === cedula;
        });
        const f: Fila = { asignatura: nombre, T1: null, T2: null, T3: null, promedio: null };
        if (row) {
          f.T1 = (row as any).T1?.promedioTrimestral ?? null;
          f.T2 = (row as any).T2?.promedioTrimestral ?? null;
          f.T3 = (row as any).T3?.promedioTrimestral ?? null;
          f.promedio = (row as any)[tri]?.promedioTrimestral ?? null;
        }
        filas.push(f);
      } catch {
        filas.push({ asignatura: nombre, T1: null, T2: null, T3: null, promedio: null });
      }
    }
    this.filas.set(filas);
    this.promedios.set(this.calcularPromedios(filas, tri));
    this.estado.set('ok');
  }

  /* ====== datos: final ====== */
  private async obtenerFilasFinales(
    cursoId: string,
    alId: string,
    materiaIds: string[],
    cedula: string,
    nombres: Map<string, string>
  ) {
    // necesitamos T1, T2, T3 por materia → pedimos 3 veces/combina
    const porTri: Record<'T1' | 'T2' | 'T3', Map<string, number | null>> = {
      T1: new Map(),
      T2: new Map(),
      T3: new Map(),
    };

    for (const tri of ['T1', 'T2', 'T3'] as Trimestre[]) {
      for (const mId of materiaIds) {
        try {
          const rows = await this.califService
            .obtenerNotas({ cursoId, anioLectivoId: alId, materiaId: mId, trimestre: tri })
            .toPromise();
          const row = (rows ?? []).find((r: CalificacionRow) => {
            const ced =
              (r as any)?.estudiante?.cedula ??
              (r as any)?.estudiante?.ci ??
              (r as any)?.estudiante?.dni ??
              '';
            return String(ced) === cedula;
          });
          const val = row ? (row as any)[tri]?.promedioTrimestral ?? null : null;
          porTri[tri].set(mId, val == null || isNaN(Number(val)) ? null : Number(val));
        } catch {
          porTri[tri].set(mId, null);
        }
      }
    }

    const filas: Fila[] = materiaIds.map((mId) => {
      const T1 = porTri.T1.get(mId) ?? null;
      const T2 = porTri.T2.get(mId) ?? null;
      const T3 = porTri.T3.get(mId) ?? null;
      const arr = [T1, T2, T3].filter((v) => v != null && !isNaN(Number(v))) as number[];
      const prom = arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
      return {
        asignatura: nombres.get(mId) ?? 'Materia',
        T1,
        T2,
        T3,
        promedio: prom,
        observacion: obsFromFinal(prom),
        cualitativa: cualiFromFinal(prom),
      };
    });

    this.filas.set(filas);
    this.promedios.set(this.calcularPromediosFinal(filas));
    this.estado.set('ok');
  }

  /* ====== cálculos ====== */
  private calcularPromedios(filas: Fila[], tri: Trimestre) {
    const nums = (xs: (number | null | undefined)[]) =>
      xs.filter((v) => v != null && !isNaN(Number(v))) as number[];
    const prom = (xs: (number | null | undefined)[]) => {
      const n = nums(xs);
      return n.length ? +(n.reduce((a, b) => a + b, 0) / n.length).toFixed(2) : null;
    };
    return {
      T1: prom(filas.map((f) => f.T1)),
      T2: prom(filas.map((f) => f.T2)),
      T3: prom(filas.map((f) => f.T3)),
      seleccionado: prom(filas.map((f) => (tri === 'T1' ? f.T1 : tri === 'T2' ? f.T2 : f.T3))),
    };
  }
  private calcularPromediosFinal(filas: Fila[]) {
    const nums = (xs: (number | null | undefined)[]) =>
      xs.filter((v) => v != null && !isNaN(Number(v))) as number[];
    const prom = (xs: (number | null | undefined)[]) => {
      const n = nums(xs);
      return n.length ? +(n.reduce((a, b) => a + b, 0) / n.length).toFixed(2) : null;
    };
    return {
      T1: prom(filas.map((f) => f.T1)),
      T2: prom(filas.map((f) => f.T2)),
      T3: prom(filas.map((f) => f.T3)),
      final: prom(filas.map((f) => f.promedio)),
    };
  }
}
