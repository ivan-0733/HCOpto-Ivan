import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

export interface HistoriaClinica {
  ID: number;
  Fecha: string;
  Archivado: boolean;
  FechaArchivado: string | null;
  EstadoID: number;
  PacienteID: number;
  ProfesorID: number;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string | null;
  Edad?: number;
  Estado: string;
  Consultorio: string;
  PeriodoEscolar: string;
  CorreoElectronico?: string;
  TelefonoCelular?: string;
  CURP?: string;  // ✅ AGREGAR
  IDSiSeCO?: string;  // ✅ AGREGAR
  MateriaProfesorID: number;
  NombreMateria: string;
  GrupoMateria: string;
  PeriodoEscolarID?: number;

  // Información del alumno que creó la historia clínica
  AlumnoNombre: string;
  AlumnoApellidoPaterno: string;
  AlumnoApellidoMaterno: string | null;
  AlumnoBoleta: string;
  AlumnoCorreo: string;

  // Información del profesor (para cuando el alumno ve las historias)
  ProfesorNombre: string;
  ProfesorApellidoPaterno: string;
  ProfesorApellidoMaterno: string | null;
}

export interface HistoriaClinicaDetalle extends HistoriaClinica {
  ProfesorID: number;
  ConsultorioID: number;
  SemestreID: number;
  PeriodoEscolarID: number;  // ✅ Asegurarse que está
  GeneroID: number;
  EstadoCivilID: number;
  EscolaridadID: number;
  Ocupacion: string;
  DireccionLinea1: string;
  CURP: string;  // ✅ NUEVO - OBLIGATORIO
  Ciudad: string;
  PacienteEstadoID: number;
  CodigoPostal: string;
  Pais: string;
  CorreoElectronico: string;
  TelefonoCelular: string;
  Telefono: string;
  IDSiSeCO?: string;  // ✅ NUEVO - OPCIONAL

