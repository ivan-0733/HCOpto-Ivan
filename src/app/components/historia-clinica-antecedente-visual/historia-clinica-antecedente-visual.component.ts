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
  @Output() nextSection = new EventEmitter<void>();
  @Output() datosGuardados = new EventEmitter<any>();
  @Output() formReady = new EventEmitter<any>();
  @Output() completed = new EventEmitter<boolean>();

  agudezaVisual!: FormGroup;
  lensometria!: FormGroup;
  loading = false;
  submitting = false;
  datosCargados = false;
  error = '';
  success = '';

  tiposLente: any[] = [
    { ID: 3, Valor: 'Monofocal' },
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

    // if (this.historiaId) {
    //   this.cargarDatosExistentes();
    // }
    // --- FIN CORRECCIÓN ---

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
    // --- CORRECCIÓN ---
    // Se elimina la lógica de este método
    // if (changes['historiaId'] && !changes['historiaId'].firstChange) {
    //   if (this.historiaId) {
    //     this.cargarDatosExistentes();
    //   }
    // }
    // --- FIN CORRECCIÓN ---
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
        ambosOjosJeager: formData.sinRxCercaAOJeager || '',
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
        // Cargar Agudeza Visual
        if (historia.agudezaVisual && historia.agudezaVisual.length > 0) {
          historia.agudezaVisual.forEach((agudeza: any) => {
            const tipoMedicion = agudeza.TipoMedicion || agudeza.tipoMedicion;

            if (tipoMedicion === 'SIN_RX_LEJOS') {
              this.agudezaVisual.patchValue({
                sinRxLejosODSnellen: agudeza.OjoDerechoSnellen || '',
                sinRxLejosOISnellen: agudeza.OjoIzquierdoSnellen || '',
                sinRxLejosAOSnellen: agudeza.AmbosOjosSnellen || '',
                sinRxLejosODMetros: agudeza.OjoDerechoMetros || '',
                sinRxLejosOIMetros: agudeza.OjoIzquierdoMetros || '',
                sinRxLejosAOMetros: agudeza.AmbosOjosMetros || '',
                sinRxLejosODDecimal: agudeza.OjoDerechoDecimal || '',
                sinRxLejosOIDecimal: agudeza.OjoIzquierdoDecimal || '',
                sinRxLejosAODecimal: agudeza.AmbosOjosDecimal || '',
                sinRxLejosODMAR: agudeza.OjoDerechoMAR || '',
                sinRxLejosOIMAR: agudeza.OjoIzquierdoMAR || '',
                sinRxLejosAOMAR: agudeza.AmbosOjosMAR || ''
              });
            } else if (tipoMedicion === 'CON_RX_ANTERIOR_LEJOS') {
              this.agudezaVisual.patchValue({
                conRxLejosODSnellen: agudeza.OjoDerechoSnellen || '',
                conRxLejosOISnellen: agudeza.OjoIzquierdoSnellen || '',
                conRxLejosAOSnellen: agudeza.AmbosOjosSnellen || '',
                conRxLejosODMetros: agudeza.OjoDerechoMetros || '',
                conRxLejosOIMetros: agudeza.OjoIzquierdoMetros || '',
                conRxLejosAOMetros: agudeza.AmbosOjosMetros || '',
                conRxLejosODDecimal: agudeza.OjoDerechoDecimal || '',
                conRxLejosOIDecimal: agudeza.OjoIzquierdoDecimal || '',
                conRxLejosAODecimal: agudeza.AmbosOjosDecimal || '',
                conRxLejosODMAR: agudeza.OjoDerechoMAR || '',
                conRxLejosOIMAR: agudeza.OjoIzquierdoMAR || '',
                conRxLejosAOMAR: agudeza.AmbosOjosMAR || ''
              });
            } else if (tipoMedicion === 'SIN_RX_CERCA') {
              this.agudezaVisual.patchValue({
                sinRxCercaODM: agudeza.OjoDerechoM || '',
                sinRxCercaOIM: agudeza.OjoIzquierdoM || '',
                sinRxCercaAOM: agudeza.AmbosOjosM || '',
                sinRxCercaODJeager: agudeza.OjoDerechoJeager || '',
                sinRxCercaOIJeager: agudeza.OjoIzquierdoJeager || '',
                sinRxCercaAOJeager: agudeza.AmbosOjosJeager || '',
                sinRxCercaODPuntos: agudeza.OjoDerechoPuntos || '',
                sinRxCercaOIPuntos: agudeza.OjoIzquierdoPuntos || '',
                sinRxCercaAOPuntos: agudeza.AmbosOjosPuntos || ''
              });
            } else if (tipoMedicion === 'CON_RX_ANTERIOR_CERCA') {
              this.agudezaVisual.patchValue({
                conRxCercaODM: agudeza.OjoDerechoM || '',
                conRxCercaOIM: agudeza.OjoIzquierdoM || '',
                conRxCercaAOM: agudeza.AmbosOjosM || '',
                conRxCercaODJeager: agudeza.OjoDerechoJeager || '',
                conRxCercaOIJeager: agudeza.OjoIzquierdoJeager || '',
                conRxCercaAOJeager: agudeza.AmbosOjosJeager || '',
                conRxCercaODPuntos: agudeza.OjoDerechoPuntos || '',
                conRxCercaOIPuntos: agudeza.OjoIzquierdoPuntos || '',
                conRxCercaAOPuntos: agudeza.AmbosOjosPuntos || ''
              });
            } else if (tipoMedicion === 'CAP_VISUAL') {
              this.agudezaVisual.patchValue({
                capacidadVisualOD: agudeza.CapacidadVisualOD || '',
                capacidadVisualOI: agudeza.CapacidadVisualOI || '',
                capacidadVisualAO: agudeza.CapacidadVisualAO || '',
                diametroMM: agudeza.DiametroMM || ''
              });
            }
          });
        }

        // Cargar Lensometría
        if (historia.lensometria) {
          this.lensometria.patchValue({
            ojoDerechoEsfera: historia.lensometria.OjoDerechoEsfera || '',
            ojoDerechoCilindro: historia.lensometria.OjoDerechoCilindro || '',
            ojoDerechoEje: historia.lensometria.OjoDerechoEje || '',
            ojoIzquierdoEsfera: historia.lensometria.OjoIzquierdoEsfera || '',
            ojoIzquierdoCilindro: historia.lensometria.OjoIzquierdoCilindro || '',
            ojoIzquierdoEje: historia.lensometria.OjoIzquierdoEje || '',
            tipoBifocalMultifocalID: historia.lensometria.TipoBifocalMultifocalID || null,
            valorADD: historia.lensometria.ValorADD || '',
            distanciaRango: historia.lensometria.DistanciaRango || '',
            centroOptico: historia.lensometria.CentroOptico || ''
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar datos existentes:', error);
        this.error = 'Error al cargar los datos. Por favor, intenta nuevamente.';
      }
    });
}

  guardarAntecedenteVisual(): void {
    if (!this.historiaId) {
      this.error = 'ID de historia clínica no válido.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    // Preparar datos para enviar
    const datosAntecedente = {
      agudezaVisual: this.prepareAgudezaVisualData(),
      lensometria: this.lensometria.value
    };

    this.historiaService.actualizarSeccion(
      this.historiaId,
      'antecedente-visual',
      datosAntecedente
    )
    .pipe(
      finalize(() => {
        this.submitting = false;
      })
    )
    .subscribe({
      next: () => {
        this.success = 'Antecedente visual guardado correctamente.';
        this.completed.emit(true);
        this.datosGuardados.emit(true);

        // Avanzar a la siguiente sección después de un breve retraso
        setTimeout(() => {
          this.nextSection.emit();
        }, 1500);
      },
      error: (error) => {
        this.error = 'Error al guardar el antecedente visual: ' + (error.message || 'Intente nuevamente');
        console.error('Error al guardar antecedente visual:', error);
        this.completed.emit(false);
        this.datosGuardados.emit(false);
      }
    });
  }

  getLensometriaData(): any {
    return this.lensometria.value;
  }

  getAgudezaData(): any {
    return this.prepareAgudezaVisualData();
  }
}