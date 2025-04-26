import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AlumnoService, Perfil } from '../../services/alumno.service';

@Component({
  selector: 'app-alumno-perfil',
  templateUrl: './alumno-perfil.component.html',
  styleUrls: ['./alumno-perfil.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class AlumnoPerfilComponent implements OnInit {
  perfil: Perfil | null = null;
  perfilForm!: FormGroup;
  loading = true;
  updating = false;
  error = '';
  success = '';
  isEditing = false;

  constructor(
    private alumnoService: AlumnoService,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.cargarPerfil();
    this.initForm();
  }

  initForm(): void {
    this.perfilForm = this.formBuilder.group({
      nombreUsuario: ['', Validators.required],
      telefonoCelular: ['', Validators.pattern('[0-9]{10}')],

      passwordActual: [''],
      nuevaPassword: ['', [Validators.minLength(6)]],
      confirmarPassword: ['']
    }, {
      validators: [this.passwordsIguales, this.validarCamposPassword]
    });
  }

  // Validación de contraseñas iguales
  passwordsIguales(group: FormGroup) {
    const nueva = group.get('nuevaPassword')?.value;
    const confirmar = group.get('confirmarPassword')?.value;
    return nueva && confirmar && nueva !== confirmar ? { passwordMismatch: true } : null;
  }

  // Validación para asegurar que todos los campos de contraseña estén llenos si uno está lleno
  validarCamposPassword(group: FormGroup) {
    const actual = group.get('passwordActual')?.value;
    const nueva = group.get('nuevaPassword')?.value;
    const confirmar = group.get('confirmarPassword')?.value;

    // Si algún campo está lleno, todos deben estar llenos
    if ((actual || nueva || confirmar) && !(actual && nueva && confirmar)) {
      return { requiredPasswordFields: true };
    }

    return null;
  }

  cargarPerfil(): void {
    this.loading = true;
    this.error = '';

    this.alumnoService.obtenerPerfil().subscribe({
      next: (perfil) => {
        this.perfil = perfil;
        this.loading = false;

        // Actualizar el formulario con los datos del perfil
        this.perfilForm.patchValue({
          nombreUsuario: perfil.NombreUsuario,
          telefonoCelular: perfil.TelefonoCelular
        });
      },
      error: (error) => {
        this.error = 'Error al cargar datos del perfil. Por favor, intenta nuevamente.';
        this.loading = false;
        console.error('Error al cargar perfil:', error);
      }
    });
  }

  toggleEditing(): void {
    this.isEditing = !this.isEditing;

    if (!this.isEditing) {
      // Restaurar valores originales si se cancela la edición
      this.perfilForm.patchValue({
        nombreUsuario: this.perfil?.NombreUsuario,
        telefonoCelular: this.perfil?.TelefonoCelular
      });
    }
  }

  onSubmit(): void {
    if (this.perfilForm.invalid) {
      return;
    }

    this.updating = true;
    this.error = '';
    this.success = '';

    const { nombreUsuario, telefonoCelular, passwordActual, nuevaPassword } = this.perfilForm.value;

    // Crear una variable para rastrear las operaciones completadas
    let operacionesCompletadas = 0;
    let totalOperaciones = 0;

    // Determinar qué operaciones se realizarán
    const actualizarDatosPerfil = nombreUsuario || telefonoCelular;
    const actualizarContraseña = passwordActual && nuevaPassword;

    if (actualizarDatosPerfil) totalOperaciones++;
    if (actualizarContraseña) totalOperaciones++;

    const finalizarActualizacion = () => {
      operacionesCompletadas++;
      if (operacionesCompletadas === totalOperaciones) {
        this.success = 'Perfil actualizado correctamente';
        this.updating = false;
        this.isEditing = false;
        this.cargarPerfil(); // Recargar perfil

        // Limpiar los campos de contraseña
        this.perfilForm.patchValue({
          passwordActual: '',
          nuevaPassword: '',
          confirmarPassword: ''
        });
      }
    };

    // Si se ingresaron las contraseñas
    if (actualizarContraseña) {
      this.alumnoService.actualizarPassword({
        passwordActual,
        nuevaPassword
      }).subscribe({
        next: () => {
          finalizarActualizacion();
        },
        error: (error) => {
          this.error = 'Error al actualizar contraseña. ' + (error?.error?.message || 'Por favor, intenta nuevamente.');
          this.updating = false;
          console.error('Error al actualizar contraseña:', error);
        }
      });
    }

    // Si se modificaron datos del perfil
    if (actualizarDatosPerfil) {
      const datos = { nombreUsuario, telefonoCelular };
      this.alumnoService.actualizarPerfil(datos).subscribe({
        next: () => {
          finalizarActualizacion();
        },
        error: (error) => {
          this.error = 'Error al actualizar perfil. ' + (error?.error?.message || 'Por favor, intenta nuevamente.');
          this.updating = false;
          console.error('Error al actualizar perfil:', error);
        }
      });
    }

    // Si no hay operaciones, simplemente cerrar el modo edición
    if (totalOperaciones === 0) {
      this.updating = false;
      this.isEditing = false;
    }
  }

  formatDateTime(dateTime: string | null): string {
    if (!dateTime) return 'Nunca';
    return new Date(dateTime).toLocaleString();
  }

  get semestreTexto(): string {
    if (!this.perfil) return '';
    return `${this.perfil.SemestreActual}°`;
  }
}