  // Propiedades existentes
  interrogatorio?: any;
  agudezaVisual?: any[];
  lensometria?: any;
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
    integracionBinocular?: string;
    tipoID?: number;
    visionEstereoscopica?: string;
    tipoVisionID?: number;
    imagenID?: number;
    imagenBase64?: string;
  }

  // Propiedades para detección de alteraciones
  gridAmsler?: {
    numeroCartilla?: string;
    ojoDerechoSensibilidadContraste?: string;
    ojoIzquierdoSensibilidadContraste?: string;
    ojoDerechoVisionCromatica?: string;
    ojoIzquierdoVisionCromatica?: string;
  };

  tonometria?: {
    metodoAnestesico?: string;
    fecha?: string;
    hora?: string;
    ojoDerecho?: number;
    ojoIzquierdo?: number;
    tipoID?: number;
  };

  paquimetria?: {
    ojoDerechoCCT?: number;
    ojoIzquierdoCCT?: number;
    ojoDerechoPIOCorregida?: number;
    ojoIzquierdoPIOCorregida?: number;
  };

  campimetria?: {
    distancia?: number;
    tamanoColorIndice?: string;
    tamanoColorPuntoFijacion?: string;
    imagenID?: number;
    imagenBase64?: string;
  };

  biomicroscopia?: {
    ojoDerechoPestanas?: string;
    ojoIzquierdoPestanas?: string;
    ojoDerechoParpadosIndice?: string;
    ojoIzquierdoParpadosIndice?: string;
    ojoDerechoBordePalpebral?: string;
    ojoIzquierdoBordePalpebral?: string;
    ojoDerechoLineaGris?: string;
    ojoIzquierdoLineaGris?: string;
    ojoDerechoCantoExterno?: string;
    ojoIzquierdoCantoExterno?: string;
    ojoDerechoCantoInterno?: string;
    ojoIzquierdoCantoInterno?: string;
    ojoDerechoPuntosLagrimales?: string;
    ojoIzquierdoPuntosLagrimales?: string;
    ojoDerechoConjuntivaTarsal?: string;
    ojoIzquierdoConjuntivaTarsal?: string;
    ojoDerechoConjuntivaBulbar?: string;
    ojoIzquierdoConjuntivaBulbar?: string;
    ojoDerechoFondoSaco?: string;
    ojoIzquierdoFondoSaco?: string;
    ojoDerechoLimbo?: string;
    ojoIzquierdoLimbo?: string;
    ojoDerechoCorneaBiomicroscopia?: string;
    ojoIzquierdoCorneaBiomicroscopia?: string;
    ojoDerechoCamaraAnterior?: string;
    ojoIzquierdoCamaraAnterior?: string;
    ojoDerechoIris?: string;
    ojoIzquierdoIris?: string;
    ojoDerechoCristalino?: string;
    ojoIzquierdoCristalino?: string;

    // IDs de imagen
    ojoDerechoImagenID?: number;
    ojoIzquierdoImagenID?: number;
    ojoDerechoImagenID2?: number;
    ojoIzquierdoImagenID2?: number;
    ojoDerechoImagenID3?: number;
    ojoIzquierdoImagenID3?: number;

    // Base64 de imágenes
    ojoDerechoImagenBase64?: string;
    ojoIzquierdoImagenBase64?: string;
    ojoDerechoImagenBase64_2?: string;
    ojoIzquierdoImagenBase64_2?: string;
    ojoDerechoImagenBase64_3?: string;
    ojoIzquierdoImagenBase64_3?: string;
  };

  oftalmoscopia?: {
    ojoDerechoPapila?: string;
    ojoIzquierdoPapila?: string;
    ojoDerechoExcavacion?: string;
    ojoIzquierdoExcavacion?: string;
    ojoDerechoRadio?: string;
    ojoIzquierdoRadio?: string;
    ojoDerechoProfundidad?: string;
    ojoIzquierdoProfundidad?: string;
    ojoDerechoVasos?: string;
    ojoIzquierdoVasos?: string;
    ojoDerechoRELAV?: string;
    ojoIzquierdoRELAV?: string;
    ojoDerechoMacula?: string;
    ojoIzquierdoMacula?: string;
    ojoDerechoReflejo?: string;
    ojoIzquierdoReflejo?: string;
    ojoDerechoRetinaPeriferica?: string;
    ojoIzquierdoRetinaPeriferica?: string;
    ojoDerechoISNT?: string;
    ojoIzquierdoISNT?: string;
    ojoDerechoImagenID?: number;
    ojoIzquierdoImagenID?: number;
    ojoDerechoImagenBase64?: string;
    ojoIzquierdoImagenBase64?: string;
  };

  diagnostico?: {
    OjoDerechoRefractivo?: string;
    OjoIzquierdoRefractivo?: string;
    OjoDerechoPatologico?: string;
    OjoIzquierdoPatologico?: string;
    Binocular?: string;
    Sensorial?: string;
  };

  planTratamiento?: {
    Descripcion?: string;
  };

  pronostico?: {
    Descripcion?: string;
  };

  recomendaciones?: {
    Descripcion?: string;
    ProximaCita?: Date | string;
  };



}

export interface ImagenUpload {
  file: File;
  seccionID: number;
  tipoImagenID: number;
  campo?: string; // Campo opcional para identificar a qué parte de la sección pertenece (ej: OD, OI)
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

  constructor(private http: HttpClient, private router: Router) { }

  // Obtener todas las historias clínicas del alumno
  obtenerHistoriasClinicas(): Observable<HistoriaClinica[]> {
    return this.http.get<ApiResponse<HistoriaClinica[]>>(this.apiUrl)
      .pipe(
        map(response => response.data || [])
      );
  }

