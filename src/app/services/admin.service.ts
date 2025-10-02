import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  ID: number;
  NombreMateria: string;
  Clave: string;
  PeriodoEscolar: string;
  EsActual?: boolean; // <<<<<<<<<<<<<<< ESTA ES LA LÍNEA CLAVE AÑADIDA
  Grupo: string;
  Archivado: boolean;
  NumeroEmpleado: string;
  NombreProfesor: string;
  TotalAlumnos: number;
  TotalHistorias: number;
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

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  obtenerTodasHistorias(): Observable<{ status: string; data: { historias: HistoriaClinicaAdmin[] } }> {
    return this.http.get<{ status: string; data: { historias: HistoriaClinicaAdmin[] } }>(`${this.apiUrl}/historias`);
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
}