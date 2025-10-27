// src/app/pages/profesor/profesor-mis-cursos.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfesorService } from '../../services/profesor.service';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-profesor-mis-cursos',
  imports: [CommonModule, HttpClientModule, MatCardModule, MatButtonModule],
  template: `
  <div class="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    <mat-card class="rounded-2xl shadow" *ngFor="let c of cursos()">
      <div class="p-4">
        <div class="text-lg font-semibold">{{ c.cursoNombre }}</div>
        <div class="text-sm opacity-70 mb-3">Año: {{ c.anioLectivoNombre ?? '—' }}</div>
        <div class="mb-3">
          <div class="text-sm font-medium mb-1">Mis Materias</div>
          <ul class="text-sm list-disc ml-4">
            <li *ngFor="let m of c.materias">{{ m.materiaNombre }}</li>
          </ul>
        </div>
        <div class="flex flex-wrap gap-2">
          <button mat-stroked-button *ngFor="let m of c.materias"
            (click)="irIngreso(c.cursoId, c.anioLectivoId, m.materiaId)">
            Ingresar notas — {{ m.materiaNombre }}
          </button>
        </div>
      </div>
    </mat-card>
  </div>
  `
})
export class ProfesorMisCursosComponent {
  private svc = inject(ProfesorService);
  private router = inject(Router);

  cursos = signal<any[]>([]);

  constructor() {
    this.svc.misCursosMaterias().subscribe({
      next: (res) => this.cursos.set(res.cursos ?? [])
    });
  }

  irIngreso(cursoId: string, anioLectivoId: string, materiaId: string) {
    this.router.navigate(['/app/curso', cursoId, 'ingreso'], { queryParams: { materiaId } });
  }
}
