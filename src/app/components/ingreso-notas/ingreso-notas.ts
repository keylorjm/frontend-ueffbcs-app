import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CursoService, Curso } from '../../services/curso.service';
import { Estudiante } from '../../services/estudiante.service';
import { CalificacionService, NotaTrimestreInput, Trimestre } from '../../services/calificacion.service';

@Component({
  standalone: true,
  selector: 'app-ingreso-notas',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule
  ],
  template: `
    <section class="panel" *ngIf="form">
      <h2>Ingreso de notas · {{ curso()?.nombre }}</h2>
      <p>Trimestre: <strong>{{ trimestre }}</strong> · Materia: <strong>{{ materiaId }}</strong></p>

      <!-- Importante: form + formArrayName + formGroupName para evitar AbstractControl|null -->
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
          <button mat-raised-button color="primary" type="submit">Guardar</button>
          <button mat-button type="button" (click)="router.navigate(['/profesor/curso', cursoId, 'notas'])">Cancelar</button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .panel { display: grid; gap: 16px; }
    table { width: 100%; }
    mat-form-field { width: 110px; }
    mat-form-field.cualit { width: 220px; }
    .actions { display: flex; gap: 12px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngresoNotasComponent {
  private route = inject(ActivatedRoute);
  protected router = inject(Router);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  private cursoService = inject(CursoService);
  private califService = inject(CalificacionService);

  // Params/Query
  cursoId = this.route.snapshot.paramMap.get('id')!;
  trimestre = (this.route.snapshot.queryParamMap.get('trimestre') as Trimestre) ?? 'T1';
  materiaId = this.route.snapshot.queryParamMap.get('materiaId')!;
  estudianteId = this.route.snapshot.queryParamMap.get('estudianteId'); // si viene => individual
  anioLectivoId = this.route.snapshot.queryParamMap.get('anioLectivoId') || '';

  curso = signal<Curso | null>(null);
  estudiantes = signal<Estudiante[]>([]);
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
      const all = (curso.estudiantes ?? []) as any[];
      const filtered = this.estudianteId
        ? all.filter(e => (e.uid ?? e._id) === this.estudianteId)
        : all;
      this.estudiantes.set(filtered);

      if (!this.anioLectivoId) {
        this.anioLectivoId =
          (curso as any).anioLectivo?.uid ??
          (curso as any).anioLectivo?._id ??
          this.anioLectivoId;
      }

      this.armarFormulario();
      this.precargarNotas();
    });
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

  private precargarNotas() {
    if (!this.anioLectivoId) return;
    this.califService.obtenerNotas({
      cursoId: this.cursoId,
      anioLectivoId: this.anioLectivoId,
      materiaId: this.materiaId,
      trimestre: this.trimestre,
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
        const t = row[this.trimestre] || {};
        this.notasArr.at(i).patchValue({
          actividadesIndividuales: t.actividadesIndividuales ?? null,
          actividadesGrupales:    t.actividadesGrupales ?? null,
          proyectoIntegrador:     t.proyectoIntegrador ?? null,
          evaluacionPeriodo:      t.evaluacionPeriodo ?? null,
          faltasJustificadas:     t.faltasJustificadas ?? 0,
          faltasInjustificadas:   t.faltasInjustificadas ?? 0,
          calificacionCualitativa:t.calificacionCualitativa ?? null,
        }, { emitEvent: false });
      });
    });
  }

  guardar() {
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
      anioLectivoId: this.anioLectivoId || '<<anio-actual>>',
      materiaId: this.materiaId,
      trimestre: this.trimestre,
      notas,
    }).subscribe({
      next: () => {
        this.snack.open('✅ Notas guardadas', 'OK', { duration: 2500 });
        this.router.navigate(['/profesor/curso', this.cursoId, 'notas']);
      },
      error: (e) => {
        const msg = e?.error?.message ?? 'Error guardando notas';
        this.snack.open(`❌ ${msg}`, 'Cerrar', { duration: 4000 });
      }
    });
  }
}
