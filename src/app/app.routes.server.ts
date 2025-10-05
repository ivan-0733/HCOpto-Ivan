import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // ========================================
  // RUTAS DINÁMICAS - ALUMNO (SSR)
  // ========================================
  {
    path: 'alumno/historias/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'alumno/historias/:id/editar',
    renderMode: RenderMode.Server
  },
  
  // ========================================
  // RUTAS DINÁMICAS - PROFESOR (SSR)
  // ========================================
  {
    path: 'profesor/historias/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'profesor/historias/:id/editar',
    renderMode: RenderMode.Server
  },
  {
    path: 'profesor/comentarios/:id',
    renderMode: RenderMode.Server
  },
  
  // ========================================
  // RUTAS DINÁMICAS - ADMIN (SSR)
  // ========================================
  {
    path: 'admin/historias/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'admin/historias/:id/editar',
    renderMode: RenderMode.Server
  },
  {
    path: 'admin/historias/:id/comentarios',
    renderMode: RenderMode.Server
  },
  
  // ========================================
  // RUTAS ESTÁTICAS - PRERENDER
  // ========================================
  {
    path: 'login',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'alumno/dashboard',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'alumno/profesores',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'alumno/perfil',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'alumno/historias/nueva',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'profesor/dashboard',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'profesor/historias',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'profesor/alumnos',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'profesor/perfil',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'admin/dashboard',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'admin/perfil',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'admin/alumnos',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'admin/profesores',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'admin/materias',
    renderMode: RenderMode.Prerender
  },
  
  // ========================================
  // FALLBACK - Todas las demás rutas (CSR)
  // ========================================
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];