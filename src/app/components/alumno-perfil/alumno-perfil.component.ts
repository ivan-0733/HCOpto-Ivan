import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AlumnoService, Perfil } from '../../services/alumno.service';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-alumno-perfil',
  templateUrl: './alumno-perfil.component.html',
  styleUrls: ['./alumno-perfil.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  animations: [
    trigger('fadeOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class AlumnoPerfilComponent implements OnInit {
  perfil: Perfil | null = null;
  perfilForm!: FormGroup;
  loading = true;
  updating = false;
  error = '';
  success = '';
  passwordError = '';
  isEditing = false;
  // Arrays para manejar errores específicos de campos únicos
  uniqueErrors: {field: string, message: string, id?: string}[] = [];
  // NUEVO: Array para manejar errores de información personal
  personalInfoErrors: {field: string, message: string, id?: string}[] = [];

  constructor(
    private alumnoService: AlumnoService,
    private formBuilder: FormBuilder
  ) { }

  // Añadir eventos para detectar cambios en los campos de contraseña
  ngOnInit(): void {
    this.cargarPerfil();
    this.initForm();

    // Validar contraseñas en tiempo real
    this.perfilForm.valueChanges.subscribe(() => {
      this.validatePasswords();
      this.checkPersonalInfoFields(); // Nuevo: Verificar campos de información personal
    });

    // Añadir listener para verificar errores de contraseña en tiempo real
    this.perfilForm.get('nuevaPassword')?.valueChanges.subscribe(() => this.checkPasswordErrors());
    this.perfilForm.get('confirmarPassword')?.valueChanges.subscribe(() => this.checkPasswordErrors());
    this.perfilForm.get('passwordActual')?.valueChanges.subscribe(() => this.checkPasswordErrors());

    // Añadir listeners para verificar campos de información personal en tiempo real
    this.perfilForm.get('nombreUsuario')?.valueChanges.subscribe(() => this.checkPersonalInfoFields());
    this.perfilForm.get('correoElectronico')?.valueChanges.subscribe(() => this.checkPersonalInfoFields());
    this.perfilForm.get('telefonoCelular')?.valueChanges.subscribe(() => this.checkPersonalInfoFields());
  }

  // Método para verificar y limpiar errores cuando los campos cambian
  checkPersonalInfoFields(): void {
    // Si estamos en modo de edición
    if (this.isEditing) {
      // Obtener valores actuales
      const nombreUsuario = this.perfilForm.get('nombreUsuario')?.value;
      const correoElectronico = this.perfilForm.get('correoElectronico')?.value;
      const telefonoCelular = this.perfilForm.get('telefonoCelular')?.value;

      // Filtrar errores de nombre de usuario si el campo ha cambiado
      if (nombreUsuario && nombreUsuario !== this.perfil?.NombreUsuario) {
        this.personalInfoErrors = this.personalInfoErrors.filter(error => error.field !== 'nombreUsuario');
      }

      // Filtrar errores de correo electrónico si el campo ha cambiado
      if (correoElectronico && correoElectronico !== this.perfil?.CorreoElectronico) {
        this.personalInfoErrors = this.personalInfoErrors.filter(error => error.field !== 'correoElectronico');
      }

      // Filtrar errores de teléfono si el campo ha cambiado
      if (telefonoCelular && telefonoCelular !== this.perfil?.TelefonoCelular) {
        this.personalInfoErrors = this.personalInfoErrors.filter(error => error.field !== 'telefonoCelular');
      }
    }
  }

  initForm(): void {
    this.perfilForm = this.formBuilder.group({
      nombreUsuario: ['', Validators.required],
      correoElectronico: ['', [Validators.required, Validators.email]],
      telefonoCelular: ['', Validators.pattern('[0-9]{10}')],

      passwordActual: [''],
      nuevaPassword: ['', [Validators.minLength(6)]],
      confirmarPassword: ['']
    });
  }

  // Método para validar contraseñas en tiempo real
  validatePasswords(): void {
    const actual = this.perfilForm.get('passwordActual')?.value;
    const nueva = this.perfilForm.get('nuevaPassword')?.value;
    const confirmar = this.perfilForm.get('confirmarPassword')?.value;

    // Primero limpiar errores existentes
    this.passwordError = '';

    // Solo validamos si hay al menos un campo con valor
    if (!actual && !nueva && !confirmar) {
      return;
    }

    // Validar que si algún campo tiene valor, todos deben tener valor
    if ((actual || nueva || confirmar) && !(actual && nueva && confirmar)) {
      this.passwordError = 'Todos los campos de contraseña son obligatorios';
      return;
    }

    // Si se están modificando las contraseñas
    if (actual && nueva && confirmar) {
      // Validar que las contraseñas nuevas coincidan
      if (nueva !== confirmar) {
        this.passwordError = 'Las contraseñas no coinciden';
        return;
      }

      // Validar que la nueva contraseña sea diferente a la actual
      if (actual === nueva) {
        this.passwordError = 'La nueva contraseña debe ser diferente a la actual';
        return;
      }

      // Validar requisitos de seguridad
      if (nueva.length < 8) {
        this.passwordError = 'La contraseña debe tener al menos 8 caracteres';
        return;
      }

      if (!/[A-Z]/.test(nueva)) {
        this.passwordError = 'La contraseña debe tener al menos una letra mayúscula';
        return;
      }

      if (!/[0-9]/.test(nueva)) {
        this.passwordError = 'La contraseña debe tener al menos un número';
        return;
      }

      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(nueva)) {
        this.passwordError = 'La contraseña debe tener al menos un carácter especial';
        return;
      }
    }
  }

  // Validación de contraseñas iguales
  passwordsIguales(group: FormGroup) {
    const nueva = group.get('nuevaPassword')?.value;
    const confirmar = group.get('confirmarPassword')?.value;

    // Solo validar si ambos campos tienen valor
    if (nueva && confirmar && nueva !== confirmar) {
      // En vez de retornar el error, lo almacenamos en la instancia
      return { passwordMismatch: true };
    }
    return null;
  }

  checkPasswordErrors(): void {
    const nueva = this.perfilForm.get('nuevaPassword')?.value;
    const confirmar = this.perfilForm.get('confirmarPassword')?.value;
    const actual = this.perfilForm.get('passwordActual')?.value;

    // Limpiar error anterior para evitar duplicidad
    this.passwordError = '';

    // Verificar si hay valores en ambos campos
    if (nueva && confirmar && nueva !== confirmar) {
      this.passwordError = 'Las contraseñas no coinciden';
      return;
    }

    // Verificar si falta algún campo de contraseña
    if ((actual || nueva || confirmar) && !(actual && nueva && confirmar)) {
      this.passwordError = 'Todos los campos de contraseña son obligatorios';
      return;
    }

    // Si tiene todos los campos, verificar si la nueva es igual a la actual
    if (actual && nueva && actual === nueva) {
      this.passwordError = 'La nueva contraseña debe ser diferente a la actual';
      return;
    }
  }

  passwordsMatch(): boolean {
    const newPassword = this.perfilForm.get('nuevaPassword')?.value;
    const confirmPassword = this.perfilForm.get('confirmarPassword')?.value;

    // Devuelve true solo si ambas contraseñas existen y son iguales
    return newPassword && confirmPassword && newPassword === confirmPassword;
  }

  // Valida si la contraseña tiene al menos 8 caracteres
  passwordMeetsMinLength(): boolean {
    const password = this.perfilForm.get('nuevaPassword')?.value;
    return password && password.length >= 8;
  }

  // Valida si la contraseña tiene al menos una letra mayúscula
  passwordHasUppercase(): boolean {
    const password = this.perfilForm.get('nuevaPassword')?.value;
    return password && /[A-Z]/.test(password);
  }

  // Valida si la contraseña tiene al menos un carácter especial
  passwordHasSpecialChar(): boolean {
    const password = this.perfilForm.get('nuevaPassword')?.value;
    return password && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password);
  }

  // Valida si la nueva contraseña es diferente a la actual
  passwordIsDifferent(): boolean {
    const currentPassword = this.perfilForm.get('passwordActual')?.value;
    const newPassword = this.perfilForm.get('nuevaPassword')?.value;
    return currentPassword && newPassword && currentPassword !== newPassword;
  }

  passwordHasNumber(): boolean {
    const password = this.perfilForm.get('nuevaPassword')?.value;
    return password && /\d/.test(password);
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
          correoElectronico: perfil.CorreoElectronico,
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

  // Generar ID único para los errores
  private generateErrorId(): string {
    return 'error-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
  }

  // Método para verificar si un mensaje de error ya existe
  private errorMessageExists(message: string): boolean {
    const lowerCaseMessage = message.toLowerCase();
    return this.personalInfoErrors.some(error => error.message.toLowerCase() === lowerCaseMessage);
  }

  toggleEditing(): void {
    this.isEditing = !this.isEditing;

    if (!this.isEditing) {
      // Restaurar valores originales si se cancela la edición
      this.perfilForm.patchValue({
        nombreUsuario: this.perfil?.NombreUsuario,
        correoElectronico: this.perfil?.CorreoElectronico,
        telefonoCelular: this.perfil?.TelefonoCelular,
        passwordActual: '',
        nuevaPassword: '',
        confirmarPassword: ''
      });

      // Limpiar errores
      this.error = '';
      this.passwordError = '';
      this.uniqueErrors = [];
      this.personalInfoErrors = []; // NUEVO: Limpiar errores de información personal
    }
  }

  onSubmit(): void {
    // Limpiar errores previos antes de validar
    this.error = '';
    this.passwordError = '';
    this.uniqueErrors = [];
    // No limpiamos personalInfoErrors para que se mantengan los errores anteriores
    // y puedan acumularse si hay nuevos errores

    // Luego validar
    this.validatePasswords();

    if (this.perfilForm.invalid || this.passwordError) {
      this.checkPasswordErrors();
      return;
    }

    this.updating = true;
    this.success = '';

    const { nombreUsuario, correoElectronico, telefonoCelular, passwordActual, nuevaPassword } = this.perfilForm.value;

    // Crear una variable para rastrear las operaciones completadas
    let operacionesCompletadas = 0;
    let totalOperaciones = 0;

    // Determinar qué operaciones se realizarán
    const actualizarDatosPerfil = nombreUsuario || correoElectronico || telefonoCelular;
    const actualizarContraseña = passwordActual && nuevaPassword;

    if (actualizarDatosPerfil) totalOperaciones++;
    if (actualizarContraseña) totalOperaciones++;

    // Convertir el nombre de usuario a minúsculas para la validación
    const nombreUsuarioLowerCase = nombreUsuario ? nombreUsuario.toLowerCase() : '';

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

        // Hacer que el mensaje de éxito desaparezca después de 5 segundos
        setTimeout(() => {
          this.success = '';
        }, 5000);
      }
    };

    // Si se modificaron datos del perfil
    if (actualizarDatosPerfil) {
      const datos = {
        nombreUsuario: nombreUsuarioLowerCase,
        correoElectronico,
        telefonoCelular
      };

      this.alumnoService.actualizarPerfil(datos).subscribe({
        next: (response) => {
          finalizarActualizacion();
        },
        error: (error) => {
          // Limpiar errores previos
          this.passwordError = '';
          this.uniqueErrors = [];
          // No limpiamos personalInfoErrors para acumular errores

          console.error('Error al actualizar perfil:', error);

          // Extraer mensaje de error, exactamente como viene del backend
          let errorMessage = '';

          if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (typeof error?.error === 'string') {
            errorMessage = error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          } else if (error?.sqlMessage) {
            errorMessage = error.sqlMessage;
          }

          // Verificar si este error ya existe para evitar duplicados
          if (this.errorMessageExists(errorMessage)) {
            this.updating = false;
            return; // Si el error ya existe, no lo agregamos nuevamente
          }

          // Usar mensaje de error exactamente como viene del backend
          const mensajeLowerCase = errorMessage.toLowerCase();
          let errorEncontrado = false;
          const errorId = this.generateErrorId(); // Generar ID único para el error

          // Verificar teléfono
          if (mensajeLowerCase.includes('teléfono') || mensajeLowerCase.includes('telefono')) {
            // Agregar el error solo si no existe ya
            this.personalInfoErrors.push({
              field: 'telefonoCelular',
              message: errorMessage,
              id: errorId
            });

            errorEncontrado = true;
          }

          // Verificar correo
          else if (mensajeLowerCase.includes('correo') || mensajeLowerCase.includes('email')) {
            // Agregar el error solo si no existe ya
            this.personalInfoErrors.push({
              field: 'correoElectronico',
              message: errorMessage,
              id: errorId
            });

            errorEncontrado = true;
          }

          // Verificar nombre de usuario
          else if (mensajeLowerCase.includes('nombre de usuario') || mensajeLowerCase.includes('username')) {
            // Agregar el error solo si no existe ya
            this.personalInfoErrors.push({
              field: 'nombreUsuario',
              message: errorMessage,
              id: errorId
            });

            errorEncontrado = true;
          }

          // Verificar errores específicos de MySQL para duplicados
          else if (mensajeLowerCase.includes('duplicate entry')) {
            if (mensajeLowerCase.includes('idx_telefono')) {
              // Agregar el error solo si no existe ya
              this.personalInfoErrors.push({
                field: 'telefonoCelular',
                message: errorMessage,
                id: errorId
              });

              errorEncontrado = true;
            }
            else if (mensajeLowerCase.includes('idx_correo')) {
              // Agregar el error solo si no existe ya
              this.personalInfoErrors.push({
                field: 'correoElectronico',
                message: errorMessage,
                id: errorId
              });

              errorEncontrado = true;
            }
            else if (mensajeLowerCase.includes('idx_nombre')) {
              // Agregar el error solo si no existe ya
              this.personalInfoErrors.push({
                field: 'nombreUsuario',
                message: errorMessage,
                id: errorId
              });

              errorEncontrado = true;
            }
          }

          // Si no se encontró un error específico, mostrar el error general
          if (!errorEncontrado) {
            this.error = 'Error al actualizar perfil. ' + (errorMessage || 'Por favor, intenta nuevamente.');
          }

          this.updating = false;
        }
      });
    }

    // Si se ingresaron las contraseñas
    if (actualizarContraseña) {
      this.alumnoService.actualizarPassword({
        passwordActual,
        nuevaPassword
      }).subscribe({
        next: (response) => {
          finalizarActualizacion();
        },
        error: (error) => {
          console.error('Error al actualizar contraseña:', error);

          // Limpiar errores previos
          this.passwordError = '';
          this.error = '';

          // Verificar diferentes formatos posibles del error
          let errorMessage = '';

          // Intentar extraer el mensaje de error del objeto error
          if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.error?.data?.message) {
            errorMessage = error.error.data.message;
          } else if (typeof error?.error === 'string') {
            errorMessage = error.error;
          } else if (error?.message) {
            errorMessage = error.message;
          }

          // Verificar por contenido del mensaje, con insensibilidad a mayúsculas/minúsculas
          const mensajeLowerCase = errorMessage.toLowerCase();
          if (mensajeLowerCase.includes('contraseña actual incorrecta') ||
              mensajeLowerCase.includes('password incorrect') ||
              mensajeLowerCase.includes('contraseña incorrecta')) {

            this.passwordError = 'La contraseña actual no es correcta';
            this.error = 'Contraseña actual incorrecta. Por favor, intenta nuevamente.';
          } else {
            this.error = 'Error al actualizar contraseña. ' + (errorMessage || 'Por favor, intenta nuevamente.');
          }

          this.updating = false;
        }
      });
    }

    // Si no hay operaciones, simplemente cerrar el modo edición
    if (totalOperaciones === 0) {
      this.updating = false;
      this.isEditing = false;
    }
  }

  get formIsValid(): boolean {
    return this.perfilForm.valid && !this.passwordError;
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