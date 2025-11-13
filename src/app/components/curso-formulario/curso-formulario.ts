// src/app/pages/curso-formulario/curso-formulario.ts
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface MateriaCatalogoItem {
  _id: string;
  nombre: string;
  profesorId?: string;
  profesorNombre?: string;
}

export interface CursoPayload {
  nombre: string;
  anioLectivo: string;        // ID del año lectivo
  profesorTutor: string;      // ID del profesor
  estudiantes: string[];      // IDs de estudiantes
  materias: Array<{
    materia: string;          // ID materia
    profesor: string;         // ID profesor
  }>;

  // 🔹 nuevos campos (opcionales, backend puede ignorarlos si no existen en el schema)
  orden?: number;             // orden dentro del año lectivo
  nextCursoId?: string | null;// ID curso destino de promoción
  activo?: boolean;           // estado del curso
}

type CursoExistentePayload = Partial<CursoPayload> & { _id?: string };

@Component({
  standalone: true,
  selector: 'app-curso-formulario',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCheckboxModule,
  ],
  template: `
    <mat-card class="card">
      <div class="header">
        <div>
          <div class="eyebrow">
            <mat-icon>school</mat-icon>
            Curso
          </div>
          <h2>{{ cursoExistente?._id ? 'Editar curso' : 'Nuevo curso' }}</h2>
        </div>
        <div class="header-actions">
          <button mat-stroked-button color="primary" type="button" (click)="onCancel()">
            <mat-icon>close</mat-icon>
            Cerrar
          </button>
          <button mat-flat-button color="primary" type="button" (click)="onSubmit()">
            <mat-icon>save</mat-icon>
            Guardar
          </button>
        </div>
      </div>

      <!-- Datos generales -->
      <div class="grid">
        <mat-form-field appearance="outline">
          <mat-label>Nombre del curso</mat-label>
          <input
            matInput
            [(ngModel)]="model.nombre"
            placeholder="Ej: Primero BGU A"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Año lectivo</mat-label>
          <mat-select [(ngModel)]="model.anioLectivo">
            <mat-option
              *ngFor="let a of asArray(aniosLectivo)"
              [value]="a._id"
            >
              {{ a.nombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Profesor tutor</mat-label>
          <mat-select [(ngModel)]="model.profesorTutor">
            <mat-option
              *ngFor="let p of asArray(profesoresCatalogo)"
              [value]="p._id"
            >
              {{ p.nombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Orden dentro del año</mat-label>
          <input
            matInput
            type="number"
            min="1"
            [(ngModel)]="model.orden"
            placeholder="1"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Curso destino (ID)</mat-label>
          <input
            matInput
            [(ngModel)]="model.nextCursoId"
            placeholder="Opcional: ID del curso siguiente"
          />
        </mat-form-field>

        <div class="activo-field">
          <mat-checkbox [(ngModel)]="model.activo">Curso activo</mat-checkbox>
        </div>
      </div>

      <!-- Estudiantes -->
      <section class="section">
        <div class="section-header">
          <h3><mat-icon>group</mat-icon> Estudiantes</h3>
          <small>Seleccione los estudiantes matriculados en este curso.</small>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Estudiantes</mat-label>
          <mat-select
            [(ngModel)]="model.estudiantes"
            multiple
          >
            <mat-option
              *ngFor="let e of asArray(estudiantesCatalogo)"
              [value]="e._id"
            >
              {{ e.nombre }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div class="chips" *ngIf="model.estudiantes.length">
          <mat-chip-set>
            <mat-chip
              *ngFor="let e of obtenerEstudiantesSeleccionados()"
              [removable]="true"
              (removed)="quitarEstudiante(e._id)"
            >
              {{ e.nombre }}
              <button matChipRemove>
                <mat-icon>close</mat-icon>
              </button>
            </mat-chip>
          </mat-chip-set>
        </div>
      </section>

      <!-- Materias -->
      <section class="section">
        <div class="section-header">
          <h3><mat-icon>menu_book</mat-icon> Materias</h3>
          <small>Asigne las materias y el profesor responsable de cada una.</small>
        </div>

        <div class="materias-list">
          <div
            class="materia-row"
            *ngFor="let m of model.materias; let i = index; trackBy: trackByIndex"
          >
            <mat-form-field appearance="outline" class="materia-field">
              <mat-label>Materia</mat-label>
              <mat-select
                [(ngModel)]="m.materia"
                (selectionChange)="autocompletarProfesor(i)"
              >
                <mat-option
                  *ngFor="let mat of asArray(materiasCatalogo)"
                  [value]="mat._id"
                >
                  {{ mat.nombre }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="profesor-field">
              <mat-label>Profesor</mat-label>
              <mat-select [(ngModel)]="m.profesor">
                <mat-option
                  *ngFor="let p of asArray(profesoresCatalogo)"
                  [value]="p._id"
                >
                  {{ p.nombre }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <button
              mat-icon-button
              color="warn"
              type="button"
              (click)="eliminarMateria(i)"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>

        <button
          mat-stroked-button
          color="primary"
          type="button"
          (click)="agregarMateria()"
        >
          <mat-icon>add</mat-icon>
          Agregar materia
        </button>
      </section>
    </mat-card>
  `,
  styles: [
    `
      .card {
        padding: 16px;
        border-radius: 16px;
        max-width: 900px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }
      .eyebrow {
        display: flex;
        align-items: center;
        gap: 6px;
        text-transform: uppercase;
        font-size: 11px;
        color: #666;
      }
      .header h2 {
        margin: 2px 0 0;
      }
      .header-actions {
        display: flex;
        gap: 8px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .activo-field {
        display: flex;
        align-items: center;
        padding-left: 4px;
      }
      .section {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e0e0e0;
        display: grid;
        gap: 10px;
      }
      .section-header {
        display: grid;
        gap: 2px;
      }
      .section-header h3 {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        font-size: 16px;
      }
      .section-header small {
        color: #666;
      }
      .full {
        width: 100%;
      }
      .chips {
        margin-top: 4px;
      }
      .materias-list {
        display: grid;
        gap: 8px;
        margin-bottom: 8px;
      }
      .materia-row {
        display: grid;
        grid-template-columns: minmax(220px, 2fr) minmax(220px, 2fr) auto;
        gap: 8px;
        align-items: center;
      }
      .materia-field,
      .profesor-field {
        width: 100%;
      }
      @media (max-width: 800px) {
        .materia-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CursoFormularioComponent implements OnInit {
  // Catálogos (el padre los setea por propiedad directa)
  @Input() aniosLectivo: any;
  @Input() profesoresCatalogo: any;
  @Input() estudiantesCatalogo: any;
  @Input() materiasCatalogo: any;

  @Input() cursoExistente: CursoExistentePayload | null = null;

  @Output() submitCurso = new EventEmitter<CursoPayload>();
  @Output() cancelar = new EventEmitter<void>();

  model: CursoPayload = {
    nombre: '',
    anioLectivo: '',
    profesorTutor: '',
    estudiantes: [],
    materias: [],
    orden: 1,          // valor inicial válido
    nextCursoId: null,
    activo: true,
  };

  ngOnInit(): void {
    if (this.cursoExistente) {
      this.model = {
        nombre: this.cursoExistente.nombre ?? '',
        anioLectivo: (this.cursoExistente.anioLectivo as any) ?? '',
        profesorTutor: (this.cursoExistente.profesorTutor as any) ?? '',
        estudiantes: [...(this.cursoExistente.estudiantes ?? [])],
        materias: [...(this.cursoExistente.materias ?? [])].map((m: any) => ({
          materia: m?.materia ?? '',
          profesor: m?.profesor ?? '',
        })),
        orden:
          this.cursoExistente.orden && this.cursoExistente.orden >= 1
            ? this.cursoExistente.orden
            : 1,
        nextCursoId:
          this.cursoExistente.nextCursoId !== undefined
            ? this.cursoExistente.nextCursoId
            : null,
        activo:
          this.cursoExistente.activo !== undefined
            ? this.cursoExistente.activo
            : true,
      };
    }

    if (!this.model.materias.length) {
      this.agregarMateria();
    }
  }

  // Convierte señales o arrays en array “normal”
  asArray(src: any): any[] {
    if (!src) return [];
    if (Array.isArray(src)) return src;
    if (typeof src === 'function') {
      try {
        const v = src();
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  trackByIndex(i: number): number {
    return i;
  }

  agregarMateria(): void {
    this.model.materias.push({ materia: '', profesor: '' });
  }

  eliminarMateria(index: number): void {
    this.model.materias.splice(index, 1);
    if (!this.model.materias.length) {
      this.agregarMateria();
    }
  }

  autocompletarProfesor(idx: number): void {
    const row = this.model.materias[idx];
    const mats = this.asArray(this.materiasCatalogo) as MateriaCatalogoItem[];
    const found = mats.find((m) => m._id === row.materia);
    if (found?.profesorId) {
      row.profesor = found.profesorId;
    }
  }

  obtenerEstudiantesSeleccionados() {
    const all = this.asArray(this.estudiantesCatalogo) as Array<{
      _id: string;
      nombre: string;
    }>;
    const set = new Set(this.model.estudiantes);
    return all.filter((e) => set.has(e._id));
  }

  quitarEstudiante(id: string) {
    this.model.estudiantes = this.model.estudiantes.filter((x) => x !== id);
  }

  onCancel(): void {
    this.cancelar.emit();
  }

  onSubmit(): void {
    if (!this.model.nombre || !this.model.anioLectivo || !this.model.profesorTutor) {
      alert('Nombre, año lectivo y profesor tutor son obligatorios.');
      return;
    }

    // 🔹 Normalizar orden (siempre >= 1 o undefined → usa default de Mongoose)
    let ordenNum: number | undefined;
    if (this.model.orden !== undefined && this.model.orden !== null) {
      const n = Number(this.model.orden);
      if (Number.isFinite(n)) {
        ordenNum = n < 1 ? 1 : n;
      }
    }

    const clean: CursoPayload = {
      nombre: this.model.nombre.trim(),
      anioLectivo: this.model.anioLectivo,
      profesorTutor: this.model.profesorTutor,
      estudiantes: this.model.estudiantes ?? [],
      materias: (this.model.materias ?? []).map((m) => ({
        materia: m.materia,
        profesor: m.profesor,
      })),
      orden: ordenNum,
      nextCursoId: this.model.nextCursoId || null,
      activo: this.model.activo !== false,
    };

    this.submitCurso.emit(clean);
  }
}
