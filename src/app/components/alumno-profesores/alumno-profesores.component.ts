import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AlumnoService, Profesor } from '../../services/alumno.service';

@Component({
  selector: 'app-alumno-profesores',
  templateUrl: './alumno-profesores.component.html',
  styleUrls: ['./alumno-profesores.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class AlumnoProfesoresComponent implements OnInit {
  profesores: Profesor[] = [];
  loading = true;
  error = '';

  constructor(private alumnoService: AlumnoService) { }

  ngOnInit(): void {
    this.cargarProfesores();
  }

  cargarProfesores(): void {
    this.loading = true;
    this.error = '';

    this.alumnoService.obtenerProfesoresAsignados().subscribe({
      next: (profesores) => {
        this.profesores = profesores;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar profesores. Por favor, intenta nuevamente.';
        this.loading = false;
        console.error('Error al cargar profesores:', error);
      }
    });
  }
}