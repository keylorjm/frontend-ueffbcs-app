// src/app/components/matricula/admin-matricula-masiva.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { firstValueFrom } from 'rxjs';

import { CursoService } from '../../services/curso.service';
import { EstudianteService, Estudiante } from '../../services/estudiante.service';
import { AnioLectivoService } from '../../services/anio-lectivo.service';
import { MatriculaService } from '../../services/matricula.service';

@Component({
  standalone: true,
  selector: 'app-admin-matricula-masiva',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="wrap">
      <mat-card>
        <h2>📘 Matrícula masiva de estudiantes</h2>

        <div class="grid">
          <mat-form-field appearance="outline">
            <mat-label>Año lectivo</mat-label>
            <mat-select [(ngModel)]="anioLectivoId">
              <mat-option *ngFor="let a of anios()" [value]="a._id">
                {{ a.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Curso</mat-label>
            <mat-select [(ngModel)]="cursoId" (selectionChange)="filtrarEstudiantes()">
              <mat-option *ngFor="let c of cursos()" [value]="c._id">
                {{ c.nombre }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <table mat-table [dataSource]="estudiantes()" class="mat-elevation-z2 full">
          <ng-container matColumnDef="check">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              <mat-checkbox [(ngModel)]="seleccionados[asId(e)]"></mat-checkbox>
            </td>
          </ng-container>

          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Estudiante</th>
            <td mat-cell *matCellDef="let e">{{ e.nombre }}</td>
          </ng-container>

          <ng-container matColumnDef="cedula">
            <th mat-header-cell *matHeaderCellDef>Cédula</th>
            <td mat-cell *matCellDef="let e">{{ e.cedula }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>

        <p *ngIf="!estudiantes().length">
          No hay estudiantes disponibles para matricular en este curso.
        </p>

        <button
          mat-flat-button
          color="primary"
          class="mt"
          (click)="matricular()"
          [disabled]="!anioLectivoId || !cursoId || !tieneSeleccion()"
        >
          Matricular seleccionados
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
export class AdminMatriculaMasivaComponent implements OnInit {
  private cursoSrv = inject(CursoService);
  private estSrv = inject(EstudianteService);
  private anioSrv = inject(AnioLectivoService);
  private matSrv = inject(MatriculaService);
  private sb = inject(MatSnackBar);

  cursos = signal<any[]>([]);
  anios = signal<any[]>([]);
  estudiantes = signal<Estudiante[]>([]);

  seleccionados: Record<string, boolean> = {};

  anioLectivoId = '';
  cursoId = '';

  cols = ['check', 'nombre', 'cedula'];

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

  async filtrarEstudiantes() {
    this.estudiantes.set([]);
    this.seleccionados = {};
    if (!this.cursoId) return;

    try {
      const cursoResp = await firstValueFrom(this.cursoSrv.obtener(this.cursoId));
      const curso: any = (cursoResp as any)?.data ?? cursoResp;

      const idsEnCurso: string[] = (curso?.estudiantes ?? []).map((e: any) =>
        this.asId(e)
      );

      const all: Estudiante[] = await firstValueFrom(this.estSrv.getAll());
      const disponibles = all.filter(
        (e) => !idsEnCurso.includes(this.asId((e as any)._id ?? (e as any).uid))
      );

      this.estudiantes.set(disponibles);
    } catch (err) {
      console.error('[AdminMatriculaMasiva] filtrarEstudiantes error', err);
      this.sb.open('Error al cargar estudiantes', 'Cerrar', { duration: 3000 });
    }
  }

  tieneSeleccion(): boolean {
    return Object.values(this.seleccionados).some((v) => v);
  }

  async matricular() {
    if (!this.anioLectivoId || !this.cursoId) {
      this.sb.open('Seleccione año lectivo y curso', 'Cerrar', { duration: 2500 });
      return;
    }

    const ids = this.estudiantes()
      .map((e) => this.asId(e))
      .filter((id) => this.seleccionados[id]);

    if (!ids.length) {
      this.sb.open('Debe seleccionar al menos un estudiante', 'Cerrar', {
        duration: 2500,
      });
      return;
    }

    try {
      const resp = await firstValueFrom(
        this.matSrv.matriculaMasiva({
          cursoId: this.cursoId,
          anioLectivoId: this.anioLectivoId,
          estudiantes: ids,
        })
      );
      this.sb.open(resp?.msg ?? 'Matrícula realizada', 'Cerrar', { duration: 3000 });
      await this.filtrarEstudiantes();
    } catch (err) {
      console.error('[AdminMatriculaMasiva] matricula error', err);
      this.sb.open('Error al matricular', 'Cerrar', { duration: 3000 });
    }
  }

  // helper para IDs
  asId(e: any): string {
    if (!e) return '';
    if (typeof e === 'string') return e;
    if (e._id) return String(e._id);
    if (e.uid) return String(e.uid);
    return '';
  }
}
