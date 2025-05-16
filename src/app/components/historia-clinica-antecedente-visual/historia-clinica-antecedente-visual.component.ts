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
  @Output() nextSection = new EventEmitter<void>();
  @Output() datosGuardados = new EventEmitter<any>();
  @Output() formReady = new EventEmitter<any>();

  agudezaVisual!: FormGroup;
  lensometria!: FormGroup;
  loading = false;
  datosCargados = false;
  error = '';
  success = '';

  tiposLente: any[] = [
    { ID: 3, Valor: 'Monocal' },
    { ID: 1, Valor: 'Bifocal' },
    { ID: 2, Valor: 'Multifocal' }
  ];

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
    
    // Agregar este log para depurar
    console.log('Tipos de lente disponibles:', this.tiposLente);
    
    // Agregar este listener para ver cuándo cambia el valor
    this.lensometria.get('tipoBifocalMultifocalID')?.valueChanges.subscribe(value => {
      console.log('Tipo de lente seleccionado:', value);
    });
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
      // Sin RX Lejos
      sinRxLejosODSnellen: [''],
      sinRxLejosOISnellen: [''],
      sinRxLejosAOSnellen: [''],
      sinRxLejosODMetros: [''],
      sinRxLejosOIMetros: [''],
      sinRxLejosAOMetros: [''],
      sinRxLejosODMAR: [''],
      sinRxLejosOIMAR: [''],
      sinRxLejosAOMAR: [''],
      sinRxLejosODDecimal: [''],
      sinRxLejosOIDecimal: [''],
      sinRxLejosAODecimal: [''],
      
      // Con RX Anterior Lejos
      conRxLejosODSnellen: [''],
      conRxLejosOISnellen: [''],
      conRxLejosAOSnellen: [''],
      conRxLejosODMetros: [''],
      conRxLejosOIMetros: [''],
      conRxLejosAOMetros: [''],
      conRxLejosODMAR: [''],
      conRxLejosOIMAR: [''],
      conRxLejosAOMAR: [''],
      conRxLejosODDecimal: [''],
      conRxLejosOIDecimal: [''],
      conRxLejosAODecimal: [''],
      
      // Sin RX Cerca
      sinRxCercaODM: [''],
      sinRxCercaOIM: [''],
      sinRxCercaAOM: [''],
      sinRxCercaODJeager: [''],
      sinRxCercaOIJeager: [''],
      sinRxCercaAOJeager: [''],
      sinRxCercaODPuntos: [''],
      sinRxCercaOIPuntos: [''],
      sinRxCercaAOPuntos: [''],
      
      // Con RX Anterior Cerca
      conRxCercaODM: [''],
      conRxCercaOIM: [''],
      conRxCercaAOM: [''],
      conRxCercaODJeager: [''],
      conRxCercaOIJeager: [''],
      conRxCercaAOJeager: [''],
      conRxCercaODPuntos: [''],
      conRxCercaOIPuntos: [''],
      conRxCercaAOPuntos: [''],
      
      // Capacidad Visual
      capacidadVisualOD: [''],
      capacidadVisualOI: [''],
      capacidadVisualAO: [''],
      diametroMM: [''],
    });

    // Formulario de Lensometría
    this.lensometria = this.fb.group({
      ojoDerechoEsfera: [''],
      ojoDerechoCilindro: [''],
      ojoDerechoEje: [''],
      ojoIzquierdoEsfera: [''],
      ojoIzquierdoCilindro: [''],
      ojoIzquierdoEje: [''],
      tipoBifocalMultifocalID: [null],
      valorADD: [''],
      distanciaRango: [''],
      centroOptico: ['']
    });
  }

  prepareAgudezaVisualData(): any[] {
    const formData = this.agudezaVisual.value;
    
    // Crear un array con los diferentes tipos de medición
    // Ya no filtramos elementos vacíos para que siempre se envíen los 5 tipos
    return [
      // 1. SIN_RX_LEJOS
      {
        tipoMedicion: 'SIN_RX_LEJOS',
        ojoDerechoSnellen: formData.sinRxLejosODSnellen || '',
        ojoIzquierdoSnellen: formData.sinRxLejosOISnellen || '',
        ambosOjosSnellen: formData.sinRxLejosAOSnellen || '',
        ojoDerechoMetros: formData.sinRxLejosODMetros || '',
        ojoIzquierdoMetros: formData.sinRxLejosOIMetros || '',
        ambosOjosMetros: formData.sinRxLejosAOMetros || '',
        ojoDerechoDecimal: formData.sinRxLejosODDecimal || '',
        ojoIzquierdoDecimal: formData.sinRxLejosOIDecimal || '',
        ambosOjosDecimal: formData.sinRxLejosAODecimal || '',
        ojoDerechoMAR: formData.sinRxLejosODMAR || '',
        ojoIzquierdoMAR: formData.sinRxLejosOIMAR || '',
        ambosOjosMAR: formData.sinRxLejosAOMAR || ''
      },
      // 2. CON_RX_ANTERIOR_LEJOS 
      {
        tipoMedicion: 'CON_RX_ANTERIOR_LEJOS',
        ojoDerechoSnellen: formData.conRxLejosODSnellen || '',
        ojoIzquierdoSnellen: formData.conRxLejosOISnellen || '',
        ambosOjosSnellen: formData.conRxLejosAOSnellen || '',
        ojoDerechoMetros: formData.conRxLejosODMetros || '',
        ojoIzquierdoMetros: formData.conRxLejosOIMetros || '',
        ambosOjosMetros: formData.conRxLejosAOMetros || '',
        ojoDerechoDecimal: formData.conRxLejosODDecimal || '',
        ojoIzquierdoDecimal: formData.conRxLejosOIDecimal || '',
        ambosOjosDecimal: formData.conRxLejosAODecimal || '',
        ojoDerechoMAR: formData.conRxLejosODMAR || '',
        ojoIzquierdoMAR: formData.conRxLejosOIMAR || '',
        ambosOjosMAR: formData.conRxLejosAOMAR || ''
      },
      // 3. SIN_RX_CERCA
      {
        tipoMedicion: 'SIN_RX_CERCA',
        ojoDerechoM: formData.sinRxCercaODM || '',
        ojoIzquierdoM: formData.sinRxCercaOIM || '',
        ambosOjosM: formData.sinRxCercaAOM || '',
        ojoDerechoJeager: formData.sinRxCercaODJeager || '',
        ojoIzquierdoJeager: formData.sinRxCercaOIJeager || '',
        ambosOjosJeager: formData.sinRxCercaAOJeager || '',
        ojoDerechoPuntos: formData.sinRxCercaODPuntos || '',
        ojoIzquierdoPuntos: formData.sinRxCercaOIPuntos || '',
        ambosOjosPuntos: formData.sinRxCercaAOPuntos || ''
      },
      // 4. CON_RX_ANTERIOR_CERCA
      {
        tipoMedicion: 'CON_RX_ANTERIOR_CERCA',
        ojoDerechoM: formData.conRxCercaODM || '',
        ojoIzquierdoM: formData.conRxCercaOIM || '',
        ambosOjosM: formData.conRxCercaAOM || '',
        ojoDerechoJeager: formData.conRxCercaODJeager || '',
        ojoIzquierdoJeager: formData.conRxCercaOIJeager || '',
        ambosOjosJeager: formData.conRxCercaAOJeager || '',
        ojoDerechoPuntos: formData.conRxCercaODPuntos || '',
        ojoIzquierdoPuntos: formData.conRxCercaOIPuntos || '',
        ambosOjosPuntos: formData.conRxCercaAOPuntos || ''
      },
      // 5. CAP_VISUAL (Capacidad Visual)
      {
        tipoMedicion: 'CAP_VISUAL',
        diametroMM: formData.diametroMM || '',
        capacidadVisualOD: formData.capacidadVisualOD || '',
        capacidadVisualOI: formData.capacidadVisualOI || '',
        capacidadVisualAO: formData.capacidadVisualAO || ''
      }
    ];
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
            // Process each tipo de medición
            historia.agudezaVisual.forEach((agudeza: any) => {
              const tipoMedicion = agudeza.TipoMedicion || agudeza.tipoMedicion;
              
              if (tipoMedicion === 'SIN_RX_LEJOS') {
                this.agudezaVisual.patchValue({
                  sinRxLejosODSnellen: agudeza.OjoDerechoSnellen || agudeza.ojoDerechoSnellen || '',
                  sinRxLejosOISnellen: agudeza.OjoIzquierdoSnellen || agudeza.ojoIzquierdoSnellen || '',
                  sinRxLejosAOSnellen: agudeza.AmbosOjosSnellen || agudeza.ambosOjosSnellen || '',
                  sinRxLejosODMetros: agudeza.OjoDerechoMetros || agudeza.ojoDerechoMetros || '',
                  sinRxLejosOIMetros: agudeza.OjoIzquierdoMetros || agudeza.ojoIzquierdoMetros || '',
                  sinRxLejosAOMetros: agudeza.AmbosOjosMetros || agudeza.ambosOjosMetros || '',
                  sinRxLejosODDecimal: agudeza.OjoDerechoDecimal || agudeza.ojoDerechoDecimal || '',
                  sinRxLejosOIDecimal: agudeza.OjoIzquierdoDecimal || agudeza.ojoIzquierdoDecimal || '',
                  sinRxLejosAODecimal: agudeza.AmbosOjosDecimal || agudeza.ambosOjosDecimal || '',
                  sinRxLejosODMAR: agudeza.OjoDerechoMAR || agudeza.ojoDerechoMAR || '',
                  sinRxLejosOIMAR: agudeza.OjoIzquierdoMAR || agudeza.ojoIzquierdoMAR || '',
                  sinRxLejosAOMAR: agudeza.AmbosOjosMAR || agudeza.ambosOjosMAR || ''
                });
              } else if (tipoMedicion === 'CON_RX_ANTERIOR_LEJOS') {
                this.agudezaVisual.patchValue({
                  conRxLejosODSnellen: agudeza.OjoDerechoSnellen || agudeza.ojoDerechoSnellen || '',
                  conRxLejosOISnellen: agudeza.OjoIzquierdoSnellen || agudeza.ojoIzquierdoSnellen || '',
                  conRxLejosAOSnellen: agudeza.AmbosOjosSnellen || agudeza.ambosOjosSnellen || '',
                  conRxLejosODMetros: agudeza.OjoDerechoMetros || agudeza.ojoDerechoMetros || '',
                  conRxLejosOIMetros: agudeza.OjoIzquierdoMetros || agudeza.ojoIzquierdoMetros || '',
                  conRxLejosAOMetros: agudeza.AmbosOjosMetros || agudeza.ambosOjosMetros || '',
                  conRxLejosODDecimal: agudeza.OjoDerechoDecimal || agudeza.ojoDerechoDecimal || '',
                  conRxLejosOIDecimal: agudeza.OjoIzquierdoDecimal || agudeza.ojoIzquierdoDecimal || '',
                  conRxLejosAODecimal: agudeza.AmbosOjosDecimal || agudeza.ambosOjosDecimal || '',
                  conRxLejosODMAR: agudeza.OjoDerechoMAR || agudeza.ojoDerechoMAR || '',
                  conRxLejosOIMAR: agudeza.OjoIzquierdoMAR || agudeza.ojoIzquierdoMAR || '',
                  conRxLejosAOMAR: agudeza.AmbosOjosMAR || agudeza.ambosOjosMAR || ''
                });
              } else if (tipoMedicion === 'SIN_RX_CERCA') {
                this.agudezaVisual.patchValue({
                  sinRxCercaODM: agudeza.OjoDerechoM || agudeza.ojoDerechoM || '',
                  sinRxCercaOIM: agudeza.OjoIzquierdoM || agudeza.ojoIzquierdoM || '',
                  sinRxCercaAOM: agudeza.AmbosOjosM || agudeza.ambosOjosM || '',
                  sinRxCercaODJeager: agudeza.OjoDerechoJeager || agudeza.ojoDerechoJeager || '',
                  sinRxCercaOIJeager: agudeza.OjoIzquierdoJeager || agudeza.ojoIzquierdoJeager || '',
                  sinRxCercaAOJeager: agudeza.AmbosOjosJeager || agudeza.ambosOjosJeager || '',
                  sinRxCercaODPuntos: agudeza.OjoDerechoPuntos || agudeza.ojoDerechoPuntos || '',
                  sinRxCercaOIPuntos: agudeza.OjoIzquierdoPuntos || agudeza.ojoIzquierdoPuntos || '',
                  sinRxCercaAOPuntos: agudeza.AmbosOjosPuntos || agudeza.ambosOjosPuntos || ''
                });
              } else if (tipoMedicion === 'CON_RX_ANTERIOR_CERCA') {
                this.agudezaVisual.patchValue({
                  conRxCercaODM: agudeza.OjoDerechoM || agudeza.ojoDerechoM || '',
                  conRxCercaOIM: agudeza.OjoIzquierdoM || agudeza.ojoIzquierdoM || '',
                  conRxCercaAOM: agudeza.AmbosOjosM || agudeza.ambosOjosM || '',
                  conRxCercaODJeager: agudeza.OjoDerechoJeager || agudeza.ojoDerechoJeager || '',
                  conRxCercaOIJeager: agudeza.OjoIzquierdoJeager || agudeza.ojoIzquierdoJeager || '',
                  conRxCercaAOJeager: agudeza.AmbosOjosJeager || agudeza.ambosOjosJeager || '',
                  conRxCercaODPuntos: agudeza.OjoDerechoPuntos || agudeza.ojoDerechoPuntos || '',
                  conRxCercaOIPuntos: agudeza.OjoIzquierdoPuntos || agudeza.ojoIzquierdoPuntos || '',
                  conRxCercaAOPuntos: agudeza.AmbosOjosPuntos || agudeza.ambosOjosPuntos || ''
                });
              } else if (tipoMedicion === 'CAP_VISUAL') {
                this.agudezaVisual.patchValue({
                  capacidadVisualOD: agudeza.CapacidadVisualOD || agudeza.capacidadVisualOD || '',
                  capacidadVisualOI: agudeza.CapacidadVisualOI || agudeza.capacidadVisualOI || '',
                  capacidadVisualAO: agudeza.CapacidadVisualAO || agudeza.capacidadVisualAO || '',
                  diametroMM: agudeza.DiametroMM || agudeza.diametroMM || ''
                });
              }
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
              tipoBifocalMultifocalID: lensometriaData.TipoBifocalMultifocalID || lensometriaData.tipoBifocalMultifocalID || null,
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
    return this.prepareAgudezaVisualData();
  }
}