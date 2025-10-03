import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, debounceTime, finalize, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService, HistoriaClinicaDetalle } from '../../services/historia-clinica.service';
import { AlumnoService, Profesor, Semestre, Consultorio, CatalogoItem, Paciente, PeriodoEscolar, MateriaAlumno } from '../../services/alumno.service';

// Interfaz para tipar la respuesta del forkJoin
interface InitialData {
  profesores: Profesor[];
  materias: MateriaAlumno[];
  consultorios: Consultorio[];
  periodoEscolar: PeriodoEscolar;
  generos: CatalogoItem[];
  estadosCiviles: CatalogoItem[];
  escolaridades: CatalogoItem[];
}

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
  // Entradas y Salidas (se mantienen igual)
  @Input() isEditing = false;
  @Input() historiaId: number | null = null;
  @Input() hideHeaderAndButtons = false;
  @Output() completed = new EventEmitter<boolean>();
  @Output() historiaCreated = new EventEmitter<number>();
  @Output() nextSection = new EventEmitter<void>();
  @Output() formReady = new EventEmitter<FormGroup>();

  historiaForm!: FormGroup;
  pacienteForm!: FormGroup;
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
  loading = false;
  submitting = false;
  error = '';
  success = '';
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
    this.loading = true;

    // 1. Llama a loadInitialData() para obtener los datos de los dropdowns
    this.loadInitialData().pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (result: InitialData) => {
        // 2. Asigna los datos a las propiedades del componente para llenar los <select>
        this.profesores = result.profesores;
        this.materias = result.materias;
        this.consultorios = result.consultorios;
        this.periodoEscolar = result.periodoEscolar;
        this.generos = result.generos;
        this.estadosCiviles = result.estadosCiviles;
        this.escolaridades = result.escolaridades;

        // Establece valores por defecto para un formulario NUEVO
        if (!this.isEditing) {
            if (this.periodoEscolar) {
              this.historiaForm.patchValue({ periodoEscolarID: this.periodoEscolar.ID });
            }
            if (this.profesores.length === 1) {
              this.historiaForm.patchValue({ materiaProfesorID: this.profesores[0].MateriaProfesorID });
            }
        }

        // 3. SOLO AHORA, si estamos editando, llama a loadHistoriaClinica()
        if (this.isEditing && this.historiaId) {
          this.loadHistoriaClinica();
        }
      },
      error: (error) => {
        this.error = 'Error al cargar los datos iniciales. Por favor, intenta nuevamente.';
        console.error('Error cargando datos iniciales:', error);
      }
    });
    
    // El resto de la lógica se mantiene
    const busquedaControl = this.pacienteForm.get('busqueda');
    if (busquedaControl) {
      busquedaControl.valueChanges.pipe(
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
            finalize(() => { this.buscandoPacientes = false; })
          );
        })
      ).subscribe(pacientes => {
        this.pacientesBusqueda = pacientes;
      });
    }

    this.formReady.emit(this.historiaForm);
  }

  initForms(): void {
    this.historiaForm = this.formBuilder.group({
      materiaProfesorID: ['', Validators.required],
      consultorioID: ['', Validators.required],
      periodoEscolarID: ['', Validators.required],
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

    this.pacienteForm = this.formBuilder.group({
      busqueda: ['']
    });
  }

  // ✅ loadInitialData CORREGIDO para que devuelva el Observable
  loadInitialData(): Observable<InitialData> {
    return forkJoin({
      profesores: this.alumnoService.obtenerProfesoresAsignados(),
      materias: this.alumnoService.obtenerMaterias(),
      consultorios: this.alumnoService.obtenerConsultorios(),
      periodoEscolar: this.alumnoService.obtenerPeriodoEscolarActual(),
      generos: this.alumnoService.obtenerCatalogo('GENERO'),
      estadosCiviles: this.alumnoService.obtenerCatalogo('ESTADO_CIVIL'),
      escolaridades: this.alumnoService.obtenerCatalogo('ESCOLARIDAD')
    }) as Observable<InitialData>;
  }

  loadHistoriaClinica(): void {
    if (!this.historiaId) return;

    // No es necesario un nuevo spinner, ngOnInit ya lo gestiona
    this.historiaClinicaService.obtenerHistoriaClinica(this.historiaId).subscribe({
      next: (historia) => {
        this.historia = historia;

        // Ahora patchValue funciona porque los dropdowns ya están llenos
        this.historiaForm.patchValue({
          materiaProfesorID: historia.MateriaProfesorID,
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

  // El resto de los métodos (onSubmit, seleccionarPaciente, etc.) no necesitan cambios.
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
    this.pacienteForm.patchValue({ busqueda: '' });
  }

  limpiarPacienteSeleccionado(): void {
    this.pacienteSeleccionado = null;
    this.historiaForm.get('paciente')?.reset({ pais: 'México' });
  }

  onSubmit(): void {
    if (this.historiaForm.invalid) {
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
        historiaData.NombreMateria = selectedMateria.NombreMateria;
      }
    }

    // Ensure PeriodoEscolarID is set correctly
    // Use the actual ID from the periodoEscolar object if it exists
    if (this.periodoEscolar && (!historiaData.periodoEscolarID || historiaData.periodoEscolarID === '')) {
      historiaData.PeriodoEscolarID = this.periodoEscolar.ID;
    } else if (historiaData.periodoEscolarID) {
      historiaData.PeriodoEscolarID = historiaData.periodoEscolarID;
    }

    console.log('Sending data to server:', historiaData);

    let action: Observable<any>;

    if (this.isEditing && this.historiaId) {
      action = this.historiaClinicaService.actualizarSeccion(
        this.historiaId,
        'datos-generales',
        historiaData
      );
    } else {
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
        this.error = error.error?.message || 'Error al guardar la historia clínica.';
        this.completed.emit(false);
      }
    });
  }

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