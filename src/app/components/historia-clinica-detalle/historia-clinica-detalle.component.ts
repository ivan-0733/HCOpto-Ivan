import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { HistoriaClinicaService, HistoriaClinicaDetalle } from '../../services/historia-clinica.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

@Component({
selector: 'app-historia-clinica-detalle',
templateUrl: './historia-clinica-detalle.component.html',
styleUrls: ['./historia-clinica-detalle.component.scss'],
standalone: true,
imports: [
  CommonModule,
  RouterModule,
  FormsModule
]
})
export class HistoriaClinicaDetalleComponent implements OnInit {
historiaId: number | null = null;
historia: HistoriaClinicaDetalle | null = null;
currentTab = 'datos-generales';

loading = true;
error = '';

constructor(
  private historiaClinicaService: HistoriaClinicaService,
  private route: ActivatedRoute,
  private router: Router
) { }

ngOnInit(): void {
  this.route.params.subscribe(params => {
    if (params['id']) {
      this.historiaId = +params['id'];
      this.loadHistoriaClinica();
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

        // Cargar imágenes de método gráfico si están disponibles por ID
        if (historia.metodoGrafico && historia.metodoGrafico.imagenID && !historia.metodoGrafico.imagenBase64) {
          this.cargarImagenMetodoGrafico(historia.metodoGrafico.imagenID);
        }
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

getButtonClass(tab: string): string {
  return this.currentTab === tab ? 'active' : '';
}

obtenerClaseEstado(estado: string): string {
  switch (estado) {
    case 'En proceso':
      return 'estado-proceso';
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
  this.router.navigate(['/alumno/historias', this.historiaId, 'editar']);
}

volverAlDashboard(): void {
  this.router.navigate(['/alumno/dashboard']);
}

responderComentario(comentarioId: number, respuesta: string): void {
  if (!this.historiaId) return;

  this.historiaClinicaService.responderComentario(this.historiaId, comentarioId, respuesta).subscribe({
    next: () => {
      // Recargar historia para mostrar la respuesta
      this.loadHistoriaClinica();
    },
    error: (error) => {
      this.error = 'Error al responder el comentario. Por favor, intenta nuevamente.';
      console.error('Error respondiendo comentario:', error);
    }
  });
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

obtenerTipoLente(tipoID: number | string | null | undefined): string {
  if (!tipoID) return 'Monocal';
  
  const tipos: {[key: string]: string} = {
    'MONOCAL': 'Monocal',
    'BIFOCAL': 'Bifocal',
    'MULTIFOCAL': 'Multifocal',
    '17': 'Bifocal',
    '18': 'Multifocal',
    '19': 'Monocal'
  };
  
  return tipos[tipoID.toString()] || 'Tipo desconocido';
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

}