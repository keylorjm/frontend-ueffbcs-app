// src/app/pages/admin/cursos.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CursoFormularioComponent,MateriaCatalogoItem,CursoPayload } from '../curso-formulario/curso-formulario';

// ---- Services (ajusta rutas si difieren)
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
    MatSnackBarModule, MatCardModule, MatDividerModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDialogModule, MatProgressBarModule,
  ],
  template: `
  <div class="wrap">
    <!-- Header -->
    <div class="header">
      <div class="titles">
        <h1>📘 Gestión de Cursos</h1>
        <p class="subtitle">Crea cursos asignando materias (con su profesor responsable) y estudiantes.</p>
      </div>
      <div class="actions">
        <button mat-flat-button color="primary" (click)="abrirCrear()">
          <mat-icon>add</mat-icon>
          Agregar curso
        </button>
      </div>
    </div>

    <!-- Tarjeta de listado -->
    <mat-card class="card">
      <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

      <div class="list" *ngIf="cursos()?.length; else vacio">
        <mat-card class="item" *ngFor="let c of cursos()">
          <div class="item-head">
            <div class="item-title">{{ c.nombre }}</div>
            <mat-chip-set>
              <mat-chip appearance="outlined" color="primary">Año: {{ c.anioLectivo?.nombre ?? c.anioLectivo }}</mat-chip>
              <mat-chip appearance="outlined">Tutor: {{ c.profesorTutor?.nombre ?? c.profesorTutor }}</mat-chip>
              <mat-chip appearance="outlined">{{ c.materias?.length || 0 }} materia(s)</mat-chip>
            </mat-chip-set>
          </div>

          <div class="item-actions">
            <button mat-stroked-button (click)="abrirEditar(c)">
              <mat-icon>edit</mat-icon>
              Editar
            </button>
            <button mat-stroked-button color="warn" (click)="eliminar(c)">
              <mat-icon>delete</mat-icon>
              Eliminar
            </button>
          </div>
        </mat-card>
      </div>

      <ng-template #vacio>
        <div class="empty">
          <div class="emoji">🗂️</div>
          <div class="msg">No hay cursos registrados.</div>
          <button mat-flat-button color="primary" (click)="abrirCrear()">
            <mat-icon>add</mat-icon>
            Crear el primero
          </button>
        </div>
      </ng-template>
    </mat-card>
  </div>
  `,
  styles: [`
    .wrap { padding: 24px; max-width: 1100px; margin: 0 auto; display: grid; gap: 16px; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .titles h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .subtitle { margin: 2px 0 0; opacity: .7; }
    .actions button mat-icon { margin-right: 6px; }

    .card { padding: 0; overflow: hidden; }
    .list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; padding: 16px; }
    .item { padding: 14px; border-radius: 16px; }
    .item-head { display: grid; gap: 8px; }
    .item-title { font-weight: 600; font-size: 16px; }
    .item-actions { display: flex; gap: 8px; margin-top: 8px; }

    .empty { padding: 32px; text-align: center; display: grid; gap: 10px; }
    .empty .emoji { font-size: 40px; }
    .empty .msg { opacity: .7; }

    :host ::ng-deep .mat-mdc-dialog-container .mdc-dialog__container { border-radius: 18px; }
  `]
})
export class CursosComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private cursoSvc = inject(CursoService);
  private dialog = inject(MatDialog);

  private anioSvc = inject(AnioLectivoService);
  private usuarioSvc = inject(UsuarioService);
  private estuSvc = inject(EstudianteService);
  private materiaSvc = inject(MateriaService);

  // Estados
  cargando = signal<boolean>(false);

  // Catálogos
  aniosLectivo = signal<{ _id: string; nombre: string }[]>([]);
  profesores = signal<{ _id: string; nombre: string }[]>([]);
  estudiantes = signal<{ _id: string; nombre: string }[]>([]);
  materiasRaw = signal<any[]>([]);

  // Materias mapeadas con profesor (para autocompletar)
  materiasConProfesor = computed<MateriaCatalogoItem[]>(() =>
    (this.materiasRaw() ?? []).map((m: any) => ({
      _id: m._id,
      nombre: m.nombre,
      profesorId: typeof m.profesor === 'object' ? m.profesor?._id : m.profesor,
      profesorNombre: typeof m.profesor === 'object' ? m.profesor?.nombre : undefined,
    }))
  );

  // Cursos
  cursos = signal<any[]>([]);

  ngOnInit() {
    this.cargarCatalogos();
    this.refrescar();
  }

  private cargarCatalogos() {
    this.anioSvc.getAll().subscribe({
      next: (res: any) => this.aniosLectivo.set(res?.data ?? res ?? []),
      error: () => this.sb.open('No se pudieron cargar los años lectivos', 'Cerrar', { duration: 3000 })
    });

    // Profesores
    (this.usuarioSvc as any).getProfesores?.().subscribe?.({
      next: (res: any) => {
        const list = res?.data ?? res ?? [];
        const mapped = list.map((p: any) => ({ _id: p._id ?? p.uid ?? p.id, nombre: p.nombre ?? p.fullname ?? p.email ?? 'Profesor' }));
        this.profesores.set(mapped);
      },
      error: () => this.sb.open('No se pudieron cargar los profesores', 'Cerrar', { duration: 3000 })
    });

    // Estudiantes
    this.estuSvc.getAll().subscribe({
      next: (res: any) => this.estudiantes.set((res?.data ?? res ?? []).map((e: any) => ({ _id: e._id ?? e.uid ?? e.id, nombre: e.nombre ?? e.fullname ?? e.email }))),
      error: () => this.sb.open('No se pudieron cargar los estudiantes', 'Cerrar', { duration: 3000 })
    });

    // Materias
    this.materiaSvc.getAll().subscribe({
      next: (res: any) => this.materiasRaw.set(res?.materias ?? res ?? []),
      error: () => this.sb.open('No se pudieron cargar las materias', 'Cerrar', { duration: 3000 })
    });
  }

  refrescar() {
    this.cargando.set(true);
    this.cursoSvc.listar().subscribe({
      next: (res: any) => { this.cursos.set(res?.data ?? res ?? []); this.cargando.set(false); },
      error: () => { this.cargando.set(false); this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 }); }
    });
  }

  // Abre diálogo para CREAR
  abrirCrear() {
    this.abrirDialogo(null);
  }

  // Abre diálogo para EDITAR
  abrirEditar(curso: any) {
    const flat: Curso = {
      _id: curso._id,
      nombre: curso.nombre,
      anioLectivo: typeof curso.anioLectivo === 'object' ? curso.anioLectivo._id : curso.anioLectivo,
      profesorTutor: typeof curso.profesorTutor === 'object' ? curso.profesorTutor._id : curso.profesorTutor,
      estudiantes: (curso.estudiantes ?? []).map((e: any) => (typeof e === 'object' ? e._id : e)),
      // solo materia (el profesor se toma del catálogo)
      materias: (curso.materias ?? []).map((m: any) => ({
        materia: typeof m.materia === 'object' ? m.materia._id : m.materia,
        profesor: '' // lo ignora el formulario; se resuelve con el catálogo al emitir
      })),
    };
    this.abrirDialogo(flat);
  }

  private abrirDialogo(cursoExistente: Curso | null) {
    const ref = this.dialog.open(CursoFormularioComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'soft-dialog',
      disableClose: true,
      autoFocus: false,
      data: null
    });

    // Inyectar catálogos e inicial
    ref.componentInstance.aniosLectivo = this.aniosLectivo as any;
    ref.componentInstance.profesoresCatalogo = this.profesores as any;
    ref.componentInstance.estudiantesCatalogo = this.estudiantes as any;
    ref.componentInstance.materiasCatalogo = this.materiasConProfesor as any;
    ref.componentInstance.cursoExistente = cursoExistente;

    // Suscribirse al submit del hijo
    ref.componentInstance.submitCurso.subscribe((payload: CursoPayload) => {
      const isEdit = !!cursoExistente?._id;

      const data: CursoPayload = {
        nombre: payload.nombre,
        anioLectivo: payload.anioLectivo,
        profesorTutor: payload.profesorTutor,
        estudiantes: payload.estudiantes,
        materias: payload.materias,
      };

      const isOid = (s: string) => /^[a-fA-F0-9]{24}$/.test(s);
      console.group('[Cursos] Guardar via diálogo');
      console.log(data);
      console.log('OID checks:', {
        anioLectivo: isOid(data.anioLectivo),
        profesorTutor: isOid(data.profesorTutor),
        estudiantesOK: data.estudiantes.every(isOid),
        materiasOK: data.materias.every(m => isOid(m.materia) && isOid(m.profesor)),
      });
      console.groupEnd();

      const req$ = isEdit
        ? this.cursoSvc.actualizar(cursoExistente!._id!, data as any)
        : this.cursoSvc.crear(data as any);

      this.cargando.set(true);
      req$.subscribe({
        next: () => {
          this.sb.open(isEdit ? 'Curso actualizado' : 'Curso creado', 'Cerrar', { duration: 2500 });
          ref.close(true);
          this.refrescar();
        },
        error: (e) => {
          this.cargando.set(false);
          console.error('[Cursos] Error backend:', e);
          const msg = e?.error?.message || e?.error?.msg || 'Error al guardar';
          this.sb.open(msg, 'Cerrar', { duration: 4000 });
        }
      });
    });

    // Si canceló, no hacemos nada
    ref.afterClosed().subscribe();
  }

  eliminar(curso: any) {
    if (!confirm(`Eliminar curso "${curso.nombre}"?`)) return;
    this.cursoSvc.eliminar(curso._id).subscribe({
      next: () => { this.sb.open('Curso eliminado', 'Cerrar', { duration: 2500 }); this.refrescar(); },
      error: (e) => this.sb.open(e?.error?.message ?? 'Error al eliminar', 'Cerrar', { duration: 3500 }),
    });
  }
}
