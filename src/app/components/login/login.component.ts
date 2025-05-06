import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService, AuthCredentials } from '../../services/auth.service';
import { first } from 'rxjs/operators';
import { ThemeService } from '../../services/theme.service'; // Añadir importación del servicio

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class LoginComponent implements OnInit, OnDestroy { // Añadir OnDestroy
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  returnUrl: string = '/';
  error: string = '';
  selectedRole: string = 'alumno';
  currentYear: number = new Date().getFullYear();

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private themeService: ThemeService // Inyectar el servicio
  ) {
    if (this.authService.currentUserValue) {
      this.redirectBasedOnRole();
    }
  }

  ngOnInit() {
    this.themeService.setTemporaryTheme('system'); // Aplicar tema del sistema
    this.updateFormFields();
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  ngOnDestroy(): void { // Añadir ciclo de vida OnDestroy
    this.themeService.clearTemporaryTheme(); // Restaurar tema original
  }

  // Cambiar la estructura del formulario según el rol seleccionado
  updateFormFields() {
    if (this.selectedRole === 'alumno') {
      this.loginForm = this.formBuilder.group({
        boleta: ['', Validators.required],
        correo: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
      });
    } else if (this.selectedRole === 'profesor') {
      this.loginForm = this.formBuilder.group({
        numeroEmpleado: ['', Validators.required],
        correo: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
      });
    } else { // admin
      this.loginForm = this.formBuilder.group({
        correo: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
      });
    }
  }

  // Setter para facilitar el acceso a los campos del formulario
  get f() { return this.loginForm.controls; }

  // Cambiar rol
  changeRole(role: string) {
    this.selectedRole = role;
    this.updateFormFields();
    this.error = '';
  }

  onSubmit() {
    this.submitted = true;

    // Si el formulario es inválido, detenerse
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;

    // Preparar credenciales según el rol
    const credentials: AuthCredentials = {
      correo: this.f['correo'].value,
      password: this.f['password'].value
    };

    if (this.selectedRole === 'alumno') {
      credentials.boleta = this.f['boleta'].value;
    } else if (this.selectedRole === 'profesor') {
      credentials.numeroEmpleado = this.f['numeroEmpleado'].value;
    }

    this.authService.login(credentials, this.selectedRole)
      .pipe(first())
      .subscribe({
        next: () => {
          this.redirectBasedOnRole();
        },
        error: error => {
          this.error = error.error?.message || 'Error al iniciar sesión';
          this.loading = false;
        }
      });
  }

  private redirectBasedOnRole() {
    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      switch (currentUser.rol) {
        case 'alumno':
          this.router.navigate(['/alumno/dashboard']);
          break;
        case 'profesor':
          this.router.navigate(['/profesor/dashboard']);
          break;
        case 'admin':
          this.router.navigate(['/admin/dashboard']);
          break;
        default:
          this.router.navigate([this.returnUrl]);
      }
    }
  }
}