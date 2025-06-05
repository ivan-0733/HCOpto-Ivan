import { Component, OnInit } from '@angular/core';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { HistoriaClinicaService, HistoriaClinica } from '../../services/historia-clinica.service';
import { ProfesorService, AlumnoAsignado, ProfesorPerfil, MateriaProfesor, EstadisticasHistorias } from '../../services/profesor.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-profesor-dashboard',
  templateUrl: './profesor-dashboard.component.html',
  styleUrls: ['./profesor-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ]
})
export class ProfesorDashboardComponent implements OnInit {
  historiasClinicas: HistoriaClinica[] = [];
  estadisticas: EstadisticasHistorias | null = null;
  estadisticasPorMateria: Map<number | null, EstadisticasHistorias> = new Map();
  perfil: ProfesorPerfil | null = null;
  todasLasMaterias: MateriaProfesor[] = [];
  mostrarMateriasHistoricas: boolean = false;
  filtroMateriaArchivada: number | null = null;
  loading = true;
  error = '';

  // Filtros
  filtroEstado: string = 'todos';
  filtroPaciente: string = '';
  filtroAlumno: string = ''; // Nuevo filtro para alumnos

  // Ordenamiento
  ordenamiento: string = 'recientes';

  // Paginación
  paginaActual: number = 1;
  registrosPorPagina: number = 5;
  totalPaginas: number = 1;

  // Para usar Math en el template
  Math = Math;

  // Propiedades para filtrado de materias
  materias: MateriaProfesor[] = [];
  materiaSeleccionadaId: number | null = null;

  // Map para almacenar conteo de historias por materia
  historiasPorMateria: Map<number, number> = new Map();

  periodoEscolar: any | null = null;
  alumnos: AlumnoAsignado[] = [];

  // Flag para saber si estamos regresando del detalle de una historia
  regresandoDeHistoriaDetalle: boolean = false;

  constructor(
    private historiaClinicaService: HistoriaClinicaService,
    private profesorService: ProfesorService,
    private authService: AuthService,
    private router: Router
  ) {
    // Detectar el evento de inicio de navegación para limpiar filtros cuando corresponda
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      if (
        (!event.url.includes('/historias/') &&
         !event.url.includes('/dashboard') &&
         !event.url.includes('/profesor/dashboard')) ||
        event.url.includes('/historias/nueva')
      ) {
        console.log('Clearing saved filters due to navigation:', event.url);
        this.clearSavedFilters();
      }

      if ((event.url.includes('/profesor/dashboard') || event.url.includes('/dashboard')) &&
          (this.router.url.includes('/historias/') && !this.router.url.includes('/historias/nueva'))) {
        console.log('Regresando del detalle de una historia al dashboard');
        this.regresandoDeHistoriaDetalle = true;
      }
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.regresandoDeHistoriaDetalle) {
        console.log('NavigationEnd: Aplicando filtros después de regresar de historia');
        this.regresandoDeHistoriaDetalle = false;
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

    // Cargar perfil del profesor
    this.profesorService.obtenerPerfil().subscribe({
      next: (perfil) => {
        console.log('Perfil cargado:', perfil);
        this.perfil = perfil;
      },
      error: (error) => {
        console.error('Error al cargar perfil:', error);
      }
    });

    // Cargar período escolar actual
    this.profesorService.obtenerPeriodoEscolarActual().subscribe({
      next: (periodo) => {
        this.periodoEscolar = periodo;
        console.log('Período escolar cargado:', periodo);
      },
      error: (error) => {
        console.error('Error al cargar período escolar:', error);
      }
    });

    // Cargar materias del profesor
    this.profesorService.obtenerMaterias().subscribe({
      next: (materias) => {
        this.materias = materias;
        console.log('Materias del profesor cargadas:', materias);

        if (this.materiaSeleccionadaId === undefined) {
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

          if (this.materiaSeleccionadaId !== null &&
              !this.materias.some(m => m.ID === this.materiaSeleccionadaId)) {
            console.log('Saved materiaSeleccionadaId not found in loaded materias, resetting to null');
            this.materiaSeleccionadaId = null;
          }
        }
        this.calcularHistoriasPorMateria();
      },
      error: (error) => {
        console.error('Error al cargar materias:', error);
      }
    });

    // Cargar todas las materias (actuales e históricas)
    this.profesorService.obtenerTodasMaterias().subscribe({
      next: (materias) => {
        this.todasLasMaterias = materias;
        console.log('Todas las materias cargadas (incluidas históricas):', materias);
      },
      error: (error) => {
        console.error('Error al cargar todas las materias:', error);
      }
    });

    // Cargar alumnos asignados
    this.profesorService.obtenerAlumnosAsignados().subscribe({
      next: (alumnos) => {
        this.alumnos = alumnos;
        console.log('Alumnos asignados cargados:', alumnos);
      },
      error: (error) => {
        console.error('Error al cargar alumnos:', error);
      }
    });

    // Cargar historias clínicas usando el nuevo servicio del profesor
    this.profesorService.obtenerHistoriasClinicas()
    .pipe(
      finalize(() => {
        this.loading = false;
      })
    )
    .subscribe({
      next: (historias) => {
        this.historiasClinicas = historias.map(historia => ({
          ...historia,
          ID: historia.ID || 0,
          CorreoElectronico: historia.CorreoElectronico || undefined,
          TelefonoCelular: historia.TelefonoCelular || undefined,
          Edad: historia.Edad !== undefined && historia.Edad !== null ? Number(historia.Edad) : undefined
        }));
        console.log('Historias cargadas:', this.historiasClinicas);

        this.calcularHistoriasPorMateria();
        this.aplicarOrdenamiento();
        this.loadSavedFilters();
        this.calcularEstadisticasPorMateria();

        if (this.estadisticas) {
          this.actualizarEstadisticas();
        }

        this.calcularTotalPaginas();

        if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
          this.paginaActual = this.totalPaginas;
        }

        this.saveFilters();
      },
      error: (error) => {
        this.error = 'Error al cargar historias clínicas. Por favor, intenta nuevamente.';
        console.error('Error al cargar historias:', error);
      }
    });

