import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
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
export class BinocularidadComponent implements OnInit {
  @Input() historiaId: number | null = null;
  @Input() hideButtons = false;
  @Output() completed = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>();

  @Output() fileSelected = new EventEmitter<{file: File, fileName: string}>();
  @Input() selectedFile: File | null = null;
  @Input() selectedFileName: string = '';
  @Input() initialImageBase64: string | null = null; // Recibe la imagen inicial (de BD o borrador)
  @Output() imageBase64Change = new EventEmitter<string | null>(); // Notifica cambios al padre

  binocularidadForm!: FormGroup;
  foriasForm!: FormGroup;
  vergenciasForm!: FormGroup;
  metodoGraficoForm!: FormGroup;
  imgPreview: string | null = null; // Vista previa local

  loading = false;
  submitting = false;
  error = '';
  success = '';

  // Catálogos (sin cambios)
  metodosMedicion: any[] = [ { ID: 1, Valor: 'Pantalleo' }, { ID: 2, Valor: 'Thorrigton' }, { ID: 3, Valor: 'Maddox' }, { ID: 4, Valor: 'Von Graeffe' } ];
  tiposTest: any[] = [ { ID: 35, Valor: 'Pola Mirror' }, { ID: 36, Valor: 'Otro' }, { ID: 37, Valor: 'P. de Worth' } ];
  tiposVision: any[] = [ { ID: 38, Valor: 'Titmus' }, { ID: 39, Valor: 'Random' }, { ID: 40, Valor: 'Otro' } ];

