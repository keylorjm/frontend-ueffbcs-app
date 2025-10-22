import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profesor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <header class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Dashboard Profesor</h1>
          <p class="text-gray-600">Bienvenido, {{ auth.user?.nombre || auth.user?.email }}</p>
        </div>
        <button mat-stroked-button color="primary" [routerLink]="['/profesor/mis-cursos']">
          <mat-icon>school</mat-icon>
          Mis cursos
        </button>
      </header>

      <section class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 class="text-xl font-semibold mb-2">Accesos rápidos</h2>
        <div class="flex gap-3">
          <button mat-flat-button color="primary" [routerLink]="['/profesor/mis-cursos']">
            <mat-icon>menu_book</mat-icon>
            Ver mis cursos
          </button>
        </div>
      </section>
    </div>
  `
})
export class ProfesorDashboardComponent {
  auth = inject(AuthService);
}
