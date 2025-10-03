import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { HistoriaClinicaService, HistoriaClinicaDetalle } from '../../services/historia-clinica.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ComentarioBoxComponent } from '../shared/comentario-box/comentario-box.component'; // ✅ Ajustar esta ruta
import { AuthService } from '../../services/auth.service';

@Component({
selector: 'app-historia-clinica-detalle',
templateUrl: './historia-clinica-detalle.component.html',
styleUrls: ['./historia-clinica-detalle.component.scss'],
standalone: true,
imports: [
  CommonModule,
  RouterModule,
  FormsModule,
  ComentarioBoxComponent
]
})
export class HistoriaClinicaDetalleComponent implements OnInit {
historiaId: number | null = null;
historia: HistoriaClinicaDetalle | null = null;
currentTab = 'datos-generales';

loading = true;
error = '';
nuevoComentarioTexto: string = '';

esProfesor = false;
esAdmin = false;
esAlumno = false;

constructor(
  private historiaClinicaService: HistoriaClinicaService,
  private route: ActivatedRoute,
  private router: Router,
  private authService: AuthService
) { }

ngOnInit(): void {
  const userRole = this.authService.getUserRole();
  console.log('🔍 ROL DETECTADO:', userRole);
  this.esProfesor = userRole === 'Profesor';
  this.esAdmin = userRole === 'Admin';
  this.esAlumno = userRole === 'Alumno';

  console.log('✅ esProfesor:', this.esProfesor);
  console.log('✅ esAlumno:', this.esAlumno);
  console.log('✅ esAdmin:', this.esAdmin);

  this.route.params.subscribe(params => {
    if (params['id']) {
      this.historiaId = +params['id'];
      this.loadHistoriaClinica();
    }
  });

  // ✅ NUEVO: Escuchar queryParams para abrir pestaña específica
  this.route.queryParams.subscribe(queryParams => {
    if (queryParams['tab']) {
      this.currentTab = queryParams['tab'];
      console.log('📂 Abriendo pestaña:', this.currentTab);
    }
  });
}

loadHistoriaClinica(): void {
  if (!this.historiaId) return;

  this.loading = true;
  this.error = '';

  this.historiaClinicaService.obtenerHistoriaClinica(this.historiaId)
    .pipe(
      finalize(() => {
        this.loading = false;
      })
    )
    .subscribe({
      next: (historia) => {
        this.historia = historia;
        console.log('Historia cargada correctamente:', historia);

        // ✅ AGREGAR ESTO: Inicializar propiedades para validación de comentarios
        if (this.historia.comentarios) {
          this.historia.comentarios.forEach(comentario => {
            comentario.nuevaRespuesta = '';
            comentario.respuestaValida = false;
          });
        }

        // Cargar imágenes de método gráfico si están disponibles por ID
        if (historia.metodoGrafico && historia.metodoGrafico.imagenID) {
          this.cargarImagenMetodoGrafico(historia.metodoGrafico.imagenID);
        }

        // Cargar imágenes de detección de alteraciones
        this.cargarImagenesDeteccionAlteraciones();
      },
      error: (error) => {
        this.error = 'No se pudo cargar la historia clínica. ' + error.message;
        console.error('Error al cargar historia clínica:', error);
      }
    });
}

cargarImagenMetodoGrafico(imagenID: number): void {
  if (!imagenID) return;

  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (typeof base64 === 'string' && base64.length > 0) {
          // Asegurar que la cadena tenga el formato correcto
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }

          // Actualizar la imagen en el objeto
          if (this.historia && this.historia.metodoGrafico) {
            this.historia.metodoGrafico.imagenBase64 = base64;
            console.log('Imagen de método gráfico cargada correctamente');
          }
        } else {
          console.error('La respuesta no contiene datos válidos de imagen');
        }
      },
      error: (error) => {
        console.error('Error al cargar la imagen del método gráfico:', error);
      }
    });
}

changeTab(tab: string): void {
  this.currentTab = tab;
}

