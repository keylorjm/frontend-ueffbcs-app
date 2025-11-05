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
  // 1️⃣ Ruta principal → Login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // 2️⃣ Autenticación pública
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

  // 3️⃣ Rutas protegidas
  {
    path: 'app',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      // 🔹 Redirección según rol
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard-admin',
      },

      // ============================
      // ADMINISTRADOR
      // ============================
      {
        path: 'dashboard-admin',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/dashboard-admin/dashboard-admin').then(
            (m) => m.DashboardAdminComponent
          ),
        title: 'Panel de Administración',
      },
      {
        path: 'anio-lectivo',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/anio-lectivo-admin/anio-lectivo-admin').then(
            (m) => m.AnioLectivoAdminComponent
          ),
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
          import('./components/estudiantes/estudiantes').then(
            (m) => m.EstudiantesComponent
          ),
        title: 'Gestión de Estudiantes',
      },
      {
        path: 'calificaciones',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/calificaciones/calificaciones').then(
            (m) => m.Calificaciones
          ),
        title: 'Ingreso de Calificaciones',
      },
      {
        path: 'cursos',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/cursos/cursos').then((m) => m.CursosComponent),
        title: 'Gestión de Cursos',
      },
      {
        path: 'materias',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/materias/materias').then(
            (m) => m.MateriasComponent
          ),
        title: 'Gestión de Materias',
      },
      {
        path: 'boletin',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./components/reporte-curso/reporte-curso').then(
            (m) => m.ReporteCursoComponent
          ),
        title: 'Reportes Académicos',
      },

      // ============================
      // PROFESOR
      // ============================
      {
        path: 'mis-cursos',
        canActivate: [ProfesorGuard],
        loadComponent: () =>
          import('./components/profesor-dashboard/profesor-dashboard').then(
            (m) => m.ProfesorDashboardComponent
          ),
        title: 'Mis Cursos',
      },
      {
        path: 'profesor-notas',
        canActivate: [ProfesorGuard],
        loadComponent: () =>
          import('./components/profesor-notas-curso/profesor-notas-curso').then(
            (m) => m.ProfesorNotasCursoComponent
          ),
        title: 'Registro de Notas',
      },
      {
        path: 'resumen',
        canActivate: [ProfesorGuard],
        loadComponent: () =>
          import('./components/profesor-notas-resumen/profesor-notas-resumen').then(
            (m) => m.ProfesorNotasResumenComponent
          ),
        title: 'Reportes del Profesor',
      },
      {
        path: 'agregar-asistencia',
        canActivate: [ProfesorGuard],
        loadComponent: () =>
          import('./components/profesor-asistencias/profesor-asistencias').then(
            (m) => m.ProfesorAsistenciasCursoComponent
          ),
        title: 'Asistencia por Trimestre',
      },
      {
        path: 'ver-asistencia',
        canActivate: [ProfesorGuard],
        loadComponent: () =>
          import('./components/profesor-asistencias-resumen/profesor-asistencias-resumen').then(
            (m) => m.ProfesorAsistenciasResumenComponent
          ),
        title: 'Resumen de Asistencia',
      },
      {
        path: 'reporte',
        canActivate: [ProfesorGuard],
        loadComponent: () =>
          import('./components/reporte-estudiante/reporte-estudiante').then(
            (m) => m.ReporteEstudianteComponent
          ),
        title: 'Reporte por Estudiante',
      },

      // 🔸 Catch-all interno
      { path: '**', redirectTo: 'dashboard' },
    ],
  },

  // 4️⃣ Ruta comodín
  { path: '**', redirectTo: 'login' },
];
