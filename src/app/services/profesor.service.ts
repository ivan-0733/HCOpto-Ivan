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

export interface AlumnoDetalle {
  ID: number;
  AlumnoInfoID: number;
  MateriaProfesorID: number;
  NumeroBoleta: string;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  CorreoElectronico?: string;
  TelefonoCelular?: string;
  FechaInscripcion: string;
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
  // AGREGAR estas propiedades:
  CorreoElectronico?: string;
  TelefonoCelular?: string;
}

export interface MateriaProfesorConAlumnos extends MateriaProfesor {
  Alumnos?: AlumnoAsignado[]; // Usar tu interface existente
  FechaAsignacion?: string;
  EjeFormativo?: string;
  Descripcion?: string;
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

export interface AlumnoExistente {
  ID: number;
  AlumnoInfoID: number;
  NumeroBoleta: string;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  CorreoElectronico: string;
  TelefonoCelular?: string;
}

export interface NuevoAlumnoRequest {
  numeroBoleta: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  correoElectronico: string;
  materiaProfesorId: number;
}

export interface InscripcionAlumnoRequest {
  alumnoInfoId: number;
  materiaProfesorId: number;
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

  // Buscar alumnos existentes
  buscarAlumnos(termino: string): Observable<AlumnoExistente[]> {
    return this.http.get<ApiResponse<AlumnoExistente[]>>(`${this.apiUrl}/alumnos/buscar`, {
      params: { termino }
    }).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Error al buscar alumnos:', error);
        return of([]);
      })
    );
  }

  // Verificar si una boleta ya existe
  verificarBoletaExistente(numeroBoleta: string): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/alumnos/verificar-boleta`, {
      params: { numeroBoleta }
    }).pipe(
      map(response => response.data === true),
      catchError(error => {
        console.error('Error al verificar boleta:', error);
        return of(false);
      })
    );
  }

  // Verificar si un correo ya existe
  verificarCorreoExistente(correoElectronico: string): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/alumnos/verificar-correo`, {
      params: { correoElectronico }
    }).pipe(
      map(response => response.data === true),
      catchError(error => {
        console.error('Error al verificar correo:', error);
        return of(false);
      })
    );
  }

  // Crear nuevo alumno e inscribirlo a una materia
  crearAlumnoEInscribir(nuevoAlumno: NuevoAlumnoRequest): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/alumnos/crear-inscribir`, nuevoAlumno)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error al crear alumno:', error);
          throw error;
        })
      );
  }

  /**
   * Eliminar alumno de una materia (desinscripción)
   */
  eliminarAlumnoDeMateria(body: { alumnoInfoId: number; materiaProfesorId: number }): Observable<any> {
    return this.http.delete(`${this.apiUrl}/alumnos/eliminar-de-materia`, { body });
  }

  // Inscribir alumno existente a una materia
  inscribirAlumnoMateria(inscripcion: InscripcionAlumnoRequest): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/alumnos/inscribir`, inscripcion)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error al inscribir alumno:', error);
          throw error;
        })
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

  // Obtener alumnos de una materia específica
  obtenerAlumnosPorMateria(materiaProfesorId: number): Observable<AlumnoAsignado[]> {
    return this.http.get<ApiResponse<AlumnoAsignado[]>>(`${this.apiUrl}/materias/${materiaProfesorId}/alumnos`)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error al obtener alumnos por materia:', error);
          return of([]);
        })
      );
  }

  // Obtener materias con sus alumnos
  obtenerMateriasConAlumnos(): Observable<MateriaProfesorConAlumnos[]> {
    return this.http.get<ApiResponse<MateriaProfesorConAlumnos[]>>(`${this.apiUrl}/materias-con-alumnos`)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error al obtener materias con alumnos:', error);
          return of([]);
        })
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