// src/app/components/reporte-curso/reporte-cursos.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';

import { CursoService } from '../../services/curso.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';
import { CalificacionService, Trimestre } from '../../services/calificacion.service';
import { AsistenciaService } from '../../services/asistencia.service';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// ✅ forma correcta para módulos ESM
(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs;


// ======================
// Tipos auxiliares
// ======================
type TipoReporte = Trimestre | 'FINAL';

type NotaMap = Record<
  string,
  { nombre: string; T1?: number | null; T2?: number | null; T3?: number | null }
>;

type AsisResumen = { fj: number; fi: number; laborables: number; asistidos: number };

interface MateriaCurso {
  materia: { _id: string; nombre: string } | string;
  profesor?: any;
}

@Component({
  standalone: true,
  selector: 'app-reporte-curso',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="wrap">
      <mat-card class="card">
        <div class="header">
          <h2>📘 Reportes de Curso (Trimestrales / Final)</h2>
          <div class="actions">
            <button
              mat-flat-button
              color="primary"
              (click)="imprimirTodos()"
              [disabled]="!estudiantes().length || cargando()"
            >
              <mat-icon>print</mat-icon> Imprimir todos
            </button>
          </div>
        </div>

        <div class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Curso</mat-label>
            <mat-select [(ngModel)]="cursoId" (selectionChange)="onCursoChange()">
              <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">
                {{ c.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Tipo de Reporte</mat-label>
            <mat-select [(ngModel)]="tipoReporte">
              <mat-option value="T1">Trimestre I</mat-option>
              <mat-option value="T2">Trimestre II</mat-option>
              <mat-option value="T3">Trimestre III</mat-option>
              <mat-option value="FINAL">Final</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

        <table mat-table [dataSource]="estudiantes()" class="mat-elevation-z2 full-table">
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Estudiante</th>
            <td mat-cell *matCellDef="let e">{{ e.nombre }}</td>
          </ng-container>

          <ng-container matColumnDef="cedula">
            <th mat-header-cell *matHeaderCellDef>Cédula</th>
            <td mat-cell *matCellDef="let e">{{ e.cedula }}</td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let e">
              <button
                mat-icon-button
                color="accent"
                (click)="imprimirIndividual(e)"
                [disabled]="cargando()"
              >
                <mat-icon>print</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>

        <p *ngIf="!estudiantes().length && !cargando()">
          Seleccione un curso para ver sus estudiantes.
        </p>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .wrap {
        padding: 20px;
        max-width: 1100px;
        margin: auto;
      }
      .card {
        padding: 16px;
        border-radius: 12px;
        display: grid;
        gap: 14px;
      }
      .header {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
      }
      .actions {
        display: inline-flex;
        gap: 8px;
      }
      .filters {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: end;
      }
      .full-table {
        width: 100%;
      }
    `,
  ],
})
export class ReporteCursoComponent {
  private sb = inject(MatSnackBar);
  private cursoSrv = inject(CursoService);
  private estSrv = inject(EstudianteService);
  private caliSrv = inject(CalificacionService);
  private asisSrv = inject(AsistenciaService);

  cursos = signal<any[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  cargando = signal<boolean>(false);

  cursoId = '';
  anioLectivoId = '';
  tipoReporte: TipoReporte = 'T1';

  cols = ['nombre', 'cedula', 'acciones'];

  ngOnInit() {
    this.cursoSrv.listar().subscribe({
      next: (res: any) => this.cursos.set(res?.data ?? res ?? []),
      error: () => this.sb.open('Error al cargar cursos', 'Cerrar', { duration: 3000 }),
    });
  }

  async onCursoChange() {
    this.estudiantes.set([]);
    if (!this.cursoId) return;
    this.cargando.set(true);
    try {
      const cursoResp = await firstValueFrom(this.cursoSrv.obtener(this.cursoId));
      const c = cursoResp?.data ?? cursoResp;
      this.anioLectivoId = this.asId(c?.anioLectivo);

      const all = await firstValueFrom(this.estSrv.getAll());
      const ids = (c?.estudiantes ?? []).map((e: unknown) => this.asId(e as any));
      const filtrados = all.filter((e: Estudiante) =>
        ids.includes(this.asId((e as any)._id ?? e.uid))
      );
      filtrados.sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''));
      this.estudiantes.set(filtrados);
    } catch (e) {
      console.error(e);
      this.sb.open('Error cargando estudiantes del curso', 'Cerrar', { duration: 3000 });
    } finally {
      this.cargando.set(false);
    }
  }

  // =========================
  // Impresión
  // =========================
  async imprimirIndividual(est: Estudiante) {
    const pdf = await this.generarPdf(est);
    pdf.open();
  }

  async imprimirTodos() {
    if (!this.estudiantes().length) return;
    this.sb.open('Generando reportes...', 'Cerrar', { duration: 1200 });
    for (const est of this.estudiantes()) {
      const pdf = await this.generarPdf(est);
      pdf.download(`${est.nombre}-${this.tipoReporte}.pdf`);
    }
  }

  // =========================
  // Carga de datos
  // =========================
  private async buildNotasMapaPorEstudiante(estId: string): Promise<NotaMap> {
    const c = (await firstValueFrom(this.cursoSrv.obtener(this.cursoId))) as any;
    const curso = c?.data ?? c;

    const mats = (curso?.materias ?? []).map((m: MateriaCurso) => {
      const id = this.asId(m.materia as any);
      const nombre =
        typeof m.materia === 'string' ? (m.materia as string) : m.materia?.nombre ?? '—';
      return { id, nombre };
    });

    const map: NotaMap = {};
    for (const m of mats) map[m.id] = { nombre: m.nombre, T1: null, T2: null, T3: null };

    const loadTri = async (tri: Trimestre) => {
      await Promise.all(
        mats.map(async (m: { id: string }) => {
          try {
            const resp = await firstValueFrom(
              this.caliSrv.obtenerNotas({
                cursoId: this.cursoId,
                anioLectivoId: this.anioLectivoId,
                materiaId: m.id,
                trimestre: tri,
              })
            );
            const arr: any[] = resp?.estudiantes ?? [];
            const found = arr.find((x) => this.asId(x.estudianteId) === estId);
            const raw =
              typeof found?.promedioTrimestral === 'number' ? found.promedioTrimestral : null;
            const valor = raw == null ? null : Number(raw);
            map[m.id][tri] = valor;
          } catch {
            map[m.id][tri] = null;
          }
        })
      );
    };

    if (this.tipoReporte === 'FINAL') {
      await loadTri('T1');
      await loadTri('T2');
      await loadTri('T3');
    } else {
      await loadTri(this.tipoReporte as Trimestre);
    }

    return map;
  }

  private async buildAsistenciaPorTrimestre(
    estId: string
  ): Promise<Record<Trimestre, AsisResumen>> {
    const out: Record<Trimestre, AsisResumen> = {
      T1: { fj: 0, fi: 0, laborables: 0, asistidos: 0 },
      T2: { fj: 0, fi: 0, laborables: 0, asistidos: 0 },
      T3: { fj: 0, fi: 0, laborables: 0, asistidos: 0 },
    };

    const trimestres: Trimestre[] =
      this.tipoReporte === 'FINAL' ? ['T1', 'T2', 'T3'] : [this.tipoReporte as Trimestre];

    await Promise.all(
      trimestres.map(async (t: Trimestre) => {
        try {
          const r = await firstValueFrom(
            this.asisSrv.getResumenTrimestre({
              cursoId: this.cursoId,
              anioLectivoId: this.anioLectivoId,
              estudianteId: estId,
              trimestre: t,
            })
          );
          const fj = Number((r as any)?.faltasJustificadas ?? 0);
          const fi = Number((r as any)?.faltasInjustificadas ?? 0);
          const laborables = Number((r as any)?.diasLaborables ?? 0);
          const asistidos = Math.max(0, laborables - fi);
          out[t] = { fj, fi, laborables, asistidos };
        } catch {
          out[t] = { fj: 0, fi: 0, laborables: 0, asistidos: 0 };
        }
      })
    );

    return out;
  }

  // =========================
  // PDF
  // =========================
  private format2(n: number | null | undefined): string {
    if (n == null || isNaN(Number(n))) return '—';
    return Number(n).toFixed(2);
  }

  private promedioFinalMateria(row: {
    T1?: number | null;
    T2?: number | null;
    T3?: number | null;
  }): number | null {
    const vals = [row.T1, row.T2, row.T3].filter((v) => v != null) as number[];
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return sum / vals.length;
  }

  private promedioGeneral(rows: Array<{ T1?: number | null; T2?: number | null; T3?: number | null }>): number | null {
    const finals = rows.map((r) => this.promedioFinalMateria(r)).filter((v) => v != null) as number[];
    if (!finals.length) return null;
    return finals.reduce((a, b) => a + b, 0) / finals.length;
  }

  async generarPdf(est: Estudiante) {
    if (!this.cursoId || !this.anioLectivoId) {
      this.sb.open('Falta seleccionar curso', 'Cerrar', { duration: 2000 });
      throw new Error('Curso/anioLectivo faltante');
    }

    const estId = this.asId((est as any)._id ?? est.uid);
    const curso = (this.cursos().find((c) => this.asId(c._id) === this.cursoId) ?? { nombre: '—' }) as any;
    const notasMap = await this.buildNotasMapaPorEstudiante(estId);
    const asis = await this.buildAsistenciaPorTrimestre(estId);

    // Generar PDF
    const materiaIds = Object.keys(notasMap);
    const body: any[] = [
      [
        { text: 'ASIGNATURA', bold: true },
        { text: 'I', bold: true },
        { text: 'II', bold: true },
        { text: 'III', bold: true },
        { text: 'PROMEDIO TRIMESTRE', bold: true },
      ],
    ];

    const filasMateria = materiaIds.map((mid) => notasMap[mid]);
    for (const row of filasMateria) {
      body.push([
        row.nombre,
        this.format2(row.T1 ?? null),
        this.format2(row.T2 ?? null),
        this.format2(row.T3 ?? null),
        this.format2(this.promedioFinalMateria(row)),
      ]);
    }

    const promGeneral = this.promedioGeneral(filasMateria);
    body.push([
      { text: 'PROMEDIO', bold: true },
      '',
      '',
      '',
      { text: this.format2(promGeneral), bold: true },
    ]);

    const titulo =
      this.tipoReporte === 'FINAL' ? 'REPORTE FINAL' : `REPORTE TRIMESTRAL (${this.tipoReporte})`;

    const docDef: any = {
      pageSize: 'A4',
      pageMargins: [32, 32, 32, 40],
      content: [
        { text: 'UNIDAD EDUCATIVA', bold: true, alignment: 'center', fontSize: 11 },
        { text: '"FRAY BARTOLOMÉ DE LAS CASAS - SALASACA"', alignment: 'center', margin: [0, 2, 0, 8] },
        { text: titulo, alignment: 'center', bold: true, fontSize: 12, margin: [0, 0, 0, 12] },
        { text: `CURSO: ${curso?.nombre ?? '—'}`, margin: [0, 2, 0, 0] },
        { text: `ESTUDIANTE: ${est.nombre}     CÉDULA: ${est.cedula}`, margin: [0, 2, 0, 8] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 40, 40, 40, 70],
            body,
          },
          layout: 'lightHorizontalLines',
        },
        { text: '_____________________________', margin: [0, 40, 0, 0] },
        { text: 'TUTOR/A', margin: [0, 4, 0, 0] },
      ],
    };
    return (pdfMake as any).createPdf(docDef);
  }

  public asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && (val as any)._id) return String((val as any)._id);
    if (typeof val === 'object' && (val as any).uid) return String((val as any).uid);
    return String(val);
  }
}
