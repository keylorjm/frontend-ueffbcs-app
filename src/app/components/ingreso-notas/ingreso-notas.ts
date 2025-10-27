// src/app/pages/profesor/ingreso-notas.component.ts
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { CalificacionService, BulkTrimestrePayload, Trimestre } from '../../services/calificacion.service';
import { ProfesorService } from '../../services/profesor.service';
import { HttpClientModule } from '@angular/common/http';

interface EstudianteRow {
  _id: string;
  nombre: string;
  promedioTrimestral: number | null;
  faltasJustificadas: number;
  faltasInjustificadas: number;
  asistenciaTotal: number;
}

@Component({
  standalone: true,
  selector: 'app-ingreso-notas',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    // Material
    MatCardModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatFormFieldModule, MatInputModule
  ],
  template: `
  <div class="wrap p-4">
    <mat-card class="card">
      <div class="header flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold">Ingreso de Notas</h2>
          <p class="text-sm opacity-70">Seleccione Materia y Trimestre</p>
        </div>
        <div class="actions flex gap-2">
          <button mat-stroked-button (click)="precargar()">
            <mat-icon>download</mat-icon> Precargar
          </button>
          <button mat-flat-button color="primary" (click)="guardar()">
            <mat-icon>save</mat-icon> Guardar
          </button>
        </div>
      </div>

      <form [formGroup]="form" class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <mat-form-field appearance="outline">
          <mat-label>Materia</mat-label>
          <mat-select formControlName="materiaId" (selectionChange)="onParamsChange()">
            <mat-option *ngFor="let m of materias()" [value]="m.materiaId">
              {{ m.materiaNombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Trimestre</mat-label>
          <mat-select formControlName="trimestre" (selectionChange)="onParamsChange()">
            <mat-option value="T1">Primer Trimestre</mat-option>
            <mat-option value="T2">Segundo Trimestre</mat-option>
            <mat-option value="T3">Tercer Trimestre</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="flex items-center">
          <button mat-stroked-button color="primary" (click)="cargarEvaluacionFinal()" type="button">
            <mat-icon>workspace_premium</mat-icon>
            Evaluación Final
          </button>
        </div>
      </form>

      <div class="modern-table overflow-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b">
              <th class="text-left p-2 w-1/3">Estudiante</th>
              <th class="text-left p-2">Prom.</th>
              <th class="text-left p-2">F. Just</th>
              <th class="text-left p-2">F. Injust</th>
              <th class="text-left p-2">Asist.</th>
            </tr>
          </thead>
          <tbody formArrayName="rows">
            <tr *ngFor="let row of rows().controls; let i = index" [formGroupName]="i" class="border-b">
              <td class="p-2">{{ row.value.nombre }}</td>
              <td class="p-2">
                <input matInput type="number" formControlName="promedioTrimestral" placeholder="0 - 10" min="0" max="10">
              </td>
              <td class="p-2">
                <input matInput type="number" formControlName="faltasJustificadas" min="0">
              </td>
              <td class="p-2">
                <input matInput type="number" formControlName="faltasInjustificadas" min="0">
              </td>
              <td class="p-2">
                <input matInput type="number" formControlName="asistenciaTotal" min="0">
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </mat-card>
  </div>
  `,
  styles: [`
    .card { border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,.06); }
    .modern-table table { border-collapse: collapse; }
    th, td { vertical-align: middle; }
  `]
})
export class IngresoNotasComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private califSvc = inject(CalificacionService);
  private profSvc = inject(ProfesorService);
  private fb = inject(FormBuilder);
  private sb = inject(MatSnackBar);

  // parámetros clave
  cursoId = signal<string>('');
  anioLectivoId = signal<string>(''); // asume que ya tienes "actual" resuelto en tu shell
  materiaId = signal<string>('');
  trimestre = signal<Trimestre>('T1');

  // materias asignadas al profe (del curso actual)
  materias = signal<{ materiaId: string; materiaNombre: string }[]>([]);

  form = this.fb.group({
    materiaId: ['', Validators.required],
    trimestre: ['T1' as Trimestre, Validators.required],
    rows: this.fb.array<FormGroup<{
      estudianteId: FormControl<string>;
      nombre: FormControl<string>;
      promedioTrimestral: FormControl<number | null>;
      faltasJustificadas: FormControl<number>;
      faltasInjustificadas: FormControl<number>;
      asistenciaTotal: FormControl<number>;
    }>>([])
  });

  rows = computed(() => this.form.get('rows') as FormArray);

  constructor() {
    // lee params (?materiaId=)
    this.route.queryParamMap.subscribe(qp => {
      const mid = qp.get('materiaId');
      if (mid) {
        this.form.patchValue({ materiaId: mid });
        this.materiaId.set(mid);
      }
    });
    // lee path /:cursoId
    this.route.paramMap.subscribe(pm => {
      const cid = pm.get('id');
      if (cid) this.cursoId.set(cid);
      this.cargarMateriasAsignadas();
    });
  }

  private cargarMateriasAsignadas() {
    // trae cursos y materias del profesor y setea materias del curso seleccionado
    this.profSvc.misCursosMaterias().subscribe({
      next: (resp) => {
        const curso = resp.cursos.find(c => c.cursoId === this.cursoId());
        if (curso) {
          this.anioLectivoId.set(curso.anioLectivoId);
          this.materias.set(curso.materias.map(m => ({ materiaId: m.materiaId, materiaNombre: m.materiaNombre })));
          // si no hay materia seleccionada aún, setear la primera
          if (!this.form.value.materiaId && curso.materias.length) {
            const first = curso.materias[0].materiaId;
            this.form.patchValue({ materiaId: first });
          }
        }
      },
      error: () => this.sb.open('No se pudieron cargar las materias asignadas', 'Cerrar', { duration: 3000 })
    });
  }

  onParamsChange() {
    const mid = this.form.value.materiaId as string;
    const tri = this.form.value.trimestre as Trimestre;
    if (!mid || !tri) return;
    this.materiaId.set(mid);
    this.trimestre.set(tri);
    this.precargar();
  }

  precargar() {
    const payload = {
      cursoId: this.cursoId(),
      anioLectivoId: this.anioLectivoId(),
      materiaId: this.materiaId(),
      trimestre: this.trimestre()
    };
    if (!payload.cursoId || !payload.anioLectivoId || !payload.materiaId) {
      this.sb.open('Seleccione materia y verifique curso/año lectivo', 'Cerrar', { duration: 3000 });
      return;
    }
    this.califSvc.obtenerNotas(payload).subscribe({
      next: (res) => {
        const estudiantes: EstudianteRow[] = (res?.data ?? []).map((r: any) => ({
          _id: r.estudiante?._id ?? r.estudianteId,
          nombre: r.estudiante?.nombre ?? r.nombre ?? '—',
          promedioTrimestral: r.promedioTrimestral ?? null,
          faltasJustificadas: r.faltasJustificadas ?? 0,
          faltasInjustificadas: r.faltasInjustificadas ?? 0,
          asistenciaTotal: r.asistenciaTotal ?? 0,
        }));
        const arr = this.fb.array(estudiantes.map(e => this.fb.group({
          estudianteId: this.fb.control<string>(e._id, { nonNullable: true }),
          nombre: this.fb.control<string>(e.nombre, { nonNullable: true }),
          promedioTrimestral: this.fb.control<number | null>(e.promedioTrimestral),
          faltasJustificadas: this.fb.control<number>(e.faltasJustificadas, { nonNullable: true }),
          faltasInjustificadas: this.fb.control<number>(e.faltasInjustificadas, { nonNullable: true }),
          asistenciaTotal: this.fb.control<number>(e.asistenciaTotal, { nonNullable: true }),
        })));
        this.form.setControl('rows', arr);
      },
      error: () => this.sb.open('No se pudieron obtener notas', 'Cerrar', { duration: 3000 })
    });
  }

  guardar() {
    const rows = (this.form.value.rows ?? []).map(r => ({
      estudianteId: r!.estudianteId!,
      promedioTrimestral: r!.promedioTrimestral ?? null,
      faltasJustificadas: Number(r!.faltasJustificadas ?? 0),
      faltasInjustificadas: Number(r!.faltasInjustificadas ?? 0),
      asistenciaTotal: Number(r!.asistenciaTotal ?? 0),
    }));

    const payload: BulkTrimestrePayload = {
      cursoId: this.cursoId(),
      anioLectivoId: this.anioLectivoId(),
      materiaId: this.materiaId(),
      trimestre: this.trimestre(),
      rows
    };

    this.califSvc.cargarTrimestreBulk(payload).subscribe({
      next: () => this.sb.open('Notas guardadas', 'Cerrar', { duration: 2500 }),
      error: () => this.sb.open('Error guardando notas', 'Cerrar', { duration: 3000 })
    });
  }

  cargarEvaluacionFinal() {
    // Navega a reporte final por estudiante o abre un diálogo propio
    this.router.navigate(['/app/reporte-final'], {
      queryParams: {
        cursoId: this.cursoId(),
        anioLectivoId: this.anioLectivoId()
      }
    });
  }
}