// ✅ NUEVO MÉTODO - Agrégalo después de changeTab
verComentarios(): void {
  if (!this.historiaId) return;

  const baseRoute = this.esProfesor || this.esAdmin ? '/profesor' : '/alumno';
  this.router.navigate([baseRoute, 'comentarios', this.historiaId]);
}

getButtonClass(tab: string): string {
  return this.currentTab === tab ? 'active' : '';
}

obtenerClaseEstado(estado: string): string {
  switch (estado) {
    case 'Nuevo':
      return 'estado-nuevo';
    case 'Corregido':
      return 'estado-corregido';
    case 'Revisión':
      return 'estado-revision';
    case 'Corrección':
      return 'estado-correccion';
    case 'Finalizado':
      return 'estado-finalizado';
    default:
      return '';
  }
}

editarHistoria(): void {
  const baseRoute = this.esProfesor || this.esAdmin ? '/profesor' : '/alumno';
  this.router.navigate([baseRoute, 'historias', this.historiaId, 'editar']);
}

volverAlDashboard(): void {
  const baseRoute = this.esProfesor || this.esAdmin ? '/profesor' : '/alumno';
  this.router.navigate([baseRoute, 'dashboard']);
}

onComentarioAgregado(): void {
  // Opcionalmente recargar los datos si quieres mostrar los comentarios actualizados
  console.log('Comentario agregado exitosamente');
  // Si quieres recargar toda la historia:
  // this.loadHistoriaClinica();
}

cambiarEstado(nuevoEstadoId: number): void {
  if (!this.historiaId) return;

  this.historiaClinicaService.cambiarEstado(this.historiaId, nuevoEstadoId).subscribe({
    next: () => {
      // Recargar historia para mostrar el nuevo estado
      this.loadHistoriaClinica();
    },
    error: (error) => {
      this.error = 'Error al cambiar el estado de la historia clínica. Por favor, intenta nuevamente.';
      console.error('Error cambiando estado:', error);
    }
  });
}

/**
 * Valida si la respuesta tiene contenido válido
 */
validarRespuesta(comentario: any): void {
  const texto = comentario.nuevaRespuesta?.trim() || '';
  comentario.respuestaValida = texto.length > 0;
}

imprimirHistoria(): void {
  window.print();
}

get nombreCompletoAlumno(): string {
  if (!this.historia) return '';
  const { AlumnoNombre, AlumnoApellidoPaterno, AlumnoApellidoMaterno } = this.historia;
  return `${AlumnoNombre} ${AlumnoApellidoPaterno} ${AlumnoApellidoMaterno ?? ''}`.trim();
}

get nombreCompletoProfesor(): string {
  if (!this.historia) return '';
  const { ProfesorNombre, ProfesorApellidoPaterno, ProfesorApellidoMaterno } = this.historia;
  return `${ProfesorNombre} ${ProfesorApellidoPaterno} ${ProfesorApellidoMaterno ?? ''}`.trim();
}

/**
 * Responder a un comentario (solo alumno)
 */
responderComentario(comentario: any): void {
  if (!this.historiaId || !comentario.respuestaValida) {
    return;
  }

  const respuesta = comentario.nuevaRespuesta.trim();

  this.historiaClinicaService.responderComentario(this.historiaId, comentario.ID, respuesta)
    .subscribe({
      next: (response) => {
        // Agregar la nueva respuesta a la lista
        if (!comentario.respuestas) {
          comentario.respuestas = [];
        }
        comentario.respuestas.push(response.data);

        // Limpiar el formulario
        comentario.nuevaRespuesta = '';
        comentario.respuestaValida = false;

        console.log('Respuesta enviada correctamente');
      },
      error: (error) => {
        this.error = 'Error al responder el comentario. Por favor, intenta nuevamente.';
        console.error('Error respondiendo comentario:', error);
      }
    });
}

