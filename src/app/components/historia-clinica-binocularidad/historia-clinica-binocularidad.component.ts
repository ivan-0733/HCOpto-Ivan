import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

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
  
  @Output() fileSelected = new EventEmitter<{file: File, fileName: string}>();
  @Input() selectedFile: File | null = null;
  @Input() selectedFileName: string = '';
  @Input() initialImageBase64: string | null = null;
  @Output() imageBase64Change = new EventEmitter<string | null>();


  binocularidadForm!: FormGroup;
  foriasForm!: FormGroup;
  vergenciasForm!: FormGroup;
  metodoGraficoForm!: FormGroup;
  imgPreview: string | null = null;

  loading = false;
  submitting = false;
  error = '';
  success = '';


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
    if (this.initialImageBase64) {
      this.imgPreview = this.initialImageBase64;
    }
    this.formReady.emit(this.binocularidadForm);
    this.formReady.emit(this.foriasForm);
    this.formReady.emit(this.vergenciasForm);
    this.formReady.emit(this.metodoGraficoForm);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedFile'] || changes['selectedFileName']) {
      this.selectedFile = changes['selectedFile']?.currentValue;
      this.selectedFileName = changes['selectedFileName']?.currentValue;
    }
    
    if (changes['initialImageBase64'] && changes['initialImageBase64'].currentValue) {
      this.imgPreview = changes['initialImageBase64'].currentValue;
      // Actualizar también el formulario
      if (this.metodoGraficoForm) {
        this.metodoGraficoForm.patchValue({ 
          imagenBase64: this.imgPreview 
        });
      }
    }
    
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
      visionEstereoscopica: [''], tipoVisionID: [null], imagenID: [null],
      imagenBase64: ['']
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
        
        if (historia.metodoGrafico) {
          this.metodoGraficoForm.patchValue(historia.metodoGrafico);
          
          // Si hay una imagen base64 guardada, actualizar la vista previa
          if (historia.metodoGrafico.imagenBase64) {
            this.imgPreview = historia.metodoGrafico.imagenBase64;
            this.imageBase64Change.emit(this.imgPreview);
          }
          
          // Si hay un ID de imagen, pero no tenemos la imagen en base64, cargarla del servidor
          else if (historia.metodoGrafico.imagenID && !historia.metodoGrafico.imagenBase64) {
            this.cargarImagenDesdeServidor(historia.metodoGrafico.imagenID);
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar datos de binocularidad:', err);
        this.error = 'Error al cargar datos. Por favor, intente nuevamente.';
        this.completed.emit(false);
      }
    });
}

