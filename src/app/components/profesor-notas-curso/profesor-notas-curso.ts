// src/app/components/profesor-notas-curso/profesor-notas-curso.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';
import { CalificacionService, Trimestre, BulkTrimestrePayload } from '../../services/calificacion.service';

type MateriaAsignada = { materiaId: string; materiaNombre: string };

@Component({
  standalone: true,
  selector: 'app-profesor-notas-curso',
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSelectModule, MatInputModule, MatButtonModule, MatSnackBarModule,
    MatIconModule, MatDividerModule
  ],
  template: `
  <div class="wrap">
    <mat-card class="card">
      <div class="header">
        <div>
          <h2>👨‍🏫 Notas por Estudiante</h2>
          <div class="sub">Seleccione el curso asignado, el trimestre y el estudiante para registrar la nota.</div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <form #f="ngForm" (ngSubmit)="guardar(f)" class="form-grid">
        <!-- Curso -->
        <div class="field">
          <label class="lbl">Curso</label>
          <mat-select [(ngModel)]="cursoId" name="cursoId" (selectionChange)="onCursoChange()" required>
            <mat-option *ngFor="let c of cursos()" [value]="asId(c._id)">
              {{ c.nombre }}
            </mat-option>
          </mat-select>
        </div>

        <!-- Materia (solo si el profesor tiene >1 materia asignada en ese curso) -->
        <div class="field" *ngIf="materiasAsignadas().length > 1">
          <label class="lbl">Materia</label>
          <mat-select [(ngModel)]="materiaId" name="materiaId" required (selectionChange)="preloadNotasDelTrimestre()">
            <mat-option *ngFor="let m of materiasAsignadas()" [value]="m.materiaId">
              {{ m.materiaNombre }}
            </mat-option>
          </mat-select>
        </div>

        <!-- Trimestre -->
        <div class="field">
          <label class="lbl">Trimestre</label>
          <mat-select [(ngModel)]="trimestre" name="trimestre" required (selectionChange)="preloadNotasDelTrimestre()">
            <mat-option [value]="'T1'">Primer Trimestre</mat-option>
            <mat-option [value]="'T2'">Segundo Trimestre</mat-option>
            <mat-option [value]="'T3'">Tercer Trimestre</mat-option>
          </mat-select>
        </div>

        <!-- Estudiante -->
        <div class="field">
          <label class="lbl">Estudiante</label>
          <mat-select [(ngModel)]="estudianteId" name="estudianteId" required (selectionChange)="prefillDesdeNotas()">
            <mat-option *ngFor="let e of estudiantesCurso()" [value]="asId(e._id)">
              {{ e.nombre ?? e.fullname ?? e.email ?? '—' }}
            </mat-option>
          </mat-select>
        </div>

        <!-- Nota / Faltas -->
        <div class="row2">
          <div class="field">
            <label class="lbl">Promedio Trimestral</label>
            <input matInput type="number" min="0" max="100" [(ngModel)]="promedio" name="promedio"
                   (ngModelChange)="cualitativa = caliSrv.cualitativa(promedio ?? 0)" required />
          </div>
          <div class="field">
            <label class="lbl">Faltas Justificadas</label>
            <input matInput type="number" min="0" [(ngModel)]="faltasJ" name="faltasJ" />
          </div>
          <div class="field">
            <label class="lbl">Faltas Injustificadas</label>
            <input matInput type="number" min="0" [(ngModel)]="faltasI" name="faltasI" />
          </div>
          <div class="field cuali">
            <label class="lbl">Cualitativa</label>
            <div class="badge" [class.ok]="(promedio ?? 0) >= 70" [class.warn]="(promedio ?? 0) < 70">
              {{ cualitativa }}
            </div>
          </div>
        </div>

        <div class="actions">
          <button mat-flat-button color="primary" type="submit" [disabled]="!formOk()">
            <mat-icon>save</mat-icon> Guardar
          </button>
        </div>
      </form>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 20px; max-width: 900px; margin: 0 auto; }
    .card { padding: 16px; border-radius: 18px; display: grid; gap: 10px; }
    .header h2 { margin: 0; font-size: 22px; font-weight: 800; }
    .sub { opacity: .7; }
    .form-grid { display: grid; gap: 12px; }
    .field { display: grid; gap: 6px; }
    .lbl { font-size: 13px; opacity: .85; }
    .row2 { display: grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap: 10px; }
    .actions { display: flex; justify-content: flex-end; }
    .badge { padding: 6px 10px; border-radius: 999px; background: #eee; text-align: center; }
    .ok { background: #e6f5e9; }
    .warn { background: #fdecea; }
    @media (max-width: 720px) {
      .row2 { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class ProfesorNotasCursoComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSrv = inject(CursoService);
  public caliSrv = inject(CalificacionService);

  // Estado base
  cursos = signal<any[]>([]);
  cursoId = '';
  materiaId = '';
  trimestre: Trimestre = 'T1';
  estudianteId = '';

  // Campos de nota
  promedio: number | null = null;
  faltasJ: number = 0;
  faltasI: number = 0;
  cualitativa: string = 'Insuficiente';

  // Cache: notas existentes del trimestre para prefill rápido por estudiante
  private notasIndex = new Map<string, { prom: number | null, fj: number, fi: number }>();

  // ====== Ciclo ======
  ngOnInit(): void {
    // Cargar cursos, filtrando solo los que tienen al profesor como responsable en alguna materia
    this.auth.ensureUserLoaded().subscribe(() => {
      const me = this.auth.getuser()?.id ?? '';
      this.cursoSrv.listar().subscribe({
        next: (res: any) => {
          const all = res?.data ?? res ?? [];
          const mios = all.filter((c: any) =>
            (c.materias ?? []).some((m: any) => this.asId(m?.profesor) === me)
          );
          this.cursos.set(mios);
          // Autoseleccionar curso si hay solo uno
          if (mios.length === 1) {
            this.cursoId = this.asId(mios[0]._id);
            this.onCursoChange();
          }
        },
        error: () => this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 })
      });
    });
  }

  // ====== Derivados ======
  cursoSel = computed(() => (this.cursos() ?? []).find(c => this.asId(c._id) === this.cursoId));
  estudiantesCurso = computed(() => (this.cursoSel()?.estudiantes ?? []));
  materiasAsignadas = computed<MateriaAsignada[]>(() => {
    const me = this.auth.getuser()?.id ?? '';
    const mats = (this.cursoSel()?.materias ?? [])
      .filter((m: any) => this.asId(m?.profesor) === me)
      .map((m: any) => ({
        materiaId: this.asId(m?.materia),
        materiaNombre: m?.materia?.nombre ?? m?.materia ?? '—'
      }));
    return mats;
  });

  // ====== Handlers ======
  onCursoChange() {
    // Si hay solo una materia asignada, autoseleccionarla y ocultar el selector
    const mats = this.materiasAsignadas();
    this.materiaId = mats.length === 1 ? mats[0].materiaId : '';
    // reset alumno y campos
    this.estudianteId = '';
    this.resetCampos();
    // Precargar notas del trimestre (si ya hay materia)
    this.preloadNotasDelTrimestre();
  }

  preloadNotasDelTrimestre() {
    this.notasIndex.clear();
    if (!this.cursoId || !this.materiaId || !this.trimestre) return;

    // Obtener las notas del trimestre para toda la materia y armar un índice por estudiante
    this.caliSrv.obtenerNotas({
      cursoId: this.cursoId,
      anioLectivoId: this.asId(this.cursoSel()?.anioLectivo),
      materiaId: this.materiaId,
      trimestre: this.trimestre,
    }).subscribe({
      next: (res) => {
        (res.estudiantes ?? []).forEach(e => {
          this.notasIndex.set(e.estudianteId, {
            prom: e.promedioTrimestral ?? null,
            fj: e.faltasJustificadas ?? 0,
            fi: e.faltasInjustificadas ?? 0
          });
        });
        // Si ya hay estudiante seleccionado, prefill
        this.prefillDesdeNotas();
      },
      error: (e) => this.sb.open(e?.error?.message ?? 'No se pudieron obtener las notas actuales', 'Cerrar', { duration: 3500 })
    });
  }

  prefillDesdeNotas() {
    this.resetCampos();
    if (!this.estudianteId) return;
    const found = this.notasIndex.get(this.estudianteId);
    if (found) {
      this.promedio = found.prom;
      this.faltasJ = found.fj;
      this.faltasI = found.fi;
      this.cualitativa = this.caliSrv.cualitativa(this.promedio ?? 0);
    }
  }

  guardar(f: NgForm) {
    if (!this.formOk()) {
      this.sb.open('Complete los campos requeridos.', 'Cerrar', { duration: 2500 });
      return;
    }

    // Validación rango
    if (this.promedio != null) {
      const n = Number(this.promedio);
      if (isNaN(n) || n < 0 || n > 100) {
        this.sb.open('El promedio debe estar entre 0 y 100.', 'Cerrar', { duration: 3000 });
        return;
      }
    }

    // Usamos el bulk con una sola fila
    const payload: BulkTrimestrePayload = this.caliSrv.buildBulkPayload({
      cursoId: this.cursoId,
      anioLectivoId: this.asId(this.cursoSel()?.anioLectivo),
      materiaId: this.materiaId,
      trimestre: this.trimestre,
      tableRows: [
        {
          estudianteId: this.estudianteId,
          promedioTrimestral: this.promedio,
          faltasJustificadas: this.faltasJ,
          faltasInjustificadas: this.faltasI,
          asistenciaTotal: undefined
        }
      ]
    });

    this.caliSrv.cargarTrimestreBulk(payload).subscribe({
      next: (r) => {
        this.sb.open(r?.message ?? 'Nota guardada', 'Cerrar', { duration: 2500 });
        // refrescar índice y mantener selección
        this.preloadNotasDelTrimestre();
      },
      error: (e) => this.sb.open(e?.error?.message ?? 'Error al guardar la nota', 'Cerrar', { duration: 3500 }),
    });
  }

  // ====== Helpers ======
  formOk(): boolean {
    const cursoOk = !!this.cursoId;
    const materiaOk = this.materiasAsignadas().length <= 1 ? true : !!this.materiaId;
    const triOk = !!this.trimestre;
    const estOk = !!this.estudianteId;
    return cursoOk && materiaOk && triOk && estOk;
  }

  resetCampos() {
    this.promedio = null;
    this.faltasJ = 0;
    this.faltasI = 0;
    this.cualitativa = this.caliSrv.cualitativa(0);
  }

  asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val._id) return String(val._id);
    return String(val);
  }
}
