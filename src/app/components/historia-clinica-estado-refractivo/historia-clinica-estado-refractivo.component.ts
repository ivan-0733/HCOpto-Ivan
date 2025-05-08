import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-estado-refractivo',
  templateUrl: './historia-clinica-estado-refractivo.component.html',
  styleUrls: ['./historia-clinica-estado-refractivo.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})

export class EstadoRefractivoComponent implements OnInit, OnChanges {
  @Input() historiaId: number | null = null;
  @Input() hideButtons = false;
  @Output() completed = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>();

  // Formularios para estado refractivo y subjetivo de cerca
  refraccionForm!: FormGroup;
  subjetivoCercaForm!: FormGroup;

  loading = false;
  submitting = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private historiaService: HistoriaClinicaService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    if (this.historiaId) {
      this.cargarDatosExistentes();
    }
    
    // Emitir los formularios para que el componente padre pueda acceder a ellos
    this.formReady.emit(this.refraccionForm);
    this.formReady.emit(this.subjetivoCercaForm);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['historiaId'] && !changes['historiaId'].firstChange) {
      if (this.historiaId) {
        this.cargarDatosExistentes();
      }
    }
  }

  private initForms(): void {
    // Formulario del Estado Refractivo
    this.refraccionForm = this.fb.group({
      // Queratometría
      ojoDerechoQueratometria: [''],
      ojoIzquierdoQueratometria: [''],
      ojoDerechoAstigmatismoCorneal: [''],
      ojoIzquierdoAstigmatismoCorneal: [''],
      ojoDerechoAstigmatismoJaval: [''],
      ojoIzquierdoAstigmatismoJaval: [''],
      
      // Retinoscopía
      ojoDerechoRetinoscopiaEsfera: [''],
      ojoDerechoRetinosciopiaCilindro: [''],
      ojoDerechoRetinoscopiaEje: [''],
      ojoIzquierdoRetinoscopiaEsfera: [''],
      ojoIzquierdoRetinosciopiaCilindro: [''],
      ojoIzquierdoRetinoscopiaEje: [''],
      
      // Subjetivo
      ojoDerechoSubjetivoEsfera: [''],
      ojoDerechoSubjetivoCilindro: [''],
      ojoDerechoSubjetivoEje: [''],
      ojoIzquierdoSubjetivoEsfera: [''],
      ojoIzquierdoSubjetivoCilindro: [''],
      ojoIzquierdoSubjetivoEje: [''],
      
      // Balance Binoculares
      ojoDerechoBalanceBinocularesEsfera: [''],
      ojoDerechoBalanceBinocularesCilindro: [''],
      ojoDerechoBalanceBinocularesEje: [''],
      ojoIzquierdoBalanceBinocularesEsfera: [''],
      ojoIzquierdoBalanceBinocularesCilindro: [''],
      ojoIzquierdoBalanceBinocularesEje: [''],
      ojoDerechoAVLejana: [''],
      ojoIzquierdoAVLejana: ['']
    });

    // Formulario de Subjetivo de Cerca
    this.subjetivoCercaForm = this.fb.group({
      ojoDerechoM: [''],
      ojoIzquierdoM: [''],
      ambosOjosM: [''],
      ojoDerechoJacger: [''],
      ojoIzquierdoJacger: [''],
      ambosOjosJacger: [''],
      ojoDerechoPuntos: [''],
      ojoIzquierdoPuntos: [''],
      ambosOjosPuntos: [''],
      ojoDerechoSnellen: [''],
      ojoIzquierdoSnellen: [''],
      ambosOjosSnellen: [''],
      valorADD: [''],
      av: [''],
      distancia: [''],
      rango: ['']
    });
  }

  cargarDatosExistentes(): void {
    if (!this.historiaId) return;
    
    this.loading = true;
    
    this.historiaService.obtenerHistoriaClinica(this.historiaId)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (historia) => {
          // Cargar datos de estado refractivo
          if (historia.estadoRefractivo) {
            this.refraccionForm.patchValue({
              // Queratometría
              ojoDerechoQueratometria: historia.estadoRefractivo.OjoDerechoQueratometria || '',
              ojoIzquierdoQueratometria: historia.estadoRefractivo.OjoIzquierdoQueratometria || '',
              ojoDerechoAstigmatismoCorneal: historia.estadoRefractivo.OjoDerechoAstigmatismoCorneal || '',
              ojoIzquierdoAstigmatismoCorneal: historia.estadoRefractivo.OjoIzquierdoAstigmatismoCorneal || '',
              ojoDerechoAstigmatismoJaval: historia.estadoRefractivo.OjoDerechoAstigmatismoJaval || '',
              ojoIzquierdoAstigmatismoJaval: historia.estadoRefractivo.OjoIzquierdoAstigmatismoJaval || '',
              
              // Retinoscopía
              ojoDerechoRetinoscopiaEsfera: historia.estadoRefractivo.OjoDerechoRetinoscopiaEsfera || '',
              ojoDerechoRetinosciopiaCilindro: historia.estadoRefractivo.OjoDerechoRetinosciopiaCilindro || '',
              ojoDerechoRetinoscopiaEje: historia.estadoRefractivo.OjoDerechoRetinoscopiaEje || '',
              ojoIzquierdoRetinoscopiaEsfera: historia.estadoRefractivo.OjoIzquierdoRetinoscopiaEsfera || '',
              ojoIzquierdoRetinosciopiaCilindro: historia.estadoRefractivo.OjoIzquierdoRetinosciopiaCilindro || '',
              ojoIzquierdoRetinoscopiaEje: historia.estadoRefractivo.OjoIzquierdoRetinoscopiaEje || '',
              
              // Subjetivo
              ojoDerechoSubjetivoEsfera: historia.estadoRefractivo.OjoDerechoSubjetivoEsfera || '',
              ojoDerechoSubjetivoCilindro: historia.estadoRefractivo.OjoDerechoSubjetivoCilindro || '',
              ojoDerechoSubjetivoEje: historia.estadoRefractivo.OjoDerechoSubjetivoEje || '',
              ojoIzquierdoSubjetivoEsfera: historia.estadoRefractivo.OjoIzquierdoSubjetivoEsfera || '',
              ojoIzquierdoSubjetivoCilindro: historia.estadoRefractivo.OjoIzquierdoSubjetivoCilindro || '',
              ojoIzquierdoSubjetivoEje: historia.estadoRefractivo.OjoIzquierdoSubjetivoEje || '',
              
              // Balance Binoculares
              ojoDerechoBalanceBinocularesEsfera: historia.estadoRefractivo.OjoDerechoBalanceBinocularesEsfera || '',
              ojoDerechoBalanceBinocularesCilindro: historia.estadoRefractivo.OjoDerechoBalanceBinocularesCilindro || '',
              ojoDerechoBalanceBinocularesEje: historia.estadoRefractivo.OjoDerechoBalanceBinocularesEje || '',
              ojoIzquierdoBalanceBinocularesEsfera: historia.estadoRefractivo.OjoIzquierdoBalanceBinocularesEsfera || '',
              ojoIzquierdoBalanceBinocularesCilindro: historia.estadoRefractivo.OjoIzquierdoBalanceBinocularesCilindro || '',
              ojoIzquierdoBalanceBinocularesEje: historia.estadoRefractivo.OjoIzquierdoBalanceBinocularesEje || '',
              ojoDerechoAVLejana: historia.estadoRefractivo.OjoDerechoAVLejana || '',
              ojoIzquierdoAVLejana: historia.estadoRefractivo.OjoIzquierdoAVLejana || ''
            });
          }
          
          // Cargar datos de subjetivo de cerca
          if (historia.subjetivoCerca) {
            this.subjetivoCercaForm.patchValue({
              ojoDerechoM: historia.subjetivoCerca.OjoDerechoM || '',
              ojoIzquierdoM: historia.subjetivoCerca.OjoIzquierdoM || '',
              ambosOjosM: historia.subjetivoCerca.AmbosOjosM || '',
              ojoDerechoJaeger: historia.subjetivoCerca.OjoDerechoJacger || '', // Nota: hay un typo en el modelo (Jacger en lugar de Jaeger)
              ojoIzquierdoJaeger: historia.subjetivoCerca.OjoIzquierdoJacger || '',
              ambosOjosJaeger: historia.subjetivoCerca.AmbosOjosJacger || '',
              ojoDerechoPuntos: historia.subjetivoCerca.OjoDerechoPuntos || '',
              ojoIzquierdoPuntos: historia.subjetivoCerca.OjoIzquierdoPuntos || '',
              ambosOjosPuntos: historia.subjetivoCerca.AmbosOjosPuntos || '',
              ojoDerechoSnellen: historia.subjetivoCerca.OjoDerechoSnellen || '',
              ojoIzquierdoSnellen: historia.subjetivoCerca.OjoIzquierdoSnellen || '',
              ambosOjosSnellen: historia.subjetivoCerca.AmbosOjosSnellen || '',
              valorADD: historia.subjetivoCerca.ValorADD || '',
              av: historia.subjetivoCerca.AV || '',
              distancia: historia.subjetivoCerca.Distancia || '',
              rango: historia.subjetivoCerca.Rango || ''
            });
          }
          
          // Emitir que los datos se han cargado correctamente
          this.completed.emit(true);
        },
        error: (err) => {
          console.error('Error al cargar datos de estado refractivo:', err);
          this.error = 'Error al cargar datos. Por favor, intente nuevamente.';
          this.completed.emit(false);
        }
      });
  }

  guardarEstadoRefractivo(): void {
    if (!this.historiaId) {
      this.error = 'No se ha podido identificar la historia clínica.';  
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    // Preparar datos de cada sección
    const refraccionData = this.refraccionForm.value;
    const subjetivoCercaData = this.subjetivoCercaForm.value;

    const payload = {
      estadoRefractivo: {
        ...refraccionData
      },
      subjetivoCerca: {
        ...subjetivoCercaData
      }
    };

    this.historiaService.actualizarSeccion(this.historiaId, 'estado-refractivo', payload)
      .pipe(finalize(() => {
        this.submitting = false;
      }))
      .subscribe({
        next: () => {
          this.success = 'Estado refractivo guardado correctamente.';
          this.completed.emit(true);
        },
        error: (err) => {
          console.error('Error al guardar estado refractivo:', err);
          this.error = 'Error al guardar los datos. Por favor, intente nuevamente.';
          this.completed.emit(false);
        }
      });
  }

  cancelar(): void {
    this.completed.emit(false);
  }
  
  // Métodos para acceder a los datos de cada formulario
  getRefraccionData(): any {
    return this.refraccionForm.value;
  }
  
  getSubjetivoCercaData(): any {
    return this.subjetivoCercaForm.value;
  }
}