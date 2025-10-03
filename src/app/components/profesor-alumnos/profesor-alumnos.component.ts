import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProfesorService, MateriaProfesor, AlumnoAsignado } from '../../services/profesor.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

// Interfaces para el componente
interface MateriaConAlumnos extends MateriaProfesor {
  Alumnos?: AlumnoAsignado[];
  FechaAsignacion?: string;
  EjeFormativo?: string;
  Descripcion?: string;
}

interface AlumnoExistente {
  ID: number;
  NumeroBoleta: string;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  CorreoElectronico: string;
  TelefonoCelular?: string;
  AlumnoInfoID: number;
}

@Component({
  selector: 'app-profesor-alumnos',
  templateUrl: './profesor-alumnos.component.html',
  styleUrls: ['./profesor-alumnos.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
    // NO incluir FormsModule
  ]
})
export class ProfesorAlumnosComponent implements OnInit {
  materias: MateriaConAlumnos[] = [];
  loading = false;
  error = '';

  // Formulario y estados
  mostrarFormulario = false;
  formularioAlumno!: FormGroup;
  searchControl = new FormControl(''); // ← NUEVO: FormControl para búsqueda
  materiaSeleccionada: MateriaConAlumnos | null = null;
  fechaInscripcion = new Date();

  // Propiedades para eliminar alumno
  mostrarModalEliminar: boolean = false;
  alumnoAEliminar: any = null;
  materiaDelAlumno: any = null;
  eliminandoAlumno: boolean = false;

  // Búsqueda
  resultadosBusqueda: AlumnoExistente[] = [];
  buscandoAlumno = false;

  // Estados del alumno
  alumnoEncontrado = false;
  alumnoSeleccionado: AlumnoExistente | null = null;

  // Estados de guardado
  guardandoAlumno = false;
  errorFormulario = '';
  successMessage = '';

  constructor(
    private profesorService: ProfesorService,
    private fb: FormBuilder
  ) {
    this.initFormulario();
    this.setupSearchSubscription();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  // Inicializar formulario
  private initFormulario(): void {
    this.formularioAlumno = this.fb.group({
      materiaProfesorId: ['', Validators.required],
      nombreCompleto: ['', Validators.required],
      numeroBoleta: ['', [
        Validators.required,
        Validators.pattern(/^\d{10}$/)
      ]],
      correoElectronico: ['', [
        Validators.required,
        Validators.email
      ]]
    });

    this.setupAsyncValidators();
  }

  // Configurar validadores asíncronos
  private setupAsyncValidators(): void {
    this.formularioAlumno.get('numeroBoleta')?.setAsyncValidators([
      (control) => {
        if (!control.value || this.alumnoEncontrado) {
          return of(null);
        }
        return this.profesorService.verificarBoletaExistente(control.value)
          .pipe(
            switchMap(existe => of(existe ? { boletaExistente: true } : null))
          );
      }
    ]);

    this.formularioAlumno.get('correoElectronico')?.setAsyncValidators([
      (control) => {
        if (!control.value || this.alumnoEncontrado) {
          return of(null);
        }
        return this.profesorService.verificarCorreoExistente(control.value)
          .pipe(
            switchMap(existe => of(existe ? { correoExistente: true } : null))
          );
      }
    ]);
  }

  // ← CAMBIADO: Nueva configuración para búsqueda con FormControl
  private setupSearchSubscription(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(termino => {
        if (!termino || termino.length < 3) {
          this.resultadosBusqueda = [];
          return of([]);
        }
        this.buscandoAlumno = true;
        return this.profesorService.buscarAlumnos(termino);
      })
    ).subscribe({
      next: (resultados) => {
        this.resultadosBusqueda = resultados;
        this.buscandoAlumno = false;
      },
      error: (error) => {
        console.error('Error en búsqueda:', error);
        this.buscandoAlumno = false;
        this.resultadosBusqueda = [];
      }
    });
  }

