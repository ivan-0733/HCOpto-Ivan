// AlumnoDashboardComponent.ts - Con estadísticas por materia

import { Component, OnInit } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { HistoriaClinicaService, HistoriaClinica } from '../../services/historia-clinica.service';
import { AlumnoService, Profesor, Perfil, Semestre, Consultorio, CatalogoItem, Paciente, PeriodoEscolar, MateriaAlumno } from '../../services/alumno.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { filter } from 'rxjs/operators';

// Definir la interfaz para estadísticas
export interface EstadisticasHistorias {
  total: number;
  archivadas: number;
  porEstado: { estado: string; cantidad: number; }[];
  porSemestre?: { semestre: string; cantidad: number; }[];
}

@Component({
  selector: 'app-alumno-dashboard',
  templateUrl: './alumno-dashboard.component.html',
  styleUrls: ['./alumno-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ]
})

export class AlumnoDashboardComponent implements OnInit {
  historiasClinicas: HistoriaClinica[] = [];
  estadisticas: EstadisticasHistorias | null = null;
  estadisticasPorMateria: Map<number | null, EstadisticasHistorias> = new Map(); // Para almacenar estadísticas por materia
  perfil: Perfil | null = null;
  loading = true;
  error = '';

  // Filtros
  filtroEstado: string = 'todos';
  filtroPaciente: string = '';

  // Ordenamiento
  ordenamiento: string = 'recientes'; // Valor por defecto: mostrar más recientes primero

  // Paginación
  paginaActual: number = 1;
  registrosPorPagina: number = 5; // Valor por defecto: 5 registros por página
  totalPaginas: number = 1;

  // Para usar Math en el template
  Math = Math;

  // Propiedades para filtrado de materias
  materias: MateriaAlumno[] = [];
  materiaSeleccionadaId: number | null = null;

  // Map para almacenar conteo de historias por materia
  historiasPorMateria: Map<number, number> = new Map();

  periodoEscolar: PeriodoEscolar | null = null;
  profesores: Profesor[] = [];

  constructor(
    private historiaClinicaService: HistoriaClinicaService,
    private alumnoService: AlumnoService,
    private authService: AuthService,
    private router: Router
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      // If navigating away from dashboard to a non-detail/edit page, clear filters
      if (!event.url.includes('/historias/') &&
          !event.url.includes('/dashboard')) {
        this.clearSavedFilters();
      }
    });
   }

  ngOnInit(): void {
    this.loadSavedFilters();
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    // Cargar perfil del alumno
    this.alumnoService.obtenerPerfil().subscribe({
      next: (perfil) => {
        console.log('Perfil cargado:', perfil);
        this.perfil = perfil;
      },
      error: (error) => {
        console.error('Error al cargar perfil:', error);
      }
    });

    // Cargar período escolar actual en lugar de semestre
    this.alumnoService.obtenerPeriodoEscolarActual().subscribe({
      next: (periodo) => {
        this.periodoEscolar = periodo;
        console.log('Período escolar cargado:', periodo);
      },
      error: (error) => {
        console.error('Error al cargar período escolar:', error);
      }
    });

    // Cargar materias del alumno
    this.alumnoService.obtenerMaterias().subscribe({
      next: (materias) => {
        this.materias = materias;
        console.log('Materias cargadas:', materias);

        // Only set a default if materiaSeleccionadaId isn't already set from localStorage
        if (this.materiaSeleccionadaId === undefined) {
          // Preseleccionar la materia según la cantidad que tengamos
          if (this.materias.length === 0) {
            console.log('No hay materias asignadas');
            this.materiaSeleccionadaId = null;
          } else if (this.materias.length === 1) {
            console.log('Una sola materia detectada, seleccionando automáticamente');
            this.materiaSeleccionadaId = this.materias[0].ID;
          } else {
            console.log('Múltiples materias detectadas, seleccionando "Todas las materias"');
            this.materiaSeleccionadaId = null;
          }
        } else {
          console.log('Using saved materiaSeleccionadaId:', this.materiaSeleccionadaId);

          // Validate that the selected materiaId still exists in loaded materias
          if (this.materiaSeleccionadaId !== null &&
              !this.materias.some(m => m.ID === this.materiaSeleccionadaId)) {
            console.log('Saved materiaSeleccionadaId not found in loaded materias, resetting to null');
            this.materiaSeleccionadaId = null;
          }
        }
        // Calcular el número de historias por materia
        this.calcularHistoriasPorMateria();
      },
      error: (error) => {
        console.error('Error al cargar materias:', error);
      }
    });

    // Cargar profesores para tener la referencia
    this.alumnoService.obtenerProfesoresAsignados().subscribe({
      next: (profesores) => {
        this.profesores = profesores;
        console.log('Profesores cargados:', profesores);
      },
      error: (error) => {
        console.error('Error al cargar profesores:', error);
      }
    });

    // Cargar historias clínicas
    this.historiaClinicaService.obtenerHistoriasClinicas()
    .pipe(
      finalize(() => {
        this.loading = false;
      })
    )
    .subscribe({
      next: (historias) => {
        // Asegurarse de que todos los objetos de historia tienen
        // las propiedades esperadas, incluso si son undefined
        this.historiasClinicas = historias.map(historia => ({
          ...historia,
          ID: historia.ID || 0, // Usar un valor predeterminado (como 0) si ID es undefined
          CorreoElectronico: historia.CorreoElectronico || undefined,
          TelefonoCelular: historia.TelefonoCelular || undefined,
          Edad: historia.Edad !== undefined && historia.Edad !== null ? Number(historia.Edad) : undefined
        }));
        console.log('Historias cargadas:', this.historiasClinicas);

        // Calcular el número de historias por materia
        this.calcularHistoriasPorMateria();

        // Aplicar ordenamiento inicial
        this.aplicarOrdenamiento();

        // Calcular total de páginas
        this.calcularTotalPaginas();

        // Calcular estadísticas para cada materia
        this.calcularEstadisticasPorMateria();

        // Actualizamos las estadísticas al cargar las historias
        if (this.estadisticas) {
          this.actualizarEstadisticas();
        }
      },
      error: (error) => {
        this.error = 'Error al cargar historias clínicas. Por favor, intenta nuevamente.';
        console.error('Error al cargar historias:', error);
      }
    });

    // Cargar estadísticas
    this.historiaClinicaService.obtenerEstadisticas().subscribe({
      next: (estadisticas) => {
        this.estadisticas = estadisticas;
        console.log('Estadísticas cargadas:', estadisticas);

        // Si las historias ya se cargaron, actualizar las estadísticas
        if (this.historiasClinicas.length > 0) {
          this.calcularEstadisticasPorMateria();
          this.actualizarEstadisticas();
        }
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
      }
    });
  }

  // Método para obtener el MateriaProfesorID basado en el ID de materia
  obtenerMateriaProfesorIdPorMateria(materiaId: number): number | undefined {
    if (!materiaId || !this.materias.length) return undefined;

    // Buscar la materia que coincida con el ID
    const materia = this.materias.find(m => m.ID === materiaId);
    if (!materia) return undefined;

    // Devolver el MateriaProfesorID asociado
    return materia.MateriaProfesorID;
  }

  // Método para calcular las estadísticas para cada materia
  calcularEstadisticasPorMateria(): void {
    if (!this.estadisticas || !this.historiasClinicas.length) return;

    // Inicializar estadísticas para todas las materias
    this.materias.forEach(materia => {
      // Crear una copia de las estadísticas originales para esta materia
      const estadisticasMateria = this.clonarEstadisticas(this.estadisticas!);

      // Filtrar historias por MateriaProfesorID en lugar de ID de la materia
      const historiasMateria = this.historiasClinicas.filter(h =>
        !Boolean(h.Archivado) && h.MateriaProfesorID === materia.MateriaProfesorID
      );

      // Filtrar historias ARCHIVADAS de esta materia
      const historiasArchivadasMateria = this.historiasClinicas.filter(h =>
        Boolean(h.Archivado) && h.MateriaProfesorID === materia.MateriaProfesorID
      );

      // Actualizar estadísticas para esta materia
      this.actualizarEstadisticasMateria(estadisticasMateria, historiasMateria);

      // Asignar el conteo de archivadas específico de la materia
      estadisticasMateria.archivadas = historiasArchivadasMateria.length;

      // Guardar estadísticas actualizadas para esta materia
      this.estadisticasPorMateria.set(materia.ID, estadisticasMateria);
    });

    // También calcular estadísticas para "todas las materias" (null)
    const estadisticasTodas = this.clonarEstadisticas(this.estadisticas!);
    const historiasTodas = this.historiasClinicas.filter(h => !Boolean(h.Archivado));
    const historiasArchivadasTodas = this.historiasClinicas.filter(h => Boolean(h.Archivado));

    this.actualizarEstadisticasMateria(estadisticasTodas, historiasTodas);
    estadisticasTodas.archivadas = historiasArchivadasTodas.length;
    this.estadisticasPorMateria.set(null, estadisticasTodas);
  }

  // Método para clonar las estadísticas
  clonarEstadisticas(estadisticas: EstadisticasHistorias): EstadisticasHistorias {
    const clon = { ...estadisticas };

    // Clonar profundamente los arrays de porEstado y porSemestre si existen
    if (estadisticas.porEstado) {
      clon.porEstado = estadisticas.porEstado.map(e => ({ ...e }));
    }

    if (estadisticas.porSemestre) {
      clon.porSemestre = estadisticas.porSemestre.map((s: { semestre: string; cantidad: number; }) => ({ ...s }));
    }

    return clon;
  }

  // Método para actualizar las estadísticas para una materia específica
  actualizarEstadisticasMateria(estadisticas: EstadisticasHistorias, historias: HistoriaClinica[]): void {
    // Actualizar el total
    estadisticas.total = historias.length;

    // Actualizar conteo por estado
    if (estadisticas.porEstado) {
      estadisticas.porEstado.forEach(estadoItem => {
        estadoItem.cantidad = historias.filter(h => h.Estado === estadoItem.estado).length;
      });
    }

    // Actualizar conteo por semestre si existe
    if (estadisticas.porSemestre) {
      estadisticas.porSemestre.forEach((semestreItem: { semestre: string; cantidad: number; }) => {
        semestreItem.cantidad = historias.filter(h => h.PeriodoEscolar === semestreItem.semestre).length;
      });
    }
  }

  // Método para calcular cuántas historias tiene cada materia
  calcularHistoriasPorMateria(): void {
    // Reiniciar el mapa
    this.historiasPorMateria = new Map();

    // Para cada materia, contar historias no archivadas
    this.materias.forEach(materia => {
      const count = this.historiasClinicas.filter(historia => {
        // Verificar si el MateriaProfesorID coincide y no está archivada
        const estaArchivado = Boolean(historia.Archivado);
        return historia.MateriaProfesorID === materia.MateriaProfesorID && !estaArchivado;
      }).length;

      // Guardar el conteo en el mapa
      this.historiasPorMateria.set(materia.ID, count);
    });

    console.log('Historias por materia calculadas:',
      Array.from(this.historiasPorMateria.entries()).map(([id, count]) =>
        `ID: ${id}, Count: ${count}`));
  }

  saveFilters(): void {
    const filters = {
      filtroEstado: this.filtroEstado,
      filtroPaciente: this.filtroPaciente,
      ordenamiento: this.ordenamiento,
      materiaSeleccionadaId: this.materiaSeleccionadaId,
      paginaActual: this.paginaActual,
      registrosPorPagina: this.registrosPorPagina
    };
    localStorage.setItem('dashboard-filters', JSON.stringify(filters));
  }

    // Method to load saved filters from localStorage
    loadSavedFilters(): void {
      const savedFilters = localStorage.getItem('dashboard-filters');
      if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        this.filtroEstado = filters.filtroEstado || 'todos';
        this.filtroPaciente = filters.filtroPaciente || '';
        this.ordenamiento = filters.ordenamiento || 'recientes';
        this.materiaSeleccionadaId = filters.materiaSeleccionadaId;
        this.paginaActual = filters.paginaActual || 1;
        this.registrosPorPagina = filters.registrosPorPagina || 5;
      }
    }

      // Method to clear saved filters
  clearSavedFilters(): void {
    localStorage.removeItem('dashboard-filters');
  }

  crearNuevaHistoria(): void {
    this.router.navigate(['/alumno/historias/nueva']);
  }

  verHistoria(id: number): void {
    // Save filters before navigating
    this.saveFilters();
    this.router.navigate(['/alumno/historias', id]);
  }

  editarHistoria(id: number): void {
    // Save filters before navigating
    this.saveFilters();
    this.router.navigate(['/alumno/historias', id, 'editar']);
  }

  // Also update methods like these to save filters:
  resetearPaginacion(): void {
    this.paginaActual = 1;
    this.calcularTotalPaginas();
    this.saveFilters();
  }

  // Método para filtrar historias por materia
  filtrarHistorias(): HistoriaClinica[] {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return [];

    const termino = this.filtroPaciente.trim().toLowerCase();

    // Filtrar historias según criterios
    const historiasFiltradas = this.historiasClinicas.filter(historia => {
      // Verificar si cumple con el filtro de búsqueda por nombre
      const nombreCompleto = `${historia.Nombre} ${historia.ApellidoPaterno} ${historia.ApellidoMaterno || ''}`.toLowerCase();
      const cumplePaciente = termino === '' || nombreCompleto.includes(termino);

      if (!cumplePaciente) {
        return false;
      }

      // Comprobar si está archivado
      const estaArchivado = Boolean(historia.Archivado);

      // FILTRADO POR MATERIA - APLICAR EN TODOS LOS CASOS (ARCHIVADOS Y NO ARCHIVADOS)
      if (this.materiaSeleccionadaId !== null) {
        // Debug para ver si el MateriaProfesorID existe en las historias
        console.log(`Filtrando por materia ID ${this.materiaSeleccionadaId}, historia MateriaProfesorID:`, historia.MateriaProfesorID);

        // Obtener el MateriaProfesorID asociado a esta materia seleccionada
        const materiaProfesorID = this.obtenerMateriaProfesorIdPorMateria(this.materiaSeleccionadaId);
        console.log(`MateriaProfesorID para materia ${this.materiaSeleccionadaId}:`, materiaProfesorID);

        // Si no se encuentra la relación o el MateriaProfesorID de la historia es diferente, excluirla
        if (!materiaProfesorID || historia.MateriaProfesorID !== materiaProfesorID) {
          return false;
        }
      }

      // Filtro específico para "Archivado"
      if (this.filtroEstado === 'Archivado') {
        return estaArchivado;
      }

      // Para los demás filtros, no mostrar historias archivadas
      if (estaArchivado) {
        return false;
      }

      // Filtrar por estado
      return this.filtroEstado === 'todos' || historia.Estado === this.filtroEstado;
    });

    // Ordenar las historias filtradas
    return this.ordenarHistorias(historiasFiltradas);
  }

  // Modify existing filter methods to save state
  aplicarFiltroMateria(materiaId: number | null): void {
    console.log(`Aplicando filtro de materia: ${materiaId}`);
    this.materiaSeleccionadaId = materiaId;

    // Update the statistics based on the selected materia
    this.actualizarEstadisticas();

    // Reset pagination when changing materia
    this.resetearPaginacion();

    // Reset patient filter for a better user experience
    this.filtroPaciente = '';

    // Save filters to localStorage
    this.saveFilters();
  }

  // Método para obtener número de historias por materia
  obtenerHistoriasPorMateria(materiaId: number): number {
    // Usar el mapa calculado previamente
    return this.historiasPorMateria.get(materiaId) || 0;
  }

  aplicarOrdenamiento(): void {
    // Esta función se llama cuando cambia el selector de ordenamiento
    // Actualiza la vista al cambiar el tipo de ordenamiento
    this.ordenarHistorias(this.historiasClinicas);

    // Volver a la primera página después de cambiar el ordenamiento
    this.paginaActual = 1;

    // Recalcular el total de páginas
    this.calcularTotalPaginas();
  }

  ordenarHistorias(historias: HistoriaClinica[]): HistoriaClinica[] {
    if (!historias || historias.length === 0) return [];

    // Crear una copia para no modificar el array original
    const historiasOrdenadas = [...historias];

    switch (this.ordenamiento) {
      case 'recientes':
        // Ordenar por fecha descendente (más recientes primero)
        return historiasOrdenadas.sort((a, b) =>
          new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime()
        );

      case 'antiguas':
        // Ordenar por fecha ascendente (más antiguas primero)
        return historiasOrdenadas.sort((a, b) =>
          new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime()
        );

      case 'alfabetico-asc':
        // Ordenar alfabéticamente por nombre completo (A-Z)
        return historiasOrdenadas.sort((a, b) => {
          const nombreA = `${a.Nombre} ${a.ApellidoPaterno} ${a.ApellidoMaterno || ''}`.toLowerCase();
          const nombreB = `${b.Nombre} ${b.ApellidoPaterno} ${b.ApellidoMaterno || ''}`.toLowerCase();
          return nombreA.localeCompare(nombreB);
        });

      case 'alfabetico-desc':
        // Ordenar alfabéticamente por nombre completo (Z-A)
        return historiasOrdenadas.sort((a, b) => {
          const nombreA = `${a.Nombre} ${a.ApellidoPaterno} ${a.ApellidoMaterno || ''}`.toLowerCase();
          const nombreB = `${b.Nombre} ${b.ApellidoPaterno} ${b.ApellidoMaterno || ''}`.toLowerCase();
          return nombreB.localeCompare(nombreA);
        });

      case 'edad-asc':
        // Ordenar por edad ascendente (menor a mayor)
        return historiasOrdenadas.sort((a, b) => {
          // Manejar casos donde la edad puede ser undefined o null
          const edadA = a.Edad !== undefined && a.Edad !== null ? Number(a.Edad) : Number.MAX_SAFE_INTEGER;
          const edadB = b.Edad !== undefined && b.Edad !== null ? Number(b.Edad) : Number.MAX_SAFE_INTEGER;
          return edadA - edadB;
        });

      case 'edad-desc':
        // Ordenar por edad descendente (mayor a menor)
        return historiasOrdenadas.sort((a, b) => {
          // Manejar casos donde la edad puede ser undefined o null
          const edadA = a.Edad !== undefined && a.Edad !== null ? Number(a.Edad) : Number.MIN_SAFE_INTEGER;
          const edadB = b.Edad !== undefined && b.Edad !== null ? Number(b.Edad) : Number.MIN_SAFE_INTEGER;
          return edadB - edadA;
        });

      case 'semestre-reciente':
        // Ordenar por periodo escolar descendente (más reciente primero)
        return historiasOrdenadas.sort((a, b) => {
          // Manejar casos donde el periodo escolar no existe o tiene formato inválido
          if (!a.PeriodoEscolar) return 1; // Mover valores vacíos al final
          if (!b.PeriodoEscolar) return -1;

          // Dividir el periodo en año y periodo
          const [yearA, periodA] = a.PeriodoEscolar.split('/').map(part => parseInt(part));
          const [yearB, periodB] = b.PeriodoEscolar.split('/').map(part => parseInt(part));

          // Comparar primero por año (descendente)
          if (yearA !== yearB) return yearB - yearA;

          // Si los años son iguales, comparar por periodo (2 es más reciente que 1)
          return periodB - periodA;
        });

      case 'semestre-antiguo':
        // Ordenar por periodo escolar ascendente (más antiguo primero)
        return historiasOrdenadas.sort((a, b) => {
          // Manejar casos donde el periodo escolar no existe o tiene formato inválido
          if (!a.PeriodoEscolar) return 1; // Mover valores vacíos al final
          if (!b.PeriodoEscolar) return -1;

          // Dividir el periodo en año y periodo
          const [yearA, periodA] = a.PeriodoEscolar.split('/').map(part => parseInt(part));
          const [yearB, periodB] = b.PeriodoEscolar.split('/').map(part => parseInt(part));

          // Comparar primero por año (ascendente)
          if (yearA !== yearB) return yearA - yearB;

          // Si los años son iguales, comparar por periodo (1 es más antiguo que 2)
          return periodA - periodB;
        });

      default:
        // Por defecto, ordenar por fecha descendente
        return historiasOrdenadas.sort((a, b) =>
          new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime()
        );
    }
  }

  obtenerClaseEstado(estado: string): string {
    switch (estado) {
      case 'En proceso':
        return 'estado-proceso';
      case 'Revisión':
        return 'estado-revision';
      case 'Corrección':
        return 'estado-correccion';
      case 'Finalizado':
        return 'estado-finalizado';
      case 'Archivado':
        return 'estado-archivado';
      default:
        return '';
    }
  }

  // Método para actualizar las estadísticas según la materia seleccionada
  actualizarEstadisticas(): void {
    if (!this.estadisticas || !this.estadisticasPorMateria.size) return;

    // Obtener las estadísticas correspondientes a la materia seleccionada o todas
    const estadisticasActuales = this.estadisticasPorMateria.get(this.materiaSeleccionadaId);

    if (estadisticasActuales) {
      // Actualiza las estadísticas mostradas en el dashboard
      this.estadisticas = estadisticasActuales;
      console.log(`Estadísticas actualizadas para materia ID ${this.materiaSeleccionadaId}:`, this.estadisticas);
    }
  }

  // Métodos de paginación
  calcularTotalPaginas(): void {
    const historiasVisibles = this.filtrarHistorias();
    this.totalPaginas = Math.ceil(historiasVisibles.length / this.registrosPorPagina);

    // Si la página actual es mayor que el total de páginas, ir a la última página
    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = Math.max(1, this.totalPaginas);
    }
  }

  obtenerHistoriasPaginaActual(): HistoriaClinica[] {
    const historiasFiltradas = this.filtrarHistorias();
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;

    return historiasFiltradas.slice(inicio, fin);
  }

  irAPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.saveFilters();
    }
  }

  cambiarRegistrosPorPagina(): void {
    // Reset to the first page when changing the number of records per page
    this.paginaActual = 1;
    // Recalculate the total pages
    this.calcularTotalPaginas();
    // Save filters
    this.saveFilters();
  }

  // Método para obtener el número de historias no archivadas (de la materia seleccionada)
  obtenerHistoriasNoArchivadas(): number {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return 0;

    // Contar las historias que NO están archivadas (y coinciden con la materia seleccionada si hay una)
    return this.historiasClinicas.filter(historia => {
      // Comprobar si NO está archivado
      const estaArchivado = Boolean(historia.Archivado);
      if (estaArchivado) return false;

      // Si hay una materia seleccionada, filtrar por ella usando MateriaProfesorID
      if (this.materiaSeleccionadaId !== null) {
        const materiaProfesorID = this.obtenerMateriaProfesorIdPorMateria(this.materiaSeleccionadaId);
        return historia.MateriaProfesorID === materiaProfesorID;
      }

      // Si no hay materia seleccionada, incluir todas las no archivadas
      return true;
    }).length;
  }

  // Método para obtener historias finalizadas no archivadas (de la materia seleccionada)
  obtenerFinalizadasNoArchivadas(): number {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return 0;

    // Contar las historias que están finalizadas pero NO archivadas (y coinciden con la materia seleccionada si hay una)
    return this.historiasClinicas.filter(historia => {
      // Comprobar si NO está archivado
      const estaArchivado = Boolean(historia.Archivado);
      if (estaArchivado || historia.Estado !== 'Finalizado') return false;

      // Si hay una materia seleccionada, filtrar por ella usando MateriaProfesorID
      if (this.materiaSeleccionadaId !== null) {
        const materiaProfesorID = this.obtenerMateriaProfesorIdPorMateria(this.materiaSeleccionadaId);
        return historia.MateriaProfesorID === materiaProfesorID;
      }

      // Si no hay materia seleccionada, incluir todas las finalizadas no archivadas
      return true;
    }).length;
  }

  aplicarFiltroCard(estado: string): void {
    // Update the status filter
    this.filtroEstado = estado;

    // Reset pagination
    this.resetearPaginacion();

    // Reset the patient filter
    this.filtroPaciente = '';

    // Save filters to localStorage
    this.saveFilters();

    // Optional: scroll to the table for the user to see the results
    setTimeout(() => {
      const tablaElement = document.querySelector('.tabla-container');
      if (tablaElement) {
        tablaElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }
}