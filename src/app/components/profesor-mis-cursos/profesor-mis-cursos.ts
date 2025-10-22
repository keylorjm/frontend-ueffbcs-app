// src/app/components/profesor-mis-cursos/profesor-mis-cursos.ts
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, of, switchMap } from 'rxjs';

// Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

// Servicios
import { CursoService, Curso } from '../../services/curso.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profesor-mis-cursos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="p-6 min-h-screen bg-gray-50">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-2xl font-semibold">Mis Cursos</h2>
          <p class="text-gray-600">Cursos que el administrador te ha asignado.</p>
        </div>
        <button mat-stroked-button color="primary" (click)="recargar()">
          <mat-icon>refresh</mat-icon>
          Recargar
        </button>
      </div>

      <div class="flex items-center gap-2 mb-4" *ngIf="isLoading$$ | async">
        <mat-progress-spinner diameter="22" mode="indeterminate"></mat-progress-spinner>
        <span class="text-gray-600">Cargando cursos…</span>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <mat-card *ngFor="let c of data" class="rounded-xl border border-gray-200 shadow-sm">
          <mat-card-header>
            <mat-card-title class="text-lg font-semibold">{{ c.nombre }}</mat-card-title>
            <mat-card-subtitle>
              {{ c.materias.length || 0 }} materias ·
              {{ c.estudiantes.length || 0 }} estudiantes
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-actions align="end">
            <a
              mat-stroked-button
              color="primary"
              [routerLink]="['/app/curso-detalle', c._id]"
              matTooltip="Ver detalle"
            >
              <mat-icon>visibility</mat-icon>
              Detalle
            </a>
          </mat-card-actions>
        </mat-card>
      </div>

      <div *ngIf="!isLoading$$.value && data.length === 0" class="mt-8 text-center text-gray-500">
        No tienes cursos asignados.
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfesorMisCursos {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private cursoService = inject(CursoService);
  private auth = inject(AuthService);

  isLoading$$ = new BehaviorSubject<boolean>(false);
  data: Curso[] = [];

  constructor() {
    this.cargar();
  }

  recargar() {
    this.cargar(true);
  }

  private cargar(force = false) {
    if (!force && this.isLoading$$.value) return;
    this.isLoading$$.next(true);

    // Aseguramos que haya usuario cargado (por si se refresca la página)
    this.auth
      .ensureUserLoaded()
      .pipe(
        switchMap((ok) => {
          if (!ok || !this.auth.user?.id) {
            console.error('No hay usuario/ID de profesor cargado.');
            return of<Curso[]>([]);
          }
          // Llama al método con fallback interno
          return this.cursoService.getMisCursos();
        })
      )
      .subscribe({
        next: (rows) => {
          this.data = (rows ?? [])
            .map((r) => ({
              _id: r?._id ?? r?.uid,
              nombre: r?.nombre ?? '—',
              materias: r?.materias ?? [],
              estudiantes: r?.estudiantes ?? [],
              profesorTutor: r?.profesorTutor,
            }))
            .filter((c) => !!c._id);
        },
        error: (e) => {
          console.error('Error cargando mis cursos', e);
          this.data = [];
        },
        complete: () => {
          this.isLoading$$.next(false);
          this.cdr.markForCheck();
        },
      });
  }
}
