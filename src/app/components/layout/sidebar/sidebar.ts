// src/app/components/layout/sidebar/sidebar.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';
import { Observable, map } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    FormsModule,
  ],
  template: `
   <mat-nav-list *ngIf="role$ | async as role">
  <!-- 🔹 PROFESOR -->
  <ng-container *ngIf="role === 'profesor'; else adminMenu">
    <a mat-list-item routerLink="/app/mis-cursos" routerLinkActive="active-link">
      <mat-icon matListItemIcon>menu_book</mat-icon>
      <span matListItemTitle>Mis Cursos</span>
    </a>

    <a mat-list-item routerLink="/app/resumen" routerLinkActive="active-link">
      <mat-icon matListItemIcon>visibility</mat-icon>
      <span matListItemTitle>Ver Notas</span>
    </a>

    <a mat-list-item routerLink="/app/profesor-notas" routerLinkActive="active-link">
      <mat-icon matListItemIcon>edit_note</mat-icon>
      <span matListItemTitle>Asignar Notas</span>
    </a>

    <a mat-list-item routerLink="/app/ver-asistencia" routerLinkActive="active-link">
      <mat-icon matListItemIcon>fact_check</mat-icon>
      <span matListItemTitle>Ver Asistencias</span>
    </a>

    <a mat-list-item routerLink="/app/agregar-asistencia" routerLinkActive="active-link">
      <mat-icon matListItemIcon>playlist_add_check</mat-icon>
      <span matListItemTitle>Agregar Asistencias</span>
    </a>
  </ng-container>

  <!-- 🔹 ADMIN -->
  <ng-template #adminMenu>
    <a mat-list-item routerLink="/app/dashboard-admin" routerLinkActive="active-link">
      <mat-icon matListItemIcon>insights</mat-icon>
      <span matListItemTitle>Dashboard</span>
    </a>

    <a mat-list-item routerLink="/app/admin-notas" routerLinkActive="active-link">
      <mat-icon matListItemIcon>grading</mat-icon>
      <span matListItemTitle>Calificaciones</span>
    </a>

    <a mat-list-item routerLink="/app/admin-asistencias" routerLinkActive="active-link">
      <mat-icon matListItemIcon>task_alt</mat-icon>
      <span matListItemTitle>Asistencias</span>
    </a>

    <a mat-list-item routerLink="/app/admin-matriculas" routerLinkActive="active-link">
      <mat-icon matListItemIcon>how_to_reg</mat-icon>
      <span matListItemTitle>Matriculas</span>
    </a>

    <a mat-list-item routerLink="/app/admin-promociones" routerLinkActive="active-link">
      <mat-icon matListItemIcon>trending_up</mat-icon>
      <span matListItemTitle>Promociones</span>
    </a>

    <a mat-list-item routerLink="/app/anio-lectivo" routerLinkActive="active-link">
      <mat-icon matListItemIcon>event</mat-icon>
      <span matListItemTitle>Año Lectivo</span>
    </a>

    <a mat-list-item routerLink="/app/estudiantes" routerLinkActive="active-link">
      <mat-icon matListItemIcon>school</mat-icon>
      <span matListItemTitle>Estudiantes</span>
    </a>

    <a mat-list-item routerLink="/app/usuarios" routerLinkActive="active-link">
      <mat-icon matListItemIcon>manage_accounts</mat-icon>
      <span matListItemTitle>Usuarios</span>
    </a>

    <a mat-list-item routerLink="/app/cursos" routerLinkActive="active-link">
      <mat-icon matListItemIcon>library_books</mat-icon>
      <span matListItemTitle>Cursos</span>
    </a>

    <a mat-list-item routerLink="/app/materias" routerLinkActive="active-link">
      <mat-icon matListItemIcon>import_contacts</mat-icon>
      <span matListItemTitle>Materias</span>
    </a>

    <a mat-list-item routerLink="/app/boletin" routerLinkActive="active-link">
      <mat-icon matListItemIcon>description</mat-icon>
      <span matListItemTitle>Boletines</span>
    </a>
  </ng-template>
</mat-nav-list>

  `,
  styles: [
    `
      .mat-nav-list {
        padding-top: 0;
      }
      .active-link {
        background-color: rgba(0, 0, 0, 0.08);
      }
      mat-icon {
        margin-right: 16px;
      }
    `,
  ],
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);

  // Observable que emite el rol actual ('admin' o 'profesor')
  role$!: Observable<string>;

  ngOnInit(): void {
    this.role$ = this.authService.user$.pipe(map((user) => (user?.rol ?? '').toLowerCase()));
  }
}
