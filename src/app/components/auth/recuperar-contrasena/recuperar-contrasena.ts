import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-recuperar-contrasena',
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
          <h2>Recuperar contraseña</h2>
          <p class="subtitle">
            Ingresa tu correo electrónico para recibir un enlace de recuperación.
          </p>
        </div>

        <form #f="ngForm" (ngSubmit)="enviarInstrucciones(f)" novalidate>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Correo electrónico</mat-label>
            <input
              matInput
              type="email"
              name="correo"
              required
              email
              [(ngModel)]="correo"
              placeholder="ejemplo@dominio.com"
            />
            <mat-icon matSuffix>alternate_email</mat-icon>
            <mat-error *ngIf="f.controls['correo']?.hasError('required')">
              El correo es obligatorio.
            </mat-error>
            <mat-error *ngIf="f.controls['correo']?.hasError('email')">
              Formato de correo inválido.
            </mat-error>
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            class="submit-btn"
            [disabled]="loading || f.invalid"
            type="submit"
          >
            <ng-container *ngIf="!loading; else loadingTpl">
              <mat-icon>send</mat-icon> Enviar enlace
            </ng-container>
            <ng-template #loadingTpl>
              <mat-progress-spinner diameter="18" mode="indeterminate"></mat-progress-spinner>
              Enviando...
            </ng-template>
          </button>
        </form>

        <div class="auth-footer">
          <a mat-button routerLink="/login">
            <mat-icon>arrow_back</mat-icon> Volver a iniciar sesión
          </a>
        </div>
      </mat-card>
    </div>
  `,
  styleUrls: ['./recuperar-contrasena.scss']
})
export class RecuperarContrasenaComponent {
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  correo = '';
  loading = false;

  enviarInstrucciones(f: NgForm) {
    if (f.invalid) return;
    this.loading = true;

    this.auth.recuperarContrasena(this.correo.trim())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.snackBar.open(
            'Si el correo existe, te enviaremos instrucciones para recuperar tu contraseña.',
            'Cerrar', { duration: 6000 }
          );
        },
        error: (_err: HttpErrorResponse) => {
          this.snackBar.open(
            'Si el correo existe, te enviaremos instrucciones para recuperar tu contraseña.',
            'Cerrar', { duration: 6000 }
          );
        }
      });
  }
}
