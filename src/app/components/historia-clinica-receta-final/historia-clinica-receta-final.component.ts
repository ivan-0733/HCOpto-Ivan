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
    // [CORREGIDO] Se elimina la llamada a cargarDatosExistentes()
    
    // Emitir el formulario para que el componente padre pueda acceder a él
    this.formReady.emit(this.recetaForm);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // [CORREGIDO] Se elimina la lógica de este método
    // if (changes['historiaId'] && !changes['historiaId'].firstChange) {
    //   if (this.historiaId) {
    //     this.cargarDatosExistentes();
    //   }
    // }
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

  // [CORREGIDO] Se elimina el método cargarDatosExistentes() completo

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