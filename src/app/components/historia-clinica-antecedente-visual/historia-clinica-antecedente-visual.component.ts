import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-antecedente-visual',
  templateUrl: './historia-clinica-antecedente-visual.component.html',
  styleUrls: ['./historia-clinica-antecedente-visual.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class AntecedenteVisualComponent implements OnInit, OnChanges {
  @Input() historiaId: number | null = null;
  @Output() datosGuardados = new EventEmitter<boolean>();
  // Emitir formularios para acceso directo desde el contenedor
  @Output() agudezaVisualFormReady = new EventEmitter<FormGroup>();
  @Output() lensometriaFormReady = new EventEmitter<FormGroup>();

  visualForm!: FormGroup;
  lensometriaForm!: FormGroup;
  loading = false;
  datosCargados = false;

  constructor(
    private fb: FormBuilder,
    private historiaService: HistoriaClinicaService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    // Aplicar validadores iniciales según el tipo de medición predeterminado
    this.adjustFormValidators();
    
    if (this.historiaId) {
      this.cargarDatosExistentes();
    }
    
    // Emitir los formularios para que el componente padre pueda acceder a ellos
    this.agudezaVisualFormReady.emit(this.visualForm);
    this.lensometriaFormReady.emit(this.lensometriaForm);
    
    // Suscribirse a cambios en el tipo de medición para ajustar validadores
    this.visualForm.get('tipoMedicion')?.valueChanges.subscribe(() => {
      this.adjustFormValidators();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si el historiaId cambia después de la inicialización
    if (changes['historiaId'] && !changes['historiaId'].firstChange) {
      if (this.historiaId) {
        this.cargarDatosExistentes();
      }
    }
  }

  private initForms(): void {
    // Formulario de Agudeza Visual
    this.visualForm = this.fb.group({
      tipoMedicion: ['SIN_RX_LEJOS', [Validators.required]],
      ojoDerechoSnellen: [''],
      ojoIzquierdoSnellen: [''],
      ambosOjosSnellen: [''],
      ojoDerechoMetros: [''],
      ojoIzquierdoMetros: [''],
      ambosOjosMetros: [''],
      ojoDerechoMAR: [''],
      ojoIzquierdoMAR: [''],
      ambosOjosMAR: [''],
      ojoDerechoM: [''],
      ojoIzquierdoM: [''],
      ambosOjosM: [''],
      ojoDerechoJeager: [''],
      ojoIzquierdoJeager: [''],
      ambosOjosJeager: [''],
      ojoDerechoPuntos: [''],
      ojoIzquierdoPuntos: [''],
      ambosOjosPuntos: [''],
      capacidadVisualOD: [''],
      capacidadVisualOI: [''],
      capacidadVisualAO: [''],
      diametroMM: ['']
    });

    // Formulario de Lensometría
    this.lensometriaForm = this.fb.group({
      ojoDerechoEsfera: [''],
      ojoDerechoCilindro: [''],
      ojoDerechoEje: [''],
      ojoIzquierdoEsfera: [''],
      ojoIzquierdoCilindro: [''],
      ojoIzquierdoEje: [''],
      tipoBifocalMultifocalID: [''],
      valorADD: [''],
      distanciaRango: [''],
      centroOptico: ['']
    });
  }

  cargarDatosExistentes(): void {
    if (!this.historiaId) return;
    
    this.loading = true;
    
    this.historiaService.obtenerHistoriaClinica(this.historiaId)
      .pipe(finalize(() => {
        this.loading = false;
        this.datosCargados = true;
      }))
      .subscribe({
        next: (historia) => {
          // Cargar datos de agudeza visual
          if (historia.agudezaVisual && historia.agudezaVisual.length > 0) {
            const agudezaData = historia.agudezaVisual[0];
            
            // Normalizar nombres de campos si es necesario
            this.visualForm.patchValue({
              tipoMedicion: agudezaData.TipoMedicion || agudezaData.tipoMedicion || 'SIN_RX_LEJOS',
              ojoDerechoSnellen: agudezaData.OjoDerechoSnellen || agudezaData.ojoDerechoSnellen || '',
              ojoIzquierdoSnellen: agudezaData.OjoIzquierdoSnellen || agudezaData.ojoIzquierdoSnellen || '',
              ambosOjosSnellen: agudezaData.AmbosOjosSnellen || agudezaData.ambosOjosSnellen || '',
              ojoDerechoMetros: agudezaData.OjoDerechoMetros || agudezaData.ojoDerechoMetros || '',
              ojoIzquierdoMetros: agudezaData.OjoIzquierdoMetros || agudezaData.ojoIzquierdoMetros || '',
              ambosOjosMetros: agudezaData.AmbosOjosMetros || agudezaData.ambosOjosMetros || '',
              ojoDerechoMAR: agudezaData.OjoDerechoMAR || agudezaData.ojoDerechoMAR || '',
              ojoIzquierdoMAR: agudezaData.OjoIzquierdoMAR || agudezaData.ojoIzquierdoMAR || '',
              ambosOjosMAR: agudezaData.AmbosOjosMAR || agudezaData.ambosOjosMAR || '',
              ojoDerechoM: agudezaData.OjoDerechoM || agudezaData.ojoDerechoM || '',
              ojoIzquierdoM: agudezaData.OjoIzquierdoM || agudezaData.ojoIzquierdoM || '',
              ambosOjosM: agudezaData.AmbosOjosM || agudezaData.ambosOjosM || '',
              ojoDerechoJeager: agudezaData.OjoDerechoJeager || agudezaData.ojoDerechoJeager || '',
              ojoIzquierdoJeager: agudezaData.OjoIzquierdoJeager || agudezaData.ojoIzquierdoJeager || '',
              ambosOjosJeager: agudezaData.AmbosOjosJeager || agudezaData.ambosOjosJeager || '',
              ojoDerechoPuntos: agudezaData.OjoDerechoPuntos || agudezaData.ojoDerechoPuntos || '',
              ojoIzquierdoPuntos: agudezaData.OjoIzquierdoPuntos || agudezaData.ojoIzquierdoPuntos || '',
              ambosOjosPuntos: agudezaData.AmbosOjosPuntos || agudezaData.ambosOjosPuntos || '',
              capacidadVisualOD: agudezaData.CapacidadVisualOD || agudezaData.capacidadVisualOD || '',
              capacidadVisualOI: agudezaData.CapacidadVisualOI || agudezaData.capacidadVisualOI || '',
              capacidadVisualAO: agudezaData.CapacidadVisualAO || agudezaData.capacidadVisualAO || '',
              diametroMM: agudezaData.DiametroMM || agudezaData.diametroMM || ''
            });
          }
          
          // Cargar datos de lensometría
          if (historia.lensometria) {
            const lensometriaData = historia.lensometria;
            
            this.lensometriaForm.patchValue({
              ojoDerechoEsfera: lensometriaData.OjoDerechoEsfera || lensometriaData.ojoDerechoEsfera || '',
              ojoDerechoCilindro: lensometriaData.OjoDerechoCilindro || lensometriaData.ojoDerechoCilindro || '',
              ojoDerechoEje: lensometriaData.OjoDerechoEje || lensometriaData.ojoDerechoEje || '',
              ojoIzquierdoEsfera: lensometriaData.OjoIzquierdoEsfera || lensometriaData.ojoIzquierdoEsfera || '',
              ojoIzquierdoCilindro: lensometriaData.OjoIzquierdoCilindro || lensometriaData.ojoIzquierdoCilindro || '',
              ojoIzquierdoEje: lensometriaData.OjoIzquierdoEje || lensometriaData.ojoIzquierdoEje || '',
              tipoBifocalMultifocalID: lensometriaData.TipoBifocalMultifocalID || lensometriaData.tipoBifocalMultifocalID || '',
              valorADD: lensometriaData.ValorADD || lensometriaData.valorADD || '',
              distanciaRango: lensometriaData.DistanciaRango || lensometriaData.distanciaRango || '',
              centroOptico: lensometriaData.CentroOptico || lensometriaData.centroOptico || ''
            });
          }
          
          // Ajustar validadores según el tipo de medición
          this.adjustFormValidators();
          
          // Emitir que los datos se han cargado correctamente
          this.datosGuardados.emit(true);
        },
        error: (err) => {
          console.error('Error al cargar datos de antecedente visual:', err);
          this.datosGuardados.emit(false);
        }
      });
  }

  // Método para ajustar validadores según el tipo de medición seleccionado
  adjustFormValidators(): void {
    const tipoMedicion = this.visualForm.get('tipoMedicion')?.value;
    
    // Resetear todos los validadores
    for (const controlName in this.visualForm.controls) {
      if (controlName !== 'tipoMedicion') {
        this.visualForm.get(controlName)?.clearValidators();
        this.visualForm.get(controlName)?.updateValueAndValidity();
      }
    }
    
    // Aplicar validadores según el tipo de medición
    if (this.isLejosMedicion()) {
      // Para mediciones de lejos, requerir al menos un valor de cada ojo en Snellen
      this.visualForm.get('ojoDerechoSnellen')?.setValidators([Validators.required]);
      this.visualForm.get('ojoIzquierdoSnellen')?.setValidators([Validators.required]);
      // El valor de ambos ojos no es obligatorio
    } else if (this.isCercaMedicion()) {
      // Para mediciones de cerca, requerir al menos un valor de M
      this.visualForm.get('ojoDerechoM')?.setValidators([Validators.required]);
      this.visualForm.get('ojoIzquierdoM')?.setValidators([Validators.required]);
      // El valor de ambos ojos no es obligatorio
    } else if (this.isCapacidadVisual()) {
      // Para capacidad visual, requerir al menos un valor
      this.visualForm.get('capacidadVisualOD')?.setValidators([Validators.required]);
      this.visualForm.get('capacidadVisualOI')?.setValidators([Validators.required]);
      // El valor de ambos ojos no es obligatorio
    }
    
    // Actualizar validez de los controles
    for (const controlName in this.visualForm.controls) {
      if (controlName !== 'tipoMedicion') {
        this.visualForm.get(controlName)?.updateValueAndValidity();
      }
    }
  }

  // Helper methods to check the type of measurement
  isLejosMedicion(): boolean {
    const tipoMedicion = this.visualForm.get('tipoMedicion')?.value;
    return tipoMedicion === 'SIN_RX_LEJOS' || tipoMedicion === 'CON_RX_ANTERIOR_LEJOS';
  }

  isCercaMedicion(): boolean {
    const tipoMedicion = this.visualForm.get('tipoMedicion')?.value;
    return tipoMedicion === 'SIN_RX_CERCA' || tipoMedicion === 'CON_RX_ANTERIOR_CERCA';
  }

  isCapacidadVisual(): boolean {
    const tipoMedicion = this.visualForm.get('tipoMedicion')?.value;
    return tipoMedicion === 'CAP_VISUAL';
  }

  // Preparar los datos de agudeza visual para guardar
  getAgudezaVisualData(): any {
    return this.visualForm.value;
  }

  // Preparar los datos de lensometría para guardar
  getLensometriaData(): any {
    return this.lensometriaForm.value;
  }

  // Guardar datos tras el evento submit
  guardarDatos(): boolean {
    // Verificar si el formulario de agudeza visual es válido
    if (this.visualForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.visualForm.controls).forEach(key => {
        const control = this.visualForm.get(key);
        if (control) {
          control.markAsTouched();
          control.updateValueAndValidity();
        }
      });
      
      return false;
    }

    // Los formularios son válidos
    return true;
  }
}