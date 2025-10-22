// src/app/components/layout/main-layout/main-layout.component.ts
import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { NavbarComponent } from '../navbar/navbar';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatSidenavModule, 
    NavbarComponent, 
    SidebarComponent
  ],
  template: `
    <app-navbar (toggleSidebar)="toggleSidenav()"></app-navbar>
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav #sidenav mode="side" [opened]="true" class="sidebar">
        <app-sidebar></app-sidebar>
      </mat-sidenav>
      
      <mat-sidenav-content class="content-area">
        <div class="page-content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .sidenav-container {
      height: calc(100vh - 64px); /* Altura total - altura del toolbar */
    }
    .sidebar {
      width: 250px;
    }
    .content-area {
      padding: 20px;
      background-color: #f4f4f4; 
    }
    .page-content {
      padding: 10px;
    }
  `]
})
export class MainLayoutComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  toggleSidenav() {
    this.sidenav.toggle();
  }
}