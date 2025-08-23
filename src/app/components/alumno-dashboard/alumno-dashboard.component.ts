// AlumnoDashboardComponent.ts - Con estadísticas por materia y corrección de paginación

import { Component, OnInit } from '@angular/core';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
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
  todasLasMaterias: MateriaAlumno[] = []; // Todas las materias (actuales e históricas)
  mostrarMateriasHistoricas: boolean = false; // Para controlar la visualización
  filtroMateriaArchivada: number | null = null;
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

  // Flag para saber si estamos regresando del detalle de una historia
  regresandoDeHistoriaDetalle: boolean = false;

  constructor(
    private historiaClinicaService: HistoriaClinicaService,
    private alumnoService: AlumnoService,
    private authService: AuthService,
    private router: Router
  ) {
    // Detectar el evento de inicio de navegación para limpiar filtros cuando corresponda
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      // Clear filters when:
      // 1. Navigating to a non-historia page AND non-dashboard page (like perfil or profesores)
      // 2. OR when navigating to the "nueva" historia page
      // Keep filters only when navigating to view or edit a specific historia
      if (
        (!event.url.includes('/historias/') &&
         !event.url.includes('/dashboard') &&
         !event.url.includes('/alumno/dashboard')) ||
        event.url.includes('/historias/nueva')
      ) {
        console.log('Clearing saved filters due to navigation:', event.url);
        this.clearSavedFilters();
      }

      // Detectar si estamos navegando de una historia al dashboard
      if ((event.url.includes('/alumno/dashboard') || event.url.includes('/dashboard')) &&
          (this.router.url.includes('/historias/') && !this.router.url.includes('/historias/nueva'))) {
        console.log('Regresando del detalle de una historia al dashboard');
        this.regresandoDeHistoriaDetalle = true;
      }
    });

    // También escuchar el evento NavigationEnd para asegurarnos de que las páginas se seleccionan correctamente
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Si estamos regresando al dashboard, asegurarnos de que se apliquen los filtros correctamente
      if (this.regresandoDeHistoriaDetalle) {
        console.log('NavigationEnd: Aplicando filtros después de regresar de historia');
        this.regresandoDeHistoriaDetalle = false;
      }
    });
  }

  ngOnInit(): void {
    // Cargar filtros guardados desde localStorage
    this.loadSavedFilters();

    // Ahora cargar datos
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
        console.log('Materias del periodo actual cargadas:', materias);

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

    // Ahora también cargar TODAS las materias (actuales e históricas)
    this.alumnoService.obtenerTodasMaterias().subscribe({
      next: (materias) => {
        this.todasLasMaterias = materias;
        console.log('Todas las materias cargadas (incluidas históricas):', materias);
      },
      error: (error) => {
        console.error('Error al cargar todas las materias:', error);
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
          ID: historia.ID || 0,
          CorreoElectronico: historia.CorreoElectronico || undefined,
          TelefonoCelular: historia.TelefonoCelular || undefined,
          Edad: historia.Edad !== undefined && historia.Edad !== null ? Number(historia.Edad) : undefined
        }));
        console.log('Historias cargadas:', this.historiasClinicas);

        // Calcular el número de historias por materia
        this.calcularHistoriasPorMateria();

        // Aplicar ordenamiento inicial
        this.aplicarOrdenamiento();

        // Aplicar los filtros guardados después de cargar las historias
        this.loadSavedFilters(); // <- Añade esta línea

        // Calcular estadísticas para cada materia
        this.calcularEstadisticasPorMateria();

        // Actualizamos las estadísticas al cargar las historias
        if (this.estadisticas) {
          this.actualizarEstadisticas();
        }

        // Calcular total de páginas
        this.calcularTotalPaginas();

        // Asegurarse de que la página actual no sea mayor que el total de páginas
        if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
          this.paginaActual = this.totalPaginas;
        }

        // Guardar los filtros actuales
        this.saveFilters();
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

  obtenerMateriaProfesorIdPorMateria(materiaId: number): number | undefined {
    if (!materiaId) return undefined;

    // Buscar primero en las materias del periodo actual
    let materia = this.materias.find(m => m.ID === materiaId);

    // Si no se encuentra y estamos mostrando materias históricas, buscar en todas
    if (!materia && this.mostrarMateriasHistoricas) {
      materia = this.todasLasMaterias.find(m => m.ID === materiaId);
    }

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

  // 2. Método para obtener las materias con historias archivadas
  obtenerMateriasConHistoriasArchivadas(): any[] {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return [];

    // Obtener todas las historias archivadas
    const historiasArchivadas = this.historiasClinicas.filter(h => Boolean(h.Archivado));

    // Crear un Map para almacenar materias únicas por MateriaProfesorID
    const materiasMap = new Map<number, any>();

    // Obtener el periodo actual
    const periodoActual = this.periodoEscolar?.Codigo || '';

    // Recorrer todas las historias archivadas para encontrar sus materias
    historiasArchivadas.forEach(historia => {
      // Si esta materia ya fue agregada, omitirla
      if (materiasMap.has(historia.MateriaProfesorID)) return;

      // Buscar información adicional de la materia en todasLasMaterias
      const materiaInfo = this.todasLasMaterias.find(m => m.MateriaProfesorID === historia.MateriaProfesorID);

      // Verificar si el periodo de esta historia es el actual
      const esActual = historia.PeriodoEscolar === periodoActual;

      // Crear un objeto con los datos de la materia
      const materiaData = {
        MateriaProfesorID: historia.MateriaProfesorID,
        NombreMateria: historia.NombreMateria || 'Materia desconocida',
        Grupo: historia.GrupoMateria || '',
        PeriodoEscolar: historia.PeriodoEscolar || '',
        // Incluir el semestre (si está disponible)
        Semestre: materiaInfo?.Semestre || 'N/A',
        // Añadir la bandera que indica si es el periodo actual
        EsPeriodoActual: esActual
      };

      // Añadir la materia al mapa
      materiasMap.set(historia.MateriaProfesorID, materiaData);
    });

    // Convertir el mapa a array y ordenar: primero el periodo actual, luego por periodo descendente
    return Array.from(materiasMap.values()).sort((a, b) => {
      // Si uno es actual y el otro no, el actual va primero
      if (a.EsPeriodoActual && !b.EsPeriodoActual) return -1;
      if (!a.EsPeriodoActual && b.EsPeriodoActual) return 1;

      // Si ambos son actuales o ambos no son actuales, ordenar por periodo descendente
      const comparaPeriodo = b.PeriodoEscolar.localeCompare(a.PeriodoEscolar);
      if (comparaPeriodo !== 0) return comparaPeriodo;

      // Si el período es el mismo, ordenar por nombre de materia
      return a.NombreMateria.localeCompare(b.NombreMateria);
    });
  }

  // 3. Método para aplicar el filtro de materia archivada
  aplicarFiltroMateriaArchivada(): void {
    console.log(`Aplicando filtro de materia archivada: ${this.filtroMateriaArchivada}`);

    // Resetear paginación
    this.resetearPaginacion();

    // Guardar filtros en localStorage
    this.saveFilters();
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

  // Método para obtener solo los estados con valores mayores que cero
  obtenerEstadosConValores(): { estado: string; cantidad: number; }[] {
    if (!this.estadisticas || !this.estadisticas.porEstado) return [];

    // Definir el orden deseado de los estados
    const ordenEstados = ['Nuevo', 'Corregido', 'En proceso', 'Revisión', 'Corrección', 'Finalizado'];

    // Filtrar estados con valores mayores que cero
    const estadosFiltrados = this.estadisticas.porEstado.filter(estado => {
      if (estado.estado === 'Finalizado') {
        return this.obtenerFinalizadasNoArchivadas() > 0;
      } else {
        return estado.cantidad > 0;
      }
    });

    // Ordenar según el orden definido
    return estadosFiltrados.sort((a, b) => {
      const indexA = ordenEstados.indexOf(a.estado);
      const indexB = ordenEstados.indexOf(b.estado);

      // Si el estado no está en el orden definido, ponerlo al final
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }

  saveFilters(): void {
    const filters = {
      filtroEstado: this.filtroEstado,
      filtroPaciente: this.filtroPaciente,
      ordenamiento: this.ordenamiento,
      materiaSeleccionadaId: this.materiaSeleccionadaId,
      paginaActual: this.paginaActual,
      registrosPorPagina: this.registrosPorPagina,
      filtroMateriaArchivada: this.filtroMateriaArchivada
    };
    console.log('Guardando filtros en localStorage:', filters);
    localStorage.setItem('dashboard-filters', JSON.stringify(filters));
  }

  // Modificar el método loadSavedFilters para asegurar que se respeta la paginación
  private loadSavedFilters(): void {
    const savedFilters = localStorage.getItem('dashboard-filters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        console.log('Cargando filtros guardados:', filters);

        // Cargar todos los filtros
        this.filtroEstado = filters.filtroEstado || 'todos';
        this.filtroPaciente = filters.filtroPaciente || '';
        this.ordenamiento = filters.ordenamiento || 'recientes';
        this.materiaSeleccionadaId = filters.materiaSeleccionadaId;
        this.filtroMateriaArchivada = filters.filtroMateriaArchivada;

        // Importante: asegurarse de cargar la paginación correctamente
        this.paginaActual = filters.paginaActual || 1;
        this.registrosPorPagina = filters.registrosPorPagina || 5;

         // Recalcular las páginas basadas en los filtros cargados
        setTimeout(() => {
          this.calcularTotalPaginas();
        }, 0);

      } catch (error) {
        console.error('Error al cargar filtros guardados:', error);
        // Si hay un error al cargar los filtros, usar valores por defecto
        this.clearSavedFilters();
      }
    }
  }

  // Method to clear saved filters
  clearSavedFilters(): void {
    console.log('Limpiando filtros guardados');
    localStorage.removeItem('dashboard-filters');
    // Reiniciar valores por defecto
    this.filtroEstado = 'todos';
    this.filtroPaciente = '';
    this.ordenamiento = 'recientes';
    this.materiaSeleccionadaId = null;
    this.paginaActual = 1;
    this.registrosPorPagina = 5;
    this.filtroMateriaArchivada = null;
  }

  crearNuevaHistoria(): void {
    // Clear filters before navigating to new history page
    this.clearSavedFilters();
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

      // Si el filtro es de archivadas, mostrar todas independientemente del periodo
      if (this.filtroEstado === 'Archivado') {
        // Si no está archivada, no mostrarla
        if (!estaArchivado) return false;

        // Si hay una materia seleccionada específica (no "Todas las materias")
        if (this.materiaSeleccionadaId !== null) {
          // Buscar la materia en todas las materias (incluidas históricas)
          const materiaEncontrada = this.todasLasMaterias.find(m => m.ID === this.materiaSeleccionadaId);
          if (materiaEncontrada) {
            return historia.MateriaProfesorID === materiaEncontrada.MateriaProfesorID;
          }
        }
        // Si está activo el filtro de materia archivada específica
        else if (this.filtroMateriaArchivada !== null) {
          return historia.MateriaProfesorID === this.filtroMateriaArchivada;
        }

        // Si no hay filtro de materia, mostrar todas las archivadas
        return true;
      }

      // Para los demás filtros, no mostrar historias archivadas
      if (estaArchivado) {
        return false;
      }

      // FILTRADO POR MATERIA - SOLO PARA MATERIAS DEL PERIODO ACTUAL
      if (this.materiaSeleccionadaId !== null) {
        const materiaProfesorID = this.obtenerMateriaProfesorIdPorMateria(this.materiaSeleccionadaId);
        if (!materiaProfesorID || historia.MateriaProfesorID !== materiaProfesorID) {
          return false;
        }
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

    // Always reset to show all histories ("todos") when changing materia
    this.filtroEstado = 'todos';

    // For historical subjects, we no longer change to "Archivado" automatically
    // We still update statistics based on selected materia
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

    // Save filters when changing sort order
    this.saveFilters();
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
    // Return the sorted histories
    return historiasOrdenadas;
  }

  // And add this method to your component
  onFiltroPacienteChange(): void {
    this.resetearPaginacion();
    this.saveFilters(); // Save filters when changing patient filter
  }

  obtenerClaseEstado(estado: string): string {
    switch (estado) {
      case 'Nuevo':
        return 'estado-nuevo';
      case 'Corregido':
        return 'estado-corregido';
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
    const oldTotalPages = this.totalPaginas;
    this.totalPaginas = Math.ceil(historiasVisibles.length / this.registrosPorPagina);

    // Only adjust page if it's higher than the new total and there are actually pages
    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      console.log(`Adjusting page from ${this.paginaActual} to ${this.totalPaginas} because total pages changed from ${oldTotalPages}`);
      this.paginaActual = this.totalPaginas;
    }

    // If total pages is 0 but there's a current page, adjust
    if (this.totalPaginas === 0) {
      this.paginaActual = 1;
    }

    // Save the updated pagination state
    this.saveFilters();
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
    // Verificar si el estado tiene valores antes de aplicar el filtro
    if (estado === 'todos' && this.obtenerHistoriasNoArchivadas() === 0) {
      return; // No hacer nada si no hay historias no archivadas
    }

    if (estado === 'Archivado' && (!this.estadisticas || this.estadisticas.archivadas === 0)) {
      return; // No hacer nada si no hay historias archivadas
    }

    if (estado !== 'todos' && estado !== 'Archivado') {
      // Para estados específicos (En proceso, Revisión, etc.)
      const estadoEncontrado = this.estadisticas?.porEstado?.find(e => e.estado === estado);
      const cantidadEstado = estado === 'Finalizado'
        ? this.obtenerFinalizadasNoArchivadas()
        : estadoEncontrado?.cantidad || 0;

      if (cantidadEstado === 0) {
        return; // No hacer nada si no hay historias en este estado
      }
    }

    // Si llegamos aquí, podemos aplicar el filtro
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