// src/app/pages/admin/cursos.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CursoFormularioComponent,CursoPayload,MateriaCatalogoItem } from '../curso-formulario/curso-formulario';
//import { CursoFormularioComponent, CursoPayload, MateriaCatalogoItem } from '';

// ---- Services (ajusta import paths si difieren en tu proyecto)
import { CursoService, Curso } from '../../services/curso.service';
import { AnioLectivoService } from '../../services/anio-lectivo.service';
import { UsuarioService } from '../../services/usuario.service';
import { EstudianteService } from '../../services/estudiante.service';
import { MateriaService } from '../../services/materia.service';

@Component({
  standalone: true,
  selector: 'app-cursos',
  imports: [
    CommonModule, HttpClientModule,
    // Material
    MatSnackBarModule, MatCardModule, MatDividerModule, MatButtonModule, MatIconModule,
    // Hijo del formulario
    CursoFormularioComponent
  ],
  template: `
  <div class="p-4 grid gap-4">
    <!-- FORMULARIO -->
    <mat-card class="p-4 rounded-2xl shadow">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">
          {{ cursoEditando() ? 'Editar curso' : 'Crear nuevo curso' }}
        </h2>
        <button mat-stroked-button (click)="nuevo()" *ngIf="cursoEditando()">
          <mat-icon>add</mat-icon> Nuevo
        </button>
      </div>

      <app-curso-formulario
        [aniosLectivo]="aniosLectivo"
        [profesoresCatalogo]="profesores"
        [estudiantesCatalogo]="estudiantes"
        [materiasCatalogo]="materiasConProfesor"
        [cursoExistente]="cursoEditando()"
        (submitCurso)="guardar($event)">
      </app-curso-formulario>
    </mat-card>

    <!-- LISTA -->
    <mat-card class="p-4 rounded-2xl shadow">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-lg font-semibold">Cursos existentes</h2>
        <button mat-stroked-button (click)="refrescar()">
          <mat-icon>refresh</mat-icon> Refrescar
        </button>
      </div>
      <mat-divider class="mb-3"></mat-divider>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-3" *ngIf="cursos()?.length; else vacio">
        <mat-card class="p-3" *ngFor="let c of cursos()">
          <div class="font-medium text-base">{{ c.nombre }}</div>
          <div class="text-sm opacity-70">Año: {{ c.anioLectivo?.nombre ?? c.anioLectivo }}</div>
          <div class="text-sm opacity-70">Tutor: {{ c.profesorTutor?.nombre ?? c.profesorTutor }}</div>

          <div class="mt-2 text-xs opacity-70" *ngIf="(c.materias?.length || 0) > 0">
            {{ c.materias.length }} materia(s) asignada(s)
          </div>

          <div class="mt-3 flex gap-8">
            <button mat-stroked-button (click)="editar(c)">
              <mat-icon>edit</mat-icon> Editar
            </button>
            <button mat-stroked-button color="warn" (click)="eliminar(c)">
              <mat-icon>delete</mat-icon> Eliminar
            </button>
          </div>
        </mat-card>
      </div>

      <ng-template #vacio>
        <div class="py-6 text-center opacity-60">No hay cursos registrados.</div>
      </ng-template>
    </mat-card>
  </div>
  `,
  styles: [`
    .shadow { box-shadow: 0 10px 25px rgba(0,0,0,.06); }
  `]
})
export class CursosComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private cursoSvc = inject(CursoService);

  private anioSvc = inject(AnioLectivoService);
  private usuarioSvc = inject(UsuarioService);
  private estuSvc = inject(EstudianteService);
  private materiaSvc = inject(MateriaService);

  // Catálogos
  aniosLectivo = signal<{ _id: string; nombre: string }[]>([]);
  profesores = signal<{ _id: string; nombre: string }[]>([]);
  estudiantes = signal<{ _id: string; nombre: string }[]>([]);
  materias = signal<any[]>([]); // respuesta raw del backend /api/materias

  // Mapeo: materias con profesor asignado (para autocompletar en el formulario)
  materiasConProfesor = computed<MateriaCatalogoItem[]>(() =>
    (this.materias() ?? []).map((m: any) => ({
      _id: m._id,
      nombre: m.nombre,
      profesorId: typeof m.profesor === 'object' ? m.profesor?._id : m.profesor,
      profesorNombre: typeof m.profesor === 'object' ? m.profesor?.nombre : undefined,
    }))
  );

  // Cursos
  cursos = signal<any[]>([]);
  cursoEditando = signal<any | null>(null);

  ngOnInit() {
    // Cargar catálogos
    this.anioSvc.getAll().subscribe({
      next: (res: any) => this.aniosLectivo.set(res?.data ?? res ?? []),
      error: () => this.sb.open('No se pudieron cargar los años lectivos', 'Cerrar', { duration: 3000 })
    });

    // Profesores (asegúrate de tener este método en tu UsuarioService)
    (this.usuarioSvc as any).getProfesores?.().subscribe?.({
      next: (res: any) => {
        const list = res?.data ?? res ?? [];
        // Aceptar { _id, nombre } o mapear si viene diferente
        const mapped = list.map((p: any) => ({ _id: p._id ?? p.uid ?? p.id, nombre: p.nombre ?? p.fullname ?? p.email ?? 'Profesor' }));
        this.profesores.set(mapped);
      },
      error: () => this.sb.open('No se pudieron cargar los profesores', 'Cerrar', { duration: 3000 })
    });

    this.estuSvc.getAll().subscribe({
      next: (res: any) => this.estudiantes.set((res?.data ?? res ?? []).map((e: any) => ({ _id: e._id ?? e.uid ?? e.id, nombre: e.nombre ?? e.fullname ?? e.email }))),
      error: () => this.sb.open('No se pudieron cargar los estudiantes', 'Cerrar', { duration: 3000 })
    });

    // Materias con populate de profesor
    this.materiaSvc.getAll().subscribe({
      next: (res: any) => this.materias.set(res?.materias ?? res ?? []),
      error: () => this.sb.open('No se pudieron cargar las materias', 'Cerrar', { duration: 3000 })
    });

    // Lista de cursos
    this.refrescar();
  }

  refrescar() {
    this.cursoSvc.listar().subscribe({
      next: (res: any) => this.cursos.set(res?.data ?? res ?? []),
      error: () => this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 })
    });
  }

  // Nuevo curso
  nuevo() { this.cursoEditando.set(null); }

  // Editar curso (normaliza IDs para el form hijo)
  editar(curso: any) {
    const flat: Curso = {
      _id: curso._id,
      nombre: curso.nombre,
      anioLectivo: typeof curso.anioLectivo === 'object' ? curso.anioLectivo._id : curso.anioLectivo,
      profesorTutor: typeof curso.profesorTutor === 'object' ? curso.profesorTutor._id : curso.profesorTutor,
      estudiantes: (curso.estudiantes ?? []).map((e: any) => (typeof e === 'object' ? e._id : e)),
      materias: (curso.materias ?? []).map((m: any) => ({
        materia: typeof m.materia === 'object' ? m.materia._id : m.materia,
        profesor: typeof m.profesor === 'object' ? m.profesor._id : m.profesor,
      })),
    };
    this.cursoEditando.set(flat);
    // scroll al formulario (UX)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  }

  eliminar(curso: any) {
    if (!confirm(`Eliminar curso "${curso.nombre}"?`)) return;
    this.cursoSvc.eliminar(curso._id).subscribe({
      next: () => { this.sb.open('Curso eliminado', 'Cerrar', { duration: 2500 }); this.refrescar(); },
      error: (e) => this.sb.open(e?.error?.message ?? 'Error al eliminar', 'Cerrar', { duration: 3500 }),
    });
  }

  // Guardar (crear/actualizar)
  guardar(payload: CursoPayload) {
    // Asegurar claves exactas esperadas por backend
    const data: CursoPayload = {
      nombre: payload.nombre,
      anioLectivo: payload.anioLectivo, // <-- L mayúscula
      profesorTutor: payload.profesorTutor,
      estudiantes: payload.estudiantes,
      materias: payload.materias,
    };

    // Debug antes de enviar
    const isOid = (s: string) => /^[a-fA-F0-9]{24}$/.test(s);
    console.group('[Cursos] Guardar payload');
    console.log(data);
    console.log('OID checks:', {
      anioLectivo: isOid(data.anioLectivo),
      profesorTutor: isOid(data.profesorTutor),
      estudiantesOK: data.estudiantes.every(isOid),
      materiasOK: data.materias.every(m => isOid(m.materia) && isOid(m.profesor)),
    });
    console.groupEnd();

    const req$ = this.cursoEditando()?. _id
      ? this.cursoSvc.actualizar(this.cursoEditando()!._id, data as any)
      : this.cursoSvc.crear(data as any);

    req$.subscribe({
      next: () => {
        this.sb.open(this.cursoEditando()?._id ? 'Curso actualizado' : 'Curso creado', 'Cerrar', { duration: 2500 });
        this.cursoEditando.set(null);
        this.refrescar();
      },
      error: (e) => {
        console.error('[Cursos] Error backend:', e);
        const msg = e?.error?.message || e?.error?.msg || 'Error al guardar';
        this.sb.open(msg, 'Cerrar', { duration: 4000 });
      }
    });
  }
}
