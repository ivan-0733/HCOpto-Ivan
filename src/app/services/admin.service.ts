import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HistoriaClinicaAdmin {
  ID: number;
  Fecha: string;
  FechaCreacion: string;
  Estado: string;
  FechaUltimaModificacion: string;
  Archivado: boolean;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  CURP: string;
  IDSiSeCo: string; // <- IMPORTANTE: debe ser exactamente así
  FechaNacimiento: string;
  Genero: string;
  NumeroBoleta: string;
  NombreAlumno: string;
  CorreoAlumno: string; // <- ESTE CAMPO
  SemestreActual: number;
  NumeroEmpleado: string;
  NombreProfesor: string;
  CorreoProfesor: string; // <- ESTE CAMPO
  NombreMateria: string;
  ClaveMateria: string;
  GrupoMateria: string;
  MateriaProfesorID: number;
  PeriodoEscolar: string;
  MateriaArchivada: boolean;
  TotalComentarios: number;
  Consultorio?: string;
}

export interface MateriaDisponible {
  ID: number;
  Codigo: string;
  Nombre: string;
  Semestre: number;
  EjeFormativo?: string;
  Descripcion?: string;
}

export interface ProfesorAdmin {
  ID: number;
  NumeroEmpleado: string;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  CorreoElectronico: string;
  TelefonoCelular?: string;
  // Eliminadas: FechaContratacion y EspecialidadPrincipal
  TotalMaterias: number;
  TotalHistorias: number;
  UsuarioID: number;
}

export interface EstadisticasAdmin {
  total: number;
  archivadas: number;
  porEstado: { estado: string; cantidad: number }[];
  totalAlumnos: number;
  totalProfesores: number;
  totalMaterias: number;
}

export interface MateriaAdmin {
  MateriaProfesorID: number;
  MateriaID: number;
  Codigo: string;
  NombreMateria: string;
  Semestre: number;
  EjeFormativo?: string;
  Descripcion?: string;
  Grupo: string;
  PeriodoEscolar: string;
  EsActual: boolean;
  Turno: string;
  NombreProfesor: string;
  NumeroEmpleado: string;
  ProfesorInfoID: number;
  FechaAsignacion: string;
  CantidadAlumnos: number;
  CantidadHistorias: number;
  Alumnos?: AlumnoAsignado[];
}

export interface AlumnoAdmin {
  ID: number;
  NumeroBoleta: string;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  CorreoElectronico: string;
  TelefonoCelular?: string;
  PeriodoEscolarActual?: string;
  TotalMaterias: number;
  TotalHistorias: number;
  UsuarioID: number;
}

export interface ComentarioHistoria {
  ID: number;
  Comentario: string;
  FechaCreacion: string;
  NombreUsuario: string;
  Rol: string;
}

export interface AdminPerfil {
  UsuarioID: number;
  NombreUsuario: string;
  CorreoElectronico: string;
  TelefonoCelular: string;
  FechaCreacion: string;
  FechaUltimoAcceso: string;
  Rol: string;
}

export interface AlumnoAsignado {
  AlumnoInfoID: number;
  NumeroBoleta: string;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  CorreoElectronico: string;
  TelefonoCelular?: string;
  FechaInscripcion: string;
}

export interface ProfesorDisponible {
  ProfesorInfoID: number;
  NumeroEmpleado: string;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  CorreoElectronico: string;
  TelefonoCelular?: string;
}

export interface CatalogoMateria {
  ID: number;
  Codigo: string;
  Nombre: string;
  Semestre: number;
  EjeFormativo?: string;
  Descripcion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  obtenerTodasHistorias(): Observable<{ status: string; data: { historias: HistoriaClinicaAdmin[] } }> {
    return this.http.get<{ status: string; data: { historias: HistoriaClinicaAdmin[] } }>(`${this.apiUrl}/historias`);
  }

