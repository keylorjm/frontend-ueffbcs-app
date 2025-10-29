import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { firstValueFrom } from 'rxjs';
import { CursoService } from '../../services/curso.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';
import { CalificacionService, Trimestre } from '../../services/calificacion.service';
import { AsistenciaService } from '../../services/asistencia.service';

// ===== Opcional: pega aquí tus logos en base64 (png/jpg) =====
const LOGO_MINEDU = null; // 'data:image/png;base64,iVBORw0K...'
const LOGO_ESCUDO = null; // 'data:image/png;base64,iVBORw0K...'

type TipoReporte = Trimestre | 'FINAL';
type NotaMap = Record<string, number | null>;           // materiaId -> nota (0..10)
type NotasPorTrimestre = Record<Trimestre, NotaMap>;    // {T1:{}, T2:{}, T3:{}}

@Component({
  standalone: true,
  selector: 'app-reporte-estudiante',
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatSelectModule, MatInputModule,
    MatButtonModule, MatSnackBarModule, MatIconModule, MatDividerModule, MatProgressBarModule
  ],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <div class="header">
        <div>
          <h2 class="title">📄 Generar Reporte Trimestral / Final</h2>
          <p class="sub">Seleccione curso, busque al estudiante por cédula y elija el tipo de reporte.</p>
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Curso</mat-label>
          <mat-select [(ngModel)]="cursoId" name="cursoId">
            <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">{{ c.nombre }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Cédula del estudiante</mat-label>
          <input matInput [(ngModel)]="cedula" placeholder="Ej: 1104589321" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tipo de reporte</mat-label>
          <mat-select [(ngModel)]="tipoReporte" name="tipoReporte">
            <mat-option value="T1">Trimestre I</mat-option>
            <mat-option value="T2">Trimestre II</mat-option>
            <mat-option value="T3">Trimestre III</mat-option>
            <mat-option value="FINAL">Reporte Final</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="actions">
          <button mat-stroked-button (click)="buscarEstudiante()">
            <mat-icon>search</mat-icon> Buscar
          </button>
          <button mat-flat-button color="primary" (click)="generarPDF()" [disabled]="!estudiante">
            <mat-icon>print</mat-icon> Imprimir PDF
          </button>
        </div>
      </div>

      <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

      <div *ngIf="estudiante" class="preview">
        <div><b>Estudiante:</b> {{ estudiante.nombre }}</div>
        <div><b>Cédula:</b> {{ estudiante.cedula }}</div>
        <div><b>Email:</b> {{ estudiante.email }}</div>
      </div>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 20px; max-width: 980px; margin: auto; }
    .card { padding: 16px; border-radius: 14px; display: grid; gap: 12px; }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .title { margin: 0; font-size: 20px; font-weight: 800; }
    .sub { margin: 0; opacity: .75; }
    .filters { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 12px; align-items: end; }
    .actions { display: flex; gap: 8px; }
    .preview { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; background: #fafafa; padding: 10px; border-radius: 10px; }
    @media (max-width: 900px){ .filters{ grid-template-columns: 1fr; } .preview{ grid-template-columns: 1fr; } }
  `]
})
export class ReporteEstudianteComponent {
  private sb = inject(MatSnackBar);
  private cursoSrv = inject(CursoService);
  private estSrv = inject(EstudianteService);
  private caliSrv = inject(CalificacionService);
  private asisSrv = inject(AsistenciaService);

  cursos = signal<any[]>([]);
  cargando = signal<boolean>(false);

  cursoId = '';
  cedula = '';
  tipoReporte: TipoReporte = 'T1';

  estudiante: Estudiante | null = null;
  cursoDetalle: any | null = null;           // curso con estudiantes/materias poblados
  anioLectivoId = '';

  // Datos construidos para PDF
  materias: { id: string; nombre: string }[] = [];
  notas: NotasPorTrimestre = { T1: {}, T2: {}, T3: {} };
  // asistencia por trimestre (agregado a nivel curso)
  fj: Record<Trimestre, number> = { T1: 0, T2: 0, T3: 0 };
  fi: Record<Trimestre, number> = { T1: 0, T2: 0, T3: 0 };
  laborables: Record<Trimestre, number> = { T1: 0, T2: 0, T3: 0 };

  ngOnInit() {
    this.cursoSrv.listar().subscribe({
      next: (res: any) => this.cursos.set(res?.data ?? res ?? []),
      error: () => this.sb.open('Error cargando cursos', 'Cerrar', { duration: 3000 })
    });
  }

  // =========================
  // UI actions
  // =========================
  async buscarEstudiante() {
    if (!this.cursoId || !this.cedula) {
      this.sb.open('Seleccione curso y escriba cédula', 'Cerrar', { duration: 2500 });
      return;
    }
    this.cargando.set(true);
    try {
      // 1) curso detalle (para materias, anio, etc.)
      const cResp: any = await firstValueFrom(this.cursoSrv.obtener(this.cursoId));
      this.cursoDetalle = cResp?.data ?? cResp ?? null;
      this.anioLectivoId = this.asId(this.cursoDetalle?.anioLectivo);

      // 2) estudiante por cédula (opcional: podrías buscar solo los del curso)
      const allEst = await firstValueFrom(this.estSrv.getAll());
      const found = allEst.find(e => e.cedula === this.cedula);
      if (!found) {
        this.sb.open('No se encontró estudiante con esa cédula', 'Cerrar', { duration: 3000 });
        this.estudiante = null;
        this.cargando.set(false);
        return;
      }
      // valida que esté en el curso seleccionado
      const idsCurso: string[] = (this.cursoDetalle?.estudiantes ?? []).map((e: any) => this.asId(e));
      const idEst = this.asId(found._id ?? found.uid);
      if (!idsCurso.includes(idEst)) {
        this.sb.open('El estudiante no pertenece al curso seleccionado', 'Cerrar', { duration: 3500 });
        this.estudiante = null;
        this.cargando.set(false);
        return;
      }

      this.estudiante = found;

      // 3) materias del curso
      this.materias = (this.cursoDetalle?.materias ?? []).map((m: any) => ({
        id: this.asId(m?.materia),
        nombre: m?.materia?.nombre ?? m?.materia ?? '—'
      }));

      // 4) cargar notas + asistencia
      await this.cargarNotasYAsistencia(idEst);

      this.sb.open('Datos cargados', 'Cerrar', { duration: 1500 });
    } catch (e) {
      console.error('[Reporte] buscarEstudiante error:', e);
      this.sb.open('Error al preparar datos', 'Cerrar', { duration: 3000 });
    } finally {
      this.cargando.set(false);
    }
  }

  async generarPDF() {
    if (!this.estudiante || !this.cursoDetalle) {
      this.sb.open('Primero busque el estudiante', 'Cerrar', { duration: 2500 });
      return;
    }
    const docDef = this.buildPdfDefinition();
    const pdfMake = await import('pdfmake/build/pdfmake');
    const pdfFonts = await import('pdfmake/build/vfs_fonts');
    (pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;
    (pdfMake as any).createPdf(docDef).open();
  }

  // =========================
  // Data load
  // =========================
  private async cargarNotasYAsistencia(estudianteId: string) {
    // limpia estructuras
    this.notas = { T1: {}, T2: {}, T3: {} };
    this.fj = { T1: 0, T2: 0, T3: 0 };
    this.fi = { T1: 0, T2: 0, T3: 0 };
    this.laborables = { T1: 0, T2: 0, T3: 0 };

    const trimestres: Trimestre[] = this.tipoReporte === 'FINAL'
      ? ['T1', 'T2', 'T3']
      : [this.tipoReporte as Trimestre];

    // --- Notas por materia y trimestre (0..10) ---
    for (const t of trimestres) {
      for (const m of this.materias) {
        try {
          const resp: any = await firstValueFrom(this.caliSrv.obtenerNotas({
            cursoId: this.asId(this.cursoDetalle?._id),
            anioLectivoId: this.anioLectivoId,
            materiaId: m.id,
            trimestre: t
          }));
          const list = resp?.estudiantes ?? [];
          const row = list.find((x: any) => this.asId(x?.estudianteId) === estudianteId);
          const nota = typeof row?.promedioTrimestral === 'number' ? Number(row.promedioTrimestral) : null;
          this.notas[t][m.id] = nota; // ya está 0..10 según tus cambios
        } catch {
          this.notas[t][m.id] = null;
        }
      }
    }

    // --- Asistencia: agregada a nivel curso (sumamos sobre materias) ---
    // Si tu backend guarda asistencia por CURSO (recomendado), usa un materiaId especial o ignóralo.
    // Aquí agregamos la primera materia como fallback para días laborables; faltas se agregan sumando por materias.
    for (const t of trimestres) {
      let totalFJ = 0;
      let totalFI = 0;
      let maxLaborables = 0;

      for (const m of this.materias) {
        try {
          const faltasR = await firstValueFrom(this.asisSrv.obtenerFaltas({
            cursoId: this.asId(this.cursoDetalle?._id),
            anioLectivoId: this.anioLectivoId,
            materiaId: m.id,
            trimestre: t
          }));
          const found = (faltasR?.estudiantes ?? []).find((x: any) => this.asId(x.estudianteId) === estudianteId);
          if (found) {
            totalFJ += Number(found.faltasJustificadas ?? 0);
            totalFI += Number(found.faltasInjustificadas ?? 0);
          }

          const labR = await firstValueFrom(this.asisSrv.getDiasLaborables({
            cursoId: this.asId(this.cursoDetalle?._id),
            anioLectivoId: this.anioLectivoId,
            materiaId: m.id,
            trimestre: t
          }));
          const d = Number(labR?.diasLaborables ?? 0);
          if (d > maxLaborables) maxLaborables = d; // tomamos el mayor para no duplicar
        } catch { /* ignore */ }
      }

      this.fj[t] = totalFJ;
      this.fi[t] = totalFI;
      this.laborables[t] = maxLaborables;
    }
  }

  // =========================
  // PDF
  // =========================
  private buildPdfDefinition() {
    const esFinal = this.tipoReporte === 'FINAL';
    const T: Trimestre[] = ['T1', 'T2', 'T3'];

    // Tabla de asignaturas
    const headerRow = [
      { text: 'ASIGNATURA', bold: true, alignment: 'left' },
      { text: 'I', bold: true, alignment: 'center' },
      { text: 'II', bold: true, alignment: 'center' },
      { text: 'III', bold: true, alignment: 'center' },
      { text: 'PROMEDIO TRIMESTRE', bold: true, alignment: 'center' }
    ];

    const body: any[] = [headerRow];

    const colPromT: Record<Trimestre, number[]> = { T1: [], T2: [], T3: [] };
    const colPromFinal: number[] = [];

    for (const m of this.materias) {
      const n1 = this.notas.T1[m.id] ?? null;
      const n2 = this.notas.T2[m.id] ?? null;
      const n3 = this.notas.T3[m.id] ?? null;

      const avgRow = esFinal
        ? this.avg([n1, n2, n3])
        : (this.tipoReporte === 'T1' ? n1 : this.tipoReporte === 'T2' ? n2 : n3);

      if (n1 != null) colPromT.T1.push(n1);
      if (n2 != null) colPromT.T2.push(n2);
      if (n3 != null) colPromT.T3.push(n3);
      if (avgRow != null) colPromFinal.push(avgRow);

      body.push([
        { text: m.nombre, alignment: 'left' },
        { text: this.fmt(n1), alignment: 'center' },
        { text: this.fmt(n2), alignment: 'center' },
        { text: this.fmt(n3), alignment: 'center' },
        { text: this.fmt(avgRow), alignment: 'center' }
      ]);
    }

    // Fila PROMEDIO (promedia por columna)
    const p1 = this.avg(colPromT.T1);
    const p2 = this.avg(colPromT.T2);
    const p3 = this.avg(colPromT.T3);
    const pF = esFinal ? this.avg(colPromFinal) : (this.tipoReporte === 'T1' ? p1 : this.tipoReporte === 'T2' ? p2 : p3);

    body.push([
      { text: 'PROMEDIO', bold: true, alignment: 'left' },
      { text: this.fmt(p1), bold: true, alignment: 'center' },
      { text: this.fmt(p2), bold: true, alignment: 'center' },
      { text: this.fmt(p3), bold: true, alignment: 'center' },
      { text: this.fmt(pF), bold: true, alignment: 'center' },
    ]);

    // Bloque asistencia (FJ/FI por trimestre) + DÍAS ASISTIDOS = laborables - FI
    const asistBody = [
      [
        { text: 'FJ', bold: true, alignment: 'center' },
        { text: 'FI', bold: true, alignment: 'center' },
        { text: 'FJ', bold: true, alignment: 'center' },
        { text: 'FI', bold: true, alignment: 'center' },
        { text: 'FJ', bold: true, alignment: 'center' },
        { text: 'FI', bold: true, alignment: 'center' },
      ],
      [
        { text: String(this.fj.T1 || 0), alignment: 'center' },
        { text: String(this.fi.T1 || 0), alignment: 'center' },
        { text: String(this.fj.T2 || 0), alignment: 'center' },
        { text: String(this.fi.T2 || 0), alignment: 'center' },
        { text: String(this.fj.T3 || 0), alignment: 'center' },
        { text: String(this.fi.T3 || 0), alignment: 'center' },
      ]
    ];

    const diasAsistidos = (t: Trimestre) => {
      const lab = this.laborables[t] || 0;
      const inju = this.fi[t] || 0;
      const asist = Math.max(0, lab - inju);
      return `${asist} / ${lab}`;
    };

    // Encabezado: logos + textos (muy similar al formato)
    const headerRowTop: any = {
      columns: [
        LOGO_MINEDU
          ? { image: LOGO_MINEDU, width: 60, alignment: 'left' }
          : { text: 'Ministerio de Educación', italics: true, alignment: 'left' },
        { text: 'UNIDAD EDUCATIVA\n"FRAY BARTOLOMÉ DE LAS CASAS - SALASACA"', bold: true, alignment: 'center', margin: [0, 6, 0, 0] },
        LOGO_ESCUDO
          ? { image: LOGO_ESCUDO, width: 60, alignment: 'right' }
          : { text: 'Escudo', italics: true, alignment: 'right' },
      ],
      margin: [0, 0, 0, 10]
    };

    const datosPlantel: any[] = [
      { text: 'UNIDAD EDUCATIVA FRAY BARTOLOMÉ DE LAS CASAS - SALASACA', alignment: 'center', bold: true, margin: [0, 3, 0, 0] },
      { text: `AÑO LECTIVO: 2024 - 2025   JORNADA: MATUTINA`, alignment: 'left', margin: [0, 8, 0, 0] },
      { text: `GRADO/CURSO: ${this.cursoDetalle?.nombre ?? '—'}   NIVEL/SUBNIVEL: —`, alignment: 'left' },
      { text: `FECHA: ${this.hoy()}   TUTOR/A: ${this.cursoDetalle?.profesorTutor?.nombre ?? this.cursoDetalle?.profesorTutor ?? '—'}`, alignment: 'left' },
      { text: `NOMBRE DEL/LA ESTUDIANTE: ${this.estudiante?.nombre ?? '—'}`, alignment: 'left', margin: [0, 8, 0, 8] },
    ];

    // Bloques “acompañamiento” y “evaluación” – vacíos para completar manualmente
    const acompanamiento = {
      table: {
        widths: ['*'],
        body: [[{ text: 'ACOMPAÑAMIENTO INTEGRAL EN EL AULA', bold: true }], [{ text: ' ', minHeight: 20 }]]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 10, 0, 0]
    };

    const evaluacionComp = {
      table: {
        widths: ['*', '*'],
        body: [
          [{ text: 'EVALUACIÓN COMPORTAMENTAL', bold: true, colSpan: 2, alignment: 'center' }, {}],
          [{ text: ' ', minHeight: 20 }, { text: ' ', minHeight: 20 }],
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 10, 0, 0]
    };

    const asistenciaBlock = {
      table: {
        widths: [40, 40, 40, 40, 40, 40],
        body: asistBody
      },
      layout: 'lightHorizontalLines',
      margin: [0, 10, 0, 0]
    };

    const diasAsistidosBlock = {
      columns: [
        { text: `DÍAS ASISTIDOS T1: ${diasAsistidos('T1')}`, width: '33%', alignment: 'center' },
        { text: `T2: ${diasAsistidos('T2')}`, width: '33%', alignment: 'center' },
        { text: `T3: ${diasAsistidos('T3')}`, width: '33%', alignment: 'center' },
      ],
      margin: [0, 6, 0, 0]
    };

    const firmaTutor = { text: '\n\n______________________________\nTUTOR/A', alignment: 'left', margin: [0, 16, 0, 0] };

    return {
      pageSize: 'A4',
      pageMargins: [36, 28, 36, 36],
      content: [
        headerRowTop,
        ...datosPlantel,
        {
          table: {
            headerRows: 1,
            widths: ['*', 40, 40, 40, 90],
            body: body
          },
          layout: {
            fillColor: (rowIndex: number) => (rowIndex === 0 ? '#F3F4F6' : null),
          },
          margin: [0, 4, 0, 0]
        },
        acompanamiento,
        evaluacionComp,
        { text: 'ASISTENCIA', bold: true, margin: [0, 10, 0, 4] },
        asistenciaBlock,
        diasAsistidosBlock,
        firmaTutor
      ],
      defaultStyle: { fontSize: 10 }
    };
  }

  // =========================
  // Helpers
  // =========================
  public asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val._id) return String(val._id);
    if (typeof val === 'object' && val.uid) return String(val.uid);
    return String(val);
  }
  private fmt(n: number | null | undefined): string {
    return n == null || isNaN(Number(n)) ? '—' : Number(n).toFixed(2);
  }
  private avg(arr: Array<number | null | undefined>): number | null {
    const xs = (arr || []).map(Number).filter(v => !isNaN(v));
    if (!xs.length) return null;
    const s = xs.reduce((a, b) => a + b, 0);
    return Number((s / xs.length).toFixed(2));
  }
  private hoy(): string {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
}
