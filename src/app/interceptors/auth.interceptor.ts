import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si la solicitud es para login, no se agrega el token
  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  // Agregar token a las demás solicitudes
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Si hay error 401 (No autorizado)
        authService.logout();
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url }
        });
      }
      return throwError(() => error);
    })
  );
};