import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CursoService, Curso } from '../../services/curso.service';
import { Estudiante } from '../../services/estudiante.service';
import { Materia } from '../../services/materia.service';
import { CalificacionService, NotaTrimestreInput, Trimestre } from '../../services/calificacion.service';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-profesor-notas-curso',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatSelectModule, MatTableModule, MatInputModule, MatButtonModule, MatSnackBarModule
  ],
  template: `
    <section class="panel" *ngIf="curso()">
      <h2>Notas del curso · {{ curso()?.nombre }}</h2>

      <div class="filters">
        <mat-form-field appearance="fill">
          <mat-label>Trimestre</mat-label>
          <mat-select [value]="trimestre()" (selectionChange)="onTrimestre($event.value)">
            <mat-option *ngFor="let t of trimestres" [value]="t">{{ t }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Materia (asignada al profesor)</mat-label>
          <mat-select [value]="materiaSel()" (selectionChange)="onMateria($event.value)">
            <mat-option *ngFor="let m of materiasAsignadas()" [value]="idDe(m)">
              {{ nombreMateria(m) }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-raised-button color="primary"
                (click)="precargar()"
                [disabled]="!trimestre() || !materiaSel()">
          Precargar notas guardadas
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="guardar()">
        <div formArrayName="notas">
          <table mat-table [dataSource]="estudiantes()" class="mat-elevation-z2">
            <ng-container matColumnDef="estudiante">
              <th mat-header-cell *matHeaderCellDef> Estudiante </th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                {{ e?.nombre }} {{ e?.apellido }}
                <input type="hidden" formControlName="estudianteId" />
              </td>
            </ng-container>

            <ng-container matColumnDef="ai">
              <th mat-header-cell *matHeaderCellDef> AI </th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline">
                  <input matInput type="number" min="0" max="10" formControlName="actividadesIndividuales">
                </mat-form-field>
              </td>
            </ng-container>

            <ng-container matColumnDef="ag">
              <th mat-header-cell *matHeaderCellDef> AG </th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline">
                  <input matInput type="number" min="0" max="10" formControlName="actividadesGrupales">
                </mat-form-field>
              </td>
            </ng-container>

            <ng-container matColumnDef="pi">
              <th mat-header-cell *matHeaderCellDef> PI </th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline">
                  <input matInput type="number" min="0" max="10" formControlName="proyectoIntegrador">
                </mat-form-field>
              </td>
            </ng-container>

            <ng-container matColumnDef="ep">
              <th mat-header-cell *matHeaderCellDef> EP </th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline">
                  <input matInput type="number" min="0" max="10" formControlName="evaluacionPeriodo">
                </mat-form-field>
              </td>
            </ng-container>

            <ng-container matColumnDef="fj">
              <th mat-header-cell *matHeaderCellDef> FJ </th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline">
                  <input matInput type="number" min="0" formControlName="faltasJustificadas">
                </mat-form-field>
              </td>
            </ng-container>

            <ng-container matColumnDef="fi">
              <th mat-header-cell *matHeaderCellDef> FI </th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline">
                  <input matInput type="number" min="0" formControlName="faltasInjustificadas">
                </mat-form-field>
              </td>
            </ng-container>

            <ng-container matColumnDef="cualit">
              <th mat-header-cell *matHeaderCellDef> Cualitativa </th>
              <td mat-cell *matCellDef="let e; let i = index" [formGroupName]="i">
                <mat-form-field appearance="outline" class="cualit">
                  <input matInput placeholder="Observación" formControlName="calificacionCualitativa">
                </mat-form-field>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayed"></tr>
            <tr mat-row *matRowDef="let row; columns: displayed"></tr>
          </table>
        </div>

        <div class="actions">
          <button mat-raised-button color="primary" type="submit"
                  [disabled]="!trimestre() || !materiaSel()">
            Guardar notas
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .panel { display: grid; gap: 16px; }
    .filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    table { width: 100%; }
    mat-form-field { width: 110px; }
    mat-form-field.cualit { width: 220px; }
    .actions { display: flex; gap: 12px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfesorNotasCursoComponent {
  private route = inject(ActivatedRoute);
  private cursoService = inject(CursoService);
  private califService = inject(CalificacionService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  // Ruta
  private cursoId = this.route.snapshot.paramMap.get('id')!;

  // Estado
  curso = signal<Curso | null>(null);
  estudiantes = signal<Estudiante[]>([]);
  materias = signal<Materia[]>([]);
  trimestres: Trimestre[] = ['T1', 'T2', 'T3'];

  // Selecciones
  trimestre = signal<Trimestre | null>(null);
  materiaSel = signal<string | null>(null);

  // Año lectivo (intento tomarlo del curso si viene)
  anioLectivoId = signal<string>('');

  // Materias asignadas al profesor (filtradas)
  materiasAsignadas = computed(() => {
    const all = this.materias() || [];
    const uid = this.auth.user?.id ||  this.auth.user?.id;
    if (!uid) return all; // fallback: mostrar todas si no hay usuario (o ajustar a tu gusto)
    return all.filter((m: any) => {
      const prof =
        m?.profesor ??
        m?.profesorTutor ??
        m?.docente ??
        m?.asignadoA ??
        null;
      const profId = (prof && (prof.id || prof._id || prof.uid)) || (typeof m?.profesor === 'string' ? m.profesor : null);
      return profId ? String(profId) === String(uid) : true; // si no hay prof en materia, no filtramos
    });
  });

  // Tabla + Form
  displayed = ['estudiante', 'ai', 'ag', 'pi', 'ep', 'fj', 'fi', 'cualit'] as const;
  form = this.fb.group({
    notas: this.fb.array<FormGroup<{
      estudianteId: FormControl<string>;
      actividadesIndividuales: FormControl<number | null>;
      actividadesGrupales:    FormControl<number | null>;
      proyectoIntegrador:     FormControl<number | null>;
      evaluacionPeriodo:      FormControl<number | null>;
      faltasJustificadas:     FormControl<number | null>;
      faltasInjustificadas:   FormControl<number | null>;
      calificacionCualitativa:FormControl<string | null>;
    }>>([])
  });
  get notasArr() { return this.form.get('notas') as FormArray; }

  ngOnInit() {
    this.cursoService.getById(this.cursoId).subscribe((curso) => {
      this.curso.set(curso);
      this.estudiantes.set((curso.estudiantes ?? []) as any[]);
      this.materias.set((curso.materias ?? []) as any[]);

      const al = (curso as any).anioLectivo;
      const alId = al?.uid ?? al?._id ?? '';
      if (alId) this.anioLectivoId.set(alId);

      // Pre-armo el form vacío con todos los estudiantes
      this.armarFormulario();
    });
  }

  // Helpers UI
  idDe(x: any): string { return x?.uid ?? x?._id ?? ''; }
  nombreMateria(m: any): string { return (m && (m.nombre ?? m.titulo ?? 'Materia')) || 'Materia'; }

  onTrimestre(t: Trimestre) {
    this.trimestre.set(t);
    // No reseteo el form: el profe puede setear valores y luego precargar si quiere sobrescribir
  }

  onMateria(mId: string) {
    this.materiaSel.set(mId);
    // Igual que arriba, no reseteo valores manuales
  }

  private armarFormulario() {
    this.notasArr.clear();
    for (const e of this.estudiantes()) {
      this.notasArr.push(this.fb.group({
        estudianteId: this.fb.control<string>((e as any).uid ?? (e as any)._id!, { nonNullable: true }),
        actividadesIndividuales: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(10)]),
        actividadesGrupales:    this.fb.control<number | null>(null, [Validators.min(0), Validators.max(10)]),
        proyectoIntegrador:     this.fb.control<number | null>(null, [Validators.min(0), Validators.max(10)]),
        evaluacionPeriodo:      this.fb.control<number | null>(null, [Validators.min(0), Validators.max(10)]),
        faltasJustificadas:     this.fb.control<number | null>(0),
        faltasInjustificadas:   this.fb.control<number | null>(0),
        calificacionCualitativa:this.fb.control<string | null>(null),
      }));
    }
  }

  // Precarga las notas existentes (si las hay) para el trimestre/materia seleccionados
  precargar() {
    const t = this.trimestre();
    const materiaId = this.materiaSel();
    const anioId = this.anioLectivoId();
    if (!t || !materiaId || !anioId) {
      this.snack.open('Selecciona trimestre y materia (y asegúrate de tener año lectivo)', 'Cerrar', { duration: 3000 });
      return;
    }

    this.califService.obtenerNotas({
      cursoId: this.cursoId, anioLectivoId: anioId, materiaId, trimestre: t
    }).subscribe((rows) => {
      const mapByEst: Record<string, any> = {};
      for (const r of rows) {
        const id = r?.estudiante?.uid ?? r?.estudiante?._id;
        mapByEst[id] = r;
      }
      this.estudiantes().forEach((e, i) => {
        const k = (e as any).uid ?? (e as any)._id;
        const row = mapByEst[k];
        if (!row) return;
        const tr = row[t] || {};
        this.notasArr.at(i).patchValue({
          actividadesIndividuales: tr.actividadesIndividuales ?? null,
          actividadesGrupales:    tr.actividadesGrupales ?? null,
          proyectoIntegrador:     tr.proyectoIntegrador ?? null,
          evaluacionPeriodo:      tr.evaluacionPeriodo ?? null,
          faltasJustificadas:     tr.faltasJustificadas ?? 0,
          faltasInjustificadas:   tr.faltasInjustificadas ?? 0,
          calificacionCualitativa:tr.calificacionCualitativa ?? null,
        }, { emitEvent: false });
      });
      this.snack.open('Notas precargadas', 'OK', { duration: 2000 });
    });
  }

  guardar() {
    const t = this.trimestre();
    const materiaId = this.materiaSel();
    const anioId = this.anioLectivoId();
    if (!t || !materiaId || !anioId) {
      this.snack.open('Selecciona trimestre y materia (y asegúrate de tener año lectivo)', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.form.invalid) {
      this.snack.open('Revisa los campos (0–10).', 'Cerrar', { duration: 3000 });
      return;
    }

    const notas: NotaTrimestreInput[] = (this.notasArr.value as any[]).map(v => ({
      estudianteId: v!.estudianteId!,
      actividadesIndividuales: v!.actividadesIndividuales ?? 0,
      actividadesGrupales:    v!.actividadesGrupales ?? 0,
      proyectoIntegrador:     v!.proyectoIntegrador ?? 0,
      evaluacionPeriodo:      v!.evaluacionPeriodo ?? 0,
      faltasJustificadas:     v!.faltasJustificadas ?? 0,
      faltasInjustificadas:   v!.faltasInjustificadas ?? 0,
      calificacionCualitativa: v!.calificacionCualitativa ?? '',
    }));

    this.califService.cargarTrimestreBulk({
      cursoId: this.cursoId,
      anioLectivoId: anioId,
      materiaId,
      trimestre: t,
      notas,
    }).subscribe({
      next: () => this.snack.open('✅ Notas guardadas', 'OK', { duration: 2500 }),
      error: (e) => {
        const msg = e?.error?.message ?? 'Error guardando notas';
        this.snack.open(`❌ ${msg}`, 'Cerrar', { duration: 4000 });
      }
    });
  }
}
