import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-examen-preliminar',
  templateUrl: './historia-clinica-examen-preliminar.component.html',
  styleUrls: ['./historia-clinica-examen-preliminar.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class ExamenPreliminarComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() historiaId: number | null = null;
  @Input() hideButtons = false;
  @Output() completed = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>();

  // Referencias a los textareas para auto-resize
  @ViewChild('ojoDerechoAnexosRef') ojoDerechoAnexosRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('ojoIzquierdoAnexosRef') ojoIzquierdoAnexosRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('ojoDerechoSegmentoAnteriorRef') ojoDerechoSegmentoAnteriorRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('ojoIzquierdoSegmentoAnteriorRef') ojoIzquierdoSegmentoAnteriorRef!: ElementRef<HTMLTextAreaElement>;

  // Formularios para cada subsección
  alineacionForm!: FormGroup;
  motilidadForm!: FormGroup;
  exploracionForm!: FormGroup;
  viaPupilarForm!: FormGroup;

  loading = false;
  submitting = false;
  error = '';
  success = '';

  // Configuración para auto-resize
  private readonly minHeight = 100; // Altura mínima en px
  private readonly maxHeight = 500; // Altura máxima en px
  private readonly lineHeight = 24; // Altura de línea aproximada en px

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
    this.formReady.emit(this.alineacionForm);
    this.formReady.emit(this.motilidadForm);
    this.formReady.emit(this.exploracionForm);
    this.formReady.emit(this.viaPupilarForm);

    // Suscribirse a cambios en el formulario para auto-resize
    this.exploracionForm.valueChanges.subscribe(() => {
      // Usar setTimeout para asegurar que el DOM se actualice antes del resize
      setTimeout(() => {
        this.autoResizeAllTextareas();
      }, 0);
    });
  }

  ngAfterViewInit(): void {
    // Aplicar auto-resize inicial después de que la vista se inicialice
    setTimeout(() => {
      this.autoResizeAllTextareas();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['historiaId'] && !changes['historiaId'].firstChange) {
      if (this.historiaId) {
        this.cargarDatosExistentes();
      }
    }
  }

  /**
   * Función para auto-resize de un textarea específico
   * @param textareaRef Referencia al elemento textarea
   */
  autoResize(textareaRef: ElementRef<HTMLTextAreaElement> | HTMLTextAreaElement): void {
    const textarea = textareaRef instanceof ElementRef ? textareaRef.nativeElement : textareaRef;

    if (!textarea) {
      return;
    }

    // Resetear altura para obtener scrollHeight correcto
    textarea.style.height = 'auto';

    // Calcular nueva altura basada en contenido
    const scrollHeight = textarea.scrollHeight;
    let newHeight = Math.max(this.minHeight, scrollHeight);

    // Aplicar altura máxima si es necesario
    if (newHeight > this.maxHeight) {
      newHeight = this.maxHeight;
      textarea.style.overflowY = 'auto'; // Mostrar scroll si excede máximo
    } else {
      textarea.style.overflowY = 'hidden'; // Ocultar scroll si no excede
    }

    // Aplicar nueva altura
    textarea.style.height = newHeight + 'px';
  }

  /**
   * Aplicar auto-resize a todos los textareas
   */
  private autoResizeAllTextareas(): void {
    const textareas = [
      this.ojoDerechoAnexosRef,
      this.ojoIzquierdoAnexosRef,
      this.ojoDerechoSegmentoAnteriorRef,
      this.ojoIzquierdoSegmentoAnteriorRef
    ];

    textareas.forEach(textareaRef => {
      if (textareaRef?.nativeElement) {
        this.autoResize(textareaRef);
      }
    });
  }

  private initForms(): void {
    // Formulario de Alineación Ocular
    this.alineacionForm = this.fb.group({
      lejosHorizontal: [''],
      lejosVertical: [''],
      cercaHorizontal: [''],
      cercaVertical: [''],
      metodoID: ['']
    });

    // Formulario de Motilidad
    this.motilidadForm = this.fb.group({
      versiones: [''],
      ducciones: [''],
      sacadicos: [''],
      persecucion: [''],
      fijacion: ['']
    });

    // Formulario de Exploración Física
    this.exploracionForm = this.fb.group({
      ojoDerechoAnexos: [''],
      ojoIzquierdoAnexos: [''],
      ojoDerechoSegmentoAnterior: [''],
      ojoIzquierdoSegmentoAnterior: ['']
    });

    // Formulario de Vía Pupilar
    this.viaPupilarForm = this.fb.group({
      ojoDerechoDiametro: [''],
      ojoIzquierdoDiametro: [''],
      ojoDerechoFotomotorPresente: [false],
      ojoDerechoConsensualPresente: [false],
      ojoDerechoAcomodativoPresente: [false],
      ojoIzquierdoFotomotorPresente: [false],
      ojoIzquierdoConsensualPresente: [false],
      ojoIzquierdoAcomodativoPresente: [false],
      ojoDerechoFotomotorAusente: [false],
      ojoDerechoConsensualAusente: [false],
      ojoDerechoAcomodativoAusente: [false],
      ojoIzquierdoFotomotorAusente: [false],
      ojoIzquierdoConsensualAusente: [false],
      ojoIzquierdoAcomodativoAusente: [false],
      esIsocoria: [false],
      esAnisocoria: [false],
      respuestaAcomodacion: [false],
      pupilasIguales: [false],
      pupilasRedondas: [false],
      respuestaLuz: [false],
      dip: [''],
      dominanciaOcularID: ['']
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
          // Cargar datos de alineación ocular
          if (historia.alineacionOcular) {
            this.alineacionForm.patchValue({
              lejosHorizontal: historia.alineacionOcular.LejosHorizontal || '',
              lejosVertical: historia.alineacionOcular.LejosVertical || '',
              cercaHorizontal: historia.alineacionOcular.CercaHorizontal || '',
              cercaVertical: historia.alineacionOcular.CercaVertical || '',
              metodoID: historia.alineacionOcular.MetodoID || ''
            });
          }

          // Cargar datos de motilidad
          if (historia.motilidad) {
            this.motilidadForm.patchValue({
              versiones: historia.motilidad.Versiones || '',
              ducciones: historia.motilidad.Ducciones || '',
              sacadicos: historia.motilidad.Sacadicos || '',
              persecucion: historia.motilidad.Persecucion || '',
              fijacion: historia.motilidad.Fijacion || ''
            });
          }

          // Cargar datos de exploración física
          if (historia.exploracionFisica) {
            this.exploracionForm.patchValue({
              ojoDerechoAnexos: historia.exploracionFisica.OjoDerechoAnexos || '',
              ojoIzquierdoAnexos: historia.exploracionFisica.OjoIzquierdoAnexos || '',
              ojoDerechoSegmentoAnterior: historia.exploracionFisica.OjoDerechoSegmentoAnterior || '',
              ojoIzquierdoSegmentoAnterior: historia.exploracionFisica.OjoIzquierdoSegmentoAnterior || ''
            });

            // Aplicar auto-resize después de cargar datos
            setTimeout(() => {
              this.autoResizeAllTextareas();
            }, 100);
          }

          // Cargar datos de vía pupilar
          if (historia.viaPupilar) {
            this.viaPupilarForm.patchValue({
              ojoDerechoDiametro: historia.viaPupilar.OjoDerechoDiametro || '',
              ojoIzquierdoDiametro: historia.viaPupilar.OjoIzquierdoDiametro || '',
              ojoDerechoFotomotorPresente: historia.viaPupilar.OjoDerechoFotomotorPresente || false,
              ojoDerechoConsensualPresente: historia.viaPupilar.OjoDerechoConsensualPresente || false,
              ojoDerechoAcomodativoPresente: historia.viaPupilar.OjoDerechoAcomodativoPresente || false,
              ojoIzquierdoFotomotorPresente: historia.viaPupilar.OjoIzquierdoFotomotorPresente || false,
              ojoIzquierdoConsensualPresente: historia.viaPupilar.OjoIzquierdoConsensualPresente || false,
              ojoIzquierdoAcomodativoPresente: historia.viaPupilar.OjoIzquierdoAcomodativoPresente || false,
              ojoDerechoFotomotorAusente: historia.viaPupilar.OjoDerechoFotomotorAusente || false,
              ojoDerechoConsensualAusente: historia.viaPupilar.OjoDerechoConsensualAusente || false,
              ojoDerechoAcomodativoAusente: historia.viaPupilar.OjoDerechoAcomodativoAusente || false,
              ojoIzquierdoFotomotorAusente: historia.viaPupilar.OjoIzquierdoFotomotorAusente || false,
              ojoIzquierdoConsensualAusente: historia.viaPupilar.OjoIzquierdoConsensualAusente || false,
              ojoIzquierdoAcomodativoAusente: historia.viaPupilar.OjoIzquierdoAcomodativoAusente || false,
              esIsocoria: historia.viaPupilar.EsIsocoria || false,
              esAnisocoria: historia.viaPupilar.EsAnisocoria || false,
              respuestaAcomodacion: historia.viaPupilar.RespuestaAcomodacion || false,
              pupilasIguales: historia.viaPupilar.PupilasIguales || false,
              pupilasRedondas: historia.viaPupilar.PupilasRedondas || false,
              respuestaLuz: historia.viaPupilar.RespuestaLuz || false,
              dip: historia.viaPupilar.DIP || '',
              dominanciaOcularID: historia.viaPupilar.DominanciaOcularID || ''
            });
          }

          // Emitir que los datos se han cargado correctamente
          this.completed.emit(true);
        },
        error: (err) => {
          console.error('Error al cargar datos de examen preliminar:', err);
          this.error = 'Error al cargar datos. Por favor, intente nuevamente.';
          this.completed.emit(false);
        }
      });
  }

  guardarExamenPreliminar(): void {
    if (!this.historiaId) {
      this.error = 'No se ha podido identificar la historia clínica.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    // Preparar datos de cada subsección
    const alineacionData = this.alineacionForm.value;
    const motilidadData = this.motilidadForm.value;
    const exploracionData = this.exploracionForm.value;
    const viaPupilarData = this.viaPupilarForm.value;

    // Crear un array de observables para cada subsección
    const promises = [];

    // Actualizar alineación ocular
    promises.push(
      this.historiaService.actualizarSeccion(
        this.historiaId,
        'alineacion-ocular',
        alineacionData
      ).toPromise()
    );

    // Actualizar motilidad
    promises.push(
      this.historiaService.actualizarSeccion(
        this.historiaId,
        'motilidad',
        motilidadData
      ).toPromise()
    );

    // Actualizar exploración física
    promises.push(
      this.historiaService.actualizarSeccion(
        this.historiaId,
        'exploracion-fisica',
        exploracionData
      ).toPromise()
    );

    // Actualizar vía pupilar
    promises.push(
      this.historiaService.actualizarSeccion(
        this.historiaId,
        'via-pupilar',
        viaPupilarData
      ).toPromise()
    );

    // Ejecutar todas las actualizaciones en paralelo
    Promise.all(promises)
      .then(() => {
        this.success = 'Examen preliminar guardado correctamente.';
        this.completed.emit(true);

        setTimeout(() => {
          this.nextSection.emit();
        }, 1500);
      })
      .catch(error => {
        this.error = 'Error al guardar el examen preliminar. Por favor, intente nuevamente.';
        console.error('Error al guardar examen preliminar:', error);
        this.completed.emit(false);
      })
      .finally(() => {
        this.submitting = false;
      });
  }

  cancelar(): void {
    this.completed.emit(false);
  }

  // Métodos para acceder a los datos de cada formulario
  getAlineacionData(): any {
    return this.alineacionForm.value;
  }

  getMotilidadData(): any {
    return this.motilidadForm.value;
  }

  getExploracionData(): any {
    return this.exploracionForm.value;
  }

  getViaPupilarData(): any {
    return this.viaPupilarForm.value;
  }
}