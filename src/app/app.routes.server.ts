import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Rutas dinámicas con parámetros - usar Server-Side Rendering
  {
    path: 'alumno/historias/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'profesor/historias/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'profesor/comentarios/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'admin/historias/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'admin/historias/:id/comentarios',
    renderMode: RenderMode.Server
  },
  // Todas las demás rutas - usar Prerendering
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];