  constructor(
    private fb: FormBuilder,
    private historiaService: HistoriaClinicaService // Aunque no se use aquí para cargar, puede usarse para subir
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    // Si el padre nos pasa una imagen inicial, la mostramos
    if (this.initialImageBase64) {
      this.imgPreview = this.initialImageBase64;
      // Actualizamos el form local (aunque el padre ya lo habrá hecho con patchValue)
      this.metodoGraficoForm.patchValue({
        imagenBase64: this.imgPreview
      });
    }

    // Emitir los formularios para que el contenedor los registre y les ponga datos
    this.formReady.emit(this.binocularidadForm);
    this.formReady.emit(this.foriasForm);
    this.formReady.emit(this.vergenciasForm);
    this.formReady.emit(this.metodoGraficoForm);
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
      metodoMedicionID: [null], caa: [''], // 'caa' se mantiene aquí si es un campo aparte
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
      imagenBase64: [null] // El padre poblará esto vía patchValue o @Input initial...
    });
  }

  // --- MÉTODOS RELACIONADOS CON GUARDADO Y SUBIDA (SIN CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR LIMPIA) ---

  guardarBinocularidad(): void {
    if (!this.historiaId) {
      this.error = 'No se ha podido identificar la historia clínica.';
      return;
    }
    this.submitting = true; this.error = ''; this.success = '';

    // Asegurarse de que el form tenga el base64 actual para el payload
    this.metodoGraficoForm.patchValue({ imagenBase64: this.imgPreview });

    const payload = {
      binocularidad: this.binocularidadForm.value,
      forias: this.foriasForm.value,
      vergencias: this.vergenciasForm.value,
      metodoGrafico: this.metodoGraficoForm.value // Incluye imagenID y/o imagenBase64
    };
    console.log('Guardando Binocularidad - Payload:', payload);

    this.historiaService.actualizarSeccion(this.historiaId, 'binocularidad', payload)
      .pipe(finalize(() => this.submitting = false))
      .subscribe({
        next: (resultado) => {
          console.log('Resultado de actualización:', resultado);
          this.success = 'Binocularidad guardada correctamente.';
          this.completed.emit(true);
          // Si hay una imagen PENDIENTE de subir (base64 presente pero sin ID)
          if (this.imgPreview && !this.metodoGraficoForm.value.imagenID) {
            this.subirImagen(); // Intenta subirla
          } else if (!this.hideButtons) {
            setTimeout(() => this.nextSection.emit(), 1500); // Si no hay imagen pendiente, avanza
          }
        },
        error: (err) => { /* ... manejo de error ... */ }
      });
  }

  subirImagen(): void {
    if (!this.historiaId || !this.imgPreview) {
       if (!this.hideButtons) setTimeout(() => this.nextSection.emit(), 0); // Avanza si no hay imagen
       return;
    }

    const file = this.base64ToFile(this.imgPreview, 'metodo-grafico.png');
    if (!file) {
      console.error('No se pudo convertir Base64 a File para subir');
       if (!this.hideButtons) setTimeout(() => this.nextSection.emit(), 0); // Avanza si hay error
      return;
    }

    let formData = new FormData();
    formData.append('file', file);
    formData.append('seccionID', '12'); // ID Sección MetodoGrafico
    formData.append('tipoImagenID', '2'); // ID Tipo MetodoGrafico

    console.log('Subiendo imagen de Método Gráfico...');
    this.historiaService.subirImagen(this.historiaId, formData)
      .subscribe({
        next: (response) => {
          const imageId = response.data?.imageId || response.data?.id || response.imageId || response.id;
          if (imageId) {
            console.log('Imagen subida, ID:', imageId);
            // Actualizar SOLO la sección MetodoGrafico con el nuevo ID
            const updateData = {
              metodoGrafico: {
                ...this.metodoGraficoForm.value,
                imagenID: imageId,
                imagenBase64: null // Limpiar base64 tras subir
              }
            };
            this.historiaService.actualizarSeccion(this.historiaId!, 'binocularidad', updateData)
              .subscribe({
                next: () => {
                  console.log('Sección actualizada con ImagenID.');
                  this.metodoGraficoForm.patchValue({ imagenID: imageId, imagenBase64: null }); // Actualizar form local
                  if (!this.hideButtons) setTimeout(() => this.nextSection.emit(), 1500);
                },
                error: (updateErr) => {
                  console.error('Error al actualizar sección con ImagenID:', updateErr);
                  if (!this.hideButtons) setTimeout(() => this.nextSection.emit(), 1500); // Avanzar igual
                }
              });
          } else {
            console.warn('No se recibió ID de imagen tras subir.');
            if (!this.hideButtons) setTimeout(() => this.nextSection.emit(), 1500);
          }
        },
        error: (error) => {
          console.error('Error al subir imagen:', error);
          this.error = 'Datos guardados, pero error al subir imagen.';
          if (!this.hideButtons) setTimeout(() => this.nextSection.emit(), 1500); // Avanzar igual
        }
      });
  }

  // --- MÉTODOS RELACIONADOS CON LA SELECCIÓN/ELIMINACIÓN DE IMAGEN (SIN CAMBIOS) ---

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      // Validaciones (tipo, tamaño) - OMITIDAS POR BREVEDAD, PERO DEBERÍAN ESTAR
      this.selectedFile = file;
      this.selectedFileName = file.name;

      const reader = new FileReader();
      reader.onload = () => {
        this.imgPreview = reader.result as string; // Actualizar vista previa local
        // Actualizar form local, BORRANDO el ID anterior si existía
        this.metodoGraficoForm.patchValue({
          imagenBase64: this.imgPreview,
          imagenID: null
        });
        // Notificar al padre del nuevo base64 (para borrador local y estado global)
        this.imageBase64Change.emit(this.imgPreview);
        // Notificar al padre del archivo (aunque quizás no lo use directamente)
        this.fileSelected.emit({ file: file, fileName: file.name });
      };
      reader.readAsDataURL(file);
      input.value = ''; // Limpiar input para permitir seleccionar el mismo archivo de nuevo
    }
  }

  eliminarImagen(): void {
    this.imgPreview = null;
    this.selectedFile = null;
    this.selectedFileName = '';
    // Actualizar form local, BORRANDO AMBOS (Base64 e ID)
    this.metodoGraficoForm.patchValue({
      imagenBase64: null,
      imagenID: null
    });
    // Notificar al padre que la imagen se eliminó (null)
    this.imageBase64Change.emit(null);
  }

  base64ToFile(base64String: string, filename: string = 'imagen.png'): File | null {
    if (!base64String || !base64String.includes(',')) return null;
    try {
      const arr = base64String.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length; const u8arr = new Uint8Array(n);
      while (n--) { u8arr[n] = bstr.charCodeAt(n); }
      return new File([u8arr], filename, { type: mime });
    } catch (e) { console.error("Error base64ToFile:", e); return null; }
  }

  // --- Otros métodos (cancelar, getters - sin cambios) ---
  cancelar(): void { this.completed.emit(false); }
  getBinocularidadData(): any { return this.binocularidadForm.value; }
  getForiasData(): any { return this.foriasForm.value; }
  getVergenciasData(): any { return this.vergenciasForm.value; }
  getMetodoGraficoData(): any { return this.metodoGraficoForm.value; }
}