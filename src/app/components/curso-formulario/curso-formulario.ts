// src/app/pages/admin/curso-formulario.ts
import { Component, EventEmitter, Input, OnInit, Output, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormArray,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';

type MateriaFormGroup = FormGroup<{
  materia: FormControl<string>;
}>;

export interface CursoPayload {
  nombre: string;
  anioLectivo: string;
  profesorTutor: string;
  estudiantes: string[];
  materias: { materia: string; profesor: string }[]; // profesor se resuelve desde el catálogo
}

export interface MateriaCatalogoItem {
  _id: string;
  nombre: string;
  profesorId?: string;      // ID del profesor asignado a la materia (desde backend)
  profesorNombre?: string;  // solo informativo
}

@Component({
  standalone: true,
  selector: 'app-curso-formulario',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatInputModule,
  ],
  template: `
  <mat-card class="p-4 rounded-2xl shadow">
    <form [formGroup]="form" class="grid gap-4" (ngSubmit)="emitir()">
      <div class="grid md:grid-cols-3 gap-3">
        <mat-form-field appearance="outline">
          <mat-label>Nombre del curso</mat-label>
          <input matInput formControlName="nombre" placeholder="Ej. Noveno A">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Año lectivo</mat-label>
          <mat-select formControlName="anioLectivo">
            <mat-option *ngFor="let a of aniosLectivo()" [value]="a._id">{{ a.nombre }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Profesor tutor</mat-label>
          <mat-select formControlName="profesorTutor">
            <mat-option *ngFor="let p of profesoresCatalogo()" [value]="p._id">{{ p.nombre }}</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Estudiantes</mat-label>
        <mat-select formControlName="estudiantes" multiple>
          <mat-option *ngFor="let e of estudiantesCatalogo()" [value]="e._id">{{ e.nombre }}</mat-option>
        </mat-select>
      </mat-form-field>

      <div>
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-base font-semibold">Materias del curso</h3>
          <div class="flex gap-2">
            <button mat-stroked-button type="button" (click)="agregarMateria()">
              <mat-icon>add</mat-icon> Agregar Materia
            </button>
            <button mat-stroked-button type="button" color="warn" (click)="quitarUltimaMateria()" [disabled]="materiasFA().length === 0">
              <mat-icon>remove</mat-icon> Quitar última
            </button>
          </div>
        </div>

        <div formArrayName="materias" class="grid gap-3">
          <div *ngFor="let fg of materiasFA().controls; let i = index"
               [formGroupName]="i"
               class="grid md:grid-cols-2 gap-3 p-3 rounded-xl border border-gray-200">
            <mat-form-field appearance="outline">
              <mat-label>Materia</mat-label>
              <mat-select formControlName="materia" (selectionChange)="onMateriaChange(i)">
                <mat-option *ngFor="let m of materiasCatalogo()" [value]="m._id">
                  {{ m.nombre }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Columna informativa: profesor asignado a la materia -->
            <div class="flex items-center text-sm opacity-80">
              <mat-icon class="mr-1">person</mat-icon>
              <ng-container *ngIf="profesorDeFila(i) as prof; else sinProf">
                Profesor asignado: <strong class="ml-1">{{ prof }}</strong>
              </ng-container>
              <ng-template #sinProf>
                <span class="text-red-600">Esta materia no tiene profesor asignado</span>
              </ng-template>
            </div>
          </div>
        </div>

        <div class="text-xs opacity-70 mt-1">
          * El profesor responsable se toma automáticamente de la materia creada. No es editable aquí.
        </div>
      </div>

      <div class="mt-2 flex gap-2">
        <button mat-flat-button color="primary" type="submit">
          <mat-icon>save</mat-icon> Guardar
        </button>
        <button mat-stroked-button type="button" (click)="resetFormulario()">Limpiar</button>
      </div>
    </form>
  </mat-card>
  `,
  styles: [`.shadow { box-shadow: 0 10px 25px rgba(0,0,0,.06); }`]
})
export class CursoFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private sb = inject(MatSnackBar);

  // Catálogos (como Signal<T> para aceptar signals y computeds)
  @Input({ required: true }) materiasCatalogo!: Signal<MateriaCatalogoItem[]>;
  @Input({ required: true }) profesoresCatalogo!: Signal<{ _id: string; nombre: string }[]>;
  @Input({ required: true }) aniosLectivo!: Signal<{ _id: string; nombre: string }[]>;
  @Input({ required: true }) estudiantesCatalogo!: Signal<{ _id: string; nombre: string }[]>;
  @Input() cursoExistente: Partial<CursoPayload> | null = null;

  @Output() submitCurso = new EventEmitter<CursoPayload>();

  // ---- Typed forms ----
  private newMateriaFG(materia = ''): MateriaFormGroup {
    return this.fb.group({
      materia: this.fb.control<string>(materia, { nonNullable: true, validators: [Validators.required] }),
    });
  }

  form = this.fb.group({
    nombre: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    anioLectivo: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    profesorTutor: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    estudiantes: this.fb.control<string[]>([], { nonNullable: true }),
    materias: this.fb.array<MateriaFormGroup>([]),
  });

  materiasFA(): FormArray<MateriaFormGroup> { return this.form.controls.materias; }

  ngOnInit() {
    if (this.cursoExistente) {
      this.form.patchValue({
        nombre: this.cursoExistente.nombre ?? '',
        anioLectivo: this.cursoExistente.anioLectivo ?? '',
        profesorTutor: this.cursoExistente.profesorTutor ?? '',
        estudiantes: this.cursoExistente.estudiantes ?? [],
      });
      const fa = this.materiasFA();
      fa.clear();

      // cursoExistente.materias es [{ materia, profesor }]; solo colocamos materia
      for (const m of this.cursoExistente.materias ?? []) {
        fa.push(this.newMateriaFG(m.materia));
      }
    }
  }

  // UI
  agregarMateria() { this.materiasFA().push(this.newMateriaFG()); }
  quitarUltimaMateria() { const fa = this.materiasFA(); if (fa.length > 0) fa.removeAt(fa.length - 1); }
  resetFormulario() { this.form.reset(); this.materiasFA().clear(); }

  // Informativo: nombre del profesor para una fila dada
  profesorDeFila(index: number): string | null {
    const materiaId = (this.materiasFA().at(index)?.get('materia')?.value ?? '').trim();
    if (!materiaId) return null;
    const item = this.materiasCatalogo().find(m => m._id === materiaId);
    return item?.profesorNombre ?? null;
  }

  onMateriaChange(_index: number) {
    // Nada que setear (profesor viene del catálogo). Dejar hook por si luego quieres reglas extra.
  }

  // ---- Validación + payload ----
  private buildMateriasPayload(): { materia: string; profesor: string }[] {
    const catalogo = this.materiasCatalogo();
    const rows: { materia: string; profesor: string }[] = [];

    for (const fg of this.materiasFA().controls) {
      const materiaId = (fg.controls.materia.value ?? '').trim();
      if (!materiaId) continue;
      const found = catalogo.find(m => m._id === materiaId);
      // Debe existir y traer profesorId
      if (!found?.profesorId) {
        // Si falta profesorId, abortamos más adelante con un mensaje claro
        rows.push({ materia: materiaId, profesor: '' as any });
      } else {
        rows.push({ materia: materiaId, profesor: found.profesorId });
      }
    }
    return rows;
  }

  private hasDuplicadasPorMateria(rows: { materia: string; profesor: string }[]): boolean {
    const set = new Set<string>();
    for (const r of rows) {
      if (set.has(r.materia)) return true;
      set.add(r.materia);
    }
    return false;
  }

  emitir() {
    this.form.markAllAsTouched();

    const nombre = (this.form.controls.nombre.value ?? '').trim();
    const anioLectivo = (this.form.controls.anioLectivo.value ?? '').trim();
    const profesorTutor = (this.form.controls.profesorTutor.value ?? '').trim();
    const estudiantes = (this.form.controls.estudiantes.value ?? []).map(s => (s ?? '').trim()).filter(Boolean);

    if (!nombre || !anioLectivo || !profesorTutor) {
      this.sb.open('Completa nombre, año lectivo y profesor tutor.', 'Cerrar', { duration: 3000 });
      return;
    }

    const materias = this.buildMateriasPayload();

    if (materias.length === 0) {
      this.sb.open('Agrega al menos una materia.', 'Cerrar', { duration: 3000 });
      return;
    }

    // Verificar que todas tengan profesor (desde el catálogo)
    const faltantes = materias.filter(m => !m.profesor);
    if (faltantes.length > 0) {
      this.sb.open('Alguna materia no tiene profesor asignado en el catálogo. Corrige la materia en "Gestión de Materias".', 'Cerrar', { duration: 4000 });
      return;
    }

    if (this.hasDuplicadasPorMateria(materias)) {
      this.sb.open('No repitas la misma materia más de una vez en el curso.', 'Cerrar', { duration: 3000 });
      return;
    }

    const payload: CursoPayload = { nombre, anioLectivo, profesorTutor, estudiantes, materias };

    // Debug
    const isOid = (s: string) => /^[a-fA-F0-9]{24}$/.test(s);
    console.group('[CursoFormulario] Payload listo');
    console.log(payload);
    console.log('OID checks:', {
      anioLectivo: isOid(anioLectivo),
      profesorTutor: isOid(profesorTutor),
      estudiantesOK: estudiantes.every(isOid),
      materiasOK: materias.every(m => isOid(m.materia) && isOid(m.profesor)),
    });
    console.groupEnd();

    this.submitCurso.emit(payload);
  }
}