// Métodos para trabajar con la sección de Antecedente Visual
obtenerNombreTipoMedicion(tipoMedicion: string): string {
  const tipos: {[key: string]: string} = {
    'SIN_RX_LEJOS': 'Sin RX Lejos',
    'CON_RX_ANTERIOR_LEJOS': 'Con RX Anterior Lejos',
    'SIN_RX_CERCA': 'Sin RX Cerca',
    'CON_RX_ANTERIOR_CERCA': 'Con RX Anterior Cerca',
    'CAP_VISUAL': 'Capacidad Visual'
  };

  return tipos[tipoMedicion] || tipoMedicion;
}

esMedicionLejos(tipoMedicion: string): boolean {
  return tipoMedicion === 'SIN_RX_LEJOS' || tipoMedicion === 'CON_RX_ANTERIOR_LEJOS';
}

esMedicionCerca(tipoMedicion: string): boolean {
  return tipoMedicion === 'SIN_RX_CERCA' || tipoMedicion === 'CON_RX_ANTERIOR_CERCA';
}

obtenerTipoLente(tipoID: number | null | undefined): string {
  if (!tipoID) return '-';

  const tipos: {[key: number]: string} = {
    1: 'Bifocal',
    2: 'Multifocal',
    3: 'Monocal'
  };

  return tipos[tipoID] || '-';
}

obtenerNombreMetodo(metodoID: number | null | undefined): string {
  if (!metodoID) return '-';

  const metodos: {[key: number]: string} = {
    1: 'Pantalleo',
    2: 'Thorrigton',
    3: 'Maddox',
    4: 'Von Graeffe'
  };

  return metodos[metodoID] || '-';
}


tieneReflejosOD(viaPupilar: any): boolean {
  if (!viaPupilar) return false;

  return viaPupilar.OjoDerechoFotomotorPresente ||
        viaPupilar.OjoDerechoConsensualPresente ||
        viaPupilar.OjoDerechoAcomodativoPresente ||
        viaPupilar.OjoDerechoFotomotorAusente ||
        viaPupilar.OjoDerechoConsensualAusente ||
        viaPupilar.OjoDerechoAcomodativoAusente;
}

tieneReflejosOI(viaPupilar: any): boolean {
  if (!viaPupilar) return false;

  return viaPupilar.OjoIzquierdoFotomotorPresente ||
          viaPupilar.OjoIzquierdoConsensualPresente ||
          viaPupilar.OjoIzquierdoAcomodativoPresente ||
          viaPupilar.OjoIzquierdoFotomotorAusente ||
          viaPupilar.OjoIzquierdoConsensualAusente ||
          viaPupilar.OjoIzquierdoAcomodativoAusente;
}

tieneCaracteristicasPupilares(viaPupilar: any): boolean {
  if (!viaPupilar) return false;

  return viaPupilar.EsIsocoria ||
          viaPupilar.EsAnisocoria ||
          viaPupilar.RespuestaAcomodacion ||
          viaPupilar.PupilasIguales ||
          viaPupilar.PupilasRedondas ||
          viaPupilar.RespuestaLuz;
}

obtenerDominanciaOcular(dominanciaID: number | null | undefined): string {
  if (!dominanciaID) return 'No especificada';

  const dominancias: {[key: number]: string} = {
    29: 'Ojo Derecho (OD)',
    30: 'Ojo Izquierdo (OI)'
  };

  return dominancias[dominanciaID] || 'Desconocida';
}

// Métodos para trabajar con la sección de Estado Refractivo
mostrarEstadoRefractivo(): boolean {
  if (!this.historia) return false;
  return !!this.historia.estadoRefractivo || !!this.historia.subjetivoCerca;
}

formatearValorNumerico(valor: any): string {
  if (valor === null || valor === undefined || valor === '') return '-';
  return valor.toString();
}

formatearGrados(grados: any): string {
  if (grados === null || grados === undefined || grados === '') return '-';
  return `${grados}°`;
}