  // Obtener una historia clínica por su ID
  // Obtener una historia clínica por su ID (detecta automáticamente si es profesor o alumno)
obtenerHistoriaClinica(id: number): Observable<HistoriaClinicaDetalle> {
  // Detectar si estamos en una ruta de profesor
  const currentUrl = this.router.url;
  const esProfesor = currentUrl.includes('/profesor');

  console.log(`🌐 SERVICE - Obteniendo historia ID: ${id}`);
  console.log(`🌐 SERVICE - URL actual: ${currentUrl}`);
  console.log(`🌐 SERVICE - Es profesor: ${esProfesor}`);

  if (esProfesor) {
    // Si es profesor, usar el endpoint de profesores
    const profesorApiUrl = `${environment.apiUrl}/profesores`;
    const url = `${profesorApiUrl}/historias-clinicas/${id}`;
    console.log(`🌐 SERVICE - URL para profesor: ${url}`);

    return this.http.get<ApiResponse<HistoriaClinicaDetalle>>(url)
      .pipe(
        map(response => {
          console.log(`✅ SERVICE - Respuesta recibida:`, response);
          return response.data;
        }),
        catchError(error => {
          console.error(`❌ SERVICE - Error en request:`, error);
          return throwError(() => error);
        })
      );
  } else {
    // Si es alumno, usar el método original
    console.log(`🌐 SERVICE - URL para alumno: ${this.apiUrl}/${id}`);
    return this.http.get<ApiResponse<HistoriaClinicaDetalle>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => response.data)
      );
  }
}





  // Crear una nueva historia clínica
  crearHistoriaClinica(datos: any): Observable<HistoriaClinicaDetalle> {
    return this.http.post<ApiResponse<HistoriaClinicaDetalle>>(this.apiUrl, datos)
      .pipe(
        map(response => response.data)
      );
  }

  crearHistoriaClinicaCompleta(datosHistoria: any, secciones: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/completa`, {
      datosHistoria,
      secciones
    });
  }

  // Actualizar una sección específica de la historia clínica
  actualizarSeccion(id: number, seccion: string, datos: any): Observable<any> {
    console.log(`Actualizando sección ${seccion} para historia ${id} con datos:`, datos);

    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${id}/secciones/${seccion}`, datos)
      .pipe(
        map(response => {
          console.log(`Respuesta de actualizar sección ${seccion}:`, response);
          return response.data || response;
        }),
        catchError(error => {
          console.error(`Error al actualizar sección ${seccion}:`, error);
          return throwError(() => error);
        })
      );
  }


  // Responder a un comentario de un profesor
  responderComentario(historiaId: number, comentarioId: number, respuesta: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${historiaId}/comentarios/${comentarioId}/respuestas`, { respuesta })
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Agregar comentario a una historia clínica
   */
  agregarComentario(historiaId: number, datos: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${historiaId}/comentarios`,
      datos
    ).pipe(
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

  // Método específico para subir imágenes con multipart
  subirImagenMultipart(historiaId: number, file: File, seccionID: string, tipoImagenID: string): Observable<any> {
    const formData = new FormData();
    formData.append('imagen', file);
    formData.append('seccionID', seccionID);
    formData.append('tipoImagenID', tipoImagenID);

    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${historiaId}/imagenes`, formData)
      .pipe(
        map(response => response.data)
      );
  }


  subirMultiplesImagenes(
    historiaId: string,
    imagenes: Array<{
      file: File;
      seccionID: string;
      tipoImagenID: string;
      campo: string;
    }>
  ): Observable<any> {
    const formData = new FormData();

    imagenes.forEach((imagen, index) => {
      formData.append(`files[${index}]`, imagen.file);
      formData.append(`secciones[${index}]`, imagen.seccionID);
      formData.append(`tipos[${index}]`, imagen.tipoImagenID);
      formData.append(`campos[${index}]`, imagen.campo);
    });

    return this.http.post(`/api/historias/${historiaId}/imagenes/multiples`, formData, {
      reportProgress: true,
      observe: 'response'
    });
  }

  obtenerImagen(imagenId: number): Observable<Blob> {
    if (!imagenId) {
      return throwError(() => new Error('ID de imagen no proporcionado'));
    }

    return this.http.get(`${this.apiUrl}/imagenes/${imagenId}`, {
      responseType: 'blob'
    });
  }

  // Método para convertir un Blob a base64
  convertirImagenABase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Método para obtener una imagen como base64
  obtenerImagenBase64(imageId: number): Observable<string> {
    if (!imageId) {
      return throwError(() => new Error('ID de imagen no proporcionado'));
    }

    const url = `${this.apiUrl}/imagenes/${imageId}`;

    return this.http.get(url, {
      responseType: 'blob'
    }).pipe(
      switchMap(blob => {
        if (!blob || blob.size === 0) {
          return throwError(() => new Error('La respuesta no contiene datos de imagen'));
        }

        return new Observable<string>(observer => {
          const reader = new FileReader();

          reader.onloadend = () => {
            observer.next(reader.result as string);
            observer.complete();
          };

          reader.onerror = error => {
            observer.error(new Error('Error al convertir la imagen a base64: ' + error));
          };

          reader.readAsDataURL(blob);
        });
      }),
      catchError(error => {
        console.error('Error al obtener imagen:', error);
        // Intentar con URL directa como fallback
        console.log('Intentando obtener imagen por URL directa');
        return of(`${this.apiUrl}/imagenes/${imageId}`);
      })
    );
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json, image/jpeg, image/png, image/gif'
    };
  }
}
