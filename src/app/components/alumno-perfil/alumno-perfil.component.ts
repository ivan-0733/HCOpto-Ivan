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
  // Array para manejar errores de información personal
  personalInfoErrors: {field: string, message: string, id?: string}[] = [];
  // Variable para controlar si hay errores en alguno de los sistemas
  hasErrors = false;
  // Variables para controlar la visibilidad de las contraseñas
  showPasswordActual = false;
  showNuevaPassword = false;

  constructor(
    private alumnoService: AlumnoService,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.cargarPerfil();
    this.initForm();

    // Validar formulario en tiempo real
    this.perfilForm.valueChanges.subscribe(() => {
      this.validatePasswords();
      this.checkPersonalInfoFields();
      this.checkForErrors();
    });

    // Listeners para campos de contraseña
    this.perfilForm.get('nuevaPassword')?.valueChanges.subscribe(() => {
      this.checkPasswordErrors();
      this.checkForErrors();
    });
    this.perfilForm.get('confirmarPassword')?.valueChanges.subscribe(() => {
      this.checkPasswordErrors();
      this.checkForErrors();
    });
    this.perfilForm.get('passwordActual')?.valueChanges.subscribe(() => {
      this.checkPasswordErrors();
      this.checkForErrors();
    });

    // Listeners para campos de información personal
    this.perfilForm.get('nombreUsuario')?.valueChanges.subscribe(() => {
      this.checkPersonalInfoFields();
      this.checkForErrors();
    });
    this.perfilForm.get('correoElectronico')?.valueChanges.subscribe(() => {
      this.checkPersonalInfoFields();
      this.checkForErrors();
    });
    this.perfilForm.get('telefonoCelular')?.valueChanges.subscribe(() => {
      this.checkPersonalInfoFields();
      this.checkForErrors();
    });
  }

  // Método para alternar la visibilidad de la contraseña actual
  togglePasswordActual(): void {
    this.showPasswordActual = !this.showPasswordActual;
  }

  // Método para alternar la visibilidad de la nueva contraseña
  toggleNuevaPassword(): void {
    this.showNuevaPassword = !this.showNuevaPassword;
  }

  // Método para verificar si hay errores en cualquier parte
  checkForErrors(): void {
    this.hasErrors = this.personalInfoErrors.length > 0 ||
                    !!this.passwordError ||
                    !!this.error ||
                    this.uniqueErrors.length > 0 ||
                    this.perfilForm.invalid;
  }

  // Método para verificar y limpiar errores cuando los campos cambian
  checkPersonalInfoFields(): void {
    if (this.isEditing) {
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
        console.log('Datos del perfil:', perfil);
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
      this.personalInfoErrors = [];
      this.hasErrors = false;

      // Restablecer visibilidad de contraseñas
      this.showPasswordActual = false;
      this.showNuevaPassword = false;
    }
  }

  onSubmit(): void {
    // Limpiar errores previos antes de validar
    this.error = '';
    this.uniqueErrors = [];
    // No limpiamos personalInfoErrors para que se mantengan los errores anteriores

    // Validar todo el formulario
    this.validatePasswords();
    this.checkPersonalInfoFields();
    this.checkPasswordErrors();
    this.checkForErrors();

    // Obtener valores y verificar si hay cambios en contraseña
    const { nombreUsuario, correoElectronico, telefonoCelular, passwordActual, nuevaPassword, confirmarPassword } = this.perfilForm.value;
    const hayAlgunCampoPassword = !!(passwordActual || nuevaPassword || confirmarPassword);

    // Si hay al menos un campo de contraseña, verificar que no tengan errores
    if (hayAlgunCampoPassword) {
      // Verificación específica para contraseña
      if (!passwordActual || !nuevaPassword || !confirmarPassword) {
        this.passwordError = 'Todos los campos de contraseña son obligatorios';
      } else if (nuevaPassword !== confirmarPassword) {
        this.passwordError = 'Las contraseñas no coinciden';
      } else if (passwordActual === nuevaPassword) {
        this.passwordError = 'La nueva contraseña debe ser diferente a la actual';
      } else if (nuevaPassword.length < 8) {
        this.passwordError = 'La contraseña debe tener al menos 8 caracteres';
      } else if (!/[A-Z]/.test(nuevaPassword)) {
        this.passwordError = 'La contraseña debe tener al menos una letra mayúscula';
      } else if (!/[0-9]/.test(nuevaPassword)) {
        this.passwordError = 'La contraseña debe tener al menos un número';
      } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(nuevaPassword)) {
        this.passwordError = 'La contraseña debe tener al menos un carácter especial';
      }
    }

    // Volver a verificar errores después de todas las validaciones
    this.checkForErrors();

    // PUNTO CLAVE: Verificar errores en CUALQUIER sección antes de continuar
    if (this.hasErrors || this.perfilForm.invalid || this.passwordError ||
        this.personalInfoErrors.length > 0 || this.uniqueErrors.length > 0) {
      console.log('Hay errores en el formulario, no se realizará ninguna actualización');
      return;
    }

    this.updating = true;
    this.success = '';

    // Determinar qué se va a actualizar
    const actualizarDatosPerfil = nombreUsuario !== this.perfil?.NombreUsuario ||
                                 correoElectronico !== this.perfil?.CorreoElectronico ||
                                 telefonoCelular !== this.perfil?.TelefonoCelular;
    const actualizarContraseña = hayAlgunCampoPassword && passwordActual && nuevaPassword;

    // Si no hay nada que actualizar, cerrar el modo edición
    if (!actualizarDatosPerfil && !actualizarContraseña) {
      this.updating = false;
      this.isEditing = false;
      return;
    }

    // Convertir el nombre de usuario a minúsculas para la validación
    const nombreUsuarioLowerCase = nombreUsuario ? nombreUsuario.toLowerCase() : '';

    // Variables para control de flujo
    let errorDuranteActualizacion = false;

    // Función para manejar los errores de la API
    const manejarError = (error: any, tipo: string) => {
      errorDuranteActualizacion = true;
      console.error(`Error al actualizar ${tipo}:`, error);

      // Extraer mensaje de error
      let errorMessage = '';
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.error?.data?.message) {
        errorMessage = error.error.data.message;
      } else if (typeof error?.error === 'string') {
        errorMessage = error.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.sqlMessage) {
        errorMessage = error.sqlMessage;
      }

      // Procesar errores según su tipo
      if (tipo === 'perfil') {
        const mensajeLowerCase = errorMessage.toLowerCase();
        let errorEncontrado = false;
        const errorId = this.generateErrorId();

        // Verificar teléfono
        if (mensajeLowerCase.includes('teléfono') || mensajeLowerCase.includes('telefono')) {
          this.personalInfoErrors.push({
            field: 'telefonoCelular',
            message: errorMessage,
            id: errorId
          });
          errorEncontrado = true;
        }
        // Verificar correo
        else if (mensajeLowerCase.includes('correo') || mensajeLowerCase.includes('email')) {
          this.personalInfoErrors.push({
            field: 'correoElectronico',
            message: errorMessage,
            id: errorId
          });
          errorEncontrado = true;
        }
        // Verificar nombre de usuario
        else if (mensajeLowerCase.includes('nombre de usuario') || mensajeLowerCase.includes('username')) {
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
            this.personalInfoErrors.push({
              field: 'telefonoCelular',
              message: errorMessage,
              id: errorId
            });
            errorEncontrado = true;
          }
          else if (mensajeLowerCase.includes('idx_correo')) {
            this.personalInfoErrors.push({
              field: 'correoElectronico',
              message: errorMessage,
              id: errorId
            });
            errorEncontrado = true;
          }
          else if (mensajeLowerCase.includes('idx_nombre')) {
            this.personalInfoErrors.push({
              field: 'nombreUsuario',
              message: errorMessage,
              id: errorId
            });
            errorEncontrado = true;
          }
        }

        // Si no se encontró un error específico, mostrar error general
        if (!errorEncontrado) {
          this.error = 'Error al actualizar perfil. ' + (errorMessage || 'Por favor, intenta nuevamente.');
        }
      }
      else if (tipo === 'contraseña') {
        const mensajeLowerCase = errorMessage.toLowerCase();
        if (mensajeLowerCase.includes('contraseña actual incorrecta') ||
            mensajeLowerCase.includes('password incorrect') ||
            mensajeLowerCase.includes('contraseña incorrecta')) {
          this.passwordError = 'La contraseña actual no es correcta';
        } else {
          this.error = 'Error al actualizar contraseña. ' + (errorMessage || 'Por favor, intenta nuevamente.');
        }
      }

      this.updating = false;
      this.checkForErrors();
    };

    // Función para finalizar el proceso si todo sale bien
    const finalizarExitosamente = () => {
      if (!errorDuranteActualizacion) {
        this.success = 'Perfil actualizado correctamente';
        this.updating = false;
        this.isEditing = false;
        // Restablecer visibilidad de contraseñas
        this.showPasswordActual = false;
        this.showNuevaPassword = false;
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

    // Implementación corregida para la verificación y actualización de contraseña
    if (actualizarContraseña) {
      // Verificar primero si la contraseña actual es correcta
      this.alumnoService.verificarPasswordActual(passwordActual).subscribe({
        next: (esValida) => {
          if (!esValida) {
            // La contraseña no es válida
            this.passwordError = 'La contraseña actual no es correcta';
            this.updating = false;
            this.checkForErrors();
            return;
          }

          // Si la contraseña es correcta y hay que actualizar perfil
          if (actualizarDatosPerfil) {
            this.actualizarInformacionPersonal(nombreUsuarioLowerCase, correoElectronico, telefonoCelular, () => {
              if (!errorDuranteActualizacion) {
                // Solo si la actualización del perfil fue exitosa, actualizamos la contraseña
                this.actualizarPasswordUsuario(passwordActual, nuevaPassword, finalizarExitosamente);
              }
            });
          } else {
            // Si solo hay que actualizar la contraseña
            this.actualizarPasswordUsuario(passwordActual, nuevaPassword, finalizarExitosamente);
          }
        },
        error: (error) => {
          manejarError(error, 'contraseña');
        }
      });
    } else if (actualizarDatosPerfil) {
      // Si solo hay que actualizar datos del perfil
      this.actualizarInformacionPersonal(nombreUsuarioLowerCase, correoElectronico, telefonoCelular, finalizarExitosamente);
    } else {
      // No hay nada que actualizar
      this.updating = false;
      this.isEditing = false;
    }
  }

  // Métodos auxiliares para actualizar por separado (mejora el mantenimiento del código)
  private actualizarInformacionPersonal(
    nombreUsuario: string,
    correoElectronico: string,
    telefonoCelular: string,
    callback: () => void
  ): void {
    const datos = {
      nombreUsuario,
      correoElectronico,
      telefonoCelular
    };

    this.alumnoService.actualizarPerfil(datos).subscribe({
      next: (response) => {
        callback();
      },
      error: (error) => {
        this.manejarErrorActualizacion(error, 'perfil');
      }
    });
  }

  private actualizarPasswordUsuario(
    passwordActual: string,
    nuevaPassword: string,
    callback: () => void
  ): void {
    this.alumnoService.actualizarPassword({
      passwordActual,
      nuevaPassword
    }).subscribe({
      next: (response) => {
        callback();
      },
      error: (error) => {
        this.manejarErrorActualizacion(error, 'contraseña');
      }
    });
  }

  // Método para manejar errores de actualización
  private manejarErrorActualizacion(error: any, tipo: string): void {
    console.error(`Error al actualizar ${tipo}:`, error);

    // Extraer mensaje de error
    let errorMessage = '';
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.error?.data?.message) {
      errorMessage = error.error.data.message;
    } else if (typeof error?.error === 'string') {
      errorMessage = error.error;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.sqlMessage) {
      errorMessage = error.sqlMessage;
    }

    // Procesar errores según su tipo
    if (tipo === 'perfil') {
      const mensajeLowerCase = errorMessage.toLowerCase();
      let errorEncontrado = false;
      const errorId = this.generateErrorId();

      // Verificar teléfono
      if (mensajeLowerCase.includes('teléfono') || mensajeLowerCase.includes('telefono')) {
        this.personalInfoErrors.push({
          field: 'telefonoCelular',
          message: errorMessage,
          id: errorId
        });
        errorEncontrado = true;
      }
      // Verificar correo
      else if (mensajeLowerCase.includes('correo') || mensajeLowerCase.includes('email')) {
        this.personalInfoErrors.push({
          field: 'correoElectronico',
          message: errorMessage,
          id: errorId
        });
        errorEncontrado = true;
      }
      // Verificar nombre de usuario
      else if (mensajeLowerCase.includes('nombre de usuario') || mensajeLowerCase.includes('username')) {
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
          this.personalInfoErrors.push({
            field: 'telefonoCelular',
            message: 'Este número de teléfono ya está en uso',
            id: errorId
          });
          errorEncontrado = true;
        }
        else if (mensajeLowerCase.includes('idx_correo')) {
          this.personalInfoErrors.push({
            field: 'correoElectronico',
            message: 'Este correo electrónico ya está en uso',
            id: errorId
          });
          errorEncontrado = true;
        }
        else if (mensajeLowerCase.includes('idx_nombre')) {
          this.personalInfoErrors.push({
            field: 'nombreUsuario',
            message: 'Este nombre de usuario ya está en uso',
            id: errorId
          });
          errorEncontrado = true;
        }
      }

      // Si no se encontró un error específico, mostrar error general
      if (!errorEncontrado) {
        this.error = 'Error al actualizar perfil. ' + (errorMessage || 'Por favor, intenta nuevamente.');
      }
    }
    else if (tipo === 'contraseña') {
      const mensajeLowerCase = errorMessage.toLowerCase();
      if (mensajeLowerCase.includes('contraseña actual incorrecta') ||
          mensajeLowerCase.includes('password incorrect') ||
          mensajeLowerCase.includes('contraseña incorrecta')) {
        this.passwordError = 'La contraseña actual no es correcta';
      } else {
        this.error = 'Error al actualizar contraseña. ' + (errorMessage || 'Por favor, intenta nuevamente.');
      }
    }

    this.updating = false;
    this.checkForErrors();
  }

  get formIsValid(): boolean {
    // Recalculamos hasErrors por si acaso
    this.checkForErrors();

    // Debe verificar si NO hay errores en ninguna parte
    return this.perfilForm.valid &&
           !this.passwordError &&
           !this.hasErrors &&
           this.personalInfoErrors.length === 0 &&
           this.uniqueErrors.length === 0;
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