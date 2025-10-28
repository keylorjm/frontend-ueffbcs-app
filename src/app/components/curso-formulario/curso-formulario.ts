// src/app/pages/admin/curso-formulario.ts
import { Component, EventEmitter, Input, OnInit, Output, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormArray,
  FormGroup,
  FormControl,
} from '@angular/forms';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

type MateriaFormGroup = FormGroup<{
  materia: FormControl<string>;
}>;

export interface CursoPayload {
  nombre: string;
  anioLectivo: string;
  profesorTutor: string;
  estudiantes: string[];
  materias: { materia: string; profesor: string }[]; // profesor desde catálogo
}

export interface MateriaCatalogoItem {
  _id: string;
  nombre: string;
  profesorId?: string;
  profesorNombre?: string;
}

@Component({
  standalone: true,
  selector: 'app-curso-formulario',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule,FormsModule,
  ],
  template: `
  <!-- Header del diálogo -->
  <div class="dlg-header">
    <div>
      <div class="dlg-title">{{ cursoExistente ? 'Editar curso' : 'Crear nuevo curso' }}</div>
      <div class="dlg-subtitle">Completa la información y agrega las materias necesarias.</div>
    </div>
    <button mat-icon-button (click)="cerrar()"><mat-icon>close</mat-icon></button>
  </div>
  <mat-divider></mat-divider>

  <form [formGroup]="form" class="form" (ngSubmit)="emitir()">
    <!-- Datos principales -->
    <div class="grid3">
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

    <mat-form-field appearance="outline" class="full">
      <mat-label>Estudiantes</mat-label>
      <mat-select formControlName="estudiantes" multiple>
        <mat-option *ngFor="let e of estudiantesCatalogo()" [value]="e._id">{{ e.nombre }}</mat-option>
      </mat-select>
    </mat-form-field>

    <div class="section-head">
      <div>
        <div class="sec-title">Materias del curso</div>
        <div class="sec-subtitle">El profesor responsable se toma de la configuración de cada materia.</div>
      </div>
      <div class="sec-actions">
        <button mat-stroked-button type="button" (click)="agregarMateria()">
          <mat-icon>add</mat-icon>
          Agregar
        </button>
        <button mat-stroked-button type="button" color="warn" (click)="quitarUltimaMateria()" [disabled]="materiasFA().length === 0">
          <mat-icon>remove</mat-icon>
          Quitar última
        </button>
      </div>
    </div>

    <div formArrayName="materias" class="materias">
      <div class="row" *ngFor="let fg of materiasFA().controls; let i = index" [formGroupName]="i">
        <mat-form-field appearance="outline" class="mcol">
          <mat-label>Materia</mat-label>
          <mat-select formControlName="materia" (selectionChange)="onMateriaChange(i)">
            <mat-option *ngFor="let m of materiasCatalogo()" [value]="m._id">
              {{ m.nombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div class="info">
          <mat-icon>person</mat-icon>
          <span *ngIf="profesorDeFila(i) as prof; else sinProf">
            {{ prof }}
          </span>
          <ng-template #sinProf>
            <span class="warn">— sin profesor asignado —</span>
          </ng-template>
        </div>

        <button mat-icon-button color="warn" type="button" (click)="removeAt(i)" class="icon-only" aria-label="Eliminar fila">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    </div>

    <mat-divider></mat-divider>

    <div class="dlg-actions">
      <button mat-stroked-button type="button" (click)="cerrar()">Cancelar</button>
      <button mat-flat-button color="primary" type="submit">
        <mat-icon>save</mat-icon>
        {{ cursoExistente ? 'Guardar cambios' : 'Crear curso' }}
      </button>
    </div>
  </form>
  `,
  styles: [`
    .dlg-header { display:flex; align-items:center; justify-content:space-between; padding:10px 4px; }
    .dlg-title { font-weight:700; font-size:18px; }
    .dlg-subtitle { opacity:.7; font-size:13px; margin-top:2px; }
    .form { padding: 14px 4px; display:grid; gap:14px; }
    .grid3 { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; }
    .full { width:100%; }
    .section-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:6px; }
    .sec-title { font-weight:600; }
    .sec-subtitle { font-size:12px; opacity:.7; }
    .sec-actions button mat-icon { margin-right:6px; }

    .materias { display:grid; gap:10px; }
    .row { display:grid; grid-template-columns: 1.2fr auto auto; gap:10px; align-items:center; padding:10px; border:1px solid #e6e6e9; border-radius:12px; }
    .mcol { width:100%; }
    .info { display:flex; align-items:center; gap:6px; font-size:13px; opacity:.85; }
    .info mat-icon { font-size:18px; width:18px; height:18px; }
    .icon-only { margin-left:auto; }

    .warn { color:#c62828; opacity:.9; }

    .dlg-actions { display:flex; justify-content:flex-end; gap:8px; }
    @media (max-width: 900px) {
      .grid3 { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr auto auto; }
    }
  `]
})
export class CursoFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private sb = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<CursoFormularioComponent>, { optional: true });

  // Catálogos como Signals (acepta tanto signal como computed)
  @Input({ required: true }) materiasCatalogo!: Signal<MateriaCatalogoItem[]>;
  @Input({ required: true }) profesoresCatalogo!: Signal<{ _id: string; nombre: string }[]>;
  @Input({ required: true }) aniosLectivo!: Signal<{ _id: string; nombre: string }[]>;
  @Input({ required: true }) estudiantesCatalogo!: Signal<{ _id: string; nombre: string }[]>;
  @Input() cursoExistente: Partial<CursoPayload> | null = null;

  @Output() submitCurso = new EventEmitter<CursoPayload>();

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
      for (const m of this.cursoExistente.materias ?? []) {
        fa.push(this.newMateriaFG(m.materia));
      }
    } else {
      // una fila por defecto para mejorar UX
      this.agregarMateria();
    }
  }

  cerrar() { this.dialogRef?.close(false); }

  agregarMateria() { this.materiasFA().push(this.newMateriaFG()); }
  quitarUltimaMateria() { const fa = this.materiasFA(); if (fa.length > 0) fa.removeAt(fa.length - 1); }
  removeAt(i: number) { this.materiasFA().removeAt(i); }

  profesorDeFila(index: number): string | null {
    const materiaId = (this.materiasFA().at(index)?.get('materia')?.value ?? '').trim();
    if (!materiaId) return null;
    const item = this.materiasCatalogo().find(m => m._id === materiaId);
    return item?.profesorNombre ?? null;
  }

  onMateriaChange(_index: number) { /* hook para reglas futuras */ }

  private buildMateriasPayload(): { materia: string; profesor: string }[] {
    const catalogo = this.materiasCatalogo();
    const rows: { materia: string; profesor: string }[] = [];

    for (const fg of this.materiasFA().controls) {
      const materiaId = (fg.controls.materia.value ?? '').trim();
      if (!materiaId) continue;
      const found = catalogo.find(m => m._id === materiaId);
      rows.push({ materia: materiaId, profesor: found?.profesorId || '' });
    }
    return rows;
  }

  private hasDuplicadasPorMateria(rows: { materia: string; profesor: string }[]): boolean {
    const set = new Set<string>();
    for (const r of rows) { if (set.has(r.materia)) return true; set.add(r.materia); }
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
    if (materias.some(m => !m.profesor)) {
      this.sb.open('Alguna materia no tiene profesor asignado. Corrige la materia en “Gestión de Materias”.', 'Cerrar', { duration: 4000 });
      return;
    }
    if (this.hasDuplicadasPorMateria(materias)) {
      this.sb.open('No repitas la misma materia más de una vez en el curso.', 'Cerrar', { duration: 3000 });
      return;
    }

    const payload: CursoPayload = { nombre, anioLectivo, profesorTutor, estudiantes, materias };
    this.submitCurso.emit(payload);
  }
}
