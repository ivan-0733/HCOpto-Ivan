import { Component, OnInit, Input, Output, EventEmitter, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-interrogatorio',
  templateUrl: './historia-clinica-interrogatorio.component.html',
  styleUrls: ['./historia-clinica-interrogatorio.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class InterrogatorioComponent implements OnInit, AfterViewInit {
  @Input() historiaId: number | null = null;
  @Input() hideButtons = false; // Nuevo input para controlar visibilidad de botones
  @Output() completed = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>(); // Nuevo output para compartir el formulario

  // Referencias a los textareas para auto-resize
  @ViewChild('motivoConsultaRef') motivoConsultaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('heredoFamiliaresRef') heredoFamiliaresRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('noPatologicosRef') noPatologicosRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('patologicosRef') patologicosRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('visualesOcularesRef') visualesOcularesRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('padecimientoActualRef') padecimientoActualRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('prediagnosticoRef') prediagnosticoRef!: ElementRef<HTMLTextAreaElement>;

  interrogatorioForm: FormGroup;
  submitting = false;
  loading = false;
  error = '';
  success = '';

  // Configuración para auto-resize
  private readonly minHeight = 100; // Altura mínima en px
  private readonly maxHeight = 500; // Altura máxima en px
  private readonly lineHeight = 24; // Altura de línea aproximada en px

  constructor(
    private fb: FormBuilder,
    private historiaClinicaService: HistoriaClinicaService
  ) {
    this.interrogatorioForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.historiaId) {
      this.loadInterrogatorio();
    }

    // Emitir el formulario para que el componente padre pueda acceder a él
    this.formReady.emit(this.interrogatorioForm);

    // Suscribirse a cambios en el formulario para auto-resize
    this.interrogatorioForm.valueChanges.subscribe(() => {
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

  createForm(): FormGroup {
    return this.fb.group({
      motivoConsulta: ['', Validators.required],
      heredoFamiliares: ['', Validators.required],
      noPatologicos: ['', Validators.required],
      patologicos: ['', Validators.required],
      visualesOculares: ['', Validators.required],
      padecimientoActual: ['', Validators.required],
      prediagnostico: ['', Validators.required]
    });
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
      this.motivoConsultaRef,
      this.heredoFamiliaresRef,
      this.noPatologicosRef,
      this.patologicosRef,
      this.visualesOcularesRef,
      this.padecimientoActualRef,
      this.prediagnosticoRef
    ];

    textareas.forEach(textareaRef => {
      if (textareaRef?.nativeElement) {
        this.autoResize(textareaRef);
      }
    });
  }

  loadInterrogatorio(): void {
    this.loading = true;
    this.error = '';

    this.historiaClinicaService.obtenerHistoriaClinica(this.historiaId!)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (historia) => {
          if (historia.interrogatorio) {
            this.interrogatorioForm.patchValue(historia.interrogatorio);

            // Aplicar auto-resize después de cargar datos
            setTimeout(() => {
              this.autoResizeAllTextareas();
            }, 100);
          }
        },
        error: (error) => {
          this.error = 'Error al cargar el interrogatorio: ' + (error.message || 'Intente nuevamente');
          console.error('Error al cargar interrogatorio:', error);
        }
      });
  }

  guardarInterrogatorio(): void {
    if (this.interrogatorioForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.interrogatorioForm.controls).forEach(key => {
        this.interrogatorioForm.get(key)?.markAsTouched();
      });

      this.error = 'Por favor, complete todos los campos obligatorios del interrogatorio.';
      return;
    }

    if (!this.historiaId) {
      this.error = 'ID de historia clínica no válido.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    this.historiaClinicaService.actualizarSeccion(
      this.historiaId,
      'interrogatorio',
      this.interrogatorioForm.value
    )
    .pipe(
      finalize(() => {
        this.submitting = false;
      })
    )
    .subscribe({
      next: () => {
        this.success = 'Interrogatorio guardado correctamente.';
        this.completed.emit(true);

        // Avanzar a la siguiente sección después de un breve retraso
        setTimeout(() => {
          this.nextSection.emit();
        }, 1500);
      },
      error: (error) => {
        this.error = 'Error al guardar el interrogatorio: ' + (error.message || 'Intente nuevamente');
        console.error('Error al guardar interrogatorio:', error);
        this.completed.emit(false);
      }
    });
  }

  cancelar(): void {
    // Simplemente emitir evento para que el componente padre maneje la navegación
    this.completed.emit(false);
  }
}