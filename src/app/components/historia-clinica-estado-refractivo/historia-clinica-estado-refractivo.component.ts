import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-estado-refractivo',
  templateUrl: './historia-clinica-estado-refractivo.component.html',
  styleUrls: ['./historia-clinica-estado-refractivo.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})

export class EstadoRefractivoComponent implements OnInit, OnChanges {
  @Input() historiaId: number | null = null;
  @Input() hideButtons = false;
  // **REVERSIÓN:** Volver al nombre original del Output
  @Output() completed = new EventEmitter<boolean>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>();

  // Formularios para estado refractivo y subjetivo de cerca
  refraccionForm!: FormGroup;
  subjetivoCercaForm!: FormGroup;

  loading = false;
  submitting = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private historiaService: HistoriaClinicaService // Aunque no se use aquí, se deja por si se necesita en el futuro
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.formReady.emit(this.refraccionForm);
    this.formReady.emit(this.subjetivoCercaForm);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // --- CORRECCIÓN ---
    // Ya no necesitamos reaccionar a cambios del ID aquí para cargar datos.
    // Si el ID cambia, el contenedor se reinicializará o cargará nuevos datos
    // y aplicará patchValue a los nuevos formularios que emitamos.
    // --- FIN CORRECCIÓN ---
    // if (changes['historiaId'] && !changes['historiaId'].firstChange) {
    //   // El contenedor manejará la recarga y actualización
    // }
  }

  private initForms(): void {
    // Formulario del Estado Refractivo
    this.refraccionForm = this.fb.group({
      // Queratometría
      ojoDerechoQueratometria: [''],
      ojoIzquierdoQueratometria: [''],
      ojoDerechoAstigmatismoCorneal: [''],
      ojoIzquierdoAstigmatismoCorneal: [''],
      ojoDerechoAstigmatismoJaval: [''],
      ojoIzquierdoAstigmatismoJaval: [''],

      // Retinoscopía
      ojoDerechoRetinoscopiaEsfera: [''],
      ojoDerechoRetinosciopiaCilindro: [''], // Typo mantenido si así está en BD/modelo
      ojoDerechoRetinoscopiaEje: [''],
      ojoIzquierdoRetinoscopiaEsfera: [''],
      ojoIzquierdoRetinosciopiaCilindro: [''], // Typo mantenido si así está en BD/modelo
      ojoIzquierdoRetinoscopiaEje: [''],

      // Subjetivo
      ojoDerechoSubjetivoEsfera: [''],
      ojoDerechoSubjetivoCilindro: [''],
      ojoDerechoSubjetivoEje: [''],
      ojoIzquierdoSubjetivoEsfera: [''],
      ojoIzquierdoSubjetivoCilindro: [''],
      ojoIzquierdoSubjetivoEje: [''],

      // Balance Binoculares
      ojoDerechoBalanceBinocularesEsfera: [''],
      ojoDerechoBalanceBinocularesCilindro: [''],
      ojoDerechoBalanceBinocularesEje: [''],
      ojoIzquierdoBalanceBinocularesEsfera: [''],
      ojoIzquierdoBalanceBinocularesCilindro: [''],
      ojoIzquierdoBalanceBinocularesEje: [''],
      ojoDerechoAVLejana: [''],
      ojoIzquierdoAVLejana: ['']
    });

    // Formulario de Subjetivo de Cerca
    this.subjetivoCercaForm = this.fb.group({
      ojoDerechoM: [''],
      ojoIzquierdoM: [''],
      ambosOjosM: [''],
      ojoDerechoJacger: [''], // Typo mantenido si así está en BD/modelo
      ojoIzquierdoJacger: [''], // Typo mantenido si así está en BD/modelo
      ambosOjosJacger: [''], // Typo mantenido si así está en BD/modelo
      ojoDerechoPuntos: [''],
      ojoIzquierdoPuntos: [''],
      ambosOjosPuntos: [''],
      ojoDerechoSnellen: [''],
      ojoIzquierdoSnellen: [''],
      ambosOjosSnellen: [''],
      valorADD: [''],
      av: [''],
      distancia: [''],
      rango: ['']
    });
  }

  // --- CORRECCIÓN ---
  // Eliminamos completamente el método cargarDatosExistentes.
  // La responsabilidad de cargar y aplicar los datos iniciales recae
  // completamente en el componente contenedor a través del patchValue
  // que hace en onEstadoRefractivoFormReady.
  // --- FIN CORRECCIÓN ---
  /*
  cargarDatosExistentes(): void {
    // ... Código eliminado ...
  }
  */

  // --- REVERSIÓN ---
  // Volvemos al nombre original del método que el template HTML espera.
  guardarEstadoRefractivo(): void {
    if (!this.historiaId) {
      this.error = 'No se ha podido identificar la historia clínica.';
      return;
    }

    // Validación simple (opcional, el contenedor puede hacer validación más robusta)
    // if (this.refraccionForm.invalid || this.subjetivoCercaForm.invalid) {
    //   this.error = 'Por favor complete los campos requeridos.';
    //   // Marcar campos como tocados si es necesario
    //   return;
    // }

    this.submitting = true;
    this.error = '';
    this.success = '';

    // Preparar datos de cada sección
    const refraccionData = this.refraccionForm.value;
    const subjetivoCercaData = this.subjetivoCercaForm.value;

    // Aunque no hacemos la llamada API aquí, podríamos emitir los datos
    // o simplemente confiar en que el contenedor ya los tiene actualizados
    // a través de la suscripción a valueChanges (implementada en el contenedor).
    // Por simplicidad y consistencia con el flujo, podemos asumir que el contenedor
    // ya tiene los datos más recientes.

    console.log("Datos de Estado Refractivo listos (guardados por el contenedor):", refraccionData);
    console.log("Datos de Subjetivo Cerca listos (guardados por el contenedor):", subjetivoCercaData);

    // Simular éxito y emitir evento 'completed' si se considera la sección completa
    this.success = 'Cambios de Estado Refractivo listos para guardar.'; // Mensaje informativo
    this.completed.emit(true); // Indicar que la sección está 'completa' o lista.
    this.submitting = false; // Terminar estado de submitting

    // Si no se esconden los botones, emitir para avanzar (comportamiento original)
    if (!this.hideButtons) {
        setTimeout(() => {
            this.nextSection.emit();
            this.success = ''; // Limpiar mensaje después de avanzar
        }, 1500);
    }

    // Ya no se hace la llamada a actualizarSeccion desde aquí.
  }

  cancelar(): void {
    // Podríamos añadir lógica para resetear si fuera necesario,
    // pero usualmente el contenedor maneja el estado.
    console.log("Cancelando edición de Estado Refractivo.");
    this.completed.emit(false); // Indicar que no se completó/guardó
    // Podríamos navegar hacia atrás o dejar que el contenedor lo haga.
  }

  // Métodos para acceder a los datos de cada formulario (se mantienen por si son útiles)
  getRefraccionData(): any {
    return this.refraccionForm.value;
  }

  getSubjetivoCercaData(): any {
    return this.subjetivoCercaForm.value;
  }
}