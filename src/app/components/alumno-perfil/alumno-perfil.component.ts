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
      telefonoCelular: ['', Validators.pattern('[0-9]{10}')]
    });
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

    const datos = {
      nombreUsuario: this.perfilForm.get('nombreUsuario')?.value,
      telefonoCelular: this.perfilForm.get('telefonoCelular')?.value
    };

    this.alumnoService.actualizarPerfil(datos).subscribe({
      next: () => {
        this.success = 'Perfil actualizado correctamente';
        this.updating = false;
        this.isEditing = false;

        // Recargar perfil para obtener datos actualizados
        this.cargarPerfil();
      },
      error: (error) => {
        this.error = 'Error al actualizar perfil. Por favor, intenta nuevamente.';
        this.updating = false;
        console.error('Error al actualizar perfil:', error);
      }
    });
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