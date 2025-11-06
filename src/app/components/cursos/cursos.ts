// src/app/pages/admin/cursos.ts
import { Component, OnInit, inject, signal, computed, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';

import {
  CursoFormularioComponent,
  MateriaCatalogoItem,
  CursoPayload,
} from '../curso-formulario/curso-formulario';

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
    CommonModule,
    HttpClientModule,
    MatSnackBarModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressBarModule,
    MatListModule,
  ],
  template: `
    <div class="wrap">
      <!-- Header -->
      <div class="header">
        <div class="titles">
          <h1>📘 Gestión de Cursos</h1>
          <p class="subtitle">
            Crea cursos asignando materias (con su profesor responsable) y estudiantes.
          </p>
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

        <div class="list" *ngIf="cursos().length; else vacio">
          <mat-card class="item" *ngFor="let c of cursos()">
            <div class="item-head">
              <!-- Nombre clickable para abrir detalles -->
              <button class="item-title link" (click)="verDetalles(c)">{{ c.nombre }}</button>
              <mat-chip-set>
                <mat-chip appearance="outlined" color="primary"
                  >Año: {{ c.anioLectivo?.nombre ?? c.anioLectivo }}</mat-chip
                >
                <mat-chip appearance="outlined"
                  >Tutor: {{ c.profesorTutor?.nombre ?? c.profesorTutor }}</mat-chip
                >
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

      <!-- DIALOG: DETALLES DEL CURSO -->
      <ng-template #detalleDlg>
        <div class="dlg-header">
          <div>
            <div class="dlg-title">Detalles del curso</div>
            <div class="dlg-subtitle" *ngIf="cursoDetalle()">
              Información completa del curso seleccionado
            </div>
          </div>
          <button mat-icon-button (click)="cerrarDialogo()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <mat-divider></mat-divider>

        <div class="det-wrap" *ngIf="cursoDetalle(); else cargandoDetalle">
          <div class="det-top">
            <div class="det-name">{{ cursoDetalle().nombre }}</div>
            <div class="det-meta">
              <mat-chip-set>
                <mat-chip appearance="outlined" color="primary"
                  >Año:
                  {{ cursoDetalle().anioLectivo?.nombre ?? cursoDetalle().anioLectivo }}</mat-chip
                >
                <mat-chip appearance="outlined"
                  >Tutor:
                  {{
                    cursoDetalle().profesorTutor?.nombre ?? cursoDetalle().profesorTutor
                  }}</mat-chip
                >
                <mat-chip appearance="outlined"
                  >{{ cursoDetalle().materias?.length || 0 }} materia(s)</mat-chip
                >
                <mat-chip appearance="outlined"
                  >{{ cursoDetalle().estudiantes?.length || 0 }} estudiante(s)</mat-chip
                >
              </mat-chip-set>
            </div>
          </div>

          <div class="det-sections">
            <mat-card class="det-card">
              <div class="sec-title"><mat-icon>menu_book</mat-icon> Materias y profesores</div>
              <mat-list dense *ngIf="cursoDetalle().materias?.length; else sinMaterias">
                <mat-list-item *ngFor="let m of cursoDetalle().materias">
                  <mat-icon matListItemIcon>book</mat-icon>
                  <div matListItemTitle>{{ m.materia?.nombre ?? m.materia }}</div>
                  <div matListItemLine class="muted">
                    Profesor: {{ m.profesor?.nombre ?? m.profesor }}
                  </div>
                </mat-list-item>
              </mat-list>
              <ng-template #sinMaterias>
                <div class="muted p2">No hay materias asignadas.</div>
              </ng-template>
            </mat-card>

            <mat-card class="det-card">
              <div class="sec-title"><mat-icon>group</mat-icon> Estudiantes</div>
              <mat-list dense *ngIf="cursoDetalle().estudiantes?.length; else sinEstudiantes">
                <mat-list-item *ngFor="let e of cursoDetalle().estudiantes">
                  <mat-icon matListItemIcon>person</mat-icon>
                  <div matListItemTitle>{{ e?.nombre ?? e }}</div>
                </mat-list-item>
              </mat-list>
              <ng-template #sinEstudiantes>
                <div class="muted p2">No hay estudiantes registrados en este curso.</div>
              </ng-template>
            </mat-card>
          </div>
        </div>

        <ng-template #cargandoDetalle>
          <div class="loading-det">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            <div class="muted">Cargando detalles…</div>
          </div>
        </ng-template>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .wrap {
        padding: 24px;
        max-width: 1100px;
        margin: 0 auto;
        display: grid;
        gap: 16px;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .titles h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }
      .subtitle {
        margin: 2px 0 0;
        opacity: 0.7;
      }
      .actions button mat-icon {
        margin-right: 6px;
      }

      .card {
        padding: 0;
        overflow: hidden;
      }
      .list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 12px;
        padding: 16px;
      }
      .item {
        padding: 14px;
        border-radius: 16px;
      }
      .item-head {
        display: grid;
        gap: 8px;
      }
      .item-title {
        font-weight: 700;
        font-size: 16px;
        text-align: left;
      }
      .link {
        background: transparent;
        border: 0;
        color: #1a73e8;
        cursor: pointer;
        padding: 0;
        text-align: left;
      }
      .link:hover {
        text-decoration: underline;
      }
      .item-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .empty {
        padding: 32px;
        text-align: center;
        display: grid;
        gap: 10px;
      }
      .empty .emoji {
        font-size: 40px;
      }
      .empty .msg {
        opacity: 0.7;
      }

      :host ::ng-deep .mat-mdc-dialog-container .mdc-dialog__container {
        border-radius: 18px;
      }

      /* Detalles */
      .dlg-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 6px 6px;
      }
      .dlg-title {
        font-weight: 700;
        font-size: 18px;
      }
      .dlg-subtitle {
        opacity: 0.7;
        font-size: 13px;
        margin-top: 2px;
      }
      .det-wrap {
        padding: 10px 6px 16px;
        display: grid;
        gap: 12px;
      }
      .det-top {
        display: grid;
        gap: 6px;
      }
      .det-name {
        font-size: 18px;
        font-weight: 700;
      }
      .det-sections {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .det-card {
        padding: 12px;
        border-radius: 14px;
      }
      .sec-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .muted {
        opacity: 0.7;
      }
      .p2 {
        padding: 6px 4px;
      }
      .loading-det {
        padding: 16px;
        display: grid;
        gap: 8px;
      }
      @media (max-width: 900px) {
        .det-sections {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CursosComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private cursoSvc = inject(CursoService);
  private dialog = inject(MatDialog);

  private anioSvc = inject(AnioLectivoService);
  private usuarioSvc = inject(UsuarioService);
  private estuSvc = inject(EstudianteService);
  private materiaSvc = inject(MateriaService);

  // Helpers seguros
private asId(val: any): string {
  if (!val) return '';                 // null | undefined
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val._id) return String(val._id);
  return '';
}
private mapIdArray(arr: any[]): string[] {
  return Array.isArray(arr)
    ? arr.map((x) => this.asId(x)).filter(Boolean)
    : [];
}


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

  // Dialog Detalles
  @ViewChild('detalleDlg') detalleDlgTpl!: TemplateRef<any>;
  detalleRef?: MatDialogRef<any>;
  cursoDetalle = signal<any | null>(null);

  ngOnInit() {
    this.cargarCatalogos();
    this.refrescar();
  }

  private cargarCatalogos() {
    this.anioSvc.getAll().subscribe({
      next: (res: any) => this.aniosLectivo.set(res?.data ?? res ?? []),
      error: () =>
        this.sb.open('No se pudieron cargar los años lectivos', 'Cerrar', { duration: 3000 }),
    });

    // Profesores
    (this.usuarioSvc as any).getProfesores?.().subscribe?.({
      next: (res: any) => {
        const list = res?.data ?? res ?? [];
        const mapped = list.map((p: any) => ({
          _id: p._id ?? p.uid ?? p.id,
          nombre: p.nombre ?? p.fullname ?? p.email ?? 'Profesor',
        }));
        this.profesores.set(mapped);
      },
      error: () =>
        this.sb.open('No se pudieron cargar los profesores', 'Cerrar', { duration: 3000 }),
    });

    // Estudiantes
    this.estuSvc.getAll().subscribe({
      next: (res: any) =>
        this.estudiantes.set(
          (res?.data ?? res ?? []).map((e: any) => ({
            _id: e._id ?? e.uid ?? e.id,
            nombre: e.nombre ?? e.fullname ?? e.email,
          }))
        ),
      error: () =>
        this.sb.open('No se pudieron cargar los estudiantes', 'Cerrar', { duration: 3000 }),
    });

    // Materias
    this.materiaSvc.getAll().subscribe({
      next: (res: any) => this.materiasRaw.set(res?.materias ?? res ?? []),
      error: () => this.sb.open('No se pudieron cargar las materias', 'Cerrar', { duration: 3000 }),
    });
  }

  refrescar() {
    this.cargando.set(true);
    this.cursoSvc.listar().subscribe({
      next: (res: any) => {
        this.cursos.set(res?.data ?? res ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 });
      },
    });
  }

  // Abre diálogo para CREAR
  abrirCrear() {
    this.abrirDialogo(null);
  }

  // Abre diálogo para EDITAR
// Abre diálogo para EDITAR (versión a prueba de nulls)
abrirEditar(curso: any) {
  const flat: Curso = {
    _id: this.asId(curso?._id) || '',
    nombre: curso?.nombre ?? '',
    anioLectivo: this.asId(curso?.anioLectivo),        // si viene objeto/null/string -> lo convierte a ID o ''
    profesorTutor: this.asId(curso?.profesorTutor),
    estudiantes: this.mapIdArray(curso?.estudiantes ?? []),
    materias: Array.isArray(curso?.materias)
      ? curso.materias.map((m: any) => ({
          materia: this.asId(m?.materia),
          profesor: '' // el form lo resuelve desde el catálogo
        })).filter((row: { materia: any; }) => !!row.materia)               // evita filas rotas
      : []
  };

  // Si faltan campos críticos, avisa y no abre
  if (!flat._id) {
    this.sb.open('No se puede editar: curso sin ID válido.', 'Cerrar', { duration: 3500 });
    return;
  }
  if (!flat.anioLectivo) {
    console.warn('[Cursos] curso.anioLectivo viene vacío o nulo para', curso?.nombre);
  }
  if (!flat.profesorTutor) {
    console.warn('[Cursos] curso.profesorTutor viene vacío o nulo para', curso?.nombre);
  }

  this.abrirDialogo(flat);
}



  private abrirDialogo(cursoExistente: Curso | null) {
    const ref = this.dialog.open(CursoFormularioComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'soft-dialog',
      disableClose: true,
      autoFocus: false,
      data: null,
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
        },
      });
    });

    // Si canceló, no hacemos nada
    ref.afterClosed().subscribe();
  }

  // VER DETALLES (abre diálogo y carga detalle desde backend)
  verDetalles(curso: any) {
    this.cursoDetalle.set(null);
    this.detalleRef = this.dialog.open(this.detalleDlgTpl, {
      width: '820px',
      maxWidth: '95vw',
      panelClass: 'soft-dialog',
      autoFocus: false,
    });

    this.cursoSvc.obtener(curso._id).subscribe({
      next: (res: any) => this.cursoDetalle.set(res?.data ?? res),
      error: (e) => {
        console.error('[Cursos] Error al obtener detalle:', e);
        this.sb.open(e?.error?.message ?? 'No se pudo cargar el detalle', 'Cerrar', {
          duration: 3500,
        });
        this.detalleRef?.close();
      },
    });
  }

  cerrarDialogo(): void {
    this.detalleRef?.close();
  }

  eliminar(curso: any) {
    if (!confirm(`Eliminar curso "${curso.nombre}"?`)) return;
    this.cursoSvc.eliminar(curso._id).subscribe({
      next: () => {
        this.sb.open('Curso eliminado', 'Cerrar', { duration: 2500 });
        this.refrescar();
      },
      error: (e) =>
        this.sb.open(e?.error?.message ?? 'Error al eliminar', 'Cerrar', { duration: 3500 }),
    });
  }
}
