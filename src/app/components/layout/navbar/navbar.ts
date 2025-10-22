// src/app/components/layout/navbar/navbar.component.ts
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <mat-toolbar color="primary" class="mat-elevation-z4">
      <button mat-icon-button (click)="toggleSidebar.emit()" matTooltip="Mostrar/Ocultar Menú">
        <mat-icon>menu</mat-icon>
      </button>
      <span>Sistema de Gestión Escolar</span>
      
      <span class="spacer"></span>
      
      <button mat-button color="accent" (click)="logout()" matTooltip="Cerrar Sesión">
        <mat-icon>exit_to_app</mat-icon>
        Cerrar Sesión
      </button>
    </mat-toolbar>
  `,
  styles: [`
    .spacer { flex: 1 1 auto; }
  `]
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  private authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}