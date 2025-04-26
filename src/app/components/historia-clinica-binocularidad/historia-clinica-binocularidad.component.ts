import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-binocularidad',
  templateUrl: './historia-clinica-binocularidad.component.html',
  styleUrls: ['./historia-clinica-binocularidad.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})

export class BinocularidadComponent implements OnInit, OnChanges {
  @Input() historiaId: number | null = null;
  @Input() hideButtons = false;
  @Output() completed = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>();

  binocularidadForm!: FormGroup;
  foriasForm!: FormGroup;
  vergenciasForm!: FormGroup;
  metodoGraficoForm!: FormGroup;

  loading = false;
  submitting = false;
  error = '';
  success = '';

  selectedFile: File | null = null;
  selectedFileName: string = '';

  metodosMedicion: any[] = [
    { ID: 1, Valor: 'Pantalleo' },
    { ID: 2, Valor: 'Thorrigton' },
    { ID: 3, Valor: 'Maddox' },
    { ID: 4, Valor: 'Von Graeffe' }
  ];

  tiposTest: any[] = [
    { ID: 35, Valor: 'Pola Mirror' },
    { ID: 36, Valor: 'Otro' },
    { ID: 37, Valor: 'P. de Worth' }
  ];

  tiposVision: any[] = [
    { ID: 38, Valor: 'Titmus' },
    { ID: 39, Valor: 'Random' },
    { ID: 40, Valor: 'Otro' }
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
    this.formReady.emit(this.binocularidadForm);
    this.formReady.emit(this.foriasForm);
    this.formReady.emit(this.vergenciasForm);
    this.formReady.emit(this.metodoGraficoForm);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['historiaId'] && !changes['historiaId'].firstChange) {
      if (this.historiaId) {
        this.cargarDatosExistentes();
      }
    }
  }

  private initForms(): void {
    this.binocularidadForm = this.fb.group({
      ppc: [''], arn: [''], arp: [''],
      donders: [false], sheards: [false],
      habAcomLente: [''], habAcomDificultad: [''],
      ojoDerechoAmpAcomCm: [''], ojoDerechoAmpAcomD: [''],
      ojoIzquierdoAmpAcomCm: [''], ojoIzquierdoAmpAcomD: [''],
      ambosOjosAmpAcomCm: [''], ambosOjosAmpAcomD: ['']
    });

    this.foriasForm = this.fb.group({
      horizontalesLejos: [''], horizontalesCerca: [''],
      verticalLejos: [''], verticalCerca: [''],
      metodoMedicionID: [null], caa: [''],
      caaCalculada: [''], caaMedida: ['']
    });

    this.vergenciasForm = this.fb.group({
      positivasLejosBorroso: [''], positivasLejosRuptura: [''], positivasLejosRecuperacion: [''],
      positivasCercaBorroso: [''], positivasCercaRuptura: [''], positivasCercaRecuperacion: [''],
      negativasLejosBorroso: [''], negativasLejosRuptura: [''], negativasLejosRecuperacion: [''],
      negativasCercaBorroso: [''], negativasCercaRuptura: [''], negativasCercaRecuperacion: [''],
      supravergenciasLejosRuptura: [''], supravergenciasLejosRecuperacion: [''],
      supravergenciasCercaRuptura: [''], supravergenciasCercaRecuperacion: [''],
      infravergenciasLejosRuptura: [''], infravergenciasLejosRecuperacion: [''],
      infravergenciasCercaRuptura: [''], infravergenciasCercaRecuperacion: ['']
    });

    this.metodoGraficoForm = this.fb.group({
      integracionBinocular: [''], tipoID: [null],
      visionEstereoscopica: [''], tipoVisionID: [null], imagenID: [null]
    });
  }

  cargarDatosExistentes(): void {
    if (!this.historiaId) return;
    this.loading = true;

    this.historiaService.obtenerHistoriaClinica(this.historiaId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (historia) => {
          if (historia.binocularidad) this.binocularidadForm.patchValue(historia.binocularidad);
          if (historia.forias) this.foriasForm.patchValue(historia.forias);
          if (historia.vergencias) this.vergenciasForm.patchValue(historia.vergencias);
          if (historia.metodoGrafico) this.metodoGraficoForm.patchValue(historia.metodoGrafico);
        },
        error: (err) => {
          console.error('Error al cargar datos de binocularidad:', err);
          this.error = 'Error al cargar datos. Por favor, intente nuevamente.';
          this.completed.emit(false);
        }
      });
  }

  guardarBinocularidad(): void {
    if (!this.historiaId) {
      this.error = 'No se ha podido identificar la historia clínica.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    const payload = {
      binocularidad: this.binocularidadForm.value,
      forias: this.foriasForm.value,
      vergencias: this.vergenciasForm.value,
      metodoGrafico: this.metodoGraficoForm.value
    };

    this.historiaService.actualizarSeccion(this.historiaId, 'binocularidad', payload)
      .pipe(finalize(() => this.submitting = false))
      .subscribe({
        next: () => {
          this.success = 'Binocularidad guardada correctamente.';
          this.completed.emit(true);
          if (this.selectedFile) this.subirImagen();
          else if (!this.hideButtons) setTimeout(() => this.nextSection.emit(), 1500);
        },
        error: (err) => {
          console.error('Error al guardar binocularidad:', err);
          this.error = 'Error al guardar los datos. Por favor, intente nuevamente.';
          this.completed.emit(false);
        }
      });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
    }
  }

  subirImagen(): void {
    if (!this.historiaId || !this.selectedFile) return;
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('seccionID', '12');
    formData.append('tipoImagenID', '2');
  
    this.historiaService.subirImagen(this.historiaId, formData)
      .subscribe({
        next: (response: {imageId?: number}) => {
          if (response && response.imageId) {
            this.metodoGraficoForm.patchValue({ imagenID: response.imageId });
            this.actualizarImagenMetodoGrafico(response.imageId);
          }
          if (!this.hideButtons) setTimeout(() => this.nextSection.emit(), 1500);
        },
        error: (error: any) => {
          console.error('Error al subir imagen:', error);
          this.error = 'La binocularidad se guardó pero hubo un error al subir la imagen.';
        }
      });
  }
  
  actualizarImagenMetodoGrafico(imageId: number): void {
    if (!this.historiaId) return;
    const metodoGraficoUpdate = {
      metodoGrafico: {
        ...this.metodoGraficoForm.value,
        imagenID: imageId
      }
    };
    this.historiaService.actualizarSeccion(this.historiaId, 'metodo-grafico', metodoGraficoUpdate)
      .subscribe({
        next: () => console.log('Imagen actualizada en método gráfico'),
        error: (err) => console.error('Error al actualizar imagen en método gráfico:', err)
      });
  }

  cancelar(): void {
    this.completed.emit(false);
  }

  getBinocularidadData(): any {
    return this.binocularidadForm.value;
  }

  getForiasData(): any {
    return this.foriasForm.value;
  }

  getVergenciasData(): any {
    return this.vergenciasForm.value;
  }

  getMetodoGraficoData(): any {
    return this.metodoGraficoForm.value;
  }
}
