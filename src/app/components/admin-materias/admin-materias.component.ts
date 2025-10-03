// ==================== 5. Frontend - admin-materias.component.ts ====================

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminService, MateriaAdmin, ProfesorDisponible, CatalogoMateria, AlumnoAsignado, MateriaDisponible } from '../../services/admin.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

interface AlumnoExistente {
  ID: number;
  AlumnoInfoID: number;
  NumeroBoleta: string;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string;
  CorreoElectronico: string;
  TelefonoCelular?: string;
}

@Component({
  selector: 'app-admin-materias',
  templateUrl: './admin-materias.component.html',
  styleUrls: ['./admin-materias.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ]
})
export class AdminMateriasComponent implements OnInit {
  materias: MateriaAdmin[] = [];
  catalogoMaterias: CatalogoMateria[] = [];
  loading = false;
  error = '';

  // Formularios
  mostrarFormularioMateria = false;
  mostrarFormularioAlumno = false;
  formularioMateria!: FormGroup;
  formularioAlumno!: FormGroup;

  // Búsqueda
  searchProfesorControl = new FormControl('');
  searchAlumnoControl = new FormControl('');
  resultadosBusquedaProfesor: ProfesorDisponible[] = [];
  resultadosBusquedaAlumno: AlumnoExistente[] = [];
  buscandoProfesor = false;
  buscandoAlumno = false;

  // Estados
  profesorSeleccionado: ProfesorDisponible | null = null;
  alumnoSeleccionado: AlumnoExistente | null = null;
  materiaSeleccionada: MateriaAdmin | null = null;
  alumnoEncontrado = false;

  searchMateriaControl = new FormControl('');
  resultadosBusquedaMateria: MateriaDisponible[] = [];
  buscandoMateria = false;
  materiaSeleccionadaBusqueda: MateriaDisponible | null = null;
  creandoMateriaNueva = false;

  // Modal eliminar materia
  mostrarModalEliminarMateria = false;
  materiaAEliminar: MateriaAdmin | null = null;
  eliminandoMateria = false;

  // Modal eliminar alumno
  mostrarModalEliminarAlumno = false;
  alumnoAEliminar: any = null;
  materiaDelAlumno: any = null;
  eliminandoAlumno = false;

  // Estados de guardado
  guardandoMateria = false;
  guardandoAlumno = false;
  errorFormulario = '';
  successMessage = '';

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder
  ) {
    this.initFormularios();
    this.setupSearchSubscriptions();
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarCatalogoMaterias();
  }

  private initFormularios(): void {
    // Formulario para crear materia
    this.formularioMateria = this.fb.group({
      codigoMateria: ['', Validators.required],
      grupo: ['', Validators.required],
      turno: ['Matutino', Validators.required],
      profesorInfoId: ['', Validators.required]
    });

    // Formulario para agregar alumno
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

    // Formulario para crear materia
    this.formularioMateria = this.fb.group({
      // Campos para materia existente
      materiaExistenteId: [''],

      // Campos para nueva materia
      codigoMateria: [''],
      nombreMateria: [''],
      semestre: [''],
      ejeFormativo: [''],
      descripcion: [''],

      // Campos comunes
      grupo: ['', Validators.required],
      turno: ['Matutino', Validators.required],
      profesorInfoId: ['', Validators.required]
    });

    this.setupAsyncValidators();
  }

  private setupAsyncValidators(): void {
    this.formularioAlumno.get('numeroBoleta')?.setAsyncValidators([
      (control) => {
        if (!control.value || this.alumnoEncontrado) {
          return of(null);
        }
        return this.adminService.verificarBoletaExistente(control.value)
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
        return this.adminService.verificarCorreoAlumnoExistente(control.value)
          .pipe(
            switchMap(existe => of(existe ? { correoExistente: true } : null))
          );
      }
    ]);
  }

  private setupSearchSubscriptions(): void {
    // Búsqueda de profesores
    this.searchProfesorControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(termino => {
        if (!termino || termino.length < 3) {
          this.resultadosBusquedaProfesor = [];
          return of([]);
        }
        this.buscandoProfesor = true;
        return this.adminService.buscarProfesoresDisponibles(termino);
      })
    ).subscribe({
      next: (resultados) => {
        this.resultadosBusquedaProfesor = resultados;
        this.buscandoProfesor = false;
      },
      error: (error) => {
        console.error('Error en búsqueda de profesores:', error);
        this.buscandoProfesor = false;
        this.resultadosBusquedaProfesor = [];
      }
    });

    this.searchMateriaControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(termino => {
        if (!termino || termino.length < 2) {
          this.resultadosBusquedaMateria = [];
          return of([]);
        }
        this.buscandoMateria = true;
        return this.adminService.buscarMateriasDisponibles(termino);
      })
    ).subscribe({
      next: (resultados) => {
        this.resultadosBusquedaMateria = resultados;
        this.buscandoMateria = false;
      },
      error: (error) => {
        console.error('Error en búsqueda de materias:', error);
        this.buscandoMateria = false;
        this.resultadosBusquedaMateria = [];
      }
    });

    // Búsqueda de alumnos
    this.searchAlumnoControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(termino => {
        if (!termino || termino.length < 3) {
          this.resultadosBusquedaAlumno = [];
          return of([]);
        }
        this.buscandoAlumno = true;
        return this.adminService.buscarAlumnosDisponibles(termino);
      })
    ).subscribe({
      next: (resultados) => {
        this.resultadosBusquedaAlumno = resultados;
        this.buscandoAlumno = false;
      },
      error: (error) => {
        console.error('Error en búsqueda de alumnos:', error);
        this.buscandoAlumno = false;
        this.resultadosBusquedaAlumno = [];
      }
    });
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    this.adminService.obtenerTodasMateriasAdmin().subscribe({
      next: (response) => {
        console.log('Materias cargadas:', response);
        this.materias = response.data.materias;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar materias. Por favor, intenta nuevamente.';
        this.loading = false;
        console.error('Error al cargar materias:', error);
      }
    });
  }

  cargarCatalogoMaterias(): void {
    this.adminService.obtenerCatalogoMaterias().subscribe({
      next: (materias) => {
        this.catalogoMaterias = materias;
      },
      error: (error) => {
        console.error('Error al cargar catálogo de materias:', error);
      }
    });
  }

  // ==================== GESTIÓN DE MATERIAS ====================

  abrirFormularioAgregarMateria(): void {
    this.mostrarFormularioMateria = true;
    this.resetFormularioMateria();
  }

  private resetFormularioMateria(): void {
    this.formularioMateria.reset({
      turno: 'Matutino'
    });
    this.searchProfesorControl.setValue('');
    this.searchMateriaControl.setValue('');
    this.profesorSeleccionado = null;
    this.materiaSeleccionadaBusqueda = null;
    this.creandoMateriaNueva = false;
    this.resultadosBusquedaProfesor = [];
    this.resultadosBusquedaMateria = [];
    this.errorFormulario = '';
    this.successMessage = '';

    // Deshabilitar campos de materia por defecto
    this.formularioMateria.get('codigoMateria')?.disable();
    this.formularioMateria.get('nombreMateria')?.disable();
    this.formularioMateria.get('semestre')?.disable();
    this.formularioMateria.get('ejeFormativo')?.disable();
    this.formularioMateria.get('descripcion')?.disable();
  }

  cancelarFormularioMateria(): void {
    this.mostrarFormularioMateria = false;
    this.resetFormularioMateria();
  }

  seleccionarProfesor(profesor: ProfesorDisponible): void {
    this.profesorSeleccionado = profesor;
    this.formularioMateria.patchValue({
      profesorInfoId: profesor.ProfesorInfoID
    });
    this.resultadosBusquedaProfesor = [];
    this.searchProfesorControl.setValue('');
  }

  onSubmitMateria(): void {
    if (!this.formularioMateria.valid || this.guardandoMateria) {
      return;
    }

    // Validar que se haya seleccionado una materia existente O se esté creando una nueva
    if (!this.materiaSeleccionadaBusqueda && !this.creandoMateriaNueva) {
      this.errorFormulario = 'Debes buscar una materia existente o crear una nueva';
      return;
    }

    this.guardandoMateria = true;
    this.errorFormulario = '';

    const formData = this.formularioMateria.getRawValue(); // getRawValue() incluye campos deshabilitados

    this.adminService.crearMateriaProfesor(formData).subscribe({
      next: (response) => {
        this.successMessage = 'Materia creada y asignada exitosamente';
        this.guardandoMateria = false;

        setTimeout(() => {
          this.cargarDatos();
          this.cancelarFormularioMateria();
        }, 2000);
      },
      error: (error) => {
        console.error('Error al crear materia:', error);
        this.errorFormulario = error.error?.message || 'Error al crear la materia. Intenta nuevamente.';
        this.guardandoMateria = false;
      }
    });
  }

  seleccionarMateriaExistente(materia: MateriaDisponible): void {
    this.materiaSeleccionadaBusqueda = materia;
    this.creandoMateriaNueva = false;

    this.formularioMateria.patchValue({
      materiaExistenteId: materia.ID,
      codigoMateria: materia.Codigo,
      nombreMateria: materia.Nombre,
      semestre: materia.Semestre,
      ejeFormativo: materia.EjeFormativo || '',
      descripcion: materia.Descripcion || ''
    });

    // Deshabilitar campos de materia
    this.formularioMateria.get('codigoMateria')?.disable();
    this.formularioMateria.get('nombreMateria')?.disable();
    this.formularioMateria.get('semestre')?.disable();
    this.formularioMateria.get('ejeFormativo')?.disable();
    this.formularioMateria.get('descripcion')?.disable();

    this.resultadosBusquedaMateria = [];
    this.searchMateriaControl.setValue('');
  }

  toggleCrearMateriaNueva(): void {
    this.creandoMateriaNueva = !this.creandoMateriaNueva;
    this.materiaSeleccionadaBusqueda = null;

    if (this.creandoMateriaNueva) {
      // Habilitar todos los campos para crear nueva materia
      this.formularioMateria.patchValue({
        materiaExistenteId: null,
        codigoMateria: '',
        nombreMateria: '',
        semestre: '',
        ejeFormativo: '',
        descripcion: ''
      });

      this.formularioMateria.get('codigoMateria')?.enable();
      this.formularioMateria.get('nombreMateria')?.enable();
      this.formularioMateria.get('semestre')?.enable();
      this.formularioMateria.get('ejeFormativo')?.enable();
      this.formularioMateria.get('descripcion')?.enable();

      // Agregar validadores para nueva materia
      this.formularioMateria.get('codigoMateria')?.setValidators([Validators.required]);
      this.formularioMateria.get('nombreMateria')?.setValidators([Validators.required]);
      this.formularioMateria.get('semestre')?.setValidators([Validators.required, Validators.min(1), Validators.max(10)]);
    } else {
      // Deshabilitar campos
      this.formularioMateria.get('codigoMateria')?.disable();
      this.formularioMateria.get('nombreMateria')?.disable();
      this.formularioMateria.get('semestre')?.disable();
      this.formularioMateria.get('ejeFormativo')?.disable();
      this.formularioMateria.get('descripcion')?.disable();

      // Quitar validadores
      this.formularioMateria.get('codigoMateria')?.clearValidators();
      this.formularioMateria.get('nombreMateria')?.clearValidators();
      this.formularioMateria.get('semestre')?.clearValidators();
    }

    this.formularioMateria.get('codigoMateria')?.updateValueAndValidity();
    this.formularioMateria.get('nombreMateria')?.updateValueAndValidity();
    this.formularioMateria.get('semestre')?.updateValueAndValidity();
  }

  confirmarEliminarMateria(materia: MateriaAdmin): void {
    this.errorFormulario = '';
    this.successMessage = '';

    this.adminService.verificarMateriaProfesorTieneHistorias(materia.MateriaProfesorID).subscribe({
      next: (resultado) => {
        if (resultado.tieneHistorias) {
          this.errorFormulario = `No se puede eliminar esta materia porque tiene ${resultado.cantidad} historia(s) clínica(s) asociada(s).`;

          setTimeout(() => {
            this.errorFormulario = '';
          }, 5000);
        } else {
          this.materiaAEliminar = materia;
          this.mostrarModalEliminarMateria = true;
        }
      },
      error: (error) => {
        console.error('Error al verificar historias:', error);
        this.errorFormulario = 'Error al verificar las historias clínicas de la materia.';
      }
    });
  }

  cancelarEliminarMateria(): void {
    if (!this.eliminandoMateria) {
      this.mostrarModalEliminarMateria = false;
      this.materiaAEliminar = null;
    }
  }

  eliminarMateria(): void {
    if (!this.materiaAEliminar || this.eliminandoMateria) {
      return;
    }

    this.eliminandoMateria = true;
    this.errorFormulario = '';
    this.successMessage = '';

    this.adminService.eliminarMateriaProfesor(this.materiaAEliminar.MateriaProfesorID).subscribe({
      next: (response) => {
        console.log('Materia eliminada exitosamente:', response);

        this.successMessage = response.message || 'Materia eliminada exitosamente';

        this.materias = this.materias.filter(
          m => m.MateriaProfesorID !== this.materiaAEliminar!.MateriaProfesorID
        );

        this.mostrarModalEliminarMateria = false;
        this.materiaAEliminar = null;
        this.eliminandoMateria = false;

        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        console.error('Error al eliminar materia:', error);
        this.errorFormulario = error.error?.message || 'Error al eliminar la materia';
        this.eliminandoMateria = false;

        setTimeout(() => {
          this.errorFormulario = '';
        }, 5000);
      }
    });
  }

  // ==================== GESTIÓN DE ALUMNOS ====================

  abrirFormularioAgregarAlumno(materia: MateriaAdmin): void {
    this.materiaSeleccionada = materia;
    this.mostrarFormularioAlumno = true;
    this.resetFormularioAlumno();

    this.formularioAlumno.patchValue({
      materiaProfesorId: materia.MateriaProfesorID
    });
  }

  private resetFormularioAlumno(): void {
    this.formularioAlumno.reset();
    this.searchAlumnoControl.setValue('');
    this.alumnoEncontrado = false;
    this.alumnoSeleccionado = null;
    this.resultadosBusquedaAlumno = [];
    this.errorFormulario = '';
    this.successMessage = '';
  }

  cancelarFormularioAlumno(): void {
    this.mostrarFormularioAlumno = false;
    this.resetFormularioAlumno();
    this.materiaSeleccionada = null;
  }

  seleccionarAlumnoExistente(alumno: AlumnoExistente): void {
    this.alumnoSeleccionado = alumno;
    this.alumnoEncontrado = true;

    this.formularioAlumno.patchValue({
      nombreCompleto: `${alumno.Nombre} ${alumno.ApellidoPaterno} ${alumno.ApellidoMaterno}`,
      numeroBoleta: alumno.NumeroBoleta,
      correoElectronico: alumno.CorreoElectronico
    });

    this.resultadosBusquedaAlumno = [];
    this.searchAlumnoControl.setValue('');
  }

  onSubmitAlumno(): void {
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

  private inscribirAlumnoExistente(formData: any): void {
    const datosInscripcion = {
      alumnoInfoId: this.alumnoSeleccionado!.AlumnoInfoID,
      materiaProfesorId: formData.materiaProfesorId
    };

    this.adminService.inscribirAlumnoAMateria(datosInscripcion).subscribe({
      next: (response) => {
        this.successMessage = 'Alumno inscrito exitosamente en la materia';
        this.guardandoAlumno = false;

        setTimeout(() => {
          this.cargarDatos();
          this.cancelarFormularioAlumno();
        }, 2000);
      },
      error: (error) => {
        console.error('Error al inscribir alumno:', error);
        this.errorFormulario = error.error?.message || 'Error al inscribir el alumno. Intenta nuevamente.';
        this.guardandoAlumno = false;
      }
    });
  }

  private crearNuevoAlumno(formData: any): void {
    const partesNombre = this.separarNombreCompleto(formData.nombreCompleto);

    const nuevoAlumno = {
      numeroBoleta: formData.numeroBoleta,
      nombre: partesNombre.nombre,
      apellidoPaterno: partesNombre.apellidoPaterno,
      apellidoMaterno: partesNombre.apellidoMaterno,
      correoElectronico: formData.correoElectronico
    };

    this.adminService.crearAlumno(nuevoAlumno).subscribe({
      next: (responseAlumno) => {
        // Ahora inscribir al alumno en la materia
        const datosInscripcion = {
          alumnoInfoId: responseAlumno.data.alumno.ID,
          materiaProfesorId: formData.materiaProfesorId
        };

        this.adminService.inscribirAlumnoAMateria(datosInscripcion).subscribe({
          next: (responseInscripcion) => {
            this.successMessage = 'Alumno creado e inscrito exitosamente';
            this.guardandoAlumno = false;

            setTimeout(() => {
              this.cargarDatos();
              this.cancelarFormularioAlumno();
            }, 2000);
          },
          error: (error) => {
            console.error('Error al inscribir alumno:', error);
            this.errorFormulario = 'Alumno creado pero no se pudo inscribir en la materia';
            this.guardandoAlumno = false;
          }
        });
      },
      error: (error) => {
        console.error('Error al crear alumno:', error);
        this.errorFormulario = error.error?.message || 'Error al crear el alumno. Intenta nuevamente.';
        this.guardandoAlumno = false;
      }
    });
  }

  confirmarEliminarAlumno(alumno: any, materia: MateriaAdmin): void {
    this.alumnoAEliminar = alumno;
    this.materiaDelAlumno = materia;
    this.mostrarModalEliminarAlumno = true;
    this.errorFormulario = '';
    this.successMessage = '';
  }

  cancelarEliminarAlumno(): void {
    if (!this.eliminandoAlumno) {
      this.mostrarModalEliminarAlumno = false;
      this.alumnoAEliminar = null;
      this.materiaDelAlumno = null;
    }
  }

  eliminarAlumno(): void {
    if (!this.alumnoAEliminar || !this.materiaDelAlumno || this.eliminandoAlumno) {
      return;
    }

    this.eliminandoAlumno = true;
    this.errorFormulario = '';
    this.successMessage = '';

    const body = {
      alumnoInfoId: this.alumnoAEliminar.AlumnoInfoID,
      materiaProfesorId: this.materiaDelAlumno.MateriaProfesorID
    };

    this.adminService.eliminarAlumnoDeMateriaAdmin(body).subscribe({
      next: (response) => {
        console.log('Alumno eliminado exitosamente:', response);

        this.successMessage = response.message || 'Alumno eliminado de la materia exitosamente';

        if (this.materiaDelAlumno.Alumnos) {
          this.materiaDelAlumno.Alumnos = this.materiaDelAlumno.Alumnos.filter(
            (a: any) => a.AlumnoInfoID !== this.alumnoAEliminar.AlumnoInfoID
          );
          this.materiaDelAlumno.CantidadAlumnos--;
        }

        this.mostrarModalEliminarAlumno = false;
        this.alumnoAEliminar = null;
        this.materiaDelAlumno = null;
        this.eliminandoAlumno = false;

        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        console.error('Error al eliminar alumno:', error);
        this.errorFormulario = error.error?.message || 'Error al eliminar el alumno de la materia';
        this.eliminandoAlumno = false;

        setTimeout(() => {
          this.errorFormulario = '';
        }, 5000);
      }
    });
  }

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