  // En src/app/services/admin.service.ts - AGREGAR:
  obtenerHistoriaDetalle(historiaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/historias/${historiaId}`);
  }

  obtenerEstadisticasGlobales(): Observable<{ status: string; data: { estadisticas: EstadisticasAdmin } }> {
    return this.http.get<{ status: string; data: { estadisticas: EstadisticasAdmin } }>(`${this.apiUrl}/estadisticas`);
  }

  obtenerTodasMaterias(): Observable<{ status: string; data: { materias: MateriaAdmin[] } }> {
    return this.http.get<{ status: string; data: { materias: MateriaAdmin[] } }>(`${this.apiUrl}/materias`);
  }

  actualizarEstadoHistoria(historiaId: number, estado: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/historias/${historiaId}/estado`, { estado });
  }

  archivarHistoria(historiaId: number, archivar: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/historias/${historiaId}/archivar`, { archivar });
  }

  eliminarHistoria(historiaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/historias/${historiaId}`);
  }

  obtenerPeriodoEscolarActual(): Observable<any> {
    return this.http.get(`${this.apiUrl}/periodo-escolar`);
  }

  obtenerComentarios(historiaId: number): Observable<{ status: string; data: { comentarios: ComentarioHistoria[] } }> {
    return this.http.get<{ status: string; data: { comentarios: ComentarioHistoria[] } }>(`${this.apiUrl}/historias/${historiaId}/comentarios`);
  }

  agregarComentario(historiaId: number, comentario: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/historias/${historiaId}/comentarios`, { comentario });
  }

  obtenerPerfil(): Observable<{ status: string; data: { perfil: AdminPerfil; estadisticas: EstadisticasAdmin } }> {
    return this.http.get<{ status: string; data: { perfil: AdminPerfil; estadisticas: EstadisticasAdmin } }>(`${this.apiUrl}/perfil`);
  }

  // Agregar estos métodos dentro de la clase AdminService
  obtenerTodosProfesores(): Observable<{ status: string; data: { profesores: ProfesorAdmin[] } }> {
    return this.http.get<{ status: string; data: { profesores: ProfesorAdmin[] } }>(`${this.apiUrl}/profesores`);
  }

  crearProfesor(nuevoProfesor: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/profesores/crear`, nuevoProfesor);
  }

  verificarEmpleadoExistente(numeroEmpleado: string): Observable<boolean> {
    console.log('Llamando API para verificar empleado:', numeroEmpleado);

    return this.http.get<any>(`${this.apiUrl}/profesores/verificar-empleado`, {
      params: { numeroEmpleado }
    }).pipe(
      map(response => {
        console.log('Respuesta API empleado:', response);
        return response.data === true;
      }),
      catchError(error => {
        console.error('Error en verificación de empleado:', error);
        return of(false);
      })
    );
  }

  buscarMateriasDisponibles(termino: string): Observable<MateriaDisponible[]> {
    return this.http.get<any>(`${this.apiUrl}/materias-disponibles`, {
      params: { termino }
    }).pipe(
      map(response => response.data.materias || [])
    );
  }

  obtenerTodosAlumnos(): Observable<{ status: string; data: { alumnos: AlumnoAdmin[] } }> {
    return this.http.get<{ status: string; data: { alumnos: AlumnoAdmin[] } }>(`${this.apiUrl}/alumnos`);
  }

  crearAlumno(nuevoAlumno: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/alumnos/crear`, nuevoAlumno);
  }

  verificarBoletaExistente(numeroBoleta: string): Observable<boolean> {
    console.log('Llamando API para verificar boleta:', numeroBoleta);

    return this.http.get<any>(`${this.apiUrl}/alumnos/verificar-boleta`, {
      params: { numeroBoleta }
    }).pipe(
      map(response => {
        console.log('Respuesta API boleta:', response);
        return response.data === true;
      }),
      catchError(error => {
        console.error('Error en verificación de boleta:', error);
        return of(false);
      })
    );
  }

  verificarCorreoAlumnoExistente(correoElectronico: string): Observable<boolean> {
    console.log('Llamando API para verificar correo alumno:', correoElectronico);

    return this.http.get<any>(`${this.apiUrl}/alumnos/verificar-correo`, {
      params: { correoElectronico }
    }).pipe(
      map(response => {
        console.log('Respuesta API:', response);
        return response.data === true;
      }),
      catchError(error => {
        console.error('Error en la petición:', error);
        return of(false);
      })
    );
  }

  eliminarAlumno(alumnoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/alumnos/${alumnoId}`);
  }

  // Gestión de Materias
