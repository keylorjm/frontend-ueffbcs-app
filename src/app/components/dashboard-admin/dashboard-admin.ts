import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';

import { CursoService } from '../../services/curso.service';
import { EstudianteService } from '../../services/estudiante.service';
import { AuthService } from '../../services/auth.service';
import { CalificacionService } from '../../services/calificacion.service';
import { AsistenciaService } from '../../services/asistencia.service';

Chart.register(...registerables);

@Component({
  standalone: true,
  selector: 'app-dashboard-admin',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDividerModule,
    RouterModule,
  ],
  template: `
  <div class="wrap">
    <h1 class="title">📊 Panel de Administración</h1>
    <p class="subtitle">Resumen general del sistema académico</p>

    <div class="grid-cards">
      <mat-card class="summary-card" *ngFor="let s of resumen()">
        <mat-icon [ngClass]="s.iconClass">{{ s.icon }}</mat-icon>
        <div class="info">
          <h2>{{ s.valor }}</h2>
          <p>{{ s.label }}</p>
        </div>
      </mat-card>
    </div>

    <mat-divider></mat-divider>

    <div class="charts">
      <mat-card class="chart-card">
        <h3>Estudiantes por Curso</h3>
        <canvas id="chartCursos"></canvas>
      </mat-card>

      <mat-card class="chart-card">
        <h3>Promedios Generales</h3>
        <canvas id="chartPromedios"></canvas>
      </mat-card>
    </div>
  </div>
  `,
  styles: [`
    .wrap {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1200px;
      margin: auto;
    }
    .title {
      font-weight: 800;
      font-size: 26px;
      margin: 0;
    }
    .subtitle {
      opacity: .8;
      margin-bottom: 10px;
    }
    .grid-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .summary-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-radius: 14px;
      background: linear-gradient(135deg, #fafafa, #f1f1f1);
      box-shadow: 0 3px 6px rgba(0,0,0,0.08);
      transition: transform .2s ease;
    }
    .summary-card:hover {
      transform: translateY(-4px);
    }
    .summary-card mat-icon {
      font-size: 40px;
    }
    .summary-card .info h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
    }
    .summary-card .info p {
      margin: 0;
      font-size: 14px;
      opacity: .8;
    }
    .chart-card {
      padding: 16px;
      border-radius: 14px;
      box-shadow: 0 3px 6px rgba(0,0,0,0.08);
    }
    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
    }
  `]
})
export class DashboardAdminComponent implements OnInit {
  private cursoSrv = inject(CursoService);
  private estSrv = inject(EstudianteService);
  private authSrv = inject(AuthService);
  private caliSrv = inject(CalificacionService);
  private asisSrv = inject(AsistenciaService);

  resumen = signal<{ icon: string, iconClass: string, valor: number | string, label: string }[]>([]);

  ngOnInit(): void {
    this.cargarDatos();
  }

  async cargarDatos() {
    try {
      const [cursosRes, estRes] = await Promise.all([
        this.cursoSrv.listar().toPromise(),
        this.estSrv.getAll().toPromise()
      ]);

      const cursos = cursosRes?.data ?? cursosRes ?? [];
      const estudiantes = estRes ?? [];
      const totalProfes = new Set<string>();

      cursos.forEach((c: any) => {
        (c.materias ?? []).forEach((m: any) => totalProfes.add(m.profesor));
      });

      this.resumen.set([
        { icon: 'school', iconClass: 'text-blue', valor: cursos.length, label: 'Cursos' },
        { icon: 'groups', iconClass: 'text-green', valor: estudiantes.length, label: 'Estudiantes' },
        { icon: 'person', iconClass: 'text-purple', valor: totalProfes.size, label: 'Profesores' },
      ]);

      // Render charts
      this.renderChartCursos(cursos);
      this.renderChartPromedios(cursos);

    } catch (e) {
      console.error('Error cargando dashboard', e);
    }
  }

  private renderChartCursos(cursos: any[]) {
    const ctx = document.getElementById('chartCursos') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = cursos.map(c => c.nombre);
    const data = cursos.map(c => (c.estudiantes?.length ?? 0));

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Estudiantes por curso',
            data,
            backgroundColor: '#42A5F5',
          }
        ]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }

  private renderChartPromedios(cursos: any[]) {
    const ctx = document.getElementById('chartPromedios') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = cursos.map(c => c.nombre);
    const data = cursos.map(() => Number((Math.random() * 5 + 5).toFixed(2))); // Placeholder (0–10)

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Promedio General',
            data,
            borderColor: '#7E57C2',
            fill: false,
            tension: 0.3,
          }
        ]
      },
      options: { responsive: true, scales: { y: { min: 0, max: 10 } } }
    });
  }
}
