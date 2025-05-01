import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { finalize } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-deteccion-alteraciones',
  templateUrl: './historia-clinica-alteraciones.component.html',
  styleUrls: ['./historia-clinica-alteraciones.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class DeteccionAlteracionesComponent implements OnInit, OnChanges {
  @Input() historiaId: number | null = null;
  @Input() hideButtons = false;
  @Output() completed = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>();
  
  // Entradas y salidas para manejar imágenes
  @Output() fileSelected = new EventEmitter<{file: File, fileName: string, imageType: string}>();
  @Output() imageBase64Change = new EventEmitter<{base64: string | null, imageType: string}>();
  @Input() initialImagenPreviews: {[key: string]: string | null} = {};
  @Input() selectedFiles: {[key: string]: File | null} = {};

  // Formularios para cada subsección
  gridAmslerForm!: FormGroup;
  tonometriaForm!: FormGroup;
  paquimetriaForm!: FormGroup;
  campimetriaForm!: FormGroup;
  biomicroscopiaForm!: FormGroup;
  oftalmoscopiaForm!: FormGroup;

  loading = false;
  submitting = false;
  error = '';
  success = '';

  // Manejo de imágenes
  imagenPreviews: {[key: string]: string | null} = {
    gridAmslerOD: null,
    gridAmslerOI: null,
    campimetriaOD: null,
    campimetriaOI: null,
    
    biomicroscopiaOD1: null,
    biomicroscopiaOI1: null,
    biomicroscopiaOD2: null,
    biomicroscopiaOI2: null,
    biomicroscopiaOD3: null,
    biomicroscopiaOI3: null,

    oftalmoscopiaOD: null,
    oftalmoscopiaOI: null
  };

  // Catálogos para los selects
  tiposTonometria: any[] = [
    { ID: 31, Valor: 'Aplanación' },
    { ID: 32, Valor: 'Identación' },
    { ID: 33, Valor: 'Aire' }
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
    
    // Emitir los formularios para que el contenedor los registre
    this.formReady.emit(this.gridAmslerForm);
    this.formReady.emit(this.tonometriaForm);
    this.formReady.emit(this.paquimetriaForm);
    this.formReady.emit(this.campimetriaForm);
    this.formReady.emit(this.biomicroscopiaForm);
    this.formReady.emit(this.oftalmoscopiaForm);

    // Inicializar las vistas previas de imágenes si se proporcionan
    if (this.initialImagenPreviews) {
      Object.keys(this.initialImagenPreviews).forEach(key => {
        if (this.initialImagenPreviews[key]) {
          this.imagenPreviews[key] = this.initialImagenPreviews[key];
          this.actualizarFormularioConImagen(key, this.initialImagenPreviews[key]);
        }
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['historiaId'] && !changes['historiaId'].firstChange) {
      if (this.historiaId) {
        this.cargarDatosExistentes();
      }
    }

    // Manejar cambios en las vistas previas de imágenes
    if (changes['initialImagenPreviews'] && changes['initialImagenPreviews'].currentValue) {
      Object.keys(changes['initialImagenPreviews'].currentValue).forEach(key => {
        const newValue = changes['initialImagenPreviews'].currentValue[key];
        if (newValue && this.imagenPreviews[key] !== newValue) {
          this.imagenPreviews[key] = newValue;
          this.actualizarFormularioConImagen(key, newValue);
        }
      });
    }
  }

  private initForms(): void {
    // Formulario de Grid de Amsler
    this.gridAmslerForm = this.fb.group({
      numeroCartilla: [''],
      ojoDerechoSensibilidadContraste: [''],
      ojoIzquierdoSensibilidadContraste: [''],
      ojoDerechoVisionCromatica: [''],
      ojoIzquierdoVisionCromatica: [''],
      ojoDerechoImagenID: [null],
      ojoIzquierdoImagenID: [null],
      ojoDerechoImagenBase64: [null], // Campo para base64
      ojoIzquierdoImagenBase64: [null] // Campo para base64
    });
  
    // Formulario de Tonometría
    this.tonometriaForm = this.fb.group({
      metodoAnestesico: [''],
      fecha: [null],
      hora: [null],
      ojoDerecho: [null],
      ojoIzquierdo: [null],
      tipoID: [null]
    });
  
    // Formulario de Paquimetría
    this.paquimetriaForm = this.fb.group({
      ojoDerechoCCT: [null],
      ojoIzquierdoCCT: [null],
      ojoDerechoPIOCorregida: [null],
      ojoIzquierdoPIOCorregida: [null]
    });
  
    // Formulario de Campimetría
    this.campimetriaForm = this.fb.group({
      distancia: [null],
      tamanoColorIndice: [''],
      tamanoColorPuntoFijacion: [''],
      ojoDerechoImagenID: [null],
      ojoIzquierdoImagenID: [null],
      ojoDerechoImagenBase64: [null], // Campo para base64
      ojoIzquierdoImagenBase64: [null] // Campo para base64
    });
  
    // Formulario de Biomicroscopía (simplificado por brevedad)
    this.biomicroscopiaForm = this.fb.group({
      ojoDerechoPestanas: [''],
      ojoIzquierdoPestanas: [''],
      ojoDerechoParpadosIndice: [''],
      ojoIzquierdoParpadosIndice: [''],
      ojoDerechoBordePalpebral: [''],
      ojoIzquierdoBordePalpebral: [''],
      ojoDerechoLineaGris: [''],
      ojoIzquierdoLineaGris: [''],
      ojoDerechoCantoExterno: [''],
      ojoIzquierdoCantoExterno: [''],
      ojoDerechoCantoInterno: [''],
      ojoIzquierdoCantoInterno: [''],
      ojoDerechoPuntosLagrimales: [''],
      ojoIzquierdoPuntosLagrimales: [''],
      ojoDerechoConjuntivaTarsal: [''],
      ojoIzquierdoConjuntivaTarsal: [''],
      ojoDerechoConjuntivaBulbar: [''],
      ojoIzquierdoConjuntivaBulbar: [''],
      ojoDerechoFondoSaco: [''],
      ojoIzquierdoFondoSaco: [''],
      ojoDerechoLimbo: [''],
      ojoIzquierdoLimbo: [''],
      ojoDerechoCorneaBiomicroscopia: [''],
      ojoIzquierdoCorneaBiomicroscopia: [''],
      ojoDerechoCamaraAnterior: [''],
      ojoIzquierdoCamaraAnterior: [''],
      ojoDerechoIris: [''],
      ojoIzquierdoIris: [''],
      ojoDerechoCristalino: [''],
      ojoIzquierdoCristalino: [''],
      // IDs de imagen
      ojoDerechoImagenID: [null],
      ojoIzquierdoImagenID: [null],
      ojoDerechoImagenID2: [null],
      ojoIzquierdoImagenID2: [null],
      ojoDerechoImagenID3: [null],
      ojoIzquierdoImagenID3: [null],  
      // Imágenes en base64
        // Imágenes en base64
      ojoDerechoImagenBase64: [null],
      ojoIzquierdoImagenBase64: [null],
      ojoDerechoImagenBase64_2: [null],
      ojoIzquierdoImagenBase64_2: [null],
      ojoDerechoImagenBase64_3: [null],
      ojoIzquierdoImagenBase64_3: [null]
    });
  
    // Formulario de Oftalmoscopía (simplificado por brevedad)
    this.oftalmoscopiaForm = this.fb.group({
      ojoDerechoPapila: [''],
      ojoIzquierdoPapila: [''],
      ojoDerechoExcavacion: [''],
      ojoIzquierdoExcavacion: [''],
      ojoDerechoRadio: [''],
      ojoIzquierdoRadio: [''],
      ojoDerechoProfundidad: [''],
      ojoIzquierdoProfundidad: [''],
      ojoDerechoVasos: [''],
      ojoIzquierdoVasos: [''],
      ojoDerechoRELAV: [''],
      ojoIzquierdoRELAV: [''],
      ojoDerechoMacula: [''],
      ojoIzquierdoMacula: [''],
      ojoDerechoReflejo: [''],
      ojoIzquierdoReflejo: [''],
      ojoDerechoRetinaPeriferica: [''],
      ojoIzquierdoRetinaPeriferica: [''],
      ojoDerechoISNT: [''],
      ojoIzquierdoISNT: [''],
      // IDs de imagen
      ojoDerechoImagenID: [null],
      ojoIzquierdoImagenID: [null],
      // Imágenes en base64
      ojoDerechoImagenBase64: [null],
      ojoIzquierdoImagenBase64: [null]
    });
  }

  cargarDatosExistentes(): void {
    if (!this.historiaId) return;
    this.loading = true;
    this.error = '';

    this.historiaService.obtenerHistoriaClinica(this.historiaId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (historia) => {
          // Cargar datos de Grid de Amsler
          if (historia.gridAmsler) {
            this.gridAmslerForm.patchValue(historia.gridAmsler);
            
            // Configurar previsualizaciones de imágenes si existen
            if (historia.gridAmsler.ojoDerechoImagenBase64) {
              this.imagenPreviews['gridAmslerOD'] = historia.gridAmsler.ojoDerechoImagenBase64;
            }
            if (historia.gridAmsler.ojoIzquierdoImagenBase64) {
              this.imagenPreviews['gridAmslerOI'] = historia.gridAmsler.ojoIzquierdoImagenBase64;
            }
          }

          // Cargar datos de Tonometría
          if (historia.tonometria) {
            this.tonometriaForm.patchValue(historia.tonometria);
          }

          // Cargar datos de Paquimetría
          if (historia.paquimetria) {
            this.paquimetriaForm.patchValue(historia.paquimetria);
          }

          // Cargar datos de Campimetría
          if (historia.campimetria) {
            this.campimetriaForm.patchValue(historia.campimetria);
            
            if (historia.campimetria.ojoDerechoImagenBase64) {
              this.imagenPreviews['campimetriaOD'] = historia.campimetria.ojoDerechoImagenBase64;
            }
            if (historia.campimetria.ojoIzquierdoImagenBase64) {
              this.imagenPreviews['campimetriaOI'] = historia.campimetria.ojoIzquierdoImagenBase64;
            }
          }

         // Cargar datos de Biomicroscopía
        if (historia.biomicroscopia) {
          this.biomicroscopiaForm.patchValue(historia.biomicroscopia);
          
          // Primera imagen OD
          if (historia.biomicroscopia.ojoDerechoImagenBase64) {
            this.imagenPreviews['biomicroscopiaOD1'] = historia.biomicroscopia.ojoDerechoImagenBase64;
          }
          
          // Primera imagen OI
          if (historia.biomicroscopia.ojoIzquierdoImagenBase64) {
            this.imagenPreviews['biomicroscopiaOI1'] = historia.biomicroscopia.ojoIzquierdoImagenBase64;
          }
          
          // Segunda imagen OD
          if (historia.biomicroscopia.ojoDerechoImagenBase64_2) {
            this.imagenPreviews['biomicroscopiaOD2'] = historia.biomicroscopia.ojoDerechoImagenBase64_2;
          }
          
          // Segunda imagen OI
          if (historia.biomicroscopia.ojoIzquierdoImagenBase64_2) {
            this.imagenPreviews['biomicroscopiaOI2'] = historia.biomicroscopia.ojoIzquierdoImagenBase64_2;
          }
          
          // Tercera imagen OD
          if (historia.biomicroscopia.ojoDerechoImagenBase64_3) {
            this.imagenPreviews['biomicroscopiaOD3'] = historia.biomicroscopia.ojoDerechoImagenBase64_3;
          }
          
          // Tercera imagen OI
          if (historia.biomicroscopia.ojoIzquierdoImagenBase64_3) {
            this.imagenPreviews['biomicroscopiaOI3'] = historia.biomicroscopia.ojoIzquierdoImagenBase64_3;
          }
        }

          // Cargar datos de Oftalmoscopía
          if (historia.oftalmoscopia) {
            this.oftalmoscopiaForm.patchValue(historia.oftalmoscopia);
            
            if (historia.oftalmoscopia.ojoDerechoImagenBase64) {
              this.imagenPreviews['oftalmoscopiaOD'] = historia.oftalmoscopia.ojoDerechoImagenBase64;
            }
            if (historia.oftalmoscopia.ojoIzquierdoImagenBase64) {
              this.imagenPreviews['oftalmoscopiaOI'] = historia.oftalmoscopia.ojoIzquierdoImagenBase64;
            }
          }

          // Emitir las imágenes cargadas al componente padre
          Object.keys(this.imagenPreviews).forEach(key => {
            if (this.imagenPreviews[key]) {
              this.imageBase64Change.emit({
                base64: this.imagenPreviews[key],
                imageType: key
              });
            }
          });
        },
        error: (err) => {
          console.error('Error al cargar datos de detección de alteraciones:', err);
          this.error = 'Error al cargar datos. Por favor, intente nuevamente.';
          this.completed.emit(false);
        }
      });
  }

  // // Método para manejar la selección de imágenes
  // onImageSelected(event: Event, imageType: string): void {
  //   const input = event.target as HTMLInputElement;
  //   if (input.files && input.files[0]) {
  //     const file = input.files[0];
      
  //     // Guardar referencia al archivo
  //     this.selectedFiles[imageType] = file;
      
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       // Almacenar la previsualización
  //       const base64 = reader.result as string;
  //       this.imagenPreviews[imageType] = base64;
        
  //       // Actualizar el formulario correspondiente
  //       this.actualizarFormularioConImagen(imageType, base64);
        
  //       // Emitir al componente padre
  //       this.imageBase64Change.emit({
  //         base64: base64,
  //         imageType: imageType
  //       });
        
  //       // Emitir información del archivo
  //       this.fileSelected.emit({
  //         file: file,
  //         fileName: file.name,
  //         imageType: imageType
  //       });
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // }

  onImageSelected(event: Event, imageType: string): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    const file = input.files[0];
    
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      this.error = 'Solo se permiten archivos JPG o PNG';
      return;
    }
    
    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.error = 'La imagen no debe superar los 10MB';
      return;
    }
    
    // Guardar referencia al archivo para envío multipart posterior
    this.selectedFiles[imageType] = file;
    
    // Crear previsualización usando Base64
    const reader = new FileReader();
    reader.onload = () => {
      try {
        // Almacenar la previsualización
        const base64 = reader.result as string;
        this.imagenPreviews[imageType] = base64;
        
        // Actualizar el formulario correspondiente solo para previsualización
        this.actualizarFormularioConImagen(imageType, base64);
        
        // Emitir al componente padre para coordinar previsualizaciones
        this.imageBase64Change.emit({
          base64: base64,
          imageType: imageType
        });
        
        // Emitir información del archivo para futuro envío
        this.fileSelected.emit({
          file: file,
          fileName: file.name,
          imageType: imageType
        });
        
        // Limpiar errores previos
        this.error = '';
      } catch (error) {
        console.error('Error procesando la imagen:', error);
        this.error = 'Error al procesar la imagen';
      }
    };
    
    reader.onerror = () => {
      this.error = 'Error al leer el archivo';
    };
    
    reader.readAsDataURL(file);
  }
  

  guardarDeteccionAlteraciones(): void {
    if (!this.historiaId) {
      this.error = 'No se ha podido identificar la historia clínica.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    // Actualizar los formularios con las imágenes actuales
    this.actualizarFormulariosConImagenesActuales();

    // Crear el payload con todos los datos
    const payload = {
      gridAmsler: this.gridAmslerForm.value,
      tonometria: this.tonometriaForm.value,
      paquimetria: this.paquimetriaForm.value,
      campimetria: this.campimetriaForm.value,
      biomicroscopia: this.biomicroscopiaForm.value,
      oftalmoscopia: this.oftalmoscopiaForm.value
    };
  
    // Actualizar la sección en el servicio
    this.historiaService.actualizarSeccion(this.historiaId, 'deteccion-alteraciones', payload)
    .pipe(finalize(() => this.submitting = false))
    .subscribe({
      next: () => {
        this.success = 'Detección de alteraciones guardada correctamente.';
        this.completed.emit(true);  
        // Subir imágenes si existen
        this.subirImagenes().then(() => {
          if (!this.hideButtons) setTimeout(() => this.nextSection.emit(), 1500);
        });
      },
      error: (err) => {
        console.error('Error al guardar detección de alteraciones:', err);
        this.error = 'Error al guardar los datos. Por favor, intente nuevamente.';
        this.completed.emit(false);
      }
    });
  }

  // Método para actualizar todos los formularios con las imágenes actuales
  private actualizarFormulariosConImagenesActuales(): void {
    // Grid de Amsler
    this.gridAmslerForm.patchValue({
      ojoDerechoImagenBase64: this.imagenPreviews['gridAmslerOD'],
      ojoIzquierdoImagenBase64: this.imagenPreviews['gridAmslerOI']
    });

    // Campimetría
    this.campimetriaForm.patchValue({
      ojoDerechoImagenBase64: this.imagenPreviews['campimetriaOD'],
      ojoIzquierdoImagenBase64: this.imagenPreviews['campimetriaOI']
    });

    // Biomicroscopía
    this.biomicroscopiaForm.patchValue({
      ojoDerechoImagenBase64: this.imagenPreviews['biomicroscopiaOD1'],
      ojoIzquierdoImagenBase64: this.imagenPreviews['biomicroscopiaOI1'],
      ojoDerechoImagenBase64_2: this.imagenPreviews['biomicroscopiaOD2'],
      ojoIzquierdoImagenBase64_2: this.imagenPreviews['biomicroscopiaOI2'],
      ojoDerechoImagenBase64_3: this.imagenPreviews['biomicroscopiaOD3'],
      ojoIzquierdoImagenBase64_3: this.imagenPreviews['biomicroscopiaOI3']
    });

    // Oftalmoscopía
    this.oftalmoscopiaForm.patchValue({
      ojoDerechoImagenBase64: this.imagenPreviews['oftalmoscopiaOD'],
      ojoIzquierdoImagenBase64: this.imagenPreviews['oftalmoscopiaOI']
    });
  }

  // // Método asíncrono para subir todas las imágenes
  // private async subirImagenes(): Promise<void> {
  //   const promises: Promise<void>[] = [];
    
  //   Object.keys(this.selectedFiles).forEach(imageType => {
  //     const file = this.selectedFiles[imageType];
  //     if (file) {
  //       promises.push(this.subirImagen(imageType, file));
  //     }
  //   });
    
  //   await Promise.all(promises);
  // }

  private async subirImagenes(): Promise<void> {
    if (!this.historiaId || Object.keys(this.selectedFiles).length === 0) {
      return;
    }
  
    this.submitting = true;
    this.error = '';
    this.success = '';
  
    // Cambiamos el tipo de las promesas a Promise<any> para mayor flexibilidad
    const promises: Promise<any>[] = [];
    const errores: string[] = [];
    const exitos: string[] = [];
  
    Object.keys(this.selectedFiles).forEach(imageType => {
      const file = this.selectedFiles[imageType];
      if (file) {
        // Aseguramos que cada promise resuelva a void explícitamente
        promises.push(
          this.subirImagen(imageType, file)
            .then((result) => {
              exitos.push(imageType);
              return; // Aseguramos retorno void explícito
            })
            .catch((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
              errores.push(`${imageType}: ${errorMessage}`);
              return; // Aseguramos retorno void explícito
            })
        );
      }
    });
  
    try {
      await Promise.all(promises);
      
      if (errores.length > 0) {
        this.error = `Error en ${errores.length} de ${promises.length} imágenes`;
        if (exitos.length > 0) {
          this.success = `${exitos.length} imágenes subidas correctamente`;
        }
      } else {
        this.success = 'Todas las imágenes subidas correctamente';
      }
    } catch (error) {
      console.error('Error general:', error);
      this.error = 'Error al subir las imágenes';
    } finally {
      this.submitting = false;
    }
  }
  
  // Método para subir una imagen específica
  private async subirImagen(imageType: string, file: File): Promise<void> {
    if (!this.historiaId) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('seccionID', this.getSeccionIdByImageType(imageType));
    formData.append('tipoImagenID', this.getTipoImagenIdByImageType(imageType));
    
    return new Promise<void>((resolve, reject) => {
      this.historiaService.subirImagen(this.historiaId!, formData)
        .subscribe({
          next: (response: {imageId?: number}) => {
            if (response && response.imageId) {
              this.actualizarImagenId(response.imageId, imageType);
            }
            resolve();
          },
          error: (error: any) => {
            console.error(`Error al subir imagen ${imageType}:`, error);
            reject(error);
          }
        });
    });
  }

  // Obtener sección ID según el tipo de imagen
  private getSeccionIdByImageType(imageType: string): string {
    switch (imageType) {
      case 'gridAmslerOD':
      case 'gridAmslerOI':
        return '7'; // ID de sección Grid de Amsler
      case 'campimetriaOD':
      case 'campimetriaOI':
        return '9'; // ID de sección Campimetría
      case 'biomicroscopiaImg1':
      case 'biomicroscopiaImg2':
      case 'biomicroscopiaImg3':
        return '10'; // ID de sección Biomicroscopía
      case 'oftalmoscopiaOD':
      case 'oftalmoscopiaOI':
        return '11'; // ID de sección Oftalmoscopía
      default:
        return '7'; // Por defecto
    }
  }

  // Obtener tipo de imagen ID según el tipo de imagen
  private getTipoImagenIdByImageType(imageType: string): string {
    switch (imageType) {
      case 'gridAmslerOD':
      case 'gridAmslerOI':
        return '1'; // Tipo Grid Amsler
      case 'campimetriaOD':
      case 'campimetriaOI':
        return '3'; // Tipo Campimetría
      case 'biomicroscopiaImg1':
      case 'biomicroscopiaImg2':
      case 'biomicroscopiaImg3':
        return '4'; // Tipo Biomicroscopía
      case 'oftalmoscopiaOD':
      case 'oftalmoscopiaOI':
        return '5'; // Tipo Oftalmoscopía
      default:
        return '1'; // Por defecto
    }
  }

  // Actualizar el ID de imagen en el formulario correspondiente
  private actualizarImagenId(imageId: number, imageType: string): void {
    switch (imageType) {
      case 'gridAmslerOD':
        this.gridAmslerForm.patchValue({ ojoDerechoImagenID: imageId });
        break;
      case 'gridAmslerOI':
        this.gridAmslerForm.patchValue({ ojoIzquierdoImagenID: imageId });
        break;
      case 'campimetriaOD':
        this.campimetriaForm.patchValue({ ojoDerechoImagenID: imageId });
        break;
      case 'campimetriaOI':
        this.campimetriaForm.patchValue({ ojoIzquierdoImagenID: imageId });
        break;
        case 'biomicroscopiaOD1':
      this.biomicroscopiaForm.patchValue({ ojoDerechoImagenID: imageId });
      break;
    case 'biomicroscopiaOI1':
      this.biomicroscopiaForm.patchValue({ ojoIzquierdoImagenID: imageId });
      break;
    case 'biomicroscopiaOD2':
      this.biomicroscopiaForm.patchValue({ ojoDerechoImagenID2: imageId });
      break;
    case 'biomicroscopiaOI2':
      this.biomicroscopiaForm.patchValue({ ojoIzquierdoImagenID2: imageId });
      break;
    case 'biomicroscopiaOD3':
      this.biomicroscopiaForm.patchValue({ ojoDerechoImagenID3: imageId });
      break;
    case 'biomicroscopiaOI3':
      this.biomicroscopiaForm.patchValue({ ojoIzquierdoImagenID3: imageId });
      break;
      case 'oftalmoscopiaOD':
        this.oftalmoscopiaForm.patchValue({ ojoDerechoImagenID: imageId });
        break;
      case 'oftalmoscopiaOI':
        this.oftalmoscopiaForm.patchValue({ ojoIzquierdoImagenID: imageId });
        break;
    }

    // Actualizar la sección correspondiente
    const seccionId = this.getSeccionIdByImageType(imageType);
    const seccionNombre = this.getSeccionNameById(seccionId);
    
    if (seccionNombre) {
      const formData = this.getFormBySeccionName(seccionNombre).value;
      this.historiaService.actualizarSeccion(this.historiaId!, seccionNombre, formData)
        .subscribe({
          next: () => console.log(`Imagen ${imageType} actualizada en sección ${seccionNombre}`),
          error: (err) => console.error(`Error al actualizar imagen en sección ${seccionNombre}:`, err)
        });
    }
  }

  // Obtener nombre de sección por ID
  private getSeccionNameById(seccionId: string): string {
    switch (seccionId) {
      case '7': return 'grid-amsler';
      case '8': return 'tonometria';
      case '9': return 'campimetria';
      case '10': return 'biomicroscopia';
      case '11': return 'oftalmoscopia';
      default: return '';
    }
  }

  // Obtener formulario por nombre de sección
  private getFormBySeccionName(seccionName: string): FormGroup {
    switch (seccionName) {
      case 'grid-amsler': return this.gridAmslerForm;
      case 'tonometria': return this.tonometriaForm;
      case 'paquimetria': return this.paquimetriaForm;
      case 'campimetria': return this.campimetriaForm;
      case 'biomicroscopia': return this.biomicroscopiaForm;
      case 'oftalmoscopia': return this.oftalmoscopiaForm;
      default: return this.gridAmslerForm; // Valor por defecto
    }
  }

  private actualizarFormularioConImagen(imageType: string, base64: string | null): void {
    // Determinar qué formulario y qué campo actualizar según el tipo de imagen
    switch (imageType) {
      case 'gridAmslerOD':
        this.gridAmslerForm.patchValue({ 
          ojoDerechoImagenBase64: base64,
          ojoDerechoImagenID: null // Resetear el ID si se cambia la imagen
        });
        break;
      case 'gridAmslerOI':
        this.gridAmslerForm.patchValue({ 
          ojoIzquierdoImagenBase64: base64,
          ojoIzquierdoImagenID: null
        });
        break;
      case 'campimetriaOD':
        this.campimetriaForm.patchValue({ 
          ojoDerechoImagenBase64: base64,
          ojoDerechoImagenID: null
        });
        break;
      case 'campimetriaOI':
        this.campimetriaForm.patchValue({ 
          ojoIzquierdoImagenBase64: base64,
          ojoIzquierdoImagenID: null
        });
        break;
          
    case 'biomicroscopiaOD1':
      this.biomicroscopiaForm.patchValue({ 
        ojoDerechoImagenBase64: base64,
        ojoDerechoImagenID: null
      });
      break;
    case 'biomicroscopiaOI1':
      this.biomicroscopiaForm.patchValue({ 
        ojoIzquierdoImagenBase64: base64,
        ojoIzquierdoImagenID: null
      });
      break;
    case 'biomicroscopiaOD2':
      this.biomicroscopiaForm.patchValue({ 
        ojoDerechoImagenBase64_2: base64,
        ojoDerechoImagenID2: null
      });
      break;
    case 'biomicroscopiaOI2':
      this.biomicroscopiaForm.patchValue({ 
        ojoIzquierdoImagenBase64_2: base64,
        ojoIzquierdoImagenID2: null
      });
      break;
    case 'biomicroscopiaOD3':
      this.biomicroscopiaForm.patchValue({ 
        ojoDerechoImagenBase64_3: base64,
        ojoDerechoImagenID3: null
      });
      break;
    case 'biomicroscopiaOI3':
      this.biomicroscopiaForm.patchValue({ 
        ojoIzquierdoImagenBase64_3: base64,
        ojoIzquierdoImagenID3: null
      });
      break;
      case 'oftalmoscopiaOD':
        this.oftalmoscopiaForm.patchValue({ 
          ojoDerechoImagenBase64: base64,
          ojoDerechoImagenID: null
        });
        break;
      case 'oftalmoscopiaOI':
        this.oftalmoscopiaForm.patchValue({ 
          ojoIzquierdoImagenBase64: base64,
          ojoIzquierdoImagenID: null
        });
        break;
    }
  }


  // Método para eliminar una imagen
  eliminarImagen(imageType: string): void {
    // Eliminar la imagen de la vista previa
    this.imagenPreviews[imageType] = null;
    
    // Resetear el archivo seleccionado
    if (this.selectedFiles[imageType]) {
      delete this.selectedFiles[imageType];
    }
    
    // Actualizar el formulario correspondiente
    this.actualizarFormularioConImagen(imageType, null);
    
    // Notificar al componente padre
    this.imageBase64Change.emit({
      base64: null,
      imageType: imageType
    });
  }

  cancelar(): void {
    this.completed.emit(false);
  }

  // Métodos para obtener los datos de cada formulario
  getGridAmslerData(): any {
    return this.gridAmslerForm.value;
  }

  getTonometriaData(): any {
    return this.tonometriaForm.value;
  }

  getPaquimetriaData(): any {
    return this.paquimetriaForm.value;
  }

  getCampimetriaData(): any {
    return this.campimetriaForm.value;
  }

  getBiomicroscopiaData(): any {
    return this.biomicroscopiaForm.value;
  }

  getOftalmoscopiaData(): any {
    return this.oftalmoscopiaForm.value;
  }
}