obtenerTodasMateriasAdmin(): Observable<{ status: string; data: { materias: MateriaAdmin[] } }> {
  return this.http.get<{ status: string; data: { materias: MateriaAdmin[] } }>(`${this.apiUrl}/materias-admin`);
}

crearMateriaProfesor(nuevaMateria: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/materias-admin/crear`, nuevaMateria);
}

verificarMateriaProfesorTieneHistorias(materiaProfesorId: number): Observable<{ tieneHistorias: boolean; cantidad: number }> {
  return this.http.get<any>(`${this.apiUrl}/materias-admin/${materiaProfesorId}/verificar-historias`);
}

eliminarMateriaProfesor(materiaProfesorId: number): Observable<any> {
  return this.http.delete(`${this.apiUrl}/materias-admin/${materiaProfesorId}`);
}

buscarProfesoresDisponibles(termino: string): Observable<ProfesorDisponible[]> {
  return this.http.get<any>(`${this.apiUrl}/profesores-disponibles`, {
    params: { termino }
  }).pipe(
    map(response => response.data.profesores || [])
  );
}

obtenerCatalogoMaterias(): Observable<CatalogoMateria[]> {
  return this.http.get<any>(`${this.apiUrl}/catalogo-materias`).pipe(
    map(response => response.data.materias || [])
  );
}

/**
 * Actualizar historia completa (para admin)
 */
actualizarHistoriaCompleta(datosHistoriaCompleta: any): Observable<any> {
  const historiaId = datosHistoriaCompleta.historiaId;
  const url = `${this.apiUrl}/historias/${historiaId}/actualizar-completa`;

  const body = {
    datosGenerales: datosHistoriaCompleta.datosGenerales,
    secciones: datosHistoriaCompleta.secciones
  };

  return this.http.put<any>(url, body);
}

inscribirAlumnoAMateria(datos: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/materias-admin/inscribir-alumno`, datos);
}

eliminarAlumnoDeMateriaAdmin(datos: any): Observable<any> {
  return this.http.delete(`${this.apiUrl}/materias-admin/eliminar-alumno`, { body: datos });
}

buscarAlumnosDisponibles(termino: string): Observable<any[]> {
  return this.http.get<any>(`${this.apiUrl}/alumnos-disponibles`, {
    params: { termino }
  }).pipe(
    map(response => response.data?.alumnos || []),
    catchError(() => of([]))
  );
}

  verificarAlumnoTieneHistorias(alumnoId: number): Observable<{ tieneHistorias: boolean; cantidad: number }> {
    return this.http.get<any>(`${this.apiUrl}/alumnos/${alumnoId}/verificar-historias`);
  }

  verificarCorreoProfesorExistente(correoElectronico: string): Observable<boolean> {
    console.log('🚀 Llamando API para verificar correo:', correoElectronico);

    return this.http.get<any>(`${this.apiUrl}/profesores/verificar-correo`, {
      params: { correoElectronico }
    }).pipe(
      map(response => {
        console.log('📦 Respuesta API:', response);
        return response.data === true;
      }),
      catchError(error => {
        console.error('❌ Error en la petición:', error);
        return of(false);
      })
    );
  }

  eliminarProfesor(profesorId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/profesores/${profesorId}`);
  }

  verificarProfesorTieneHistorias(profesorId: number): Observable<{ tieneHistorias: boolean; cantidad: number }> {
    return this.http.get<any>(`${this.apiUrl}/profesores/${profesorId}/verificar-historias`)
  }
}