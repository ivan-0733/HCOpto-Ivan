import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, debounceTime, finalize, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService, HistoriaClinicaDetalle } from '../../services/historia-clinica.service';
import { AlumnoService, Profesor, Semestre, Consultorio, CatalogoItem, Paciente, PeriodoEscolar, MateriaAlumno } from '../../services/alumno.service';

@Component({
  selector: 'app-historia-clinica-form',
  templateUrl: './historia-clinica-form.component.html',
  styleUrls: ['./historia-clinica-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ]
})

export class HistoriaClinicaFormComponent implements OnInit {
  // Inputs y Outputs para comunicación con el componente padre
  @Input() isEditing = false;
  @Input() historiaId: number | null = null;
  @Input() hideHeaderAndButtons = false; // Nuevo input para controlar visibilidad
  @Output() completed = new EventEmitter<boolean>();
  @Output() historiaCreated = new EventEmitter<number>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>(); // Nuevo output para compartir el formulario

  historiaForm!: FormGroup;
  pacienteForm!: FormGroup;

  // Para la edición de historia clínica
  historia: HistoriaClinicaDetalle | null = null;

  // Eliminamos el uso de tabs internos ya que ahora todo es manejado por el contenedor
  // currentTab = 'datos-generales';

  // Datos para los selectores
  profesores: Profesor[] = [];
  consultorios: Consultorio[] = [];
  semestreActual: Semestre | null = null;
  generos: CatalogoItem[] = [];
  estadosCiviles: CatalogoItem[] = [];
  escolaridades: CatalogoItem[] = [];
  materias: MateriaAlumno[] = [];

  // Estado del formulario
  loading = false;
  submitting = false;
  error = '';
  success = '';

  // Para la búsqueda de pacientes
  pacientesBusqueda: Paciente[] = [];
  buscandoPacientes = false;
  mostrarResultadosBusqueda = false;
  pacienteSeleccionado: Paciente | null = null;

  periodoEscolar: PeriodoEscolar | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private historiaClinicaService: HistoriaClinicaService,
    private alumnoService: AlumnoService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initForms();
    this.loadInitialData();

    // Cargar historia clínica si estamos en modo edición
    if (this.isEditing && this.historiaId) {
      this.loadHistoriaClinica();
    }

    // Configurar búsqueda de pacientes
    const busquedaControl = this.pacienteForm.get('busqueda');
    if (busquedaControl) {
      busquedaControl.valueChanges
        .pipe(
          debounceTime(300),
          switchMap(term => {
            if (term.length < 3) {
              this.pacientesBusqueda = [];
              this.mostrarResultadosBusqueda = false;
              return of([]);
            }

            this.buscandoPacientes = true;
            this.mostrarResultadosBusqueda = true;

            return this.alumnoService.buscarPacientes(term).pipe(
              catchError(() => of([])),
              finalize(() => {
                this.buscandoPacientes = false;
              })
            );
          })
        )
        .subscribe(pacientes => {
          this.pacientesBusqueda = pacientes;
        });
    }

    // Emitir el formulario después de inicializarlo
    this.formReady.emit(this.historiaForm);
  }

  initForms(): void {
    // Formulario para la historia clínica
    this.historiaForm = this.formBuilder.group({
      materiaProfesorID: ['', Validators.required], // Cambiar profesorID por materiaProfesorID
      consultorioID: ['', Validators.required],
      periodoEscolarID: ['', Validators.required], // Cambiar semestreID por periodoEscolarID
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      paciente: this.formBuilder.group({
        id: [null],
        nombre: ['', Validators.required],
        apellidoPaterno: ['', Validators.required],
        apellidoMaterno: [''],
        generoID: ['', Validators.required],
        edad: ['', [Validators.required, Validators.min(1), Validators.max(130)]],
        estadoCivilID: [''],
        escolaridadID: [''],
        ocupacion: [''],
        direccionLinea1: [''],
        curp: ['', [Validators.required, Validators.minLength(18), Validators.maxLength(18)]],  // ✅ NUEVO - OBLIGATORIO
        ciudad: [''],
        estadoID: [''],
        codigoPostal: [''],
        pais: ['México'],
        correoElectronico: ['', Validators.email],  // ✅ OPCIONAL - solo validar formato si se llena
        telefonoCelular: [''],  // ✅ OPCIONAL
        telefono: [''],
        idSiSeCO: ['', [Validators.minLength(8), Validators.maxLength(8)]]  // ✅ NUEVO - OPCIONAL
      })
    });

    // Formulario para la búsqueda de pacientes
    this.pacienteForm = this.formBuilder.group({
      busqueda: ['']
    });
  }

  loadInitialData(): void {
    this.loading = true;

    // Cargar datos iniciales en paralelo
    forkJoin({
      profesores: this.alumnoService.obtenerProfesoresAsignados(),
      materias: this.alumnoService.obtenerMaterias(),
      consultorios: this.alumnoService.obtenerConsultorios(),
      periodoEscolar: this.alumnoService.obtenerPeriodoEscolarActual(),
      generos: this.alumnoService.obtenerCatalogo('GENERO'),
      estadosCiviles: this.alumnoService.obtenerCatalogo('ESTADO_CIVIL'),
      escolaridades: this.alumnoService.obtenerCatalogo('ESCOLARIDAD')
    }).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (result) => {
        this.profesores = result.profesores;
        this.materias = result.materias; // Add this line
        this.consultorios = result.consultorios;
        this.periodoEscolar = result.periodoEscolar;
        this.generos = result.generos;
        this.estadosCiviles = result.estadosCiviles;
        this.escolaridades = result.escolaridades;

        // Seleccionar valores por defecto
        if (this.periodoEscolar) {
          this.historiaForm.patchValue({ periodoEscolarID: this.periodoEscolar.ID });
        }

        if (this.profesores.length === 1) {
          this.historiaForm.patchValue({ MateriaProfesorID: this.profesores[0].MateriaProfesorID });
        }
      },
      error: (error) => {
        this.error = 'Error al cargar los datos iniciales. Por favor, intenta nuevamente.';
        console.error('Error cargando datos iniciales:', error);
      }
    });
  }

  loadHistoriaClinica(): void {
    if (!this.historiaId) return;

    this.loading = true;

    this.historiaClinicaService.obtenerHistoriaClinica(this.historiaId).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (historia) => {
        this.historia = historia;

        // Llenar el formulario con los datos de la historia clínica
        this.historiaForm.patchValue({
          materiaProfesorID: historia.MateriaProfesorID, // Use MateriaProfesorID instead of ProfesorID
          consultorioID: historia.ConsultorioID,
          periodoEscolarID: historia.PeriodoEscolarID,
          fecha: new Date(historia.Fecha).toISOString().split('T')[0],
          paciente: {
            id: historia.PacienteID,
            nombre: historia.Nombre,
            apellidoPaterno: historia.ApellidoPaterno,
            apellidoMaterno: historia.ApellidoMaterno,
            generoID: historia.GeneroID,
            edad: historia.Edad,
            estadoCivilID: historia.EstadoCivilID,
            escolaridadID: historia.EscolaridadID,
            ocupacion: historia.Ocupacion,
            direccionLinea1: historia.DireccionLinea1,
            curp: historia.CURP,  // ✅ NUEVO
            ciudad: historia.Ciudad,
            estadoID: historia.PacienteEstadoID,
            codigoPostal: historia.CodigoPostal,
            pais: historia.Pais,
            correoElectronico: historia.CorreoElectronico,
            telefonoCelular: historia.TelefonoCelular,
            telefono: historia.Telefono,
            idSiSeCO: historia.IDSiSeCO  // ✅ NUEVO
          }
        });

        // Deshabilitar la edición de ciertos campos
        if (historia.Archivado || historia.Estado === 'Finalizado') {
          this.historiaForm.disable();
        }
      },
      error: (error) => {
        this.error = 'Error al cargar la historia clínica. Por favor, intenta nuevamente.';
        console.error('Error cargando historia clínica:', error);
      }
    });
  }

  seleccionarPaciente(paciente: Paciente): void {
    this.pacienteSeleccionado = paciente;
    this.mostrarResultadosBusqueda = false;

    // Llenar el formulario con TODOS los datos del paciente
    this.historiaForm.get('paciente')?.patchValue({
      id: paciente.ID,
      nombre: paciente.Nombre,
      apellidoPaterno: paciente.ApellidoPaterno,
      apellidoMaterno: paciente.ApellidoMaterno || '',
      generoID: paciente.GeneroID || '',
      edad: paciente.Edad || '',
      estadoCivilID: paciente.EstadoCivilID || '',
      escolaridadID: paciente.EscolaridadID || '',
      ocupacion: paciente.Ocupacion || '',
      direccionLinea1: paciente.DireccionLinea1 || '',
      curp: paciente.CURP || '',  // ✅ CARGAR CURP
      ciudad: paciente.Ciudad || '',
      estadoID: paciente.EstadoID || '',
      codigoPostal: paciente.CodigoPostal || '',
      pais: paciente.Pais || 'México',
      correoElectronico: paciente.CorreoElectronico || '',
      telefonoCelular: paciente.TelefonoCelular || '',
      telefono: paciente.Telefono || '',
      idSiSeCO: paciente.IDSiSeCO || ''  // ✅ CARGAR IDSiSeCO
    });

    // Limpiar campo de búsqueda
    this.pacienteForm.patchValue({ busqueda: '' });
  }

  limpiarPacienteSeleccionado(): void {
    this.pacienteSeleccionado = null;

    // Limpiar formulario de paciente
    this.historiaForm.get('paciente')?.reset({
      pais: 'México'
    });
  }

  onSubmit(): void {
    if (this.historiaForm.invalid) {
      // Mark all fields as touched to show errors
      this.markFormGroupTouched(this.historiaForm);
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    // Get a copy of the form data to modify
    const historiaData = { ...this.historiaForm.value };

    // Find the selected materia to add the NombreMateria field
    if (historiaData.materiaProfesorID) {
      const selectedMateria = this.materias.find(m => m.MateriaProfesorID == historiaData.materiaProfesorID);
      if (selectedMateria) {
        // Add the required NombreMateria field
        historiaData.NombreMateria = selectedMateria.NombreMateria;
        console.log('Adding NombreMateria:', historiaData.NombreMateria);
      }
    }

    // Ensure PeriodoEscolarID is set correctly
    // Use the actual ID from the periodoEscolar object if it exists
    if (this.periodoEscolar && (!historiaData.periodoEscolarID || historiaData.periodoEscolarID === '')) {
      historiaData.PeriodoEscolarID = this.periodoEscolar.ID;
      console.log('Setting PeriodoEscolarID to:', historiaData.PeriodoEscolarID);
    } else if (historiaData.periodoEscolarID) {
      // If it's already set in lowercase, make sure it's also set in uppercase
      historiaData.PeriodoEscolarID = historiaData.periodoEscolarID;
    }

    console.log('Sending data to server:', historiaData);

    let action: Observable<any>;

    if (this.isEditing && this.historiaId) {
      // Update existing history
      action = this.historiaClinicaService.actualizarSeccion(
        this.historiaId,
        'datos-generales',
        historiaData
      );
    } else {
      // Create new history
      action = this.historiaClinicaService.crearHistoriaClinica(historiaData);
    }

    action.pipe(
      finalize(() => {
        this.submitting = false;
      })
    ).subscribe({
      next: (response) => {
        this.success = this.isEditing
          ? 'Historia clínica actualizada correctamente.'
          : 'Historia clínica creada correctamente.';

        // Emit events to parent component
        if (this.isEditing) {
          this.completed.emit(true);
        } else {
          // Get ID of created history
          const newHistoriaId = response.data.ID;
          this.historiaCreated.emit(newHistoriaId);
          this.completed.emit(true);
        }

        // After a brief delay, move to next section
        setTimeout(() => {
          this.nextSection.emit();
        }, 1500);
      },
      error: (error) => {
        this.error = error.error?.message || 'Error al guardar la historia clínica. Por favor, intenta nuevamente.';
        console.error('Error al guardar historia clínica:', error);
        this.completed.emit(false);
      }
    });
  }

  // Marcar todos los campos de un FormGroup como tocados
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  cancelar(): void {
    if (this.isEditing) {
      this.loadHistoriaClinica();
    } else {
      this.completed.emit(false);
      this.router.navigate(['/alumno/dashboard']);
    }
  }

  get busquedaControl(): FormControl {
    return this.pacienteForm.get('busqueda') as FormControl;
  }
}