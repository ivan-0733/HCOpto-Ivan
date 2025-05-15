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

  // Manejo de imágenes (solo para campimetría y oftalmoscopía)
  imagenPreviews: {[key: string]: string | null} = {
    campimetria: null,
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
        if (this.initialImagenPreviews[key] && this.imagenPreviews.hasOwnProperty(key)) {
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
        if (newValue && this.imagenPreviews.hasOwnProperty(key) && this.imagenPreviews[key] !== newValue) {
          this.imagenPreviews[key] = newValue;
          this.actualizarFormularioConImagen(key, newValue);
        }
      });
    }
  }

  private initForms(): void {
    // Formulario de Grid de Amsler (sin imágenes)
    this.gridAmslerForm = this.fb.group({
      numeroCartilla: [''],
      ojoDerechoSensibilidadContraste: [''],
      ojoIzquierdoSensibilidadContraste: [''],
      ojoDerechoVisionCromatica: [''],
      ojoIzquierdoVisionCromatica: ['']
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
  
    // Formulario de Campimetría (con una imagen)
    this.campimetriaForm = this.fb.group({
      distancia: [null],
      tamanoColorIndice: [''],
      tamanoColorPuntoFijacion: [''],
      imagenID: [null],        // ID de la imagen en la BD
      imagenBase64: [null]     // Base64 de la imagen para previsualización
    });
  
    // Formulario de Biomicroscopía (sin imágenes)
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
      ojoIzquierdoCristalino: ['']
    });
  
    // Formulario de Oftalmoscopía (con imágenes)
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
          // Cargar datos de Grid de Amsler (sin imágenes)
          if (historia.gridAmsler) {
            this.gridAmslerForm.patchValue({
              numeroCartilla: historia.gridAmsler.numeroCartilla,
              ojoDerechoSensibilidadContraste: historia.gridAmsler.ojoDerechoSensibilidadContraste,
              ojoIzquierdoSensibilidadContraste: historia.gridAmsler.ojoIzquierdoSensibilidadContraste,
              ojoDerechoVisionCromatica: historia.gridAmsler.ojoDerechoVisionCromatica,
              ojoIzquierdoVisionCromatica: historia.gridAmsler.ojoIzquierdoVisionCromatica
            });
          }

          // Cargar datos de Tonometría
          if (historia.tonometria) {
            this.tonometriaForm.patchValue(historia.tonometria);
          }

          // Cargar datos de Paquimetría
          if (historia.paquimetria) {
            this.paquimetriaForm.patchValue(historia.paquimetria);
          }

          // Cargar datos de Campimetría (con imagen)
          if (historia.campimetria) {
            this.campimetriaForm.patchValue({
              distancia: historia.campimetria.distancia,
              tamanoColorIndice: historia.campimetria.tamanoColorIndice,
              tamanoColorPuntoFijacion: historia.campimetria.tamanoColorPuntoFijacion,
              imagenID: historia.campimetria.imagenID
            });
            
            // Si hay base64, actualizar la previsualización
            if (historia.campimetria.imagenBase64) {
              this.imagenPreviews['campimetria'] = historia.campimetria.imagenBase64;
            }
            // Si hay ID de imagen pero no base64, intentar cargar la imagen
            else if (historia.campimetria.imagenID) {
              this.cargarImagenDesdeServidor(historia.campimetria.imagenID, 'campimetria');
            }
          }

         // Cargar datos de Biomicroscopía (sin imágenes)
        if (historia.biomicroscopia) {
          this.biomicroscopiaForm.patchValue(historia.biomicroscopia);
        }

          // Cargar datos de Oftalmoscopía (con imágenes)
          if (historia.oftalmoscopia) {
            this.oftalmoscopiaForm.patchValue(historia.oftalmoscopia);
            
            if (historia.oftalmoscopia.ojoDerechoImagenBase64) {
              this.imagenPreviews['oftalmoscopiaOD'] = historia.oftalmoscopia.ojoDerechoImagenBase64;
            } 
            else if (historia.oftalmoscopia.ojoDerechoImagenID) {
              this.cargarImagenDesdeServidor(historia.oftalmoscopia.ojoDerechoImagenID, 'oftalmoscopiaOD');
            }

            if (historia.oftalmoscopia.ojoIzquierdoImagenBase64) {
              this.imagenPreviews['oftalmoscopiaOI'] = historia.oftalmoscopia.ojoIzquierdoImagenBase64;
            }
            else if (historia.oftalmoscopia.ojoIzquierdoImagenID) {
              this.cargarImagenDesdeServidor(historia.oftalmoscopia.ojoIzquierdoImagenID, 'oftalmoscopiaOI');
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

  // Método para cargar una imagen desde el servidor usando su ID
  cargarImagenDesdeServidor(imagenID: number, tipoImagen: string): void {
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
            this.imagenPreviews[tipoImagen] = base64;
            
            // Emitir el cambio para que el componente padre lo sepa
            this.imageBase64Change.emit({
              base64: this.imagenPreviews[tipoImagen],
              imageType: tipoImagen
            });
            
            // Actualizar el formulario correspondiente
            this.actualizarFormularioConImagen(tipoImagen, base64);
            
            console.log(`Imagen de ${tipoImagen} cargada correctamente`);
          } else {
            console.error(`La respuesta no contiene datos válidos de imagen para ${tipoImagen}`);
          }
        },
        error: (error) => {
          console.error(`Error al cargar la imagen de ${tipoImagen}:`, error);
        }
      });
  }

  // Método para manejar la selección de imágenes
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
        
        // Actualizar el formulario correspondiente
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
    // Campimetría (una sola imagen)
    this.campimetriaForm.patchValue({
      imagenBase64: this.imagenPreviews['campimetria']
    });

    // Oftalmoscopía
    this.oftalmoscopiaForm.patchValue({
      ojoDerechoImagenBase64: this.imagenPreviews['oftalmoscopiaOD'],
      ojoIzquierdoImagenBase64: this.imagenPreviews['oftalmoscopiaOI']
    });
  }

  private async subirImagenes(): Promise<void> {
    if (!this.historiaId || Object.keys(this.selectedFiles).length === 0) {
      return;
    }
  
    this.submitting = true;
    this.error = '';
    this.success = '';
  
    const promises: Promise<any>[] = [];
    const errores: string[] = [];
    const exitos: string[] = [];
  
    Object.keys(this.selectedFiles).forEach(imageType => {
      const file = this.selectedFiles[imageType];
      if (file) {
        promises.push(
          this.subirImagen(imageType, file)
            .then((result) => {
              exitos.push(imageType);
              return;
            })
            .catch((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
              errores.push(`${imageType}: ${errorMessage}`);
              return;
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
  
  // Asignar la sección y tipo de imagen correcto según el tipo
  if (imageType === 'campimetria') {
    formData.append('seccionID', '9');  // ID para sección Campimetría
    formData.append('tipoImagenID', '3'); // ID para tipo Campimetría
  } else if (imageType === 'oftalmoscopiaOD') {
    formData.append('seccionID', '11'); // ID para sección Oftalmoscopía
    formData.append('tipoImagenID', '5'); // ID para tipo Oftalmoscopía
    formData.append('esOjoDerecho', 'true'); // Añadir parámetro para indicar que es el ojo derecho
  } else if (imageType === 'oftalmoscopiaOI') {
    formData.append('seccionID', '11'); // ID para sección Oftalmoscopía
    formData.append('tipoImagenID', '5'); // ID para tipo Oftalmoscopía
    formData.append('esOjoDerecho', 'false'); // Añadir parámetro para indicar que es el ojo izquierdo
  } else {
    console.error('Tipo de imagen no reconocido:', imageType);
    return Promise.reject('Tipo de imagen no válido');
  }
  
  console.log(`Enviando imagen de ${imageType} con formData:`, {
    seccionID: formData.get('seccionID'),
    tipoImagenID: formData.get('tipoImagenID'),
    esOjoDerecho: formData.get('esOjoDerecho'),
    file: file.name
  });
  
  return new Promise<void>((resolve, reject) => {
    this.historiaService.subirImagen(this.historiaId!, formData)
      .subscribe({
        next: (response: {imageId?: number, data?: any}) => {
          const imageId = response.imageId || (response.data ? response.data.imageId : null);
          console.log(`Respuesta de subida de ${imageType}:`, response);
          
          if (imageId) {
            // Actualizar el ID de imagen en el formulario correspondiente
            this.actualizarImagenId(imageId, imageType);
            
            // Actualizar la sección con el nuevo ID de imagen
            this.actualizarSeccionConImagen(imageType, imageId);
            resolve();
          } else {
            console.warn('No se obtuvo ID de imagen en la respuesta');
            resolve();
          }
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
      case 'campimetria':
        return '9'; // ID de sección Campimetría
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
      case 'campimetria':
        return '3'; // Tipo Campimetría
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
    case 'campimetria':
      this.campimetriaForm.patchValue({ imagenID: imageId });
      break;
    case 'oftalmoscopiaOD':
      console.log('Actualizando formulario de oftalmoscopía con OD imageId:', imageId);
      this.oftalmoscopiaForm.patchValue({ ojoDerechoImagenID: imageId });
      break;
    case 'oftalmoscopiaOI':
      console.log('Actualizando formulario de oftalmoscopía con OI imageId:', imageId);
      this.oftalmoscopiaForm.patchValue({ ojoIzquierdoImagenID: imageId });
      break;
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
      case 'campimetria': return this.campimetriaForm;
      case 'biomicroscopia': return this.biomicroscopiaForm;
      case 'oftalmoscopia': return this.oftalmoscopiaForm;
      default: return this.gridAmslerForm; // Valor por defecto
    }
  }

  private actualizarFormularioConImagen(imageType: string, base64: string | null): void {
    // Determinar qué formulario y qué campo actualizar según el tipo de imagen
    switch (imageType) {
      case 'campimetria':
        this.campimetriaForm.patchValue({ 
          imagenBase64: base64,
          imagenID: null
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

// Actualización del método actualizarSeccionConImagen para asegurar actualización correcta
actualizarSeccionConImagen(imageType: string, imageId: number): void {
  if (!this.historiaId) return;
  
  let seccionData = {};
  
  if (imageType === 'campimetria') {
    seccionData = {
      ...this.campimetriaForm.value,
      imagenID: imageId
    };
    
    this.historiaService.actualizarSeccion(this.historiaId, 'campimetria', seccionData)
      .subscribe({
        next: () => console.log('Imagen actualizada en campimetría'),
        error: (err) => console.error('Error al actualizar imagen en campimetría:', err)
      });
  } 
  else if (imageType === 'oftalmoscopiaOD') {
    seccionData = {
      ...this.oftalmoscopiaForm.value,
      ojoDerechoImagenID: imageId,
      ojoDerechoImagenBase64: null // Importante: limpiar la versión base64
    };
    
    console.log('Actualizando oftalmoscopía OD con imageId:', imageId);
    this.historiaService.actualizarSeccion(this.historiaId, 'oftalmoscopia', seccionData)
      .subscribe({
        next: () => console.log('Imagen OD actualizada en oftalmoscopía'),
        error: (err) => console.error('Error al actualizar imagen OD en oftalmoscopía:', err)
      });
  }
  else if (imageType === 'oftalmoscopiaOI') {
    seccionData = {
      ...this.oftalmoscopiaForm.value,
      ojoIzquierdoImagenID: imageId,
      ojoIzquierdoImagenBase64: null // Importante: limpiar la versión base64
    };
    
    console.log('Actualizando oftalmoscopía OI con imageId:', imageId);
    this.historiaService.actualizarSeccion(this.historiaId, 'oftalmoscopia', seccionData)
      .subscribe({
        next: () => console.log('Imagen OI actualizada en oftalmoscopía'),
        error: (err) => console.error('Error al actualizar imagen OI en oftalmoscopía:', err)
      });
  }
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