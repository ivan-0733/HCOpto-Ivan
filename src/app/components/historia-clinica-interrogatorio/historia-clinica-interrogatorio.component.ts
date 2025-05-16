import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
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
export class InterrogatorioComponent implements OnInit {
  @Input() historiaId: number | null = null;
  @Input() hideButtons = false; // Nuevo input para controlar visibilidad de botones
  @Output() completed = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>(); // Nuevo output para compartir el formulario

  interrogatorioForm: FormGroup;
  submitting = false;
  loading = false;
  error = '';
  success = '';

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