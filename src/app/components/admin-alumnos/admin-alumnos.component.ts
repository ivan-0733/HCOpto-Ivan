import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminService, AlumnoAdmin } from '../../services/admin.service';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-admin-alumnos',
  templateUrl: './admin-alumnos.component.html',
  styleUrls: ['./admin-alumnos.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ]
})
export class AdminAlumnosComponent implements OnInit {
  alumnos: AlumnoAdmin[] = [];
  loading = false;
  error = '';

  // Formulario y estados
  mostrarFormulario = false;
  formularioAlumno!: FormGroup;

  // Propiedades para eliminar alumno
  mostrarModalEliminar: boolean = false;
  alumnoAEliminar: any = null;
  eliminandoAlumno: boolean = false;

  // Estados de guardado
  guardandoAlumno = false;
  errorFormulario = '';
  successMessage = '';

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder
  ) {
    this.initFormulario();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  // Inicializar formulario
  private initFormulario(): void {
    this.formularioAlumno = this.fb.group({
      nombreCompleto: ['', Validators.required],
      numeroBoleta: ['', Validators.required],
      correoElectronico: ['', [
        Validators.required,
        Validators.email
      ]],
      telefonoCelular: ['', [
        Validators.pattern(/^\d{10}$/)
      ]]
    });

    this.setupAsyncValidators();
  }

  // Configurar validadores asíncronos
  private setupAsyncValidators(): void {
    this.formularioAlumno.get('numeroBoleta')?.setAsyncValidators([
      (control) => {
        if (!control.value) {
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
        if (!control.value) {
          return of(null);
        }
        return this.adminService.verificarCorreoAlumnoExistente(control.value)
          .pipe(
            switchMap(existe => of(existe ? { correoExistente: true } : null))
          );
      }
    ]);
  }

  // Cargar datos principales
  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    this.adminService.obtenerTodosAlumnos().subscribe({
      next: (response) => {
        console.log('Alumnos cargados:', response);
        this.alumnos = response.data.alumnos;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar alumnos. Por favor, intenta nuevamente.';
        this.loading = false;
        console.error('Error al cargar alumnos:', error);
      }
    });
  }

  // Abrir formulario para agregar alumno
  abrirFormularioAgregarAlumno(): void {
    this.mostrarFormulario = true;
    this.resetFormulario();
  }

  // Resetear formulario
  private resetFormulario(): void {
    this.formularioAlumno.reset();
    this.errorFormulario = '';
    this.successMessage = '';
  }

  // Cancelar formulario
  cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.resetFormulario();
  }

  // Enviar formulario
  onSubmit(): void {
    if (this.formularioAlumno.valid && !this.guardandoAlumno) {
      this.guardandoAlumno = true;
      this.errorFormulario = '';

      const formData = this.formularioAlumno.value;
      this.crearNuevoAlumno(formData);
    }
  }

  // Crear nuevo alumno
  private crearNuevoAlumno(formData: any): void {
    const partesNombre = this.separarNombreCompleto(formData.nombreCompleto);

    const nuevoAlumno = {
      numeroBoleta: formData.numeroBoleta,
      nombre: partesNombre.nombre,
      apellidoPaterno: partesNombre.apellidoPaterno,
      apellidoMaterno: partesNombre.apellidoMaterno,
      correoElectronico: formData.correoElectronico,
      telefonoCelular: formData.telefonoCelular || null,
    };

    this.adminService.crearAlumno(nuevoAlumno).subscribe({
      next: (response) => {
        this.successMessage = 'Alumno creado exitosamente';
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

  // Confirmar eliminación
  confirmarEliminarAlumno(alumno: AlumnoAdmin): void {
    this.errorFormulario = '';
    this.successMessage = '';

    this.adminService.verificarAlumnoTieneHistorias(alumno.ID).subscribe({
      next: (resultado) => {
        if (resultado.tieneHistorias) {
          this.errorFormulario = `No se puede eliminar este alumno porque tiene ${resultado.cantidad} historia(s) clínica(s) asociada(s).`;

          setTimeout(() => {
            this.errorFormulario = '';
          }, 5000);
        } else {
          this.alumnoAEliminar = alumno;
          this.mostrarModalEliminar = true;
        }
      },
      error: (error) => {
        console.error('Error al verificar historias:', error);
        this.errorFormulario = 'Error al verificar las historias clínicas del alumno.';
      }
    });
  }

  cancelarEliminar(): void {
    if (!this.eliminandoAlumno) {
      this.mostrarModalEliminar = false;
      this.alumnoAEliminar = null;
    }
  }

  eliminarAlumno(): void {
    if (!this.alumnoAEliminar || this.eliminandoAlumno) {
      return;
    }

    this.eliminandoAlumno = true;
    this.errorFormulario = '';
    this.successMessage = '';

    this.adminService.eliminarAlumno(this.alumnoAEliminar.ID).subscribe({
      next: (response) => {
        console.log('Alumno eliminado exitosamente:', response);

        this.successMessage = response.message || 'Alumno eliminado exitosamente';

        this.alumnos = this.alumnos.filter(
          a => a.ID !== this.alumnoAEliminar.ID
        );

        this.mostrarModalEliminar = false;
        this.alumnoAEliminar = null;
        this.eliminandoAlumno = false;

        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        console.error('Error al eliminar alumno:', error);
        this.errorFormulario = error.error?.message || 'Error al eliminar el alumno';
        this.eliminandoAlumno = false;

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