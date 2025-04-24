import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Se produjo un error al procesar la solicitud';

      if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Error del lado del servidor
        if (error.status === 404) {
          errorMessage = 'El recurso solicitado no existe';
        } else if (error.status === 403) {
          errorMessage = 'No tienes permiso para acceder a este recurso';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Por favor, intenta nuevamente más tarde.';
        }

        // Mensaje del backend
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
      }

      console.error('Error interceptado:', error);
      return throwError(() => new Error(errorMessage));
    })
  );
};