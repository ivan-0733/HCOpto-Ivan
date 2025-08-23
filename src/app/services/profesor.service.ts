import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HistoriaClinica } from './historia-clinica.service';

export interface ProfesorPerfil {
  ID: number;
  UsuarioID: number;
  ProfesorInfoID: number;
  NumeroEmpleado: string;
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

export interface AlumnoAsignado {
  ID: number;
  AlumnoInfoID: number;
  MateriaProfesorID: number;
  NumeroBoleta: string;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  NombreMateria: string;
  Grupo: string;
  PeriodoEscolar: string;
  FechaInscripcion: string;
}

export interface MateriaProfesor {
  ID: number;
  MateriaProfesorID: number;
  NombreMateria: string;
  Codigo: string;
  Semestre: number;
  Grupo: string;
  PeriodoEscolar: string;
  CantidadAlumnos: number;
  EsPeriodoActual: boolean;
}

export interface EstadisticasHistorias {
  total: number;
  archivadas: number;
  porEstado: { estado: string; cantidad: number; }[];
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
  results?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProfesorService {
  private apiUrl = `${environment.apiUrl}/profesores`;

  constructor(private http: HttpClient) { }

  // Obtener perfil del profesor
  obtenerPerfil(): Observable<ProfesorPerfil> {
    return this.http.get<ApiResponse<ProfesorPerfil>>(`${this.apiUrl}/perfil`)
      .pipe(
        map(response => response.data)
      );
  }

  // Obtener historias clínicas de los alumnos del profesor
  obtenerHistoriasClinicas(): Observable<HistoriaClinica[]> {
    return this.http.get<ApiResponse<HistoriaClinica[]>>(`${this.apiUrl}/historias-clinicas`)
      .pipe(
        map(response => response.data || [])
      );
  }


// Obtener una historia clínica específica por ID
obtenerHistoriaClinica(id: number): Observable<HistoriaClinica> {
  return this.http.get<ApiResponse<HistoriaClinica>>(`${this.apiUrl}/historias-clinicas/${id}`)
    .pipe(
      map(response => response.data)
    );
}

  // Obtener estadísticas de historias clínicas
  obtenerEstadisticasHistorias(): Observable<EstadisticasHistorias> {
    return this.http.get<ApiResponse<EstadisticasHistorias>>(`${this.apiUrl}/historias-clinicas/estadisticas`)
      .pipe(
        map(response => response.data)
      );
  }

  // Obtener alumnos asignados al profesor
  obtenerAlumnosAsignados(): Observable<AlumnoAsignado[]> {
    return this.http.get<ApiResponse<AlumnoAsignado[]>>(`${this.apiUrl}/alumnos`)
      .pipe(
        map(response => response.data || [])
      );
  }

  // Obtener materias del profesor
  obtenerMaterias(): Observable<MateriaProfesor[]> {
    return this.http.get<ApiResponse<MateriaProfesor[]>>(`${this.apiUrl}/materias`)
      .pipe(
        map(response => response.data || [])
      );
  }

  // Obtener todas las materias (actuales e históricas)
  obtenerTodasMaterias(): Observable<MateriaProfesor[]> {
    return this.http.get<ApiResponse<MateriaProfesor[]>>(`${this.apiUrl}/todas-materias`)
      .pipe(
        map(response => response.data || [])
      );
  }

  // Obtener período escolar actual
  obtenerPeriodoEscolarActual(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/periodo-actual`)
      .pipe(
        map(response => response.data)
      );
  }

  // Agregar este método al ProfesorService si no lo tiene completo:
  actualizarPerfil(datos: {
    nombreUsuario?: string;
    correoElectronico?: string;
    telefonoCelular?: string;
    passwordActual?: string;
    nuevaPassword?: string;
  }): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/perfil`, datos)
      .pipe(
        map(response => response.data)
      );
  }

  // Actualizar contraseña del profesor
  actualizarPassword(datos: { passwordActual: string, nuevaPassword: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/password`, datos);
  }

  // Verificar contraseña actual
  verificarPasswordActual(passwordActual: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/verificar-password`, {
      passwordActual
    }).pipe(
      map(response => response.data === true),
      catchError(error => {
        console.error('Error al verificar contraseña:', error);
        return of(false);
      })
    );
  }
}