// src/app/components/profesor-mis-cursos/profesor-mis-cursos.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

import { CursoService } from '../../services/curso.service';
import { AuthService } from '../../services/auth.service'; // Tu servicio real
import { resolveCurrentUser, resolveUserId } from '../../utils/auth-helpers';

@Component({
  selector: 'app-profesor-mis-cursos',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
  <div class="container">
    <h1>Mis Cursos</h1>

    <div class="grid" *ngIf="misCursos?.length; else noData">
      <mat-card *ngFor="let c of misCursos">
        <mat-card-title>{{ c.nombre }}</mat-card-title>
        <mat-card-subtitle>Año: {{ c.anioLectivo?.nombre || '—' }}</mat-card-subtitle>

        <div class="materias">
          <h4>Mis Materias</h4>
          <div *ngIf="(c._misMaterias || []).length === 0">No tienes materias en este curso.</div>

          <div class="mat-row" *ngFor="let m of c._misMaterias">
            <span>{{ m.nombre }}</span>
            <div class="actions">
              <button mat-button color="primary" (click)="ingresarNotas(c, m)">Ingresar Notas</button>
              <button mat-button (click)="verNotas(c, m)">Ver Notas</button>
            </div>
          </div>
        </div>
      </mat-card>
    </div>

    <ng-template #noData>
      <div class="empty">No tienes cursos asignados.</div>
    </ng-template>
  </div>
  `,
  styles: [`
    .container { padding: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .materias { margin-top: 12px; }
    .mat-row { display:flex; justify-content: space-between; align-items:center; padding: 4px 0; }
    .actions { display:flex; gap: 8px; }
    .empty { opacity: .7; padding: 16px 0; }
  `],
})
export class ProfesorMisCursos implements OnInit {
  private cursosSrv = inject(CursoService);
  private auth = inject(AuthService);
  private router = inject(Router);

  misCursos: any[] = [];
  private myId?: string;

  ngOnInit(): void {
    const me = resolveCurrentUser(this.auth);
    this.myId = resolveUserId(me);

    // Si tu backend ya filtra por profesor con ?profesorId=..., puedes descomentar:
    // this.cursosSrv.getAll({ profesorId: this.myId }).subscribe((cursos) => this.misCursos = this.postMap(cursos));
    // Si prefieres traer todos y filtrar en front (mantengo esta opción por compatibilidad):
    this.cursosSrv.getAll().subscribe((cursos: any[]) => {
      this.misCursos = this.postMap(cursos || []);
    });
  }

  /** Post-procesa los cursos para extraer solo las materias donde yo soy profesor o tutor. */
  private postMap(cursos: any[]): any[] {
    if (!this.myId) return [];
    return cursos.map(c => {
      const mis = (c.materias || []).filter((m: any) => {
        const pid = m?.profesor?._id || m?.profesor;
        return String(pid) === String(this.myId);
      });
      const soyTutor = String(c.profesorTutor?._id || c.profesorTutor) === String(this.myId);
      return (mis.length || soyTutor) ? { ...c, _misMaterias: mis } : null;
    }).filter(Boolean) as any[];
  }

  ingresarNotas(curso: any, materia: any) {
    const anioLectivoId = curso.anioLectivo?._id || curso.anioLectivo;
    this.router.navigate([`/app/profesor/curso/${curso._id}/ingreso`], {
      queryParams: { materiaId: materia._id || materia, anioLectivoId }
    });
  }

  verNotas(curso: any, materia: any) {
    const anioLectivoId = curso.anioLectivo?._id || curso.anioLectivo;
    this.router.navigate([`/app/profesor/curso/${curso._id}/notas`], {
      queryParams: { materiaId: materia._id || materia, anioLectivoId }
    });
  }
}