cargarImagenDesdeServidor(imagenID: number): void {
  if (!imagenID) return;
  
  this.historiaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (base64 && typeof base64 === 'string') {
          // Asegurar que la cadena tenga el formato correcto de base64
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }
          
          // Actualizar la vista previa
          this.imgPreview = base64;
          
          // Emitir el cambio para que el componente padre lo sepa
          this.imageBase64Change.emit(this.imgPreview);
          
          // Actualizar el formulario
          this.metodoGraficoForm.patchValue({
            imagenBase64: this.imgPreview
          });
          
          console.log('Imagen del método gráfico cargada correctamente');
        } else {
          console.error('La respuesta no contiene datos válidos de imagen');
        }
      },
      error: (error) => {
        console.error('Error al cargar la imagen del método gráfico:', error);
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

  // Preparar los datos para enviar en el formato correcto
  const payload = {
    binocularidad: this.binocularidadForm.value,
    forias: this.foriasForm.value,
    vergencias: this.vergenciasForm.value,
    metodoGrafico: {
      ...this.metodoGraficoForm.value,
      // Importante: NO incluir la imagen base64 en el payload para evitar payload muy grande
      imagenBase64: undefined 
    }
  };

  console.log('Enviando datos de binocularidad:', payload);

  this.historiaService.actualizarSeccion(this.historiaId, 'binocularidad', payload)
    .pipe(finalize(() => this.submitting = false))
    .subscribe({
      next: (resultado) => {
        console.log('Resultado de actualización:', resultado);
        this.success = 'Binocularidad guardada correctamente.';
        this.completed.emit(true);
        
        // Si hay una imagen para subir y no hay un ID de imagen existente
        if (this.imgPreview && !this.metodoGraficoForm.value.imagenID) {
          this.subirImagen();
        } else if (!this.hideButtons) {
          setTimeout(() => this.nextSection.emit(), 1500);
        }
      },
      error: (err) => {
        console.error('Error al guardar binocularidad:', err);
        this.error = 'Error al guardar los datos. Por favor, intente nuevamente.';
        this.completed.emit(false);
      }
    });
}


  // Método para manejar la selección de imagen
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile = file; // Guardar la referencia al archivo
      this.selectedFileName = file.name;
      
      const reader = new FileReader();
      reader.onload = () => {
        // Actualizar la vista previa
        this.imgPreview = reader.result as string;
        
        // Actualizar el formulario
        this.metodoGraficoForm.patchValue({
          imagenBase64: this.imgPreview
        });
        
        // Emitir el base64 al padre (container)
        this.imageBase64Change.emit(this.imgPreview);
        
        // También emitir el archivo seleccionado
        this.fileSelected.emit({
          file: file,
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
  
      this.fileSelected.emit({
        file: file, 
        fileName: this.selectedFileName
      });
    }
  }

subirImagen(): void {
  if (!this.historiaId || !this.imgPreview) return;
  
  let formData = new FormData();
  
  // Convertir base64 a File
  const file = this.base64ToFile(this.imgPreview, 'metodo-grafico.png');
  if (!file) {
    console.error('No se pudo convertir la imagen base64 a File');
    return;
  }

  // Asegurarse de usar el nombre de campo correcto que espera el backend
  formData.append('file', file);
  formData.append('seccionID', '12'); // ID de la sección de binocularidad
  formData.append('tipoImagenID', '2'); // ID para método gráfico

  console.log('Subiendo imagen para historia:', this.historiaId);
  
  this.historiaService.subirImagen(this.historiaId, formData)
    .subscribe({
      next: (response) => {
        console.log('Respuesta completa de subir imagen:', response);
        
        // Extraer ID de imagen de la respuesta
        const imageId = response.data?.imageId || 
                        response.data?.id || 
                        response.imageId || 
                        response.id;
        
        if (imageId) {
          console.log('ID de imagen recuperado:', imageId);
          
          // IMPORTANTE: Actualizar correctamente metodoGrafico con el ID de la imagen
          const updateData = {
            metodoGrafico: {
              ...this.metodoGraficoForm.value,
              imagenID: imageId
            }
          };

          this.historiaService.actualizarSeccion(this.historiaId!, 'binocularidad', updateData)
            .subscribe({
              next: () => {
                console.log('Imagen asociada correctamente al método gráfico con ID:', imageId);
                
                // Actualizar el formulario local con el nuevo ID
                this.metodoGraficoForm.patchValue({
                  imagenID: imageId
                });
                
                if (!this.hideButtons) {
                  setTimeout(() => this.nextSection.emit(), 1500);
                }
              },
              error: (updateErr) => {
                console.error('Error al asociar imagen:', updateErr);
                console.error('Detalles del error:', updateErr.error || updateErr.message);
                
                if (!this.hideButtons) {
                  setTimeout(() => this.nextSection.emit(), 1500);
                }
              }
            });
        } else {
          console.warn('No se encontró ID de imagen en la respuesta');
          if (!this.hideButtons) {
            setTimeout(() => this.nextSection.emit(), 1500);
          }
        }
      },
      error: (error) => {
        console.error('Error al subir imagen:', error);
        console.error('Detalles del error:', error.error || error.message);
        this.error = 'La binocularidad se guardó pero hubo un error al subir la imagen.';
        
        if (!this.hideButtons) {
          setTimeout(() => this.nextSection.emit(), 1500);
        }
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

  base64ToFile(base64String: string, filename: string = 'imagen.png'): File | null {
    if (!base64String) return null;
    
    try {
      // Extraer la parte de datos del string base64
      const arr = base64String.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      return new File([u8arr], filename, { type: mime });
    } catch (error) {
      console.error('Error al convertir base64 a File:', error);
      return null;
    }
  }

  eliminarImagen(): void {
    // Eliminar la imagen de la vista previa
    this.imgPreview = null;
    
    // Resetear los valores de archivo
    this.selectedFile = null;
    this.selectedFileName = '';
    
    // Actualizar el formulario
    this.metodoGraficoForm.patchValue({ 
      imagenBase64: null,
      imagenID: null  // También resetear el ID de la imagen si existe
    });
    
    // Notificar al componente padre
    this.imageBase64Change.emit(null);
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