    // Cargar estadísticas desde el backend
    this.profesorService.obtenerEstadisticasHistorias().subscribe({
      next: (estadisticas) => {
        this.estadisticas = estadisticas;
        this.calcularEstadisticasPorMateria();
        this.actualizarEstadisticas();
        console.log('Estadísticas cargadas:', estadisticas);
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
        // Fallback a estadísticas locales si falla
        this.generarEstadisticasLocales();
      }
    });
  }

  generarEstadisticasLocales(): void {
    setTimeout(() => {
      if (this.historiasClinicas.length > 0) {
        const estados = ['En proceso', 'Revisión', 'Corrección', 'Finalizado'];
        const porEstado = estados.map(estado => ({
          estado,
          cantidad: this.historiasClinicas.filter(h => h.Estado === estado && !h.Archivado).length
        }));

        this.estadisticas = {
          total: this.historiasClinicas.filter(h => !h.Archivado).length,
          archivadas: this.historiasClinicas.filter(h => h.Archivado).length,
          porEstado
        };

        this.calcularEstadisticasPorMateria();
        this.actualizarEstadisticas();
      }
    }, 500);
  }

  // ===== MÉTODOS DE FILTRADO =====

  // Modificar el método filtrarHistorias()
  filtrarHistorias(): HistoriaClinica[] {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return [];

    const terminoPaciente = this.filtroPaciente.trim().toLowerCase();
    const terminoAlumno = this.filtroAlumno.trim().toLowerCase();

    const historiasFiltradas = this.historiasClinicas.filter(historia => {
      // Verificar si cumple con el filtro de búsqueda por paciente
      const nombreCompletoPaciente = `${historia.Nombre} ${historia.ApellidoPaterno} ${historia.ApellidoMaterno || ''}`.toLowerCase();
      const cumplePaciente = terminoPaciente === '' || nombreCompletoPaciente.includes(terminoPaciente);

      // Verificar si cumple con el filtro de búsqueda por alumno (SOLO NOMBRE Y BOLETA)
      const nombreCompletoAlumno = `${historia.AlumnoNombre} ${historia.AlumnoApellidoPaterno} ${historia.AlumnoApellidoMaterno || ''}`.toLowerCase();
      const boletaAlumno = historia.AlumnoBoleta?.toLowerCase() || '';
      // Se elimina la línea: const correoAlumno = historia.AlumnoCorreo?.toLowerCase() || '';
      const cumpleAlumno = terminoAlumno === '' ||
        nombreCompletoAlumno.includes(terminoAlumno) ||
        boletaAlumno.includes(terminoAlumno);
        // Se elimina: || correoAlumno.includes(terminoAlumno);

      if (!cumplePaciente || !cumpleAlumno) {
        return false;
      }

      const estaArchivado = Boolean(historia.Archivado);

      if (this.filtroEstado === 'Archivado') {
        if (!estaArchivado) return false;

        if (this.materiaSeleccionadaId !== null) {
          const materiaEncontrada = this.todasLasMaterias.find(m => m.ID === this.materiaSeleccionadaId);
          if (materiaEncontrada) {
            return historia.MateriaProfesorID === materiaEncontrada.MateriaProfesorID;
          }
        }
        else if (this.filtroMateriaArchivada !== null) {
          return historia.MateriaProfesorID === this.filtroMateriaArchivada;
        }

        return true;
      }

      if (estaArchivado) {
        return false;
      }

      if (this.materiaSeleccionadaId !== null) {
        const materiaProfesorID = this.obtenerMateriaProfesorIdPorMateria(this.materiaSeleccionadaId);
        if (!materiaProfesorID || historia.MateriaProfesorID !== materiaProfesorID) {
          return false;
        }
      }

      return this.filtroEstado === 'todos' || historia.Estado === this.filtroEstado;
    });

    return this.ordenarHistorias(historiasFiltradas);
  }

  // Nuevo método para manejar cambios en el filtro de alumno
  onFiltroAlumnoChange(): void {
    this.resetearPaginacion();
    this.saveFilters();
  }

  // ===== MÉTODOS DE FILTROS GUARDADOS =====

  saveFilters(): void {
    const filters = {
      filtroEstado: this.filtroEstado,
      filtroPaciente: this.filtroPaciente,
      filtroAlumno: this.filtroAlumno, // Incluir el nuevo filtro
      ordenamiento: this.ordenamiento,
      materiaSeleccionadaId: this.materiaSeleccionadaId,
      paginaActual: this.paginaActual,
      registrosPorPagina: this.registrosPorPagina,
      filtroMateriaArchivada: this.filtroMateriaArchivada
    };
    console.log('Guardando filtros en localStorage:', filters);
    localStorage.setItem('profesor-dashboard-filters', JSON.stringify(filters));
  }

  private loadSavedFilters(): void {
    const savedFilters = localStorage.getItem('profesor-dashboard-filters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        console.log('Cargando filtros guardados:', filters);

        this.filtroEstado = filters.filtroEstado || 'todos';
        this.filtroPaciente = filters.filtroPaciente || '';
        this.filtroAlumno = filters.filtroAlumno || ''; // Cargar el nuevo filtro
        this.ordenamiento = filters.ordenamiento || 'recientes';
        this.materiaSeleccionadaId = filters.materiaSeleccionadaId;
        this.filtroMateriaArchivada = filters.filtroMateriaArchivada;

        this.paginaActual = filters.paginaActual || 1;
        this.registrosPorPagina = filters.registrosPorPagina || 5;

        setTimeout(() => {
          this.calcularTotalPaginas();
        }, 0);

      } catch (error) {
        console.error('Error al cargar filtros guardados:', error);
        this.clearSavedFilters();
      }
    }
  }

  clearSavedFilters(): void {
    console.log('Limpiando filtros guardados');
    localStorage.removeItem('profesor-dashboard-filters');
    this.filtroEstado = 'todos';
    this.filtroPaciente = '';
    this.filtroAlumno = ''; // Limpiar el nuevo filtro
    this.ordenamiento = 'recientes';
    this.materiaSeleccionadaId = null;
    this.paginaActual = 1;
    this.registrosPorPagina = 5;
    this.filtroMateriaArchivada = null;
  }

  // ===== RESTO DE MÉTODOS (copiados del código original) =====

  obtenerMateriaProfesorIdPorMateria(materiaId: number): number | undefined {
    if (!materiaId) return undefined;

    let materia = this.materias.find(m => m.ID === materiaId);

    if (!materia && this.mostrarMateriasHistoricas) {
      materia = this.todasLasMaterias.find(m => m.ID === materiaId);
    }

    if (!materia) return undefined;

    return materia.MateriaProfesorID;
  }

  calcularEstadisticasPorMateria(): void {
    if (!this.estadisticas || !this.historiasClinicas.length) return;

    this.materias.forEach(materia => {
      const estadisticasMateria = this.clonarEstadisticas(this.estadisticas!);

      const historiasMateria = this.historiasClinicas.filter(h =>
        !Boolean(h.Archivado) && h.MateriaProfesorID === materia.MateriaProfesorID
      );

      const historiasArchivadasMateria = this.historiasClinicas.filter(h =>
        Boolean(h.Archivado) && h.MateriaProfesorID === materia.MateriaProfesorID
      );

      this.actualizarEstadisticasMateria(estadisticasMateria, historiasMateria);
      estadisticasMateria.archivadas = historiasArchivadasMateria.length;

      this.estadisticasPorMateria.set(materia.ID, estadisticasMateria);
    });

    const estadisticasTodas = this.clonarEstadisticas(this.estadisticas!);
    const historiasTodas = this.historiasClinicas.filter(h => !Boolean(h.Archivado));
    const historiasArchivadasTodas = this.historiasClinicas.filter(h => Boolean(h.Archivado));

    this.actualizarEstadisticasMateria(estadisticasTodas, historiasTodas);
    estadisticasTodas.archivadas = historiasArchivadasTodas.length;
    this.estadisticasPorMateria.set(null, estadisticasTodas);
  }

  obtenerMateriasConHistoriasArchivadas(): any[] {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return [];

    const historiasArchivadas = this.historiasClinicas.filter(h => Boolean(h.Archivado));
    const materiasMap = new Map<number, any>();
    const periodoActual = this.periodoEscolar?.Codigo || '';

    historiasArchivadas.forEach(historia => {
      if (materiasMap.has(historia.MateriaProfesorID)) return;

      const materiaInfo = this.todasLasMaterias.find(m => m.MateriaProfesorID === historia.MateriaProfesorID);
      const esActual = historia.PeriodoEscolar === periodoActual;

      const materiaData = {
        MateriaProfesorID: historia.MateriaProfesorID,
        NombreMateria: historia.NombreMateria || 'Materia desconocida',
        Grupo: historia.GrupoMateria || '',
        PeriodoEscolar: historia.PeriodoEscolar || '',
        Semestre: materiaInfo?.Semestre || 'N/A',
        EsPeriodoActual: esActual
      };

      materiasMap.set(historia.MateriaProfesorID, materiaData);
    });

    return Array.from(materiasMap.values()).sort((a, b) => {
      if (a.EsPeriodoActual && !b.EsPeriodoActual) return -1;
      if (!a.EsPeriodoActual && b.EsPeriodoActual) return 1;

      const comparaPeriodo = b.PeriodoEscolar.localeCompare(a.PeriodoEscolar);
      if (comparaPeriodo !== 0) return comparaPeriodo;

      return a.NombreMateria.localeCompare(b.NombreMateria);
    });
  }

  aplicarFiltroMateriaArchivada(): void {
    console.log(`Aplicando filtro de materia archivada: ${this.filtroMateriaArchivada}`);
    this.resetearPaginacion();
    this.saveFilters();
  }

  clonarEstadisticas(estadisticas: EstadisticasHistorias): EstadisticasHistorias {
    const clon = { ...estadisticas };

    if (estadisticas.porEstado) {
      clon.porEstado = estadisticas.porEstado.map(e => ({ ...e }));
    }

    return clon;
  }

  actualizarEstadisticasMateria(estadisticas: EstadisticasHistorias, historias: HistoriaClinica[]): void {
    estadisticas.total = historias.length;

    if (estadisticas.porEstado) {
      estadisticas.porEstado.forEach(estadoItem => {
        estadoItem.cantidad = historias.filter(h => h.Estado === estadoItem.estado).length;
      });
    }
  }

  calcularHistoriasPorMateria(): void {
    this.historiasPorMateria = new Map();

    this.materias.forEach(materia => {
      const count = this.historiasClinicas.filter(historia => {
        const estaArchivado = Boolean(historia.Archivado);
        return historia.MateriaProfesorID === materia.MateriaProfesorID && !estaArchivado;
      }).length;

      this.historiasPorMateria.set(materia.ID, count);
    });

    console.log('Historias por materia calculadas:',
      Array.from(this.historiasPorMateria.entries()).map(([id, count]) =>
        `ID: ${id}, Count: ${count}`));
  }

  obtenerEstadosConValores(): { estado: string; cantidad: number; }[] {
    if (!this.estadisticas || !this.estadisticas.porEstado) return [];

    const estadosFiltrados = this.estadisticas.porEstado.filter(estado => {
      if (estado.estado === 'Finalizado') {
        return this.obtenerFinalizadasNoArchivadas() > 0;
      } else {
        return estado.cantidad > 0;
      }
    });

    return estadosFiltrados;
  }

  verHistoria(id: number): void {
    this.saveFilters();
    this.router.navigate(['/profesor/historias', id]);
  }

  editarHistoria(id: number): void {
    this.saveFilters();
    this.router.navigate(['/profesor/historias', id, 'editar']);
  }

  resetearPaginacion(): void {
    this.paginaActual = 1;
    this.calcularTotalPaginas();
    this.saveFilters();
  }

  aplicarFiltroMateria(materiaId: number | null): void {
    console.log(`Aplicando filtro de materia: ${materiaId}`);
    this.materiaSeleccionadaId = materiaId;

    this.filtroEstado = 'todos';

    this.actualizarEstadisticas();
    this.resetearPaginacion();
    this.filtroPaciente = '';
    this.filtroAlumno = ''; // Limpiar filtro de alumno al cambiar materia
    this.saveFilters();
  }

  obtenerHistoriasPorMateria(materiaId: number): number {
    return this.historiasPorMateria.get(materiaId) || 0;
  }

  aplicarOrdenamiento(): void {
    this.ordenarHistorias(this.historiasClinicas);
    this.paginaActual = 1;
    this.calcularTotalPaginas();
    this.saveFilters();
  }

  ordenarHistorias(historias: HistoriaClinica[]): HistoriaClinica[] {
    if (!historias || historias.length === 0) return [];

    const historiasOrdenadas = [...historias];

    switch (this.ordenamiento) {
      case 'recientes':
        return historiasOrdenadas.sort((a, b) =>
          new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime()
        );

      case 'antiguas':
        return historiasOrdenadas.sort((a, b) =>
          new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime()
        );

      case 'alfabetico-asc':
        return historiasOrdenadas.sort((a, b) => {
          const nombreA = `${a.Nombre} ${a.ApellidoPaterno} ${a.ApellidoMaterno || ''}`.toLowerCase();
          const nombreB = `${b.Nombre} ${b.ApellidoPaterno} ${b.ApellidoMaterno || ''}`.toLowerCase();
          return nombreA.localeCompare(nombreB);
        });

      case 'alfabetico-desc':
        return historiasOrdenadas.sort((a, b) => {
          const nombreA = `${a.Nombre} ${a.ApellidoPaterno} ${a.ApellidoMaterno || ''}`.toLowerCase();
          const nombreB = `${b.Nombre} ${b.ApellidoPaterno} ${b.ApellidoMaterno || ''}`.toLowerCase();
          return nombreB.localeCompare(nombreA);
        });

      case 'edad-asc':
        return historiasOrdenadas.sort((a, b) => {
          const edadA = a.Edad !== undefined && a.Edad !== null ? Number(a.Edad) : Number.MAX_SAFE_INTEGER;
          const edadB = b.Edad !== undefined && b.Edad !== null ? Number(b.Edad) : Number.MAX_SAFE_INTEGER;
          return edadA - edadB;
        });

      case 'edad-desc':
        return historiasOrdenadas.sort((a, b) => {
          const edadA = a.Edad !== undefined && a.Edad !== null ? Number(a.Edad) : Number.MIN_SAFE_INTEGER;
          const edadB = b.Edad !== undefined && b.Edad !== null ? Number(b.Edad) : Number.MIN_SAFE_INTEGER;
          return edadB - edadA;
        });

      case 'semestre-reciente':
        return historiasOrdenadas.sort((a, b) => {
          if (!a.PeriodoEscolar) return 1;
          if (!b.PeriodoEscolar) return -1;

          const [yearA, periodA] = a.PeriodoEscolar.split('/').map(part => parseInt(part));
          const [yearB, periodB] = b.PeriodoEscolar.split('/').map(part => parseInt(part));

          if (yearA !== yearB) return yearB - yearA;

          return periodB - periodA;
        });

      case 'semestre-antiguo':
        return historiasOrdenadas.sort((a, b) => {
          if (!a.PeriodoEscolar) return 1;
          if (!b.PeriodoEscolar) return -1;

          const [yearA, periodA] = a.PeriodoEscolar.split('/').map(part => parseInt(part));
          const [yearB, periodB] = b.PeriodoEscolar.split('/').map(part => parseInt(part));

          if (yearA !== yearB) return yearA - yearB;

          return periodA - periodB;
        });

      default:
        return historiasOrdenadas.sort((a, b) =>
          new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime()
        );
    }
  }

  onFiltroPacienteChange(): void {
    this.resetearPaginacion();
    this.saveFilters();
  }

  obtenerClaseEstado(estado: string): string {
    switch (estado) {
      case 'En proceso':
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

  actualizarEstadisticas(): void {
    if (!this.estadisticas || !this.estadisticasPorMateria.size) return;

    const estadisticasActuales = this.estadisticasPorMateria.get(this.materiaSeleccionadaId);

    if (estadisticasActuales) {
      this.estadisticas = estadisticasActuales;
      console.log(`Estadísticas actualizadas para materia ID ${this.materiaSeleccionadaId}:`, this.estadisticas);
    }
  }

  // Métodos de paginación
  calcularTotalPaginas(): void {
    const historiasVisibles = this.filtrarHistorias();
    const oldTotalPages = this.totalPaginas;
    this.totalPaginas = Math.ceil(historiasVisibles.length / this.registrosPorPagina);

    if (this.paginaActual > this.totalPaginas && this.totalPaginas > 0) {
      console.log(`Adjusting page from ${this.paginaActual} to ${this.totalPaginas} because total pages changed from ${oldTotalPages}`);
      this.paginaActual = this.totalPaginas;
    }

    if (this.totalPaginas === 0) {
      this.paginaActual = 1;
    }

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
    this.paginaActual = 1;
    this.calcularTotalPaginas();
    this.saveFilters();
  }

  obtenerHistoriasNoArchivadas(): number {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return 0;

    return this.historiasClinicas.filter(historia => {
      const estaArchivado = Boolean(historia.Archivado);
      if (estaArchivado) return false;

      if (this.materiaSeleccionadaId !== null) {
        const materiaProfesorID = this.obtenerMateriaProfesorIdPorMateria(this.materiaSeleccionadaId);
        return historia.MateriaProfesorID === materiaProfesorID;
      }

      return true;
    }).length;
  }

  obtenerFinalizadasNoArchivadas(): number {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return 0;

    return this.historiasClinicas.filter(historia => {
      const estaArchivado = Boolean(historia.Archivado);
      if (estaArchivado || historia.Estado !== 'Finalizado') return false;

      if (this.materiaSeleccionadaId !== null) {
        const materiaProfesorID = this.obtenerMateriaProfesorIdPorMateria(this.materiaSeleccionadaId);
        return historia.MateriaProfesorID === materiaProfesorID;
      }

      return true;
    }).length;
  }

  aplicarFiltroCard(estado: string): void {
    if (estado === 'todos' && this.obtenerHistoriasNoArchivadas() === 0) {
      return;
    }

    if (estado === 'Archivado' && (!this.estadisticas || this.estadisticas.archivadas === 0)) {
      return;
    }

    if (estado !== 'todos' && estado !== 'Archivado') {
      const estadoEncontrado = this.estadisticas?.porEstado?.find(e => e.estado === estado);
      const cantidadEstado = estado === 'Finalizado'
        ? this.obtenerFinalizadasNoArchivadas()
        : estadoEncontrado?.cantidad || 0;

      if (cantidadEstado === 0) {
        return;
      }
    }

    this.filtroEstado = estado;
    this.resetearPaginacion();
    this.filtroPaciente = '';
    this.filtroAlumno = ''; // Limpiar filtro de alumno al cambiar estado
    this.saveFilters();

    setTimeout(() => {
      const tablaElement = document.querySelector('.tabla-container');
      if (tablaElement) {
        tablaElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }
}