verificarSubjetivoCerca(): boolean {
  if (!this.historia || !this.historia.subjetivoCerca) return false;

  const subjetivoCerca = this.historia.subjetivoCerca;
  return !!(
    subjetivoCerca.OjoDerechoM ||
    subjetivoCerca.OjoIzquierdoM ||
    subjetivoCerca.AmbosOjosM ||
    subjetivoCerca.OjoDerechoJacger ||
    subjetivoCerca.OjoIzquierdoJacger ||
    subjetivoCerca.AmbosOjosJacger ||
    subjetivoCerca.OjoDerechoPuntos ||
    subjetivoCerca.OjoIzquierdoPuntos ||
    subjetivoCerca.AmbosOjosPuntos ||
    subjetivoCerca.OjoDerechoSnellen ||
    subjetivoCerca.OjoIzquierdoSnellen ||
    subjetivoCerca.AmbosOjosSnellen ||
    subjetivoCerca.ValorADD ||
    subjetivoCerca.AV ||
    subjetivoCerca.Distancia ||
    subjetivoCerca.Rango
  );
}

// Verifica si existen datos de binocularidad
tieneDatosBinocularidad(): boolean {
  if (!this.historia) return false;

  // Función auxiliar para verificar si un valor tiene datos significativos
  const tieneValor = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim() !== '';
    if (typeof val === 'number') return !isNaN(val);
    if (typeof val === 'boolean') return val;
    return true;
  };

  // Verificar datos en binocularidad
  const hasBinocularidadData = !!(
    this.historia.binocularidad &&
    Object.values(this.historia.binocularidad).some(tieneValor)
  );

  // Verificar datos en forias
  const hasForiasData = !!(
    this.historia.forias &&
    Object.values(this.historia.forias).some(tieneValor)
  );

  // Verificar datos en vergencias
  const hasVergenciasData = !!(
    this.historia.vergencias &&
    Object.values(this.historia.vergencias).some(tieneValor)
  );

  // Verificar datos en metodoGrafico
  const hasMetodoGraficoData = !!(
    this.historia.metodoGrafico && (
      Object.values(this.historia.metodoGrafico).some(tieneValor) ||
      this.historia.metodoGrafico.imagenID ||
      this.historia.metodoGrafico.imagenBase64
    )
  );

  return hasBinocularidadData || hasForiasData || hasVergenciasData || hasMetodoGraficoData;
}

// Obtiene el nombre del método de medición para forias
obtenerTipoTest(tipoID: number | null | undefined): string {
  if (!tipoID) return '-';

  const tipos: {[key: number]: string} = {
    35: 'Pola Mirror',
    36: 'Otro',
    37: 'P. de Worth'
  };

  return tipos[tipoID] || '-';
}

/**
 * Obtener nombre de sección por ID
 */
obtenerNombreSeccion(seccionId: number | null): string {
  if (!seccionId) return 'General';

  const secciones: {[key: number]: string} = {
    1: 'Datos Generales',
    2: 'Interrogatorio',
    3: 'Antecedente Visual',
    4: 'Examen Preliminar',
    8: 'Estado Refractivo',
    10: 'Binocularidad',
    14: 'Detección de Alteraciones',
    20: 'Diagnóstico',
    24: 'Receta Final'
  };

  return secciones[seccionId] || 'Sección Desconocida';
}

/**
 * Agregar comentario general (sin sección específica)
 */
agregarComentarioGeneral(): void {
  if (!this.historiaId || !this.nuevoComentarioTexto.trim()) {
    return;
  }

  // Usar seccionId = 0 o null para comentarios generales
  const comentarioData = {
    historiaId: this.historiaId,
    seccionId: null, // o 0 para comentarios generales
    comentario: this.nuevoComentarioTexto.trim()
  };

  this.historiaClinicaService.agregarComentario(this.historiaId, comentarioData)
    .subscribe({
      next: (response) => {
        console.log('Comentario agregado exitosamente');
        this.nuevoComentarioTexto = '';
        this.loadHistoriaClinica(); // Recargar para mostrar el nuevo comentario
      },
      error: (error) => {
        this.error = 'Error al agregar el comentario. Por favor, intenta nuevamente.';
        console.error('Error agregando comentario:', error);
      }
    });
}

