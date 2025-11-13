// src/app/components/cursos/cursos.ts
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

import {
  CursoFormularioComponent,
  MateriaCatalogoItem,
  CursoPayload,
} from '../curso-formulario/curso-formulario';

import { CursoService } from '../../services/curso.service';
import { AnioLectivoService, AnioLectivo } from '../../services/anio-lectivo.service';
import { UsuarioService } from '../../services/usuario.service';
import { EstudianteService } from '../../services/estudiante.service';
import { MateriaService, Materia } from '../../services/materia.service';

@Component({
  standalone: true,
  selector: 'app-cursos',
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,

    MatSnackBarModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressBarModule,
    MatListModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  template: `
    <div class="wrap">
      <!-- Header -->
      <div class="header">
        <div class="titles">
          <h1>📘 Gestión de Cursos</h1>
          <p class="subtitle">
            Administra cursos, su año lectivo, tutor, materias y estudiantes.
          </p>
        </div>
        <div class="actions">
          <button mat-flat-button color="primary" (click)="abrirCrear()">
            <mat-icon>add</mat-icon>
            Nuevo curso
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <mat-card class="filters-card">
        <div class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Año lectivo</mat-label>
            <mat-select [(ngModel)]="filtroAnioId">
              <mat-option [value]="''">Todos</mat-option>
              <mat-option *ngFor="let a of aniosLectivo()" [value]="a._id">
                {{ a.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-text">
            <mat-label>Buscar curso</mat-label>
            <input
              matInput
              [(ngModel)]="filtroTexto"
              placeholder="Nombre de curso, tutor..."
            />
            <button
              mat-icon-button
              matSuffix
              *ngIf="filtroTexto"
              type="button"
              (click)="filtroTexto = ''"
            >
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>
        </div>
      </mat-card>

      <!-- Tarjeta de listado -->
      <mat-card class="card">
        <mat-progress-bar *ngIf="cargando()" mode="indeterminate"></mat-progress-bar>

        <div class="list" *ngIf="cursosFiltrados().length; else vacio">
          <mat-card class="item" *ngFor="let c of cursosFiltrados(); trackBy: trackByCursoId">
            <div class="item-head">
              <div class="item-title-row">
                <button class="item-title link" (click)="verDetalles(c)">
                  {{ c.nombre }}
                </button>
                <span class="tag-orden" *ngIf="c.orden">
                  #{{ c.orden }}
                </span>
              </div>

              <mat-chip-set>
                <mat-chip appearance="outlined" color="primary">
                  Año: {{ c.anioLectivo?.nombre ?? c.anioLectivo }}
                </mat-chip>
                <mat-chip appearance="outlined">
                  Tutor: {{ c.profesorTutor?.nombre ?? c.profesorTutor }}
                </mat-chip>
                <mat-chip appearance="outlined">
                  {{ c.materias?.length || 0 }} materia(s)
                </mat-chip>
                <mat-chip appearance="outlined">
                  {{ c.estudiantes?.length || 0 }} estudiante(s)
                </mat-chip>
              </mat-chip-set>
            </div>

            <div class="item-footer">
              <div class="meta" *ngIf="c.nextCursoId">
                <mat-icon inline>trending_flat</mat-icon>
                Promociona a: <strong>{{ c.nextCursoId }}</strong>
              </div>

              <div class="item-actions">
                <button mat-stroked-button color="primary" type="button" (click)="abrirEditar(c)">
                  <mat-icon>edit</mat-icon>
                  Editar
                </button>
                <button mat-stroked-button color="warn" type="button" (click)="eliminar(c)">
                  <mat-icon>delete</mat-icon>
                  Eliminar
                </button>
              </div>
            </div>
          </mat-card>
        </div>

        <ng-template #vacio>
          <div class="empty">
            <div class="emoji">🗂️</div>
            <div class="msg">No hay cursos registrados con el filtro actual.</div>
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
          <button mat-icon-button type="button" (click)="cerrarDialogo()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <mat-divider></mat-divider>

        <div class="det-wrap" *ngIf="cursoDetalle(); else cargandoDetalle">
          <div class="det-top">
            <div class="det-name">
              {{ cursoDetalle().nombre }}
              <span class="tag-orden" *ngIf="cursoDetalle().orden">
                #{{ cursoDetalle().orden }}
              </span>
            </div>
            <div class="det-meta">
              <mat-chip-set>
                <mat-chip appearance="outlined" color="primary">
                  Año:
                  {{ cursoDetalle().anioLectivo?.nombre ?? cursoDetalle().anioLectivo }}
                </mat-chip>
                <mat-chip appearance="outlined">
                  Tutor:
                  {{
                    cursoDetalle().profesorTutor?.nombre ?? cursoDetalle().profesorTutor
                  }}
                </mat-chip>
                <mat-chip appearance="outlined">
                  {{ cursoDetalle().materias?.length || 0 }} materia(s)
                </mat-chip>
                <mat-chip appearance="outlined">
                  {{ cursoDetalle().estudiantes?.length || 0 }} estudiante(s)
                </mat-chip>
              </mat-chip-set>
            </div>
          </div>

          <div class="det-sections">
            <mat-card class="det-card">
              <div class="sec-title">
                <mat-icon>menu_book</mat-icon>
                Materias y profesores
              </div>
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
              <div class="sec-title">
                <mat-icon>group</mat-icon>
                Estudiantes
              </div>
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

      .filters-card {
        padding: 12px 16px;
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
      }
      .filter-text {
        flex: 1;
        min-width: 220px;
      }

      .card {
        padding: 0;
        overflow: hidden;
      }
      .list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
        gap: 12px;
        padding: 16px;
      }
      .item {
        padding: 14px;
        border-radius: 16px;
        display: grid;
        gap: 10px;
      }
      .item-head {
        display: grid;
        gap: 8px;
      }
      .item-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .item-title {
        font-weight: 700;
        font-size: 16px;
        text-align: left;
      }
      .tag-orden {
        padding: 1px 6px;
        border-radius: 999px;
        background: #e3f2fd;
        font-size: 11px;
        color: #1565c0;
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
      .item-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .meta {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        opacity: 0.8;
      }
      .meta mat-icon {
        font-size: 16px;
      }
      .item-actions {
        display: flex;
        gap: 8px;
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
        display: inline-flex;
        align-items: center;
        gap: 6px;
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

  private asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val._id) return String(val._id);
    if (typeof val === 'object' && val.uid) return String(val.uid);
    return '';
  }
  private mapIdArray(arr: any[]): string[] {
    return Array.isArray(arr)
      ? arr.map((x) => this.asId(x)).filter(Boolean)
      : [];
  }

  cargando = signal<boolean>(false);

  aniosLectivo = signal<AnioLectivo[]>([]);
  profesores = signal<{ _id: string; nombre: string }[]>([]);
  estudiantes = signal<{ _id: string; nombre: string }[]>([]);
  materiasRaw = signal<Materia[]>([]);

  materiasConProfesor = computed<MateriaCatalogoItem[]>(() =>
    (this.materiasRaw() ?? []).map((m: any) => ({
      _id: m._id,
      nombre: m.nombre,
      profesorId: typeof m.profesor === 'object' ? m.profesor?._id : m.profesor,
      profesorNombre: typeof m.profesor === 'object' ? m.profesor?.nombre : undefined,
    }))
  );

  cursos = signal<any[]>([]);

  filtroAnioId = '';
  filtroTexto = '';

  cursosFiltrados = computed(() => {
    const list = this.cursos() ?? [];
    const anioId = this.filtroAnioId;
    const q = (this.filtroTexto || '').toLowerCase().trim();

    return list.filter((c) => {
      if (anioId) {
        const cid = this.asId(c.anioLectivo);
        if (cid !== anioId) return false;
      }
      if (q) {
        const nombre = (c.nombre ?? '').toLowerCase();
        const tutor =
          (c.profesorTutor?.nombre ??
            c.profesorTutor ??
            '')?.toString().toLowerCase();
        if (!nombre.includes(q) && !tutor.includes(q)) return false;
      }
      return true;
    });
  });

  @ViewChild('detalleDlg') detalleDlgTpl!: TemplateRef<any>;
  detalleRef?: MatDialogRef<any>;
  cursoDetalle = signal<any | null>(null);

  ngOnInit() {
    this.cargarCatalogos();
    this.refrescar();
  }

  private cargarCatalogos() {
    this.anioSvc.getAll().subscribe({
      next: (rows) => this.aniosLectivo.set(rows ?? []),
      error: () =>
        this.sb.open('No se pudieron cargar los años lectivos', 'Cerrar', {
          duration: 3000,
        }),
    });

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
        this.sb.open('No se pudieron cargar los profesores', 'Cerrar', {
          duration: 3000,
        }),
    });

    this.estuSvc.getAll().subscribe({
      next: (rows: any) =>
        this.estudiantes.set(
          (rows ?? []).map((e: any) => ({
            _id: e._id ?? e.uid ?? e.id,
            nombre: e.nombre ?? e.fullname ?? e.email,
          }))
        ),
      error: () =>
        this.sb.open('No se pudieron cargar los estudiantes', 'Cerrar', {
          duration: 3000,
        }),
    });

    this.materiaSvc.getAll().subscribe({
      next: (res: any) =>
        this.materiasRaw.set((res?.materias ?? res ?? []) as Materia[]),
      error: () =>
        this.sb.open('No se pudieron cargar las materias', 'Cerrar', {
          duration: 3000,
        }),
    });
  }

  /** Normaliza cualquier forma de respuesta del backend a un array de cursos */
  private normalizeCursosResponse(res: any): any[] {
    console.log('[Cursos] respuesta listar()', res);

    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.cursos)) return res.cursos;
    if (Array.isArray(res.results)) return res.results;
    return [];
  }

  refrescar() {
    this.cargando.set(true);
    this.cursoSvc.listar().subscribe({
      next: (res: any) => {
        const data = this.normalizeCursosResponse(res);
        this.cursos.set(data);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        console.error('[Cursos] Error listar:', e);
        this.sb.open('No se pudieron cargar los cursos', 'Cerrar', {
          duration: 3000,
        });
      },
    });
  }

  abrirCrear() {
    this.abrirDialogo(null);
  }

  abrirEditar(curso: any) {
    const flat: any = {
      _id: this.asId(curso?._id) || '',
      nombre: curso?.nombre ?? '',
      anioLectivo: this.asId(curso?.anioLectivo),
      profesorTutor: this.asId(curso?.profesorTutor),
      estudiantes: this.mapIdArray(curso?.estudiantes ?? []),
      materias: Array.isArray(curso?.materias)
        ? curso.materias
            .map((m: any) => ({
              materia: this.asId(m?.materia),
              profesor: this.asId(m?.profesor),
            }))
            .filter((row: { materia: string }) => !!row.materia)
        : [],
      orden: curso.orden,
      nextCursoId: curso.nextCursoId ?? null,
      activo: curso.activo ?? true,
    };

    if (!flat._id) {
      this.sb.open('No se puede editar: curso sin ID válido.', 'Cerrar', {
        duration: 3500,
      });
      return;
    }

    this.abrirDialogo(flat);
  }

  private abrirDialogo(cursoExistente: any | null) {
    const ref = this.dialog.open(CursoFormularioComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'soft-dialog',
      disableClose: true,
      autoFocus: false,
      data: null,
    });

    ref.componentInstance.aniosLectivo = this.aniosLectivo;
    ref.componentInstance.profesoresCatalogo = this.profesores;
    ref.componentInstance.estudiantesCatalogo = this.estudiantes;
    ref.componentInstance.materiasCatalogo = this.materiasConProfesor;
    ref.componentInstance.cursoExistente = cursoExistente;

    ref.componentInstance.submitCurso.subscribe((payload: CursoPayload) => {
      const isEdit = !!cursoExistente?._id;

      const data: CursoPayload = {
        nombre: payload.nombre,
        anioLectivo: payload.anioLectivo,
        profesorTutor: payload.profesorTutor,
        estudiantes: payload.estudiantes ?? [],
        materias: payload.materias ?? [],
        orden: payload.orden,
        nextCursoId: payload.nextCursoId ?? null,
        activo: payload.activo,
      };

      const req$ = isEdit
        ? this.cursoSvc.actualizar(cursoExistente!._id!, data as any)
        : this.cursoSvc.crear(data as any);

      this.cargando.set(true);
      req$.subscribe({
        next: () => {
          this.sb.open(
            isEdit ? 'Curso actualizado' : 'Curso creado',
            'Cerrar',
            { duration: 2500 }
          );
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

    ref.afterClosed().subscribe();
  }

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
        this.sb.open(e?.error?.message ?? 'Error al eliminar', 'Cerrar', {
          duration: 3500,
        }),
    });
  }

   trackByCursoId = (index: number, c: any): string => {
    if (c && typeof c === 'object') {
      if (c._id) return String(c._id);
      if (c.uid) return String(c.uid);
    }
    return index.toString();
  };
}
