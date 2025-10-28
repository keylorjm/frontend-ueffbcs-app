import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../services/auth.service';

function deferChange(fn: () => void) {
  if (typeof queueMicrotask === 'function') queueMicrotask(fn);
  else setTimeout(fn, 0);
}

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatButtonModule, MatIconModule, RouterLink,
    MatProgressSpinnerModule, MatSnackBarModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  credenciales = { correo: '', clave: '' };
  isLoading = false;

  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  iniciarSesion() {
    if (this.isLoading) return;

    const correo = (this.credenciales.correo || '').trim();
    const clave = this.credenciales.clave || '';
    if (!correo || !clave) {
      this.snackBar.open('Ingresa tu correo y contraseña.', 'Cerrar', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.authService.login({ correo, clave })
      .pipe(finalize(() => {
        deferChange(() => { this.isLoading = false; this.cdr.markForCheck(); });
      }))
      .subscribe({
        next: () => {
          deferChange(() => {
            const rawReturn = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
            const role = (this.authService.getrole() ?? '').toLowerCase();

            const adminOnly = ['/app/usuarios', '/app/cursos', '/app/materias', '/app/estudiantes', '/app/calificaciones'];
            const isAdminOnlyReturn = adminOnly.some(p => rawReturn.startsWith(p));

            if (role === 'profesor') {
              const destino = isAdminOnlyReturn ? '/app/mis-cursos' : (rawReturn || '/app/mis-cursos');
              this.router.navigateByUrl(destino);
            } else if (role === 'admin') {
              this.router.navigateByUrl(rawReturn || '/app/usuarios');
            } else {
              this.router.navigateByUrl('/app');
            }

            this.snackBar.open('¡Bienvenido! Sesión iniciada.', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
            this.cdr.markForCheck();
          });
        },
        error: (err: HttpErrorResponse) => {
          deferChange(() => {
            let mensajeError = 'Error de conexión con el servidor. Intente más tarde.';
            if (err.status === 0) {
              mensajeError = 'No se pudo contactar al servidor. Verifique que el backend esté activo.';
            } else if (err.status === 401 || err.status === 400) {
              mensajeError = err.error?.error || 'Correo o contraseña incorrectos. Por favor, verifique.';
            } else if (err.error?.message) {
              mensajeError = err.error.message;
            }
            this.snackBar.open(mensajeError, 'Cerrar', { duration: 6000, panelClass: ['error-snackbar'] });
            this.cdr.markForCheck();
          });
        }
      });
  }
}