// Obtiene el tipo de visión estereoscópica
obtenerTipoVision(tipoVisionID: number | null | undefined): string {
  if (!tipoVisionID) return '-';

  const tiposVision: {[key: number]: string} = {
    38: 'Titmus',
    39: 'Random',
    40: 'Otro'
  };

  return tiposVision[tipoVisionID] || '-';
}

// Obtiene la URL de la imagen asociada al método gráfico
obtenerUrlImagen(imagenID: number | null | undefined): string {
  if (!imagenID) return '';
  return `${environment.apiUrl}/historias-clinicas/imagenes/${imagenID}`;
}

// método para cargar la imagen en base64
cargarImagenBase64(imagenID: number): void {
  if (!imagenID) return;

  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (typeof base64 === 'string' && base64.length > 0) {
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }
          if (this.historia && !this.historia.metodoGrafico) {
            this.historia.metodoGrafico = {};
          }

          if (this.historia && this.historia.metodoGrafico) {
            this.historia.metodoGrafico.imagenBase64 = base64;
            console.log('Imagen cargada correctamente en base64');
          }
        } else {
          console.error('La respuesta no contiene datos válidos de imagen en base64');
        }
      },
      error: (error) => {
        console.error('Error al cargar imagen:', error);
      }
    });
}

onImageError(event: Event): void {
  const imgElement = event.target as HTMLImageElement;

  // Marcar como error
  imgElement.classList.add('image-error');

  // Cambiar a una imagen de placeholder
  imgElement.src = 'assets/images/image-not-found.png';

  // Actualizar el caption
  const caption = imgElement.nextElementSibling;
  if (caption && caption.classList.contains('image-caption')) {
    caption.textContent = 'Error al cargar la imagen';
  }

  console.error('Error al cargar la imagen desde URL');
}

private getBlobAsBase64(url: string): Promise<string> {
  return fetch(url)
    .then(response => response.blob())
    .then(blob => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    });
}

recargarImagen(imagenID: number): void {
  if (!imagenID) return;

  this.loading = true;
  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (base64) => {
        if (this.historia && this.historia.metodoGrafico) {
          this.historia.metodoGrafico.imagenBase64 = base64;
        }
      },
      error: (error) => {
        this.error = 'No se pudo cargar la imagen. ' + error.message;
      }
    });
}

// Helper method to check if amplitud acomodacion has any data
tieneDatosAmplitudAcomodacion(binocularidad: any): boolean {
  if (!binocularidad) return false;

  return !!(
    binocularidad.ojoDerechoAmpAcomCm ||
    binocularidad.ojoDerechoAmpAcomD ||
    binocularidad.ojoIzquierdoAmpAcomCm ||
    binocularidad.ojoIzquierdoAmpAcomD ||
    binocularidad.ambosOjosAmpAcomCm ||
    binocularidad.ambosOjosAmpAcomD
  );
}

// Helper method to check if vergencias positivas has any data
tieneDatosVergenciasPositivas(vergencias: any): boolean {
  if (!vergencias) return false;

  return !!(
    vergencias.positivasLejosBorroso ||
    vergencias.positivasLejosRuptura ||
    vergencias.positivasLejosRecuperacion ||
    vergencias.positivasCercaBorroso ||
    vergencias.positivasCercaRuptura ||
    vergencias.positivasCercaRecuperacion
  );
}

// Helper method to check if vergencias negativas has any data
tieneDatosVergenciasNegativas(vergencias: any): boolean {
  if (!vergencias) return false;

  return !!(
    vergencias.negativasLejosBorroso ||
    vergencias.negativasLejosRuptura ||
    vergencias.negativasLejosRecuperacion ||
    vergencias.negativasCercaBorroso ||
    vergencias.negativasCercaRuptura ||
    vergencias.negativasCercaRecuperacion
  );
}

