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
      },
      error: (error) => {
        this.error = 'No se pudo cargar la historia clínica. ' + error.message;
        console.error('Error al cargar historia clínica:', error);
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
  const {
    ProfesorNombre,
    ProfesorApellidoPaterno,
    ProfesorApellidoMaterno
  } = this.historia as any;
  return `${ProfesorNombre} ${ProfesorApellidoPaterno} ${ProfesorApellidoMaterno ?? ''}`;
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

// Métodos para trabajar con la sección de Examen Preliminar
obtenerNombreMetodo(metodoID: number | null | undefined): string {
  if (!metodoID) return 'No especificado';
  
  const metodos: {[key: number]: string} = {
    1: 'Pantalleo',
    2: 'Thorrigton',
    3: 'Maddox',
    4: 'Von Graeffe'
  };
  
  return metodos[metodoID] || 'Desconocido';
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
  
  return !!(
    this.historia.binocularidad || 
    this.historia.forias || 
    this.historia.vergencias || 
    this.historia.metodoGrafico
  );
}

// Obtiene el nombre del método de medición para forias
obtenerTipoTest(tipoID: number | null | undefined): string {
  if (!tipoID) return 'No especificado';
  
  const tipos: {[key: number]: string} = {
    35: 'Pola Mirror',
    36: 'Otro',
    37: 'P. de Worth'
  };
  
  return tipos[tipoID] || 'Desconocido';
}

// Obtiene el tipo de visión estereoscópica
obtenerTipoVision(tipoVisionID: number | null | undefined): string {
  if (!tipoVisionID) return 'No especificado';
  
  const tiposVision: {[key: number]: string} = {
    38: 'Titmus',
    39: 'Random',
    40: 'Otro'
  };
  
  return tiposVision[tipoVisionID] || 'Desconocido';
}

// Obtiene la URL de la imagen asociada al método gráfico
obtenerUrlImagen(imagenID: number | null | undefined): string {
  if (!imagenID) return '';
  return `${environment.apiUrl}/imagenes/${imagenID}`;
}


}