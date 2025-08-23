import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProfesorService, MateriaProfesor, AlumnoAsignado } from '../../services/profesor.service';

// Interface extendida para materias con alumnos
interface MateriaConAlumnos extends MateriaProfesor {
  Alumnos?: AlumnoAsignado[];
  FechaAsignacion?: string;
  EjeFormativo?: string;
  Descripcion?: string;
}

@Component({
  selector: 'app-profesor-alumnos',
  templateUrl: './profesor-alumnos.component.html',
  styleUrls: ['./profesor-alumnos.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class ProfesorAlumnosComponent implements OnInit {
  materias: MateriaConAlumnos[] = [];
  loading = false;
  error = '';

  constructor(private profesorService: ProfesorService) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    // Método 1: Usar el método de materias con alumnos si está disponible
    this.profesorService.obtenerMateriasConAlumnos().subscribe({
      next: (materias) => {
        console.log('Materias con alumnos cargadas:', materias);
        this.materias = materias;
        this.loading = false;
      },
      error: (error) => {
        console.error('Método obtenerMateriasConAlumnos no disponible, usando método alternativo:', error);
        this.cargarDatosAlternativo();
      }
    });
  }

  private cargarDatosAlternativo(): void {
    // Método 2: Cargar materias y luego alumnos por separado
    this.profesorService.obtenerMaterias().subscribe({
      next: (materias) => {
        console.log('Materias cargadas:', materias);
        this.materias = materias.map(materia => ({
          ...materia,
          Alumnos: []
        }));

        // Cargar alumnos para cada materia
        this.cargarAlumnosPorMateria();
      },
      error: (error) => {
        this.error = 'Error al cargar materias. Por favor, intenta nuevamente.';
        this.loading = false;
        console.error('Error al cargar materias:', error);
      }
    });
  }

  private cargarAlumnosPorMateria(): void {
    const promesasAlumnos = this.materias.map(materia => {
      return this.profesorService.obtenerAlumnosPorMateria(materia.ID).toPromise()
        .then(alumnos => {
          // Filtrar alumnos de esta materia específica
          const alumnosDeEstaMateria = (alumnos || []).filter(
            alumno => alumno.MateriaProfesorID === materia.ID
          );
          materia.Alumnos = alumnosDeEstaMateria;
          return alumnosDeEstaMateria;
        })
        .catch(error => {
          console.error(`Error al cargar alumnos para materia ${materia.ID}:`, error);
          materia.Alumnos = [];
          return [];
        });
    });

    Promise.all(promesasAlumnos)
      .then(() => {
        console.log('Todos los alumnos cargados:', this.materias);
      })
      .catch(error => {
        console.error('Error al cargar algunos alumnos:', error);
        this.error = 'Error al cargar algunos alumnos. Algunos datos pueden estar incompletos.';
      })
      .finally(() => {
        this.loading = false;
      });
  }

  // Método alternativo usando obtenerAlumnosAsignados
  private cargarDatosConAlumnosAsignados(): void {
    this.loading = true;
    this.error = '';

    // Cargar materias y alumnos por separado
    const materias$ = this.profesorService.obtenerMaterias();
    const alumnos$ = this.profesorService.obtenerAlumnosAsignados();

    Promise.all([
      materias$.toPromise(),
      alumnos$.toPromise()
    ]).then(([materias, alumnos]) => {
      console.log('Materias y alumnos cargados:', { materias, alumnos });

      // Agrupar alumnos por materia
      this.materias = (materias || []).map(materia => {
        const alumnosDeEstaMateria = (alumnos || []).filter(
          alumno => alumno.MateriaProfesorID === materia.ID
        );

        return {
          ...materia,
          Alumnos: alumnosDeEstaMateria
        };
      });

      this.loading = false;
    }).catch(error => {
      this.error = 'Error al cargar datos. Por favor, intenta nuevamente.';
      this.loading = false;
      console.error('Error al cargar materias y alumnos:', error);
    });
  }
}