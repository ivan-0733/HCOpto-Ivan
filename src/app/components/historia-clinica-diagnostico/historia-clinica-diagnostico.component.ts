import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-diagnostico',
  templateUrl: './historia-clinica-diagnostico.component.html',
  styleUrls: ['./historia-clinica-diagnostico.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class DiagnosticoComponent implements OnInit, OnChanges {
  @Input() historiaId: number | null = null;
  @Input() hideButtons = false;
  @Output() completed = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>();

  // Formularios para cada subsección
  diagnosticoForm!: FormGroup;
  planTratamientoForm!: FormGroup;
  pronosticoForm!: FormGroup;
  recomendacionesForm!: FormGroup;

  loading = false;
  submitting = false;
  error = '';
  success = '';

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
    this.formReady.emit(this.diagnosticoForm);
    this.formReady.emit(this.planTratamientoForm);
    this.formReady.emit(this.pronosticoForm);
    this.formReady.emit(this.recomendacionesForm);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['historiaId'] && !changes['historiaId'].firstChange) {
      if (this.historiaId) {
        this.cargarDatosExistentes();
      }
    }
  }

  private initForms(): void {
    // Formulario de Diagnóstico
    this.diagnosticoForm = this.fb.group({
      ojoDerechoRefractivo: [''],
      ojoIzquierdoRefractivo: [''],
      ojoDerechoPatologico: [''],
      ojoIzquierdoPatologico: [''],
      binocular: [''],
      sensorial: ['']
    });

    // Formulario de Plan de Tratamiento
    this.planTratamientoForm = this.fb.group({
      descripcion: ['', Validators.required]
    });

    // Formulario de Pronóstico
    this.pronosticoForm = this.fb.group({
      descripcion: ['']
    });

    // Formulario de Recomendaciones
    this.recomendacionesForm = this.fb.group({
      descripcion: ['']
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
          // Cargar datos de diagnóstico
          if (historia.diagnostico) {
            this.diagnosticoForm.patchValue({
              ojoDerechoRefractivo: historia.diagnostico.OjoDerechoRefractivo || '',
              ojoIzquierdoRefractivo: historia.diagnostico.OjoIzquierdoRefractivo || '',
              ojoDerechoPatologico: historia.diagnostico.OjoDerechoPatologico || '',
              ojoIzquierdoPatologico: historia.diagnostico.OjoIzquierdoPatologico || '',
              binocular: historia.diagnostico.Binocular || '',
              sensorial: historia.diagnostico.Sensorial || ''
            });
          }
          
          // Cargar datos de plan de tratamiento
          if (historia.planTratamiento) {
            this.planTratamientoForm.patchValue({
              descripcion: historia.planTratamiento.Descripcion || ''
            });
          }
          
          // Cargar datos de pronóstico
          if (historia.pronostico) {
            this.pronosticoForm.patchValue({
              descripcion: historia.pronostico.Descripcion || ''
            });
          }
          
          // Cargar datos de recomendaciones
          if (historia.recomendaciones) {
            this.recomendacionesForm.patchValue({
              descripcion: historia.recomendaciones.Descripcion || ''
            });
          }
          
          // Emitir que los datos se han cargado correctamente
          this.completed.emit(true);
        },
        error: (err) => {
          console.error('Error al cargar datos de diagnóstico:', err);
          this.error = 'Error al cargar datos. Por favor, intente nuevamente.';
          this.completed.emit(false);
        }
      });
  }

  guardarDiagnostico(): void {
    if (!this.historiaId) {
      this.error = 'No se ha podido identificar la historia clínica.';
      return;
    }

    if (this.planTratamientoForm.invalid) {
      this.error = 'Por favor, complete el Plan de Tratamiento antes de guardar.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    // Preparar datos de cada subsección
    const diagnosticoData = this.diagnosticoForm.value;
    const planTratamientoData = { descripcion: this.planTratamientoForm.value.descripcion };
    const pronosticoData = { descripcion: this.pronosticoForm.value.descripcion };
    const recomendacionesData = { descripcion: this.recomendacionesForm.value.descripcion };

    // Crear un array de promesas para cada subsección
    const promises = [];

    // Actualizar diagnóstico
    promises.push(
      this.historiaService.actualizarSeccion(
        this.historiaId,
        'diagnostico',
        diagnosticoData
      ).toPromise()
    );

    // Actualizar plan de tratamiento
    promises.push(
      this.historiaService.actualizarSeccion(
        this.historiaId,
        'planTratamiento',
        planTratamientoData
      ).toPromise()
    );

    // Actualizar pronóstico
    promises.push(
      this.historiaService.actualizarSeccion(
        this.historiaId,
        'pronostico',
        pronosticoData
      ).toPromise()
    );

    // Actualizar recomendaciones
    promises.push(
      this.historiaService.actualizarSeccion(
        this.historiaId,
        'recomendaciones',
        recomendacionesData
      ).toPromise()
    );

    // Ejecutar todas las actualizaciones en paralelo
    Promise.all(promises)
      .then(() => {
        this.success = 'Diagnóstico y plan guardados correctamente.';
        this.completed.emit(true);
        
        setTimeout(() => {
          this.nextSection.emit();
        }, 1500);
      })
      .catch(error => {
        this.error = 'Error al guardar el diagnóstico. Por favor, intente nuevamente.';
        console.error('Error al guardar diagnóstico:', error);
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
  getDiagnosticoData(): any {
    return this.diagnosticoForm.value;
  }
  
  getPlanTratamientoData(): any {
    return this.planTratamientoForm.value;
  }
  
  getPronosticoData(): any {
    return this.pronosticoForm.value;
  }
  
  getRecomendacionesData(): any {
    return this.recomendacionesForm.value;
  }
}