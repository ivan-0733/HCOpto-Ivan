import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AlumnoService, Profesor, MateriaAlumno } from '../../services/alumno.service';

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
  materias: MateriaAlumno[] = [];
  loading = true;
  error = '';

  constructor(private alumnoService: AlumnoService) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    // Cargar profesores asignados
    this.alumnoService.obtenerProfesoresAsignados().subscribe({
      next: (profesores) => {
        console.log('Profesores cargados en componente Profesores:', profesores);
        // Filtrar profesores para no mostrar duplicados (mismo ID)
        const profesoresUnicos = this.filtrarProfesoresUnicos(profesores);
        this.profesores = profesoresUnicos;
      },
      error: (error) => {
        this.error = 'Error al cargar profesores. Por favor, intenta nuevamente.';
        this.loading = false;
        console.error('Error al cargar profesores:', error);
      },
      complete: () => {
        // Solo establecemos loading = false cuando ambas cargas hayan terminado
        if (this.materias.length > 0 || this.error) {
          this.loading = false;
        }
      }
    });

    // Cargar materias del alumno
    this.alumnoService.obtenerMaterias().subscribe({
      next: (materias) => {
        console.log('Materias cargadas en componente Profesores (con detalles):', JSON.stringify(materias[0], null, 2));
        this.materias = materias;
      },
      error: (error) => {
        this.error = 'Error al cargar materias. Por favor, intenta nuevamente.';
        this.loading = false;
        console.error('Error al cargar materias:', error);
      },
      complete: () => {
        // Solo establecemos loading = false cuando ambas cargas hayan terminado
        if (this.profesores.length > 0 || this.error) {
          this.loading = false;
        }
      }
    });
  }

  // Método para filtrar profesores únicos por ID
  filtrarProfesoresUnicos(profesores: Profesor[]): Profesor[] {
    const profesoresMap = new Map<number, Profesor>();

    profesores.forEach(profesor => {
      if (!profesoresMap.has(profesor.ProfesorID)) {
        profesoresMap.set(profesor.ProfesorID, profesor);
      }
    });

    return Array.from(profesoresMap.values());
  }
}