// Helper method to check if vergencias verticales has any data
tieneDatosVergenciasVerticales(vergencias: any): boolean {
  if (!vergencias) return false;

  return this.tieneDatosSupravergencias(vergencias) || this.tieneDatosInfravergencias(vergencias);
}

// Helper method to check if supravergencias has any data
tieneDatosSupravergencias(vergencias: any): boolean {
  if (!vergencias) return false;

  return !!(
    vergencias.supravergenciasLejosRuptura ||
    vergencias.supravergenciasLejosRecuperacion ||
    vergencias.supravergenciasCercaRuptura ||
    vergencias.supravergenciasCercaRecuperacion
  );
}

// Helper method to check if infravergencias has any data
tieneDatosInfravergencias(vergencias: any): boolean {
  if (!vergencias) return false;

  return !!(
    vergencias.infravergenciasLejosRuptura ||
    vergencias.infravergenciasLejosRecuperacion ||
    vergencias.infravergenciasCercaRuptura ||
    vergencias.infravergenciasCercaRecuperacion
  );
}

// Verificar si hay datos de detección de alteraciones
tieneDatosAlteraciones(): boolean {
  if (!this.historia) return false;

  // Función auxiliar para verificar si un valor tiene datos significativos
  const tieneValor = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim() !== '';
    if (typeof val === 'number') return !isNaN(val);
    if (typeof val === 'boolean') return val;
    return true;
  };

  // Verificar datos en Grid de Amsler
  const hasGridAmslerData = !!(
    this.historia.gridAmsler &&
    Object.values(this.historia.gridAmsler).some(tieneValor)
  );

  // Verificar datos en Tonometría
  const hasTonometriaData = !!(
    this.historia.tonometria &&
    Object.values(this.historia.tonometria).some(tieneValor)
  );

  // Verificar datos en Paquimetría
  const hasPaquimetriaData = !!(
    this.historia.paquimetria &&
    Object.values(this.historia.paquimetria).some(tieneValor)
  );

  // Verificar datos en Campimetría
  const hasCampimetriaData = !!(
    this.historia.campimetria && (
      Object.values(this.historia.campimetria).some(tieneValor) ||
      this.historia.campimetria.imagenID ||
      this.historia.campimetria.imagenBase64
    )
  );

  // Verificar datos en Biomicroscopía
  const hasBiomicroscopiaData = !!(
    this.historia.biomicroscopia &&
    Object.values(this.historia.biomicroscopia).some(tieneValor)
  );

  // Verificar datos en Oftalmoscopía
  const hasOftalmoscopiaData = !!(
    this.historia.oftalmoscopia && (
      Object.values(this.historia.oftalmoscopia).some(tieneValor) ||
      this.historia.oftalmoscopia.ojoDerechoImagenID ||
      this.historia.oftalmoscopia.ojoIzquierdoImagenID ||
      this.historia.oftalmoscopia.ojoDerechoImagenBase64 ||
      this.historia.oftalmoscopia.ojoIzquierdoImagenBase64
    )
  );

  return hasGridAmslerData || hasTonometriaData || hasPaquimetriaData || hasCampimetriaData || hasBiomicroscopiaData || hasOftalmoscopiaData;
}

// Verificar si hay datos de diagnóstico
tieneDatosDiagnostico(): boolean {
  if (!this.historia) return false;

  // Función auxiliar para verificar si un valor tiene datos significativos
  const tieneValor = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim() !== '';
    if (typeof val === 'number') return !isNaN(val);
    if (typeof val === 'boolean') return val;
    return true;
  };

  // Verificar datos en Diagnóstico
  const hasDiagnosticoData = !!(
    this.historia.diagnostico &&
    Object.values(this.historia.diagnostico).some(tieneValor)
  );

  // Verificar datos en Plan de Tratamiento
  const hasPlanTratamientoData = !!(
    this.historia.planTratamiento &&
    Object.values(this.historia.planTratamiento).some(tieneValor)
  );

  // Verificar datos en Pronóstico
  const hasPronosticoData = !!(
    this.historia.pronostico &&
    Object.values(this.historia.pronostico).some(tieneValor)
  );

  // Verificar datos en Recomendaciones
  const hasRecomendacionesData = !!(
    this.historia.recomendaciones &&
    Object.values(this.historia.recomendaciones).some(tieneValor)
  );

  return hasDiagnosticoData || hasPlanTratamientoData || hasPronosticoData || hasRecomendacionesData;
}

