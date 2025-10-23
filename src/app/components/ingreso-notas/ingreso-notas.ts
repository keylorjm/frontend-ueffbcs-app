import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CursoService, Curso } from '../../services/curso.service';
import { Estudiante } from '../../services/estudiante.service';
import {
  CalificacionService,
  Trimestre,
  NotaTrimestreInput,
} from '../../services/calificacion.service';

/** Conversión nota → cualitativa (solo visual) */
function cualiFromPromedio(prom: number | null | undefined): string {
  if (prom == null || Number.isNaN(Number(prom))) return '';
  const p = Number(prom);
  if (p >= 9) return 'A (Excelente)';
  if (p >= 8) return 'B (Muy bueno)';
  if (p >= 7) return 'C (Bueno)';
  if (p >= 6) return 'D (Suficiente)';
  return 'E (Insuficiente)';
}

/** Formulario por estudiante (según backend actual) */
type NotaForm = FormGroup<{
  estudianteId: FormControl<string>;
  promedioTrimestral: FormControl<number | null>;
  faltasJustificadas: FormControl<number | null>;
  faltasInjustificadas: FormControl<number | null>;
}>;

@Component({
  standalone: true,
  selector: 'app-ingreso-notas',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <section class="panel" *ngIf="form">
      <h2>Ingreso de Notas · {{ cursoNombre() }}</h2>

      <select [value]="trimestre()" (change)="onTrimestre($event)">
  <option value="T1">T1</option>
  <option value="T2">T2</option>
  <option value="T3">T3</option>
</select>


      <div class="actions-top">
        <button mat-stroked-button type="button" (click)="precargar()">Precargar</button>
      </div>

      <form [formGroup]="form" (ngSubmit)="guardar()">
        <div formArrayName="notas">
          <table mat-table [dataSource]="estudiantes()" class="mat-elevation-z2">
            <!-- Estudiante -->
            <ng-container matColumnDef="estudiante">
              <th mat-header-cell *matHeaderCellDef>Estudiante</th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                {{ e?.nombre }}
                <input type="hidden" formControlName="estudianteId" />
              </td>
            </ng-container>

            <!-- PromedioTrimestral -->
            <ng-container matColumnDef="prom">
              <th mat-header-cell *matHeaderCellDef>Nota (0–10)</th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline">
                  <input
                    matInput
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    formControlName="promedioTrimestral"
                    placeholder="0 - 10"
                  />
                </mat-form-field>
              </td>
            </ng-container>

            <!-- Cualitativa (visual) -->
            <ng-container matColumnDef="cualit">
              <th mat-header-cell *matHeaderCellDef>Cualitativa</th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <span
                  class="badge"
                  [ngClass]="
                    badgeClass(cualiFromPromedio(notasArr.at(i).get('promedioTrimestral')?.value))
                  "
                >
                  {{ cualiFromPromedio(notasArr.at(i).get('promedioTrimestral')?.value) || '—' }}
                </span>
              </td>
            </ng-container>

            <!-- Faltas J -->
            <ng-container matColumnDef="fj">
              <th mat-header-cell *matHeaderCellDef>FJ</th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline">
                  <input matInput type="number" min="0" formControlName="faltasJustificadas" />
                </mat-form-field>
              </td>
            </ng-container>

            <!-- Faltas I -->
            <ng-container matColumnDef="fi">
              <th mat-header-cell *matHeaderCellDef>FI</th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline">
                  <input matInput type="number" min="0" formControlName="faltasInjustificadas" />
                </mat-form-field>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayed"></tr>
            <tr mat-row *matRowDef="let row; columns: displayed"></tr>
          </table>
        </div>

        <div class="actions">
          <button mat-raised-button color="primary" type="submit">Guardar</button>
          <button
            mat-button
            type="button"
            (click)="router.navigate(['/profesor/curso', cursoId, 'notas'])"
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .panel {
        display: grid;
        gap: 16px;
      }
      .context {
        display: flex;
        gap: 16px;
        align-items: center;
      }
      .actions-top {
        margin-top: -8px;
      }
      table {
        width: 100%;
      }
      mat-form-field {
        width: 130px;
      }
      .actions {
        display: flex;
        gap: 12px;
        margin-top: 12px;
      }
      .badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        background: #f3f4f6;
        font-size: 12px;
      }
      .badge-a {
        background: #dcfce7;
        color: #166534;
      }
      .badge-b {
        background: #e0f2fe;
        color: #075985;
      }
      .badge-c {
        background: #fef9c3;
        color: #854d0e;
      }
      .badge-d {
        background: #fee2e2;
        color: #991b1b;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngresoNotasComponent {
  private route = inject(ActivatedRoute);
  protected router = inject(Router);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  private cursoService = inject(CursoService);
  private califService = inject(CalificacionService);

  // -------- Contexto desde la URL (backend espera: cursoId, anioLectivoId, materiaId, trimestre)
  cursoId = this.route.snapshot.paramMap.get('id')!;
  materiaId = this.route.snapshot.queryParamMap.get('materiaId') || '';
  anioLectivoId = this.route.snapshot.queryParamMap.get('anioLectivoId') || '';
  trimestre = signal<Trimestre>(
    (this.route.snapshot.queryParamMap.get('trimestre') as Trimestre) || 'T1'
  );

  // -------- Estado UI
  curso = signal<Curso | null>(null);
  estudiantes = signal<Estudiante[]>([]);
  cursoNombre = computed(() => this.curso()?.nombre ?? '—');

  displayed = ['estudiante', 'prom', 'cualit', 'fj', 'fi'] as const;

  // -------- Formulario (una fila por estudiante)
  form = this.fb.group({
    notas: this.fb.array<NotaForm>([]),
  });

  get notasArr(): FormArray<NotaForm> {
    return this.form.get('notas') as FormArray<NotaForm>;
  }

  // -------- Helpers UI
  cualiFromPromedio = cualiFromPromedio;
  badgeClass(q: string): string {
    if (!q) return '';
    if (q.startsWith('A')) return 'badge-a';
    if (q.startsWith('B')) return 'badge-b';
    if (q.startsWith('C')) return 'badge-c';
    return 'badge-d';
  }

  constructor() {
    // Cargar curso + estudiantes
    this.cursoService.getById(this.cursoId).subscribe({
      next: (c) => {
        this.curso.set(c);
        const ests = (c.estudiantes ?? []) as any[];
        this.estudiantes.set(ests);
        // si no viene anioLectivoId en la URL, intenta tomarlo del curso (populate)
        if (!this.anioLectivoId) {
          const al = (c as any)?.anioLectivo;
          this.anioLectivoId = (al?.uid ?? al?._id) || '';
        }
        this.armarFormulario();
        this.precargar(); // intentamos precargar al abrir
      },
      error: () => this.snack.open('No se pudo cargar el curso', 'Cerrar', { duration: 3000 }),
    });
  }

  // construir form array
  private armarFormulario(): void {
    this.notasArr.clear();
    for (const e of this.estudiantes()) {
      const estId = (e as any).uid ?? (e as any)._id;
      this.notasArr.push(this.newNotaForm(estId));
    }
  }

  private newNotaForm(estudianteId: string): NotaForm {
    return this.fb.group({
      estudianteId: this.fb.control<string>(estudianteId, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      promedioTrimestral: this.fb.control<number | null>(null, [
        Validators.min(0),
        Validators.max(10),
      ]),
      faltasJustificadas: this.fb.control<number | null>(0, [Validators.min(0)]),
      faltasInjustificadas: this.fb.control<number | null>(0, [Validators.min(0)]),
    });
  }

  onTrimestre(value: any) {
    const t = String(value || 'T1') as Trimestre;
    this.trimestre.set(t);
    // no reseteamos estructura, sólo valores visibles
    for (const g of this.notasArr.controls) {
      g.patchValue(
        { promedioTrimestral: null, faltasJustificadas: 0, faltasInjustificadas: 0 },
        { emitEvent: false }
      );
    }
  }

  /** Precarga desde GET /api/calificaciones con {cursoId, anioLectivoId, materiaId, trimestre} */
  precargar() {
    if (!this.anioLectivoId || !this.materiaId) {
      this.snack.open('Falta Año Lectivo o Materia en la URL.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.califService
      .obtenerNotas({
        cursoId: this.cursoId,
        anioLectivoId: this.anioLectivoId,
        materiaId: this.materiaId,
        trimestre: this.trimestre(),
      })
      .subscribe({
        next: (rows) => {
          // rows = Calificacion[] con campos T1/T2/T3
          const byEst: Record<string, any> = {};
          for (const r of rows) {
            const id = r?.estudiante?.uid ?? r?.estudiante?._id;
            if (id) byEst[id] = r;
          }
          const tri = this.trimestre();
          this.estudiantes().forEach((e, idx) => {
            const k = (e as any).uid ?? (e as any)._id;
            const row = byEst[k];
            if (!row) return;
            const t = (row as any)[tri] || {};
            this.notasArr.at(idx).patchValue(
              {
                promedioTrimestral: t.promedioTrimestral ?? null,
                faltasJustificadas: t.faltasJustificadas ?? 0,
                faltasInjustificadas: t.faltasInjustificadas ?? 0,
              },
              { emitEvent: false }
            );
          });
          this.snack.open('Notas precargadas', 'OK', { duration: 1800 });
        },
        error: (e) => {
          const msg = e?.error?.message || 'No se pudieron precargar las notas';
          this.snack.open(`❌ ${msg}`, 'Cerrar', { duration: 3500 });
        },
      });
  }

  /** Guarda con POST /api/calificaciones/bulk-trimestre */
  guardar() {
    if (this.form.invalid) {
      this.snack.open('Revisa los campos (0–10).', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!this.anioLectivoId || !this.materiaId) {
      this.snack.open('Falta Año Lectivo o Materia en la URL.', 'Cerrar', { duration: 3000 });
      return;
    }

    const notas: NotaTrimestreInput[] = this.notasArr.value.map((v: any) => ({
      estudianteId: v.estudianteId,
      promedioTrimestral: v.promedioTrimestral ?? 0,
      faltasJustificadas: v.faltasJustificadas ?? 0,
      faltasInjustificadas: v.faltasInjustificadas ?? 0,
    }));

    this.califService
      .cargarTrimestreBulk({
        cursoId: this.cursoId,
        anioLectivoId: this.anioLectivoId,
        materiaId: this.materiaId,
        trimestre: this.trimestre(),
        notas,
      })
      .subscribe({
        next: () => {
          this.snack.open('✅ Notas guardadas', 'OK', { duration: 2200 });
          this.router.navigate(['/profesor/curso', this.cursoId, 'notas']);
        },
        error: (e) => {
          const msg = e?.error?.message || 'Error guardando notas';
          this.snack.open(`❌ ${msg}`, 'Cerrar', { duration: 3500 });
        },
      });
  }
}
