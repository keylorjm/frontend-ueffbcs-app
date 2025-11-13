// src/app/components/promociones/admin-promociones.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { firstValueFrom } from 'rxjs';

import { CursoService } from '../../services/curso.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';
import { AnioLectivoService } from '../../services/anio-lectivo.service';
import { MatriculaService } from '../../services/matricula.service';

@Component({
  standalone: true,
  selector: 'app-admin-promociones',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatTableModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="wrap">
      <mat-card>
        <h2>📘 Promoción de estudiantes al siguiente año</h2>

        <div class="grid">
          <mat-form-field appearance="outline">
            <mat-label>Año lectivo actual</mat-label>
            <mat-select [(ngModel)]="anioIdActual" (selectionChange)="onChange()">
              <mat-option *ngFor="let a of anios()" [value]="a._id">
                {{ a.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Curso actual</mat-label>
            <mat-select [(ngModel)]="cursoId" (selectionChange)="onChange()">
              <mat-option *ngFor="let c of cursos()" [value]="c._id">
                {{ c.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <table mat-table [dataSource]="estudiantes()" class="mat-elevation-z2 full">
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Estudiante</th>
            <td mat-cell *matCellDef="let e">{{ e.nombre }}</td>
          </ng-container>

          <ng-container matColumnDef="cedula">
            <th mat-header-cell *matHeaderCellDef>Cédula</th>
            <td mat-cell *matCellDef="let e">{{ e.cedula }}</td>
          </ng-container>

          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              <button mat-flat-button color="primary" (click)="promoverUno(e)">
                Promover
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>

        <p *ngIf="!estudiantes().length">
          Seleccione año y curso para ver estudiantes.
        </p>

        <button
          mat-flat-button
          color="accent"
          class="mt"
          (click)="promoverTodos()"
          [disabled]="!estudiantes().length"
        >
          Promover todos
        </button>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .wrap { padding: 20px; max-width: 900px; margin: auto; }
      .grid { display: flex; gap: 12px; flex-wrap: wrap; }
      .full { width: 100%; margin-top: 12px; }
      .mt { margin-top: 12px; }
    `,
  ],
})
export class AdminPromocionesComponent implements OnInit {
  private anioSrv = inject(AnioLectivoService);
  private cursoSrv = inject(CursoService);
  private estSrv = inject(EstudianteService);
  private matSrv = inject(MatriculaService);
  private sb = inject(MatSnackBar);

  anios = signal<any[]>([]);
  cursos = signal<any[]>([]);
  estudiantes = signal<Estudiante[]>([]);

  anioIdActual = '';
  cursoId = '';

  cols = ['nombre', 'cedula', 'acciones'];

  ngOnInit() {
    this.anioSrv.getAll().subscribe({
      next: (res: any) => this.anios.set(res?.data ?? res ?? []),
      error: () =>
        this.sb.open('Error cargando años lectivos', 'Cerrar', { duration: 3000 }),
    });

    this.cursoSrv.listar().subscribe({
      next: (res: any) => this.cursos.set(res?.data ?? res ?? []),
      error: () =>
        this.sb.open('Error cargando cursos', 'Cerrar', { duration: 3000 }),
    });
  }

  async onChange() {
    this.estudiantes.set([]);

    if (!this.anioIdActual || !this.cursoId) return;

    try {
      const cursoResp = await firstValueFrom(this.cursoSrv.obtener(this.cursoId));
      const curso: any = (cursoResp as any)?.data ?? cursoResp;

      const idsCurso: string[] = (curso?.estudiantes ?? []).map((e: any) =>
        this.asId(e)
      );

      const all: Estudiante[] = await firstValueFrom(this.estSrv.getAll());
      const filtrados = all.filter((e) =>
        idsCurso.includes(this.asId((e as any)._id ?? (e as any).uid))
      );

      this.estudiantes.set(filtrados);
    } catch (err) {
      console.error('[AdminPromociones] onChange error', err);
      this.sb.open('Error cargando estudiantes del curso', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  async promoverUno(est: Estudiante) {
    if (!this.anioIdActual || !this.cursoId) return;
    const estId = this.asId((est as any));

    try {
      const resp = await firstValueFrom(
        this.matSrv.autoMatricular({
          estudianteId: estId,
          anioLectivoActualId: this.anioIdActual,
          cursoActualId: this.cursoId,
        })
      );
      this.sb.open(resp?.message ?? 'Procesado', 'Cerrar', { duration: 3000 });
    } catch (err) {
      console.error('[AdminPromociones] promoverUno error', err);
      this.sb.open('Error al promover estudiante', 'Cerrar', { duration: 3000 });
    }
  }

  async promoverTodos() {
    if (!this.anioIdActual || !this.cursoId) return;

    try {
      const resp = await firstValueFrom(
        this.matSrv.autoMatricularBulk({
          anioLectivoId: this.anioIdActual,
          cursoId: this.cursoId,
        })
      );
      this.sb.open(resp?.message ?? 'Promoción completada', 'Cerrar', {
        duration: 4000,
      });
    } catch (err) {
      console.error('[AdminPromociones] promoverTodos error', err);
      this.sb.open('Error al promover el curso', 'Cerrar', { duration: 3000 });
    }
  }

  // helper
  private asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (val._id) return String(val._id);
    if (val.uid) return String(val.uid);
    return '';
  }
}