// Obtener el tipo de tonometría según el ID
obtenerTipoTonometria(tipoID: number | null | undefined): string {
  if (!tipoID) return 'No especificado';

  const tipos: {[key: number]: string} = {
    31: 'Aplanación',
    32: 'Identación',
    33: 'Aire'
  };

  return tipos[tipoID] || 'Desconocido';
}

// Método para cargar imágenes desde el servidor
cargarImagenesDeteccionAlteraciones(): void {
  if (!this.historia) return;

  // Cargar imagen de campimetría si hay ID pero no base64
  if (this.historia.campimetria?.imagenID && !this.historia.campimetria?.imagenBase64) {
    this.cargarImagenCampimetria(this.historia.campimetria.imagenID);
  }

  // Cargar imágenes de oftalmoscopía si hay IDs pero no base64
  if (this.historia.oftalmoscopia?.ojoDerechoImagenID && !this.historia.oftalmoscopia?.ojoDerechoImagenBase64) {
    this.cargarImagenOftalmoscopiaOD(this.historia.oftalmoscopia.ojoDerechoImagenID);
  }

  if (this.historia.oftalmoscopia?.ojoIzquierdoImagenID && !this.historia.oftalmoscopia?.ojoIzquierdoImagenBase64) {
    this.cargarImagenOftalmoscopiaOI(this.historia.oftalmoscopia.ojoIzquierdoImagenID);
  }
}

// Método para cargar la imagen de campimetría
cargarImagenCampimetria(imagenID: number): void {
  if (!imagenID) return;

  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (typeof base64 === 'string' && base64.length > 0) {
          // Asegurar formato correcto de data URL
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }

          // Actualizar en el objeto historia
          if (this.historia && this.historia.campimetria) {
            this.historia.campimetria.imagenBase64 = base64;
            console.log('Imagen de campimetría cargada correctamente');
          }
        } else {
          console.error('La respuesta no contiene datos válidos de imagen de campimetría');
        }
      },
      error: (error) => {
        console.error('Error al cargar la imagen de campimetría:', error);
      }
    });
}

// Método para cargar la imagen de oftalmoscopía OD
cargarImagenOftalmoscopiaOD(imagenID: number): void {
  if (!imagenID) return;

  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (typeof base64 === 'string' && base64.length > 0) {
          // Asegurar formato correcto de data URL
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }

          // Actualizar en el objeto historia
          if (this.historia && this.historia.oftalmoscopia) {
            this.historia.oftalmoscopia.ojoDerechoImagenBase64 = base64;
            console.log('Imagen de oftalmoscopía OD cargada correctamente');
          }
        } else {
          console.error('La respuesta no contiene datos válidos de imagen de oftalmoscopía OD');
        }
      },
      error: (error) => {
        console.error('Error al cargar la imagen de oftalmoscopía OD:', error);
      }
    });
}

// Método para cargar la imagen de oftalmoscopía OI
cargarImagenOftalmoscopiaOI(imagenID: number): void {
  if (!imagenID) return;

  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (typeof base64 === 'string' && base64.length > 0) {
          // Asegurar formato correcto de data URL
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }

          // Actualizar en el objeto historia
          if (this.historia && this.historia.oftalmoscopia) {
            this.historia.oftalmoscopia.ojoIzquierdoImagenBase64 = base64;
            console.log('Imagen de oftalmoscopía OI cargada correctamente');
          }
        } else {
          console.error('La respuesta no contiene datos válidos de imagen de oftalmoscopía OI');
        }
      },
      error: (error) => {
        console.error('Error al cargar la imagen de oftalmoscopía OI:', error);
      }
    });
}

}