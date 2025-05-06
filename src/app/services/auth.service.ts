import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

export interface AuthCredentials {
  boleta?: string;  // Para alumnos
  numeroEmpleado?: string;  // Para profesores
  correo: string;
  password: string;
}

export interface AuthResponse {
  status: string;
  token: string;
  data: any;
}

export interface Usuario {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  correo: string;
  boleta?: string;
  numeroEmpleado?: string;
  semestre?: number;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject: BehaviorSubject<Usuario | null>;
  public currentUser: Observable<Usuario | null>;
  private isBrowser: boolean;

  constructor(private http: HttpClient, private router: Router) {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    let storedUser = null;

    // Solo accede a localStorage si estamos en un navegador
    if (this.isBrowser) {
      storedUser = localStorage.getItem('currentUser');
    }

    this.currentUserSubject = new BehaviorSubject<Usuario | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): Usuario | null {
    return this.currentUserSubject.value;
  }

  login(credentials: AuthCredentials, role: string): Observable<AuthResponse> {
    if (!this.isBrowser) {
      // Si no estamos en un navegador, devolver un observable vacío
      return of({} as AuthResponse);
    }

    let url = '';

    switch (role) {
      case 'alumno':
        url = `${this.apiUrl}/auth/login/alumno`;
        break;
      case 'profesor':
        url = `${this.apiUrl}/auth/login/profesor`;
        break;
      case 'admin':
        url = `${this.apiUrl}/auth/login/admin`;
        break;
      default:
        return throwError(() => new Error('Rol no válido'));
    }

    return this.http.post<AuthResponse>(url, credentials).pipe(
      tap(response => {
        if (response.status === 'success' && response.token) {
          const user: Usuario = {
            ...response.data,
            rol: role
          };

          // Solo guardar en localStorage si estamos en un navegador
          if (this.isBrowser) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('currentUser', JSON.stringify(user));
          }

          this.currentUserSubject.next(user);
        }
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    // Solo accede a localStorage si estamos en un navegador
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }

    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    // En servidor siempre devolver false
    if (!this.isBrowser) {
      return false;
    }

    const token = localStorage.getItem('token');
    return !!token;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user !== null && user.rol === role;
  }

  getToken(): string | null {
    // En servidor siempre devolver null
    if (!this.isBrowser) {
      return null;
    }

    return localStorage.getItem('token');
  }

  // Nuevo método para actualizar los datos del usuario en memoria y localStorage
  updateUserData(userData: Partial<Usuario>): void {
    if (!this.isBrowser || !this.currentUserValue) {
      return;
    }

    const updatedUser = {
      ...this.currentUserValue,
      ...userData
    };

    // Actualizar en localStorage
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    // Actualizar el BehaviorSubject para notificar a todos los componentes suscritos
    this.currentUserSubject.next(updatedUser);
  }
}