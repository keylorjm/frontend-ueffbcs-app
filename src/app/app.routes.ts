// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login';
import { RecuperarContrasenaComponent } from './components/auth/recuperar-contrasena/recuperar-contrasena';
import { MainLayoutComponent } from './components/layout/main-layout/main-layout';
import { AuthGuard } from './guards/auth.guard';
import { Usuarios } from './components/usuarios/usuarios';
import { ProfesorGuard } from './guards/profesor.guard';
import { AdminGuard } from './guards/admin.guard';
import { RestablecerContrasenaComponent } from './components/auth/restablecer-contrasena/restablecer-contrasena';

export const routes: Routes = [
  // 1. Ruta de Inicio (Al cargar la app, redirige al login)
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // 2. Rutas de Autenticación (Públicas)
  { path: 'login', component: LoginComponent, title: 'Iniciar Sesión' },
  {
    path: 'recuperar-contrasena',
    component: RecuperarContrasenaComponent,
    title: 'Recuperar Clave',
  },
  {
    path: 'restablecer-contrasena/:token',
    component: RestablecerContrasenaComponent,
    title: 'Restablecer Clave',
  },

  // 3. Rutas Protegidas (Requieren Login)
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'mis-cursos', pathMatch: 'full' },

      {
        path: 'anio-lectivo',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/anio-lectivo-admin/anio-lectivo-admin').then(
            (m) => m.AnioLectivoAdminComponent
          ),
      },
      {
        path: 'mis-cursos',
        canActivate: [ProfesorGuard],
        loadComponent: () =>
          import('./components/profesor-mis-cursos/profesor-mis-cursos').then(
            (m) => m.ProfesorMisCursos
          ),
        title: 'Mis Cursos',
      },
      {
        path: 'profesor',
        canActivate: [AuthGuard, ProfesorGuard],
        children: [
          {
            path: 'curso/:id/notas',
            loadComponent: () =>
              import('./components/profesor-notas-curso/profesor-notas-curso').then(
                (m) => m.ProfesorNotasCursoComponent
              ),
          },
          {
            path: 'curso/:id/ingreso',
            loadComponent: () =>
              import('./components/ingreso-notas/ingreso-notas').then(
                (m) => m.IngresoNotasComponent
              ),
          },
        ],
      },

      {
        path: 'usuarios',
        canActivate: [AdminGuard],
        component: Usuarios,
        title: 'Gestión de Usuarios',
      },
      {
        path: 'estudiantes',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/estudiantes/estudiantes').then((m) => m.EstudiantesComponent),
        title: 'Gestión de Estudiantes',
      },
      {
        path: 'calificaciones',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/calificaciones/calificaciones').then((m) => m.Calificaciones),
        title: 'Ingreso de Calificaciones',
      },
      {
        path: 'cursos',
        canActivate: [AdminGuard],
        loadComponent: () => import('./components/cursos/cursos').then((m) => m.CursosComponent),
        title: 'Gestión de Cursos',
      },
      {
        path: 'materias',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/materias/materias').then((m) => m.MateriasComponent),
        title: 'Gestión de Materias',
      },

      {
        path: 'boletin',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/admin-boletin/admin-boletin').then((m) => m.AdminBoletinComponent),
      },

      {
        path: 'profesor-notas',
        loadComponent: () =>
          import('./components/profesor-notas-curso/profesor-notas-curso').then(
            (m) => m.ProfesorNotasCursoComponent
          ),
        title: 'Detalle del Curso',
      },

      {
        path: 'curso-detalle/:id',
        loadComponent: () =>
          import('./components/curso-detalle-component/curso-detalle-component').then(
            (m) => m.CursoDetalleComponent
          ),
        title: 'Detalle del Curso',
      },

      { path: '**', redirectTo: 'mis-cursos' },
    ],
  },

  // 4. Ruta comodín (404)
  { path: '**', redirectTo: 'login' },
];
