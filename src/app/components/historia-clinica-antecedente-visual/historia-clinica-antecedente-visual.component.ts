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
  @Input() hideButtons = false;
  @Output() datosGuardados = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>

  agudezaVisual!: FormGroup;
  lensometria!: FormGroup;
  loading = false;
  datosCargados = false;
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
    
    // Emitir ambos formularios juntos
    this.formReady.emit(this.agudezaVisual);
    this.formReady.emit(this.lensometria);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['historiaId'] && !changes['historiaId'].firstChange) {
      if (this.historiaId) {
        this.cargarDatosExistentes();
      }
    }
  }

  private initForms(): void {
    // Formulario de Agudeza Visual
    this.agudezaVisual = this.fb.group({

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
    this.lensometria = this.fb.group({
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
          if (historia.agudezaVisual && historia.agudezaVisual.length > 0) {
            const agudezaData = historia.agudezaVisual[0];
            
            this.agudezaVisual.patchValue({
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
          
          if (historia.lensometria) {
            const lensometriaData = historia.lensometria;
            
            this.lensometria.patchValue({
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
          
          this.datosGuardados.emit(true);
        },
        error: (err) => {
          console.error('Error al cargar datos de antecedente visual:', err);
          this.error = 'Error al cargar datos. Por favor, intente nuevamente.';
          this.datosGuardados.emit(false);
        }
      });
  }

  cancelar(): void {
    this.datosGuardados.emit(false);
  }

  getLensometriaData(): any {
    return this.lensometria.value;
  }

  getAgudezaData(): any {
    return this.agudezaVisual.value;
  }
  
}