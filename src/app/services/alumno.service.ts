import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Perfil {
  ID: number;
  UsuarioID: number;
  AlumnoInfoID: number;
  NumeroBoleta: string;
  PeriodoEscolarActualID?: number;  // Changed from SemestreActual
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  NombreUsuario: string;
  CorreoElectronico: string;
  TelefonoCelular?: string;
  EstaActivo: boolean;
  FechaCreacion?: string;
  FechaUltimoAcceso?: string;
}

// Update the existing PeriodoEscolar interface from your file (if it exists already) or add it
export interface PeriodoEscolar {
  ID: number;
  Codigo: string;
  FechaInicio: string;
  FechaFin: string;
  EsActual: boolean;
  FechaInicioSiguiente?: string;
}

export interface MateriaAlumno {
  ID: number;
  AlumnoInfoID: number;
  MateriaProfesorID: number;
  PeriodoEscolarID: number;
  FechaInscripcion: string;
  NombreMateria: string;
  NombreProfesor: string;
  Codigo?: string;
  Semestre?: number;
  EjeFormativo?: string;
  Descripcion?: string;
  PeriodoEscolar?: string;
  Grupo?: string;
  EsPeriodoActual?: boolean; // Agregar esta propiedad
}

// Corregir la interfaz Profesor en alumno.service.ts
export interface Profesor {
  ProfesorID: number;       // Cambiado de ProfesorInfoID a ProfesorID para coincidir con el backend
  MateriaProfesorID: number; // Nuevo campo para la relación
  NumeroEmpleado: string;
  NombreUsuario: string;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string | null;
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
  ApellidoMaterno?: string;
  GeneroID?: number;
  Edad?: number;
  EstadoCivilID?: number;  // ✅ OPCIONAL
  EscolaridadID?: number;  // ✅ OPCIONAL
  Ocupacion?: string;
  DireccionLinea1?: string;
  CURP: string;  // ✅ NUEVO - OBLIGATORIO (antes era DireccionLinea2)
  Ciudad?: string;
  EstadoID?: number;
  CodigoPostal?: string;
  Pais?: string;
  CorreoElectronico?: string;  // ✅ OPCIONAL (ya no es UNIQUE)
  TelefonoCelular?: string;  // ✅ OPCIONAL (ya no es UNIQUE)
  Telefono?: string;
  IDSiSeCO?: string;  // ✅ NUEVO - OPCIONAL
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

  // Cambiar obtenerSemestreActual por obtenerPeriodoEscolarActual
  obtenerPeriodoEscolarActual(): Observable<PeriodoEscolar> {
    return this.http.get<ApiResponse<PeriodoEscolar>>(`${this.apiUrl}/periodo-actual`)
      .pipe(
        map(response => response.data)
      );
  }

  // Añadir método para obtener materias
  obtenerMaterias(): Observable<MateriaAlumno[]> {
    return this.http.get<ApiResponse<MateriaAlumno[]>>(`${this.apiUrl}/materias`)
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

  // Añadir este método en alumno.service.ts
  obtenerTodasMaterias(): Observable<MateriaAlumno[]> {
    return this.http.get<ApiResponse<MateriaAlumno[]>>(`${this.apiUrl}/todas-materias`)
      .pipe(
        map(response => response.data)
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