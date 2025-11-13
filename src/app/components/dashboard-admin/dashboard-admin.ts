// src/app/components/dashboard-admin/dashboard-admin.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule
  ],
  template: `
  <div class="wrap">
    <div class="header">
      <div class="eyebrow"><mat-icon>dashboard</mat-icon> Panel de Administración</div>
      <h1>Bienvenido, Administrador</h1>
      <p class="subtitle">Accesos rápidos para la gestión académica</p>
    </div>

    <div class="grid">
      <!-- Promociones -->
      <mat-card class="tile">
        <div class="tile-head">
          <mat-icon>upgrade</mat-icon>
          <h3>Promociones (Admin)</h3>
        </div>
        <p>Promover estudiantes aprobados al nuevo año lectivo (individual o masivo).</p>
        <div class="actions">
          <a mat-flat-button color="primary" routerLink="/app/admin-promociones">
            <mat-icon>arrow_forward</mat-icon> Abrir
          </a>
        </div>
      </mat-card>

      <!-- Años lectivos -->
      <mat-card class="tile">
        <div class="tile-head">
          <mat-icon>calendar_today</mat-icon>
          <h3>Años lectivos</h3>
        </div>
        <p>Crear/editar años, establecer <em>orden</em> y marcar el año <em>actual</em>.</p>
        <div class="actions">
          <a mat-stroked-button routerLink="/app/anio-lectivo">
            <mat-icon>arrow_forward</mat-icon> Gestionar
          </a>
        </div>
      </mat-card>

      <!-- Cursos -->
      <mat-card class="tile">
        <div class="tile-head">
          <mat-icon>class</mat-icon>
          <h3>Cursos</h3>
        </div>
        <p>Configura el <em>orden</em> y el <em>curso destino (nextCursoId)</em> del año siguiente.</p>
        <div class="actions">
          <a mat-stroked-button routerLink="/app/cursos">
            <mat-icon>arrow_forward</mat-icon> Gestionar
          </a>
        </div>
      </mat-card>

      <!-- (Opcional) Calificaciones -->
      <mat-card class="tile">
        <div class="tile-head">
          <mat-icon>grading</mat-icon>
          <h3>Calificaciones</h3>
        </div>
        <p>Consulta y edita notas trimestrales por curso/materia.</p>
        <div class="actions">
          <a mat-button routerLink="/app/calificaciones">
            <mat-icon>arrow_forward</mat-icon> Abrir
          </a>
        </div>
      </mat-card>

      <!-- (Opcional) Asistencias -->
      <mat-card class="tile">
        <div class="tile-head">
          <mat-icon>fact_check</mat-icon>
          <h3>Asistencias</h3>
        </div>
        <p>Gestiona días laborables y faltas por trimestre.</p>
        <div class="actions">
          <a mat-button routerLink="/app/agregar-asistencia">
            <mat-icon>arrow_forward</mat-icon> Abrir
          </a>
        </div>
      </mat-card>
    </div>
  </div>
  `,
  styles: [`
    .wrap { padding: 12px; }
    .eyebrow { display:flex; align-items:center; gap:6px; color:#666; font-size:12px; text-transform:uppercase; }
    .header h1 { margin: 6px 0 0; font-size: 24px; }
    .subtitle { color:#666; margin: 4px 0 14px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
    }
    .tile { padding: 12px; display:flex; flex-direction: column; gap: 10px; }
    .tile-head { display:flex; align-items:center; gap: 8px; }
    .tile h3 { margin: 0; font-size: 18px; }
    .actions { display:flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
  `]
})
export class DashboardAdminComponent {}
