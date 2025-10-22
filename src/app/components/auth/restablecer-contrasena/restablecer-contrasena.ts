import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject, combineLatest } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-restablecer-contrasena',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  template: `
    <div class="auth-wrapper">
      <mat-card class="auth-card">
        <div class="auth-header">          
          <h2>Restablecer contraseña</h2>
          <p class="subtitle">Crea una nueva contraseña para tu cuenta.</p>
        </div>

        <form #f="ngForm" (ngSubmit)="cambiarClave(f)" novalidate>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nueva contraseña</mat-label>
            <input
              matInput
              [type]="mostrar1 ? 'text' : 'password'"
              name="clave"
              required
              minlength="8"
              [(ngModel)]="clave"
              (ngModelChange)="onClaveChange()"
              placeholder="Mínimo 8 caracteres"
              autocomplete="new-password"
            />
            <button mat-icon-button matSuffix type="button" (click)="mostrar1 = !mostrar1">
              <mat-icon>{{ mostrar1 ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <div class="strength">
            <span>Fortaleza: {{ strengthLabel }}</span>
            <div class="strength-bar">
              <div *ngFor="let n of [1,2,3,4]" [class.active]="strength >= n" [class]="colorClass"></div>
            </div>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Confirmar contraseña</mat-label>
            <input
              matInput
              [type]="mostrar2 ? 'text' : 'password'"
              name="confirmar"
              required
              minlength="8"
              [(ngModel)]="confirmar"
              placeholder="Repite la contraseña"
              autocomplete="new-password"
            />
            <button mat-icon-button matSuffix type="button" (click)="mostrar2 = !mostrar2">
              <mat-icon>{{ mostrar2 ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          <button
            mat-flat-button
            color="primary"
            class="submit-btn"
            [disabled]="loading || f.invalid || clave !== confirmar"
          >
            <mat-icon *ngIf="!loading">lock</mat-icon>
            <mat-progress-spinner
              *ngIf="loading"
              mode="indeterminate"
              diameter="18"
              strokeWidth="3"
            ></mat-progress-spinner>
            {{ loading ? 'Guardando...' : 'Cambiar contraseña' }}
          </button>
        </form>

        <a mat-button routerLink="/login" class="back-link">
          <mat-icon>arrow_back</mat-icon> Volver a iniciar sesión
        </a>
      </mat-card>
    </div>
  `,
  styleUrls: ['./restablecer-contrasena.scss']
})
export class RestablecerContrasenaComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  clave = '';
  confirmar = '';
  mostrar1 = false;
  mostrar2 = false;
  loading = false;

  strength = 0;

  get strengthLabel(): string {
    return ['Muy débil', 'Débil', 'Aceptable', 'Fuerte'][Math.max(0, this.strength - 1)] ?? '';
  }

  get colorClass() {
    return ['danger', 'warn', 'info', 'success'][Math.max(0, this.strength - 1)] ?? 'danger';
  }

  private _token = '';
  get token() { return this._token; }

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([pm, qm]) => {
        const token = pm.get('token') || qm.get('token') || '';
        this._token = decodeURIComponent(token);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onClaveChange() {
    const v = this.clave || '';
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    this.strength = s;
  }

  cambiarClave(f: NgForm) {
    if (!this._token || f.invalid || this.clave !== this.confirmar) return;
    this.loading = true;
    this.auth.restablecerContrasena(this._token, this.clave)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.snackBar.open('¡Tu contraseña ha sido actualizada!', 'Cerrar', { duration: 5000 });
          this.router.navigate(['/login']);
        },
        error: (err: HttpErrorResponse) => {
          const msg = err?.error?.message || 'Error al restablecer la contraseña.';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }
}
