import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    title: 'HCOpto - Iniciar Sesión'
  },
  {
    path: 'alumno',
    canActivate: [authGuard],
    data: { role: 'alumno' },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./components/alumno-dashboard/alumno-dashboard.component').then(m => m.AlumnoDashboardComponent),
        title: 'HCOpto - Dashboard'
      },
      {
        path: 'profesores',
        loadComponent: () => import('./components/alumno-profesores/alumno-profesores.component').then(m => m.AlumnoProfesoresComponent),
        title: 'HCOpto - Mis Profesores'
      },
      {
        path: 'perfil',
        loadComponent: () => import('./components/alumno-perfil/alumno-perfil.component').then(m => m.AlumnoPerfilComponent),
        title: 'HCOpto - Mi Perfil'
      },
      // Historia Clínica - Usar el contenedor para nueva y edición
      {
        path: 'historias/nueva',
        loadComponent: () => import('./components/historia-clinica-container/historia-clinica-container.component').then(m => m.HistoriaClinicaContainerComponent),
        title: 'HCOpto - Nueva Historia Clínica'
      },
      {
        path: 'historias/:id',
        loadComponent: () => import('./components/historia-clinica-detalle/historia-clinica-detalle.component').then(m => m.HistoriaClinicaDetalleComponent),
        title: 'HCOpto - Ver Historia Clínica'
      },
      {
        path: 'historias/:id/editar',
        loadComponent: () => import('./components/historia-clinica-container/historia-clinica-container.component').then(m => m.HistoriaClinicaContainerComponent),
        title: 'HCOpto - Editar Historia Clínica'
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  // Rutas para profesor (por implementar)
  {
    path: 'profesor',
    canActivate: [authGuard],
    data: { role: 'profesor' },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./components/alumno-dashboard/alumno-dashboard.component').then(m => m.AlumnoDashboardComponent),
        title: 'HCOpto - Dashboard Profesor'
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  // Rutas para administrador (por implementar)
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { role: 'admin' },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./components/alumno-dashboard/alumno-dashboard.component').then(m => m.AlumnoDashboardComponent),
        title: 'HCOpto - Panel de Administración'
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  // Ruta por defecto
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  // Ruta para manejar rutas no encontradas
  {
    path: '**',
    redirectTo: '/login'
  }
];