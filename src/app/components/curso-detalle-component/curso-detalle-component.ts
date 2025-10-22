// src/app/components/curso-detalle-component/curso-detalle-component.ts
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Curso, CursoService } from '../../services/curso.service';
import {
  CalificacionService,
  Trimestre,
  NotaTrimestreInput,
  CalificacionRow,
} from '../../services/calificacion.service';
import { AnioLectivoService } from '../../services/anio-lectivo.service';

type Estado = 'cargando' | 'ok' | 'error';

/** Conversión nota → cualitativa (A/B/C/D/E) */
function cualiFromPromedio(promedio: number | null | undefined): string {
  if (promedio == null || isNaN(Number(promedio))) return '';
  const p = Number(promedio);
  if (p >= 9) return 'A (Excelente)';
  if (p >= 8) return 'B (Muy bueno)';
  if (p >= 7) return 'C (Bueno)';
  if (p >= 6) return 'D (Suficiente)';
  return 'E (Insuficiente)';
}

/** Form tipado para una fila de notas */
type NotaForm = FormGroup<{
  estudianteId: FormControl<string>;
  promedioTrimestral: FormControl<number | null>;
  faltasJustificadas: FormControl<number | null>;
  faltasInjustificadas: FormControl<number | null>;
}>;

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <!-- Encabezado -->
    <div class="header">
      <h2 class="title">
        Curso: <span class="course">{{ cursoNombre() }}</span>
      </h2>

      <div class="stats">
        <span class="chip" title="Total de materias">📘 {{ materias().length }} materias</span>
        <span class="chip" title="Total de estudiantes">👥 {{ estudiantes().length }} estudiantes</span>
      </div>
    </div>

    <!-- Controles -->
    <section class="controls">
      <div class="control">
        <label for="trimestre">Trimestre</label>
        <select id="trimestre" (change)="onTrimestre($any($event.target).value)">
          <option value="" [selected]="!trimestre()">-- Selecciona --</option>
          <option value="T1" [selected]="trimestre()==='T1'">T1</option>
          <option value="T2" [selected]="trimestre()==='T2'">T2</option>
          <option value="T3" [selected]="trimestre()==='T3'">T3</option>
        </select>
      </div>

      <div class="control">
        <label for="materia">Materia</label>
        <select id="materia" (change)="onMateria($any($event.target).value)">
          <option value="" [selected]="!materiaSel()">-- Selecciona --</option>
          <option *ngFor="let m of materias()" [value]="id(m)" [selected]="id(m)===materiaSel()">
            {{ nombreMateria(m) }}
          </option>
        </select>
      </div>

      <div class="buttons">
        <button type="button" (click)="precargar()">Precargar</button>
        <button type="button" class="primary" (click)="guardar()">Guardar</button>
      </div>
    </section>

    <!-- Tabla de notas -->
    <form [formGroup]="form" class="table-wrap">
      <ng-container formArrayName="notas">
        <table class="notas" *ngIf="notasArr.length > 0; else vacio">
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Promedio</th>
              <th>Cualitativa</th>
              <th>Faltas J.</th>
              <th>Faltas I.</th>
            </tr>
          </thead>

          <tbody>
            <tr *ngFor="let g of notasArr.controls; let i = index" [formGroupName]="i">
              <td class="estudiante">
                {{ ((estudiantes()[i]?.nombre ?? 'Estudiante')).trim() }}
              </td>

              <td>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  formControlName="promedioTrimestral"
                  placeholder="0 - 10"
                />
              </td>

              <td>
                <span class="badge" [ngClass]="badgeClass(cualiFromPromedio(g.controls.promedioTrimestral.value))">
                  {{ cualiFromPromedio(g.controls.promedioTrimestral.value) || '—' }}
                </span>
              </td>

              <td>
                <input type="number" min="0" formControlName="faltasJustificadas" />
              </td>

              <td>
                <input type="number" min="0" formControlName="faltasInjustificadas" />
              </td>
            </tr>
          </tbody>
        </table>
      </ng-container>

      <ng-template #vacio>
        <p style="margin:12px 0;">Selecciona Trimestre y Materia para cargar las filas de estudiantes.</p>
      </ng-template>
    </form>
  `,
  styles: [`
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 8px 0 16px;
    }
    .title { margin: 0; font-weight: 600; }
    .title .course { font-weight: 700; }
    .stats { display: flex; gap: 8px; }
    .chip {
      background: #eef2ff;
      color: #3730a3;
      border-radius: 16px;
      padding: 4px 10px;
      font-size: 12px;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: end;
      margin-bottom: 16px;
    }
    .control { display: flex; flex-direction: column; gap: 4px; min-width: 220px; }
    .control select, .control input {
      padding: 6px 8px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    .buttons { display: flex; gap: 8px; }
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

    .table-wrap { overflow-x: auto; }
    table.notas { width: 100%; border-collapse: collapse; }
    table.notas th, table.notas td {
      padding: 8px 10px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
    }
    table.notas th { background: #f9fafb; font-weight: 600; }
    td.estudiante { white-space: nowrap; }

    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      background: #f3f4f6;
      font-size: 12px;
    }
    .badge-a   { background: #dcfce7; color: #166534; } /* A */
    .badge-b   { background: #e0f2fe; color: #075985; } /* B */
    .badge-c   { background: #fef9c3; color: #854d0e; } /* C */
    .badge-d   { background: #fee2e2; color: #991b1b; } /* D o inferior */
  `],
})
export class CursoDetalleComponent implements OnInit {
  // ---- Inyecciones
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private cursoService = inject(CursoService);
  private califService = inject(CalificacionService);
  private anioSvc = inject(AnioLectivoService);

  // ✅ exponer función al template
  public readonly cualiFromPromedio = cualiFromPromedio;

  // ---- Estado
  estado = signal<Estado>('cargando');
  private _curso = signal<Curso | null>(null);

  // Selección
  trimestre = signal<Trimestre | null>(null);
  materiaSel = signal<string | null>(null);
  anioLectivoId = signal<string>(''); // poblado desde Curso o fallback

  // Intento de autocompletar Año lectivo (evitar bucles)
  private triedFetchAnioForPrecargar = false;
  private triedFetchAnioForGuardar = false;

  // ---- Formulario tipado
  form: FormGroup<{ notas: FormArray<NotaForm> }> = new FormGroup({
    notas: new FormArray<NotaForm>([]),
  });

  get notasArr(): FormArray<NotaForm> {
    return this.form.controls.notas;
  }

  estudiantes = computed(() => this._curso()?.estudiantes ?? []);
  materias = computed(() => this._curso()?.materias ?? []);
  cursoNombre = computed(() => this._curso()?.nombre ?? '—');

  constructor() {
    // 🔁 Si cambia Trimestre o Materia, resetea valores (no estructura)
    effect(() => {
      const t = this.trimestre();
      const m = this.materiaSel();
      if (!t || !m) return;
      this.resetNotas();
    });
  }

  ngOnInit(): void {
    const raw =
      this.route.snapshot.paramMap.get('id') ??
      this.route.snapshot.queryParamMap.get('cursoId');

    const id = (raw && raw !== 'null' && raw !== 'undefined') ? raw : '';

    // Validamos forma de ObjectId (24 hex) para evitar /api/cursos/null
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      this.estado.set('error');
      this.snack.open('ID de curso inválido en la URL.', 'Cerrar', { duration: 3500 });
      return;
    }

    this.cargarCurso(id);
  }

  // ---- Utilidades
  id(x: any): string {
    return (x && (x._id ?? x.uid)) ?? '';
  }
  nombreMateria(m: any): string {
    return (m && (m.nombre ?? m.titulo ?? 'Materia')) || 'Materia';
  }

  // Eventos: casteo dentro del TS (no en el template)
  onTrimestre(raw: any) {
    const v = String(raw ?? '');
    this.trimestre.set(v ? (v as Trimestre) : null);
  }
  onMateria(raw: any) {
    const v = String(raw ?? '');
    this.materiaSel.set(v || null);
  }

  badgeClass(q: string): string {
    if (!q) return '';
    if (q.startsWith('A')) return 'badge-a';
    if (q.startsWith('B')) return 'badge-b';
    if (q.startsWith('C')) return 'badge-c';
    return 'badge-d';
  }

  // ========== FORM HELPERS ==========
  private newNotaGroup(estudianteId: string): NotaForm {
    return new FormGroup({
      estudianteId: new FormControl<string>(estudianteId, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      promedioTrimestral: new FormControl<number | null>(null, {
        validators: [Validators.min(0), Validators.max(10)],
      }),
      faltasJustificadas: new FormControl<number | null>(0, {
        validators: [Validators.min(0)],
      }),
      faltasInjustificadas: new FormControl<number | null>(0, {
        validators: [Validators.min(0)],
      }),
    });
  }

  /** Sanea filas existentes ante posibles inconsistencias externas. */
  private ensureNotaControls() {
    for (const g of this.notasArr.controls) {
      if (!('estudianteId' in g.controls)) {
        g.addControl('estudianteId', new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }));
      }
      if (!('promedioTrimestral' in g.controls)) {
        g.addControl('promedioTrimestral', new FormControl<number | null>(null, { validators: [Validators.min(0), Validators.max(10)] }));
      }
      if (!('faltasJustificadas' in g.controls)) {
        g.addControl('faltasJustificadas', new FormControl<number | null>(0, { validators: [Validators.min(0)] }));
      }
      if (!('faltasInjustificadas' in g.controls)) {
        g.addControl('faltasInjustificadas', new FormControl<number | null>(0, { validators: [Validators.min(0)] }));
      }
    }
  }

  // ---- Carga de curso (pobla Año lectivo; si falta, hace fallback)
  private cargarCurso(id: string) {
    this.estado.set('cargando');
    this.cursoService.getById(id).subscribe({
      next: (c) => {
        this._curso.set(c);

        const al: any = (c as any)?.anioLectivo ?? null;
        const alId = (al && (al.uid ?? al._id)) ?? '';
        if (alId) {
          this.anioLectivoId.set(alId);
        } else {
          // Fallback: intentar obtener el Año lectivo actual
          this.fetchAnioLectivoActual();
        }

        this.armarFormulario();
        this.estado.set('ok');
      },
      error: () => this.estado.set('error'),
    });
  }

  /** Intenta obtener el Año Lectivo actual y setear anioLectivoId */
  private fetchAnioLectivoActual(cb?: () => void) {
    this.anioSvc.obtenerActual().subscribe({
      next: (al: any) => {
        const id = (al?.uid ?? al?._id) ?? '';
        if (id) {
          this.anioLectivoId.set(id);
          if (cb) cb();
        } else {
          this.snack.open('⚠️ No hay Año Lectivo actual configurado.', 'Cerrar', { duration: 3000 });
        }
      },
      error: () => {
        this.snack.open('⚠️ No se pudo obtener el Año Lectivo actual.', 'Cerrar', { duration: 3000 });
      },
    });
  }

  private armarFormulario() {
    const ests = this.estudiantes();
    const arr = new FormArray<NotaForm>([]);
    for (const e of ests) {
      arr.push(this.newNotaGroup(this.id(e)));
    }
    this.form.setControl('notas', arr);

    // saneo defensivo
    this.ensureNotaControls();
  }

  private resetNotas() {
    // asegurar estructura antes de tocar valores
    this.ensureNotaControls();

    for (const g of this.notasArr.controls) {
      g.patchValue(
        {
          promedioTrimestral: null,
          faltasJustificadas: 0,
          faltasInjustificadas: 0,
        },
        { emitEvent: false }
      );
    }
  }

  // ---- Precargar notas (auto-intento de obtener Año lectivo si falta)
  precargar() {
    const t = this.trimestre();
    const mId = this.materiaSel();
    const aId = this.anioLectivoId();
    const cursoId = (this._curso()?.uid ?? this._curso()?._id) ?? '';

    if (!t || !mId) {
      this.snack.open('Selecciona Trimestre y Materia.', 'Cerrar', { duration: 2500 });
      return;
    }
    if (!aId) {
      if (!this.triedFetchAnioForPrecargar) {
        this.triedFetchAnioForPrecargar = true;
        this.fetchAnioLectivoActual(() => this.precargar());
        return;
      }
      this.snack.open('⚠️ Falta Año Lectivo. No es posible precargar.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.califService
      .obtenerNotas({
        cursoId: String(cursoId),
        anioLectivoId: aId,
        materiaId: mId,
        trimestre: t,
      })
      .subscribe({
        next: (rows) => {
          this.hidratarDesdeRows(rows ?? []);
          this.snack.open('Notas precargadas', 'OK', { duration: 2000 });
        },
        error: (e) => {
          const msg: string = e?.error?.message ?? 'No se pudieron precargar las notas';
          this.snack.open(`❌ ${msg}`, 'Cerrar', { duration: 3500 });
        },
      });
  }

  private hidratarDesdeRows(rows: CalificacionRow[]) {
    const mapByEst = new Map<string, CalificacionRow>();
    for (const r of rows) {
      const id = (r as any)?.estudianteId
        ?? r?.estudiante?._id
        ?? r?.estudiante?.uid
        ?? '';
      if (id) mapByEst.set(id, r);
    }

    const t = this.trimestre();
    for (const g of this.notasArr.controls) {
      this.ensureNotaControls();

      const estId = g.controls.estudianteId.value;
      if (!estId) continue;

      const row = mapByEst.get(estId);
      if (!row) continue;

      let prom: number | null = null;
      if (t && (row as any)[t] && (row as any)[t].promedioTrimestral != null) {
        prom = Number((row as any)[t].promedioTrimestral);
      } else if ((row as any).promedioTrimestralAnual != null) {
        prom = Number((row as any).promedioTrimestralAnual);
      }

      g.patchValue(
        {
          promedioTrimestral: prom,
          // Si manejas faltas por trimestre en el backend, mapéalas aquí:
          // faltasJustificadas: (row as any)[t!]?.faltasJustificadas ?? 0,
          // faltasInjustificadas: (row as any)[t!]?.faltasInjustificadas ?? 0,
        },
        { emitEvent: false }
      );
    }
  }

  // ---- Guardar (auto-intento de obtener Año lectivo si falta)
  guardar() {
    const t = this.trimestre();
    const mId = this.materiaSel();
    const aId = this.anioLectivoId();
    const cursoId = (this._curso()?.uid ?? this._curso()?._id) ?? '';

    if (!t || !mId) {
      this.snack.open('Selecciona Trimestre y Materia.', 'Cerrar', { duration: 2500 });
      return;
    }
    if (this.form.invalid) {
      this.snack.open('Revisa los campos (0–10).', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!aId) {
      if (!this.triedFetchAnioForGuardar) {
        this.triedFetchAnioForGuardar = true;
        this.fetchAnioLectivoActual(() => this.guardar());
        return;
      }
      this.snack.open('⚠️ Falta Año Lectivo. Configúralo antes de guardar.', 'Cerrar', { duration: 3000 });
      return;
    }

    // asegurar estructura antes de leer valores
    this.ensureNotaControls();

    const notas: NotaTrimestreInput[] = this.notasArr.controls.map((g) => ({
      estudianteId: g.controls.estudianteId.value,
      promedioTrimestral: g.controls.promedioTrimestral.value ?? 0,
      faltasJustificadas: g.controls.faltasJustificadas.value ?? 0,
      faltasInjustificadas: g.controls.faltasInjustificadas.value ?? 0,
    }));

    this.califService
      .cargarTrimestreBulk({
        cursoId: String(cursoId),
        anioLectivoId: aId,
        materiaId: mId,
        trimestre: t!,
        notas,
      })
      .subscribe({
        next: () => this.snack.open('✅ Notas guardadas', 'OK', { duration: 2500 }),
        error: (e) => {
          const msg: string = e?.error?.message ?? 'Error guardando notas';
          this.snack.open(`❌ ${msg}`, 'Cerrar', { duration: 4000 });
        },
      });
  }
}
