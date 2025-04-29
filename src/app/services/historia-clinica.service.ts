import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface HistoriaClinica {
  ID: number;
  Fecha: string;
  Archivado: boolean;
  FechaArchivado: string | null;
  EstadoID: number;
  PacienteID: number;
  Nombre: string;  // Sigue siendo del paciente
  ApellidoPaterno: string;
  ApellidoMaterno: string | null;
  Edad?: number;
  Estado: string;
  Consultorio: string;
  Semestre: string;
  CorreoElectronico?: string;
  TelefonoCelular?: string;

  // Nuevos campos del alumno
  AlumnoNombre: string;
  AlumnoApellidoPaterno: string;
  AlumnoApellidoMaterno: string | null;

  ProfesorNombre: string;
  ProfesorApellidoPaterno: string;
  ProfesorApellidoMaterno: string | null;
}

export interface HistoriaClinicaDetalle extends HistoriaClinica {
  ProfesorID: number;
  ConsultorioID: number;
  SemestreID: number;
  GeneroID: number;
  EstadoCivilID: number;
  EscolaridadID: number;
  Ocupacion: string;
  DireccionLinea1: string;
  DireccionLinea2: string;
  Ciudad: string;
  PacienteEstadoID: number;
  CodigoPostal: string;
  Pais: string;
  CorreoElectronico: string;
  TelefonoCelular: string;
  Telefono: string;

  interrogatorio?: any;
  agudezaVisual?: any[];
  lensometria?: any;
  diagnostico?: any;
  planTratamiento?: any;
  pronostico?: any;
  recetaFinal?: any;
  comentarios?: any[];
}

export interface EstadisticasHistorias {
  total: number;
  archivadas: number;
  porEstado: { estado: string; cantidad: number }[];
}

export interface ApiResponse<T> {
  status: string;
  results?: number;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HistoriaClinicaService {
  private apiUrl = `${environment.apiUrl}/historias-clinicas`;

  constructor(private http: HttpClient) { }

  // Obtener todas las historias clínicas del alumno
  obtenerHistoriasClinicas(): Observable<HistoriaClinica[]> {
    return this.http.get<ApiResponse<HistoriaClinica[]>>(this.apiUrl)
      .pipe(
        map(response => response.data || [])
      );
  }

  // Obtener una historia clínica por su ID
  obtenerHistoriaClinica(id: number): Observable<HistoriaClinicaDetalle> {
    return this.http.get<ApiResponse<HistoriaClinicaDetalle>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => response.data)
      );
  }

  // Crear una nueva historia clínica
  crearHistoriaClinica(datos: any): Observable<HistoriaClinicaDetalle> {
    return this.http.post<ApiResponse<HistoriaClinicaDetalle>>(this.apiUrl, datos)
      .pipe(
        map(response => response.data)
      );
  }

  // Actualizar una sección específica de la historia clínica
  actualizarSeccion(id: number, seccion: string, datos: any): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}/secciones/${seccion}`, datos)
      .pipe(
        map(response => response.data)
      );
  }

  // Responder a un comentario de un profesor
  responderComentario(historiaId: number, comentarioId: number, respuesta: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${historiaId}/comentarios/${comentarioId}/respuestas`, { respuesta })
      .pipe(
        map(response => response.data)
      );
  }

  // Obtener estadísticas de historias clínicas
  obtenerEstadisticas(): Observable<EstadisticasHistorias> {
    return this.http.get<ApiResponse<EstadisticasHistorias>>(`${this.apiUrl}/estadisticas`)
      .pipe(
        map(response => response.data)
      );
  }

  // Cambiar el estado de una historia clínica
  cambiarEstado(id: number, estadoId: number): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}/estado`, { estadoId })
      .pipe(
        map(response => response.data)
      );
  }
}