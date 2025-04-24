import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar si el usuario está autenticado
  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
    return false;
  }

  // Verificar si la ruta requiere un rol específico
  const requiredRole = route.data?.['role'] as string;

  if (requiredRole && !authService.hasRole(requiredRole)) {
    // Redirigir a la página según el rol actual
    const currentUser = authService.currentUserValue;

    if (currentUser) {
      switch (currentUser.rol) {
        case 'alumno':
          router.navigate(['/alumno/dashboard']);
          break;
        case 'profesor':
          router.navigate(['/profesor/dashboard']);
          break;
        case 'admin':
          router.navigate(['/admin/dashboard']);
          break;
        default:
          router.navigate(['/login']);
      }
    } else {
      router.navigate(['/login']);
    }

    return false;
  }

  return true;
};