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
    MatButtonModule, MatIconModule, MatSnackBarModule, MatDividerModule, FormsModule,
  ],
  template: `
  <!-- Panel envolvente con header fijo y cuerpo desplazable -->
  <div class="dlg-wrapper">
    <!-- Header -->
    <div class="dlg-header">
      <div class="dlg-header-left">
        <div class="dlg-icon"><mat-icon>library_add</mat-icon></div>
        <div>
          <div class="dlg-title">{{ cursoExistente ? 'Editar curso' : 'Crear nuevo curso' }}</div>
          <div class="dlg-subtitle">Completa la información y agrega las materias necesarias.</div>
        </div>
      </div>
      <button mat-icon-button class="icon-ghost" (click)="cerrar()" aria-label="Cerrar">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-divider class="soft-divider"></mat-divider>

    <!-- Cuerpo desplazable -->
    <div class="dlg-body scroll-y">
      <form [formGroup]="form" class="form" (ngSubmit)="emitir()">
        <!-- Datos principales -->
        <div class="grid3 dense">
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

        <mat-form-field appearance="outline" class="full dense">
          <mat-label>Estudiantes</mat-label>
          <mat-select formControlName="estudiantes" multiple>
            <mat-option *ngFor="let e of estudiantesCatalogo()" [value]="e._id">{{ e.nombre }}</mat-option>
          </mat-select>
          <mat-hint>Selecciona uno o varios.</mat-hint>
        </mat-form-field>

        <!-- Sección Materias -->
        <div class="section-head">
          <div>
            <div class="sec-title">Materias del curso</div>
            <div class="sec-subtitle">El profesor responsable se toma de la configuración de cada materia.</div>
          </div>
          <div class="sec-actions">
            <button mat-stroked-button type="button" class="btn-stroked" (click)="agregarMateria()">
              <mat-icon>add</mat-icon>
              Agregar
            </button>
            <button mat-stroked-button type="button" color="warn" class="btn-stroked-warn"
                    (click)="quitarUltimaMateria()" [disabled]="materiasFA().length === 0">
              <mat-icon>remove</mat-icon>
              Quitar última
            </button>
          </div>
        </div>

        <div formArrayName="materias" class="materias">
          <div class="row soft-card" *ngFor="let fg of materiasFA().controls; let i = index" [formGroupName]="i">
            <mat-form-field appearance="outline" class="mcol dense">
              <mat-label>Materia</mat-label>
              <mat-select formControlName="materia" (selectionChange)="onMateriaChange(i)">
                <mat-option *ngFor="let m of materiasCatalogo()" [value]="m._id">
                  {{ m.nombre }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <div class="info">
              <div class="pill" [class.pill-warn]="!(profesorDeFila(i))" [class.pill-success]="profesorDeFila(i)">
                <mat-icon>{{ profesorDeFila(i) ? 'person' : 'priority_high' }}</mat-icon>
                <span *ngIf="profesorDeFila(i) as prof; else sinProf">
                  {{ prof }}
                </span>
                <ng-template #sinProf>
                  <span>Sin profesor</span>
                </ng-template>
              </div>
            </div>

            <button mat-icon-button color="warn" type="button" (click)="removeAt(i)"
                    class="icon-only icon-ghost" aria-label="Eliminar fila">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>

        <mat-divider class="soft-divider"></mat-divider>

        <!-- Acciones -->
        <div class="dlg-actions">
          <button mat-stroked-button type="button" class="btn-outline" (click)="cerrar()">Cancelar</button>
          <button mat-flat-button color="primary" type="submit" class="btn-primary">
            <mat-icon>save</mat-icon>
            {{ cursoExistente ? 'Guardar cambios' : 'Crear curso' }}
          </button>
        </div>
      </form>
    </div>
  </div>
  `,
  styles: [`
    /* ====== Panel y header ====== */
    .dlg-wrapper{
      background:#f8f8fb;
      border:1px solid #e5e7eb;
      border-radius:20px;
      box-shadow:0 6px 20px rgba(16,24,40,0.06);
      overflow:hidden;
      max-height:78vh;             /* limita alto del panel */
      display:flex;
      flex-direction:column;
    }
    .dlg-header{
      display:flex; align-items:center; justify-content:space-between;
      padding:16px 18px;
      background:#ffffff;
      position: sticky;
      top: 0;
      z-index: 1;
      box-shadow: 0 1px 0 rgba(17,24,39,0.06);
    }
    .dlg-header-left{ display:flex; align-items:center; gap:12px; }
    .dlg-icon{
      width:40px; height:40px; border-radius:12px;
      display:grid; place-items:center;
      background:#e8efff; color:#1e40af;
    }
    .dlg-title{ font-weight:800; font-size:21px; line-height:1.25; }
    .dlg-subtitle{ color:#6b7280; font-size:13px; margin-top:2px; }

    .soft-divider{ border-color:#eef0f4 !important; }

    /* ====== Cuerpo desplazable ====== */
    .dlg-body{
      overflow: hidden; /* evita doble scroll en algunos navegadores */
    }
    .scroll-y{
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 0 18px 14px;
      background: transparent;
    }
    /* Scrollbar (Firefox) */
    .scroll-y{
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 #f1f5f9;
    }
    /* Scrollbar (WebKit) */
    .scroll-y::-webkit-scrollbar{ width:10px; }
    .scroll-y::-webkit-scrollbar-track{
      background:#f1f5f9;
      border-left:1px solid #eef0f4;
    }
    .scroll-y::-webkit-scrollbar-thumb{
      background:#cbd5e1;
      border-radius:8px;
      border:2px solid #f1f5f9;
    }
    .scroll-y::-webkit-scrollbar-thumb:hover{ background:#94a3b8; }

    /* ====== Form ====== */
    .form{ padding:16px 18px 18px; display:grid; gap:16px; }
    .grid3{ display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
    .full{ width:100%; }

    /* Densidad compacta para campos */
    .dense mat-form-field{
      --mdc-outlined-text-field-container-shape: 10px;
    }
    .dense .mdc-text-field, .dense .mat-mdc-select-trigger{
      height:40px;
    }
    .dense .mdc-text-field--outlined .mdc-notched-outline{
      --mdc-outlined-text-field-outline-color:#e5e7eb;
    }
    .dense .mdc-notched-outline__leading,
    .dense .mdc-notched-outline__notch,
    .dense .mdc-notched-outline__trailing{
      border-color:#e5e7eb !important;
    }
    .dense .mdc-text-field--focused .mdc-notched-outline{
      border-color:#93c5fd !important;
      box-shadow:0 0 0 3px #dbeafe;
    }
    mat-hint{ font-size:12px; color:#6b7280; }

    /* ====== Secciones ====== */
    .section-head{
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      margin-top:4px;
    }
    .sec-title{ font-weight:700; }
    .sec-subtitle{ font-size:12px; color:#6b7280; }
    .sec-actions button mat-icon{ margin-right:6px; }

    /* ====== Materias ====== */
    .materias{ display:grid; gap:12px; }
    .row{
      display:grid; grid-template-columns: 1.25fr auto 40px;
      gap:12px; align-items:center;
    }
    .soft-card{
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:16px;
      padding:12px;
      transition: box-shadow .15s ease, transform .15s ease, border-color .15s ease;
    }
    .soft-card:hover{ box-shadow:0 6px 14px rgba(16,24,40,.06); border-color:#e3e6ee; }

    .mcol{ width:100%; }

    .info{ display:flex; align-items:center; justify-content:flex-start; }
    .pill{
      display:inline-flex; align-items:center; gap:6px;
      font-size:12px; padding:6px 10px; border-radius:999px;
      border:1px solid #e5e7eb; color:#374151; background:#f3f4f6;
    }
    .pill mat-icon{ font-size:16px; width:16px; height:16px; }
    .pill-success{ background:#e8f7ee; color:#166534; border-color:#b7ebcd; }
    .pill-warn{ background:#fff4f4; color:#b91c1c; border-color:#f3c9c9; }

    /* ====== Botones ====== */
    .btn-primary{
      border-radius:12px; height:40px; font-weight:600;
      box-shadow:0 8px 20px rgba(29,78,216,.15);
    }
    .btn-outline{
      border-radius:12px; height:36px; border:1px solid #94a3b8 !important;
      background:#fff;
    }
    .btn-stroked{
      border-radius:12px; height:36px; border:1px solid #e5e7eb !important; background:#fff;
    }
    .btn-stroked-warn{
      border-radius:12px; height:36px;
    }
    .icon-ghost{ border-radius:12px; }
    .icon-ghost:hover{ background:#f3f4f6; }
    .dlg-actions{
      display:flex; justify-content:flex-end; gap:10px; padding-top:4px;
    }

    /* ====== Responsivo ====== */
    @media (max-width: 900px){
      .grid3{ grid-template-columns: 1fr; }
      .row{ grid-template-columns: 1fr auto 40px; }
      .dlg-wrapper{ max-height:82vh; }
      .dlg-header{ padding:14px 14px; }
      .scroll-y{ padding:0 14px 12px; }
      .form{ padding:14px; }
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
