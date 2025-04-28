import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Perfil {
  AlumnoInfoID: number;
  NumeroBoleta: string;
  SemestreActual: number;
  UsuarioID: number;
  NombreUsuario: string;
  CorreoElectronico: string;
  EstaActivo: boolean;
  TelefonoCelular: string | null;
  FechaCreacion: string;
  FechaUltimoAcceso: string | null;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string | null;
}

export interface Profesor {
  ProfesorInfoID: number;
  NumeroEmpleado: string;
  NombreUsuario: string;          // Mantenido
  Nombre: string;                 // Nuevo
  ApellidoPaterno: string;        // Nuevo
  ApellidoMaterno: string | null; // Nuevo
  NombreMateria: string;
  CorreoElectronico: string;
  TelefonoCelular: string | null;
  FechaInicio: string;
}

export interface Semestre {
  ID: number;
  Nombre: string;
  FechaInicio: string;
  FechaFin: string;
}

export interface Consultorio {
  ID: number;
  Nombre: string;
  Descripcion: string | null;
}

export interface CatalogoItem {
  ID: number;
  Valor: string;
  Descripcion: string | null;
  Orden: number;
}

export interface Paciente {
  ID: number;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string | null;
  CorreoElectronico: string;
  TelefonoCelular: string;
  Edad: number;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlumnoService {
  private apiUrl = `${environment.apiUrl}/alumnos`;

  constructor(private http: HttpClient) { }

  // Obtener perfil del alumno
  obtenerPerfil(): Observable<Perfil> {
    return this.http.get<ApiResponse<Perfil>>(`${this.apiUrl}/perfil`)
      .pipe(
        map(response => response.data)
      );
  }

  // Actualizar perfil del alumno
  actualizarPerfil(datos: { nombreUsuario?: string; correoElectronico?: string; telefonoCelular?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/perfil`, datos);
  }

  // Obtener profesores asignados
  obtenerProfesoresAsignados(): Observable<Profesor[]> {
    return this.http.get<ApiResponse<Profesor[]>>(`${this.apiUrl}/profesores`)
      .pipe(
        map(response => response.data || [])
      );
  }

  // Obtener semestre actual
  obtenerSemestreActual(): Observable<Semestre> {
    return this.http.get<ApiResponse<Semestre>>(`${this.apiUrl}/semestre-actual`)
      .pipe(
        map(response => response.data)
      );
  }

  // Obtener consultorios disponibles
  obtenerConsultorios(): Observable<Consultorio[]> {
    return this.http.get<ApiResponse<Consultorio[]>>(`${this.apiUrl}/consultorios`)
      .pipe(
        map(response => response.data || [])
      );
  }

  // Obtener catálogos
  obtenerCatalogo(tipo: string): Observable<CatalogoItem[]> {
    return this.http.get<ApiResponse<CatalogoItem[]>>(`${this.apiUrl}/catalogos/${tipo}`)
      .pipe(
        map(response => response.data || [])
      );
  }

  // Buscar pacientes
  buscarPacientes(termino: string): Observable<Paciente[]> {
    return this.http.get<ApiResponse<Paciente[]>>(`${this.apiUrl}/pacientes/buscar`, {
      params: { termino }
    }).pipe(
      map(response => response.data || [])
    );
  }

  // Actualizar contraseña del alumno
  actualizarPassword(datos: { passwordActual: string, nuevaPassword: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/password`, datos);
  }

  // Método corregido para verificar contraseña
  verificarPasswordActual(passwordActual: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/verificar-password`, {
      passwordActual
    }).pipe(
      map(response => {
        // Asegurarse de que estamos interpretando correctamente la respuesta
        // La API devuelve { status: 'success', data: true/false }
        return response.data === true;
      }),
      catchError(error => {
        console.error('Error al verificar contraseña:', error);
        // Devolver falso en caso de error para indicar que la contraseña no es válida
        return of(false);
      })
    );
  }
}