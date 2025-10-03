import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminService, ProfesorAdmin } from '../../services/admin.service';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-admin-profesores',
  templateUrl: './admin-profesores.component.html',
  styleUrls: ['./admin-profesores.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ]
})
export class AdminProfesoresComponent implements OnInit {
  profesores: ProfesorAdmin[] = [];
  loading = false;
  error = '';

  // Formulario y estados
  mostrarFormulario = false;
  formularioProfesor!: FormGroup;

  // Propiedades para eliminar profesor
  mostrarModalEliminar: boolean = false;
  profesorAEliminar: any = null;
  eliminandoProfesor: boolean = false;

  // Estados de guardado
  guardandoProfesor = false;
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
    this.formularioProfesor = this.fb.group({
      nombreCompleto: ['', Validators.required],
      numeroEmpleado: ['', [
        Validators.required,
      ]],
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
    this.formularioProfesor.get('numeroEmpleado')?.setAsyncValidators([
      (control) => {
        if (!control.value) {
          return of(null);
        }
        return this.adminService.verificarEmpleadoExistente(control.value)
          .pipe(
            switchMap(existe => of(existe ? { empleadoExistente: true } : null))
          );
      }
    ]);

    this.formularioProfesor.get('correoElectronico')?.setAsyncValidators([
      (control) => {
        if (!control.value) {
          return of(null);
        }
        return this.adminService.verificarCorreoProfesorExistente(control.value)
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

    this.adminService.obtenerTodosProfesores().subscribe({
      next: (response) => {
        console.log('Profesores cargados:', response);
        this.profesores = response.data.profesores;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar profesores. Por favor, intenta nuevamente.';
        this.loading = false;
        console.error('Error al cargar profesores:', error);
      }
    });
  }

  // Abrir formulario para agregar profesor
  abrirFormularioAgregarProfesor(): void {
    this.mostrarFormulario = true;
    this.resetFormulario();
  }

  // Resetear formulario
  private resetFormulario(): void {
    this.formularioProfesor.reset();
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
    if (this.formularioProfesor.valid && !this.guardandoProfesor) {
      this.guardandoProfesor = true;
      this.errorFormulario = '';

      const formData = this.formularioProfesor.value;
      this.crearNuevoProfesor(formData);
    }
  }

  // Crear nuevo profesor
  private crearNuevoProfesor(formData: any): void {
    const partesNombre = this.separarNombreCompleto(formData.nombreCompleto);

    const nuevoProfesor = {
      numeroEmpleado: formData.numeroEmpleado,
      nombre: partesNombre.nombre,
      apellidoPaterno: partesNombre.apellidoPaterno,
      apellidoMaterno: partesNombre.apellidoMaterno,
      correoElectronico: formData.correoElectronico,
      telefonoCelular: formData.telefonoCelular || null,
    };

    this.adminService.crearProfesor(nuevoProfesor).subscribe({
      next: (response) => {
        this.successMessage = 'Profesor creado exitosamente';
        this.guardandoProfesor = false;

        setTimeout(() => {
          this.cargarDatos();
          this.cancelarFormulario();
        }, 2000);
      },
      error: (error) => {
        console.error('Error al crear profesor:', error);
        this.errorFormulario = error.error?.message || 'Error al crear el profesor. Intenta nuevamente.';
        this.guardandoProfesor = false;
      }
    });
  }

  // ==================== MÉTODOS PARA ELIMINAR PROFESOR ====================

  confirmarEliminarProfesor(profesor: ProfesorAdmin): void {
    this.errorFormulario = '';
    this.successMessage = '';

    // Primero verificar si tiene historias clínicas asociadas
    this.adminService.verificarProfesorTieneHistorias(profesor.ID).subscribe({
      next: (resultado) => {
        if (resultado.tieneHistorias) {
          this.errorFormulario = `No se puede eliminar este profesor porque tiene ${resultado.cantidad} historia(s) clínica(s) asociada(s).`;

          setTimeout(() => {
            this.errorFormulario = '';
          }, 5000);
        } else {
          this.profesorAEliminar = profesor;
          this.mostrarModalEliminar = true;
        }
      },
      error: (error) => {
        console.error('Error al verificar historias:', error);
        this.errorFormulario = 'Error al verificar las historias clínicas del profesor.';
      }
    });
  }

  cancelarEliminar(): void {
    if (!this.eliminandoProfesor) {
      this.mostrarModalEliminar = false;
      this.profesorAEliminar = null;
    }
  }

  eliminarProfesor(): void {
    if (!this.profesorAEliminar || this.eliminandoProfesor) {
      return;
    }

    this.eliminandoProfesor = true;
    this.errorFormulario = '';
    this.successMessage = '';

    this.adminService.eliminarProfesor(this.profesorAEliminar.ID).subscribe({
      next: (response) => {
        console.log('✅ Profesor eliminado exitosamente:', response);

        this.successMessage = response.message || 'Profesor eliminado exitosamente';

        // Eliminar el profesor de la lista local
        this.profesores = this.profesores.filter(
          p => p.ID !== this.profesorAEliminar.ID
        );

        // Cerrar modal
        this.mostrarModalEliminar = false;
        this.profesorAEliminar = null;
        this.eliminandoProfesor = false;

        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        console.error('❌ Error al eliminar profesor:', error);
        this.errorFormulario = error.error?.message || 'Error al eliminar el profesor';
        this.eliminandoProfesor = false;

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