  // Cargar datos principales
  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    this.profesorService.obtenerMateriasConAlumnos().subscribe({
      next: (materias) => {
        console.log('Materias con alumnos cargadas:', materias);
        this.materias = materias;
        this.loading = false;
      },
      error: (error) => {
        console.error('Método obtenerMateriasConAlumnos no disponible, usando método alternativo:', error);
        this.cargarDatosAlternativo();
      }
    });
  }

  // Método alternativo para cargar datos
  private cargarDatosAlternativo(): void {
    this.profesorService.obtenerMaterias().subscribe({
      next: (materias) => {
        console.log('Materias cargadas:', materias);
        this.materias = materias.map(materia => ({
          ...materia,
          Alumnos: []
        }));
        this.cargarAlumnosPorMateria();
      },
      error: (error) => {
        this.error = 'Error al cargar materias. Por favor, intenta nuevamente.';
        this.loading = false;
        console.error('Error al cargar materias:', error);
      }
    });
  }

  // Cargar alumnos para cada materia
  private cargarAlumnosPorMateria(): void {
    let materiasCompletadas = 0;
    const totalMaterias = this.materias.length;

    if (totalMaterias === 0) {
      this.loading = false;
      return;
    }

    this.materias.forEach(materia => {
      this.profesorService.obtenerAlumnosPorMateria(materia.MateriaProfesorID).subscribe({
        next: (alumnos) => {
          materia.Alumnos = alumnos;
          materiasCompletadas++;

          if (materiasCompletadas === totalMaterias) {
            this.loading = false;
            console.log('Todas las materias con alumnos cargadas:', this.materias);
          }
        },
        error: (error) => {
          console.error(`Error al cargar alumnos de materia ${materia.ID}:`, error);
          materia.Alumnos = [];
          materiasCompletadas++;

          if (materiasCompletadas === totalMaterias) {
            this.loading = false;
          }
        }
      });
    });
  }

  // Abrir formulario para agregar alumno
  abrirFormularioAgregarAlumno(materia: MateriaConAlumnos): void {
    this.materiaSeleccionada = materia;
    this.mostrarFormulario = true;
    this.resetFormulario();

    this.formularioAlumno.patchValue({
      materiaProfesorId: materia.ID
    });
  }

  // ← ELIMINADO: Ya no necesitamos buscarAlumno() porque usamos valueChanges

  // Seleccionar alumno existente
  seleccionarAlumnoExistente(alumno: AlumnoExistente): void {
    this.alumnoSeleccionado = alumno;
    this.alumnoEncontrado = true;

    this.formularioAlumno.patchValue({
      nombreCompleto: `${alumno.Nombre} ${alumno.ApellidoPaterno} ${alumno.ApellidoMaterno}`,
      numeroBoleta: alumno.NumeroBoleta,
      correoElectronico: alumno.CorreoElectronico
    });

    // Limpiar resultados de búsqueda
    this.resultadosBusqueda = [];
    this.searchControl.setValue(''); // ← CAMBIADO: usar setValue en lugar de terminoBusqueda
  }

  // Resetear formulario
  private resetFormulario(): void {
    this.formularioAlumno.reset();
    this.searchControl.setValue(''); // ← CAMBIADO
    this.alumnoEncontrado = false;
    this.alumnoSeleccionado = null;
    this.resultadosBusqueda = [];
    this.errorFormulario = '';
    this.successMessage = '';
    this.fechaInscripcion = new Date();
  }

  // Cancelar formulario
  cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.resetFormulario();
    this.materiaSeleccionada = null;
  }

  // Enviar formulario
  onSubmit(): void {
    if (this.formularioAlumno.valid && !this.guardandoAlumno) {
      this.guardandoAlumno = true;
      this.errorFormulario = '';

      const formData = this.formularioAlumno.value;

      if (this.alumnoEncontrado && this.alumnoSeleccionado) {
        this.inscribirAlumnoExistente(formData);
      } else {
        this.crearNuevoAlumno(formData);
      }
    }
  }

  // Inscribir alumno existente a materia
  private inscribirAlumnoExistente(formData: any): void {
    const datosInscripcion = {
      alumnoInfoId: this.alumnoSeleccionado!.AlumnoInfoID,
      materiaProfesorId: formData.materiaProfesorId
    };

    this.profesorService.inscribirAlumnoMateria(datosInscripcion).subscribe({
      next: (response) => {
        this.successMessage = 'Alumno inscrito exitosamente en la materia';
        this.guardandoAlumno = false;

        setTimeout(() => {
          this.cargarDatos();
          this.cancelarFormulario();
        }, 2000);
      },
      error: (error) => {
        console.error('Error al inscribir alumno:', error);
        this.errorFormulario = error.error?.message || 'Error al inscribir el alumno. Intenta nuevamente.';
        this.guardandoAlumno = false;
      }
    });
  }

  // Crear nuevo alumno e inscribir
  private crearNuevoAlumno(formData: any): void {
    const partesNombre = this.separarNombreCompleto(formData.nombreCompleto);

    const nuevoAlumno = {
      numeroBoleta: formData.numeroBoleta,
      nombre: partesNombre.nombre,
      apellidoPaterno: partesNombre.apellidoPaterno,
      apellidoMaterno: partesNombre.apellidoMaterno,
      correoElectronico: formData.correoElectronico,
      materiaProfesorId: formData.materiaProfesorId
    };

    this.profesorService.crearAlumnoEInscribir(nuevoAlumno).subscribe({
      next: (response) => {
        this.successMessage = 'Alumno creado e inscrito exitosamente';
        this.guardandoAlumno = false;

        setTimeout(() => {
          this.cargarDatos();
          this.cancelarFormulario();
        }, 2000);
      },
      error: (error) => {
        console.error('Error al crear alumno:', error);
        this.errorFormulario = error.error?.message || 'Error al crear el alumno. Intenta nuevamente.';
        this.guardandoAlumno = false;
      }
    });
  }

  // ==================== MÉTODOS PARA ELIMINAR ALUMNO ====================

  /**
   * Abre el modal de confirmación para eliminar alumno
   */
  confirmarEliminarAlumno(alumno: any, materia: MateriaConAlumnos): void {
    this.alumnoAEliminar = alumno;
    this.materiaDelAlumno = materia;
    this.mostrarModalEliminar = true;
    this.errorFormulario = '';
    this.successMessage = '';
  }

  /**
   * Cancela la eliminación y cierra el modal
   */
  cancelarEliminar(): void {
    if (!this.eliminandoAlumno) {
      this.mostrarModalEliminar = false;
      this.alumnoAEliminar = null;
      this.materiaDelAlumno = null;
    }
  }

  /**
   * Elimina al alumno de la materia
   */
  eliminarAlumno(): void {
    if (!this.alumnoAEliminar || !this.materiaDelAlumno || this.eliminandoAlumno) {
      return;
    }

    this.eliminandoAlumno = true;
    this.errorFormulario = '';
    this.successMessage = '';

    const body = {
      alumnoInfoId: this.alumnoAEliminar.AlumnoInfoID,
      materiaProfesorId: this.materiaDelAlumno.ID
    };

    this.profesorService.eliminarAlumnoDeMateria(body).subscribe({
      next: (response) => {
        console.log('✅ Alumno eliminado exitosamente:', response);

        // Mostrar mensaje de éxito
        this.successMessage = response.message || 'Alumno eliminado de la materia exitosamente';

        // Eliminar el alumno de la lista local
        if (this.materiaDelAlumno.Alumnos) {
          this.materiaDelAlumno.Alumnos = this.materiaDelAlumno.Alumnos.filter(
            (a: any) => a.AlumnoInfoID !== this.alumnoAEliminar.AlumnoInfoID
          );
        }

        // Cerrar modal
        this.mostrarModalEliminar = false;
        this.alumnoAEliminar = null;
        this.materiaDelAlumno = null;
        this.eliminandoAlumno = false;

        // Ocultar mensaje después de 5 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        console.error('❌ Error al eliminar alumno:', error);
        this.errorFormulario = error.error?.message || 'Error al eliminar el alumno de la materia';
        this.eliminandoAlumno = false;

        // Ocultar mensaje de error después de 5 segundos
        setTimeout(() => {
          this.errorFormulario = '';
        }, 5000);
      }
    });
  }

  // Separar nombre completo en partes
  private separarNombreCompleto(nombreCompleto: string): {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
  } {
    const partes = nombreCompleto.trim().split(' ').filter(parte => parte.length > 0);

    if (partes.length >= 3) {
      return {
        nombre: partes[0],
        apellidoPaterno: partes[1],
        apellidoMaterno: partes.slice(2).join(' ')
      };
    } else if (partes.length === 2) {
      return {
        nombre: partes[0],
        apellidoPaterno: partes[1],
        apellidoMaterno: ''
      };
    } else {
      return {
        nombre: partes[0] || '',
        apellidoPaterno: '',
        apellidoMaterno: ''
      };
    }
  }
}