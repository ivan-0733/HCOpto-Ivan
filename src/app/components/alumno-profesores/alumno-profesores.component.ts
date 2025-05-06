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
  loading = false; // Changed from true to false to hide loading by default
  error = '';

  constructor(private alumnoService: AlumnoService) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    // Array to hold promises for both data fetching operations
    const promises = [];

    // Cargar profesores asignados
    const profesoresPromise = this.alumnoService.obtenerProfesoresAsignados().subscribe({
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
        // Solo finalizamos carga cuando ambas operaciones terminen
        checkLoadingComplete();
      }
    });

    // Cargar materias del alumno
    const materiasPromise = this.alumnoService.obtenerMaterias().subscribe({
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
        // Solo finalizamos carga cuando ambas operaciones terminen
        checkLoadingComplete();
      }
    });

    // Helper function to check if all operations are complete
    const checkLoadingComplete = () => {
      // When both operations complete or any has an error, set loading to false
      if (!this.loading) return; // Already set to false by an error

      // If both operations have completed successfully
      if (this.materias.length === 0 && this.profesores.length === 0) {
        // No need to keep the loading state if there are no records to display
        this.loading = false;
      } else {
        this.loading = false;
      }
    };
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