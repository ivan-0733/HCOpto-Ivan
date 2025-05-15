import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-receta-final',
  templateUrl: './historia-clinica-receta-final.component.html',
  styleUrls: ['./historia-clinica-receta-final.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class RecetaFinalComponent implements OnInit, OnChanges {
  @Input() historiaId: number | null = null;
  @Input() hideButtons = false;
  @Output() completed = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>();

  recetaForm!: FormGroup;
  
  tiposLente: any[] = [
    { ID: 3, Valor: 'Monocal' },
    { ID: 1, Valor: 'Bifocal' },
    { ID: 2, Valor: 'Multifocal' }
  ];

  loading = false;
  submitting = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private historiaService: HistoriaClinicaService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    if (this.historiaId) {
      this.cargarDatosExistentes();
    }
    
    // Emitir el formulario para que el componente padre pueda acceder a él
    this.formReady.emit(this.recetaForm);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['historiaId'] && !changes['historiaId'].firstChange) {
      if (this.historiaId) {
        this.cargarDatosExistentes();
      }
    }
  }

  private initForm(): void {
    this.recetaForm = this.fb.group({
      ojoDerechoEsfera: [''],
      ojoDerechoCilindro: [''],
      ojoDerechoEje: [''],
      ojoDerechoPrisma: [''],
      ojoDerechoEjePrisma: [''],
      ojoIzquierdoEsfera: [''],
      ojoIzquierdoCilindro: [''],
      ojoIzquierdoEje: [''],
      ojoIzquierdoPrisma: [''],
      ojoIzquierdoEjePrisma: [''],
      tratamiento: [''],
      tipoID: [null],
      dip: [''],
      valorADD: [''],
      material: [''],
      observaciones: ['']
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
          // Cargar datos de receta final
          if (historia.recetaFinal) {
            this.recetaForm.patchValue({
              ojoDerechoEsfera: historia.recetaFinal.OjoDerechoEsfera || '',
              ojoDerechoCilindro: historia.recetaFinal.OjoDerechoCilindro || '',
              ojoDerechoEje: historia.recetaFinal.OjoDerechoEje || '',
              ojoDerechoPrisma: historia.recetaFinal.OjoDerechoPrisma || '',
              ojoDerechoEjePrisma: historia.recetaFinal.OjoDerechoEjePrisma || '',
              ojoIzquierdoEsfera: historia.recetaFinal.OjoIzquierdoEsfera || '',
              ojoIzquierdoCilindro: historia.recetaFinal.OjoIzquierdoCilindro || '',
              ojoIzquierdoEje: historia.recetaFinal.OjoIzquierdoEje || '',
              ojoIzquierdoPrisma: historia.recetaFinal.OjoIzquierdoPrisma || '',
              ojoIzquierdoEjePrisma: historia.recetaFinal.OjoIzquierdoEjePrisma || '',
              tratamiento: historia.recetaFinal.Tratamiento || '',
              tipoID: historia.recetaFinal.TipoID || null,
              dip: historia.recetaFinal.DIP || '',
              valorADD: historia.recetaFinal.ValorADD || '',
              material: historia.recetaFinal.Material || '',
              observaciones: historia.recetaFinal.Observaciones || ''
            });
          }
          
          // Emitir que los datos se han cargado correctamente
          this.completed.emit(true);
        },
        error: (err) => {
          console.error('Error al cargar datos de receta final:', err);
          this.error = 'Error al cargar datos. Por favor, intente nuevamente.';
          this.completed.emit(false);
        }
      });
  }

  guardarRecetaFinal(): void {
    if (!this.historiaId) {
      this.error = 'No se ha podido identificar la historia clínica.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    // Preparar datos de la receta final
    const recetaData = this.recetaForm.value;

    // Actualizar receta final
    this.historiaService.actualizarSeccion(
      this.historiaId,
      'recetaFinal',
      recetaData
    ).subscribe({
      next: () => {
        this.success = 'Receta final guardada correctamente.';
        this.completed.emit(true);
        
        setTimeout(() => {
          this.nextSection.emit();
        }, 1500);
      },
      error: (error) => {
        this.error = 'Error al guardar la receta final. Por favor, intente nuevamente.';
        console.error('Error al guardar receta final:', error);
        this.completed.emit(false);
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.completed.emit(false);
  }
  
  // Método para acceder a los datos del formulario
  getRecetaData(): any {
    return this.recetaForm.value;
  }
}