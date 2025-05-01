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
  ProfesorID: number; // Añadir este campo
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string | null;
  Edad?: number;
  Estado: string;
  Consultorio: string;
  Semestre: string;
  CorreoElectronico?: string;
  TelefonoCelular?: string;

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

  // Propiedades existentes
  interrogatorio?: any;
  agudezaVisual?: any[];
  lensometria?: any;
  diagnostico?: any;
  planTratamiento?: any;
  pronostico?: any;
  recetaFinal?: any;
  comentarios?: any[];
  
  // Nuevas propiedades para examen preliminar
  alineacionOcular?: {
    LejosHorizontal?: string;
    LejosVertical?: string;
    CercaHorizontal?: string;
    CercaVertical?: string;
    MetodoID?: number;
  };
  
  motilidad?: {
    Versiones?: string;
    Ducciones?: string;
    Sacadicos?: string;
    Persecucion?: string;
    Fijacion?: string;
  };
  
  exploracionFisica?: {
    OjoDerechoAnexos?: string;
    OjoIzquierdoAnexos?: string;
    OjoDerechoSegmentoAnterior?: string;
    OjoIzquierdoSegmentoAnterior?: string;
  };
  
  viaPupilar?: {
    OjoDerechoDiametro?: number;
    OjoIzquierdoDiametro?: number;
    OjoDerechoFotomotorPresente?: boolean;
    OjoDerechoConsensualPresente?: boolean;
    OjoDerechoAcomodativoPresente?: boolean;
    OjoIzquierdoFotomotorPresente?: boolean;
    OjoIzquierdoConsensualPresente?: boolean;
    OjoIzquierdoAcomodativoPresente?: boolean;
    OjoDerechoFotomotorAusente?: boolean;
    OjoDerechoConsensualAusente?: boolean;
    OjoDerechoAcomodativoAusente?: boolean;
    OjoIzquierdoFotomotorAusente?: boolean;
    OjoIzquierdoConsensualAusente?: boolean;
    OjoIzquierdoAcomodativoAusente?: boolean;
    EsIsocoria?: boolean;
    EsAnisocoria?: boolean;
    RespuestaAcomodacion?: boolean;
    PupilasIguales?: boolean;
    PupilasRedondas?: boolean;
    RespuestaLuz?: boolean;
    DIP?: string;
    DominanciaOcularID?: number;
  };

   // Propiedades para estado refractivo
    estadoRefractivo?: {
    OjoDerechoQueratometria?: string;
    OjoIzquierdoQueratometria?: string;
    OjoDerechoAstigmatismoCorneal?: number;
    OjoIzquierdoAstigmatismoCorneal?: number;
    OjoDerechoAstigmatismoJaval?: string;
    OjoIzquierdoAstigmatismoJaval?: string;
    
    OjoDerechoRetinoscopiaEsfera?: number;
    OjoDerechoRetinosciopiaCilindro?: number;
    OjoDerechoRetinoscopiaEje?: number;
    OjoIzquierdoRetinoscopiaEsfera?: number;
    OjoIzquierdoRetinosciopiaCilindro?: number;
    OjoIzquierdoRetinoscopiaEje?: number;
    
    OjoDerechoSubjetivoEsfera?: number;
    OjoDerechoSubjetivoCilindro?: number;
    OjoDerechoSubjetivoEje?: number;
    OjoIzquierdoSubjetivoEsfera?: number;
    OjoIzquierdoSubjetivoCilindro?: number;
    OjoIzquierdoSubjetivoEje?: number;
    
    OjoDerechoBalanceBinocularesEsfera?: number;
    OjoDerechoBalanceBinocularesCilindro?: number;
    OjoDerechoBalanceBinocularesEje?: number;
    OjoIzquierdoBalanceBinocularesEsfera?: number;
    OjoIzquierdoBalanceBinocularesCilindro?: number;
    OjoIzquierdoBalanceBinocularesEje?: number;
    OjoDerechoAVLejana?: string;
    OjoIzquierdoAVLejana?: string;
  };
  
  subjetivoCerca?: {
    OjoDerechoM?: string;
    OjoIzquierdoM?: string;
    AmbosOjosM?: string;
    OjoDerechoJacger?: string;
    OjoIzquierdoJacger?: string;
    AmbosOjosJacger?: string;
    OjoDerechoPuntos?: string;
    OjoIzquierdoPuntos?: string;
    AmbosOjosPuntos?: string;
    OjoDerechoSnellen?: string;
    OjoIzquierdoSnellen?: string;
    AmbosOjosSnellen?: string;
    ValorADD?: string;
    AV?: string;
    Distancia?: string;
    Rango?: string;
  };

  binocularidad?: {
    PPC?: string;
    ARN?: string;
    ARP?: string;
    Donders?: boolean;
    Sheards?: boolean;
    HabAcomLente?: string;
    HabAcomDificultad?: string;
    OjoDerechoAmpAcomCm?: string;
    OjoDerechoAmpAcomD?: number;
    OjoIzquierdoAmpAcomCm?: string;
    OjoIzquierdoAmpAcomD?: number;
    AmbosOjosAmpAcomCm?: string;
    AmbosOjosAmpAcomD?: number;
  };

  forias?: {
    HorizontalesLejos?: string;
    HorizontalesCerca?: string;
    VerticalLejos?: string;
    VerticalCerca?: string;
    MetodoMedicionID?: number;
    CAA?: string;
    CAACalculada?: string;
    CAAMedida?: string;
  };

  vergencias?: {
    PositivasLejosBorroso?: number;
    PositivasLejosRuptura?: number;
    PositivasLejosRecuperacion?: number;
    PositivasCercaBorroso?: number;
    PositivasCercaRuptura?: number;
    PositivasCercaRecuperacion?: number;
    NegativasLejosBorroso?: number;
    NegativasLejosRuptura?: number;
    NegativasLejosRecuperacion?: number;
    NegativasCercaBorroso?: number;
    NegativasCercaRuptura?: number;
    NegativasCercaRecuperacion?: number;
    SupravergenciasLejosRuptura?: number;
    SupravergenciasLejosRecuperacion?: number;
    SupravergenciasCercaRuptura?: number;
    SupravergenciasCercaRecuperacion?: number;
    InfravergenciasLejosRuptura?: number;
    InfravergenciasLejosRecuperacion?: number;
    InfravergenciasCercaRuptura?: number;
    InfravergenciasCercaRecuperacion?: number;
  };

  metodoGrafico?: {
    IntegracionBinocular?: string;
    TipoID?: number;
    VisionEstereoscopica?: string;
    TipoVisionID?: number;
    ImagenID?: number;
  };
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

  // Subir una imagen para la historia clínica
subirImagen(historiaId: number, formData: FormData): Observable<any> {
  return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${historiaId}/imagenes`, formData)
    .pipe(
      map(response => response.data)
    );
  }
  
}


