// src/app/pages/profesor/profesor-dashboard.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { CursoService } from '../../services/curso.service';

@Component({
  standalone: true,
  selector: 'app-profesor-dashboard',
  imports: [CommonModule, MatCardModule, MatSnackBarModule, MatChipsModule, MatButtonModule],
  template: `
    <div class="wrap">
      <div class="header">
        <h1>👨‍🏫 Panel del Profesor</h1>
        <p class="subtitle">
          Selecciona un curso y materia para registrar notas (masivo o individual) o generar
          reportes.
        </p>
      </div>

      <div class="grid" *ngIf="cursosFiltrados()?.length; else vacio">
        <mat-card class="item" *ngFor="let c of cursosFiltrados()">
          <div class="title">{{ c.nombre }}</div>
          <div class="chips">
            <mat-chip appearance="outlined" color="primary"
              >Año: {{ c.anioLectivo?.nombre ?? c.anioLectivo }}</mat-chip
            >
            <mat-chip appearance="outlined">Estudiantes: {{ c.estudiantes?.length ?? 0 }}</mat-chip>
          </div>

          <div class="materias">
            <div class="m-row" *ngFor="let m of materiasDelProfesor(c)">
              <div class="m-name">📘 {{ m.materia?.nombre ?? m.materia }}</div>              
            </div>
          </div>
        </mat-card>
      </div>

      <ng-template #vacio>
        <div class="empty">No tienes materias asignadas en los cursos.</div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .wrap {
        padding: 24px;
        max-width: 1000px;
        margin: 0 auto;
        display: grid;
        gap: 14px;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 800;
      }
      .subtitle {
        margin: 2px 0 0;
        opacity: 0.7;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 12px;
      }
      .item {
        padding: 14px;
        border-radius: 16px;
        display: grid;
        gap: 10px;
      }
      .title {
        font-weight: 700;
        font-size: 18px;
      }
      .chips {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .materias {
        display: grid;
        gap: 8px;
      }
      .m-row {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border: 1px solid #ececec;
        border-radius: 10px;
      }
      .m-name {
        font-weight: 600;
      }
      .m-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .empty {
        text-align: center;
        opacity: 0.6;
        padding: 32px;
      }
    `,
  ],
})
export class ProfesorDashboardComponent implements OnInit {
  private sb = inject(MatSnackBar);
  private auth = inject(AuthService);
  private cursoSvc = inject(CursoService);
  private router = inject(Router);

  cursos = signal<any[]>([]);
  meId = signal<string>('');

  ngOnInit() {
    this.auth.ensureUserLoaded().subscribe(() => {
      this.meId.set(this.auth.getuser()?.id ?? '');
      this.cursoSvc.listar().subscribe({
        next: (res: any) => this.cursos.set(res?.data ?? res ?? []),
        error: () => this.sb.open('No se pudieron cargar los cursos', 'Cerrar', { duration: 3000 }),
      });
    });
  }

  cursosFiltrados = computed(() => {
    const me = this.meId();
    return (this.cursos() ?? []).filter((c: any) =>
      (c.materias ?? []).some((m: any) => this.asId(m?.profesor) === me)
    );
  });

  materiasDelProfesor(curso: any) {
    const me = this.meId();
    return (curso.materias ?? []).filter((m: any) => this.asId(m?.profesor) === me);
  } 
  
  irAResumen(curso: any, m: any): void {
  const cursoId = this.asId(curso?._id);
  const anioId = this.asId(curso?.anioLectivo);
  const materiaId = this.asId(m?.materia);

  if (!cursoId || !anioId || !materiaId) {
    this.sb.open('IDs inválidos', 'Cerrar', { duration: 2500 });
    return;
  }

  this.router.navigate(['/app/resumen'], {
    queryParams: { curso: cursoId, anioLectivo: anioId, materia: materiaId }
  });
}



  

  private asId(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val._id) return String(val._id);
    return '';
  }
}
