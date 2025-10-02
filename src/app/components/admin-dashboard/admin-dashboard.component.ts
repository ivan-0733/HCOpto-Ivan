import { Component, OnInit } from '@angular/core';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { AdminService, HistoriaClinicaAdmin, EstadisticasAdmin, MateriaAdmin } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['../../components/profesor-dashboard/profesor-dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class AdminDashboardComponent implements OnInit {
  historiasClinicas: HistoriaClinicaAdmin[] = [];
  estadisticas: EstadisticasAdmin | null = null;
  estadisticasPorMateria: Map<number | null, EstadisticasAdmin> = new Map();
  todasLasMaterias: MateriaAdmin[] = [];
  mostrarMateriasHistoricas: boolean = false;
  filtroMateriaArchivada: number | null = null;
  loading = true;
  error = '';

  // Filtros
  filtroEstado: string = 'todos';
  filtroPaciente: string = '';
  filtroAlumno: string = '';
  filtroProfesor: string = '';

  // Ordenamiento
  ordenamiento: string = 'recientes';

  // Paginación
  paginaActual: number = 1;
  registrosPorPagina: number = 5;
  totalPaginas: number = 1;

  Math = Math;

  materias: MateriaAdmin[] = [];
  materiaSeleccionadaId: number | null = null;
  historiasPorMateria: Map<number, number> = new Map();

  regresandoDeHistoriaDetalle: boolean = false;

  // Menú desplegable
  menuAbiertoId: number | null = null;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      if (
        (!event.url.includes('/historias/') &&
         !event.url.includes('/dashboard') &&
         !event.url.includes('/admin/dashboard')) ||
        event.url.includes('/historias/nueva')
      ) {
        this.clearSavedFilters();
      }

      if ((event.url.includes('/admin/dashboard') || event.url.includes('/dashboard')) &&
          (this.router.url.includes('/historias/') && !this.router.url.includes('/historias/nueva'))) {
        this.regresandoDeHistoriaDetalle = true;
      }
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.regresandoDeHistoriaDetalle) {
        this.regresandoDeHistoriaDetalle = false;
        setTimeout(() => this.aplicarFiltrosGuardados(), 100);
      }
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    this.adminService.obtenerTodasHistorias().subscribe({
      next: (response) => {
        this.historiasClinicas = response.data.historias;
        this.todasLasMaterias = this.extraerMaterias(this.historiasClinicas);
        this.materias = this.todasLasMaterias.filter(m => !m.Archivado);

        this.contarHistoriasPorMateria();
        this.calcularEstadisticasPorMateria();

        if (!this.regresandoDeHistoriaDetalle) {
          this.loadSavedFilters();
        }

        this.actualizarEstadisticas();
        this.calcularTotalPaginas();
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error al cargar las historias clínicas. Por favor, intenta nuevamente.';
        console.error('Error al cargar historias:', error);
      }
    });

    this.adminService.obtenerEstadisticasGlobales().subscribe({
      next: (response) => {
        this.estadisticas = response.data.estadisticas;
        this.calcularEstadisticasPorMateria();
        this.actualizarEstadisticas();
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
        this.generarEstadisticasLocales();
      }
    });
  }

  extraerMaterias(historias: HistoriaClinicaAdmin[]): MateriaAdmin[] {
    const materiasMap = new Map<number, MateriaAdmin>();

    historias.forEach(h => {
      if (!materiasMap.has(h.MateriaProfesorID)) {
        materiasMap.set(h.MateriaProfesorID, {
          MateriaProfesorID: h.MateriaProfesorID,
          ID: h.MateriaProfesorID,
          NombreMateria: h.NombreMateria,
          Clave: h.ClaveMateria,
          PeriodoEscolar: h.PeriodoEscolar,
          Archivado: h.MateriaArchivada,
          NumeroEmpleado: h.NumeroEmpleado,
          NombreProfesor: h.NombreProfesor,
          TotalHistorias: 0
        });
      }
    });

    return Array.from(materiasMap.values()).sort((a, b) => {
      if (a.PeriodoEscolar !== b.PeriodoEscolar) {
        return b.PeriodoEscolar.localeCompare(a.PeriodoEscolar);
      }
      return a.NombreMateria.localeCompare(b.NombreMateria);
    });
  }

  generarEstadisticasLocales(): void {
    setTimeout(() => {
      if (this.historiasClinicas.length > 0) {
        const estados = ['Nuevo', 'Corregido', 'En proceso', 'Revisión', 'Corrección', 'Finalizado'];
        const porEstado = estados.map(estado => ({
          estado,
          cantidad: this.historiasClinicas.filter(h => h.Estado === estado && !h.Archivado).length
        }));

        this.estadisticas = {
          total: this.historiasClinicas.filter(h => !h.Archivado).length,
          archivadas: this.historiasClinicas.filter(h => h.Archivado).length,
          porEstado,
          totalAlumnos: 0,
          totalProfesores: 0,
          totalMaterias: 0
        };

        this.calcularEstadisticasPorMateria();
        this.actualizarEstadisticas();
      }
    }, 100);
  }

  obtenerFinalizadasNoArchivadas(): number {
    return this.filtrarHistorias().filter(h =>
      h.Estado === 'Finalizado' && !h.Archivado
    ).length;
  }

  verHistoria(id: number): void {
    this.saveFilters();
    this.router.navigate(['/admin/historias', id]);
  }

editarHistoria(id: number, event?: Event): void {
  if (event) event.stopPropagation();
  this.saveFilters();
  this.router.navigate(['/admin/historias', id, 'editar']);
}

  resetearPaginacion(): void {
    this.paginaActual = 1;
    this.calcularTotalPaginas();
    this.saveFilters();
  }

  aplicarFiltroMateria(materiaId: number | null): void {
    this.materiaSeleccionadaId = materiaId;
    this.filtroEstado = 'todos';
    this.actualizarEstadisticas();
    this.resetearPaginacion();
    this.filtroPaciente = '';
    this.filtroAlumno = '';
    this.filtroProfesor = '';
    this.saveFilters();
  }

  aplicarFiltroEstado(estado: string): void {
    this.filtroEstado = estado;
    this.resetearPaginacion();
  }

  aplicarOrdenamiento(): void {
    this.resetearPaginacion();
  }

  onFiltroPacienteChange(): void {
    this.resetearPaginacion();
    this.saveFilters();
  }

  onFiltroAlumnoChange(): void {
    this.resetearPaginacion();
    this.saveFilters();
  }

  onFiltroProfesorChange(): void {
    this.resetearPaginacion();
    this.saveFilters();
  }

  calcularTotalPaginas(): void {
    const totalHistorias = this.filtrarHistorias().length;
    this.totalPaginas = Math.max(1, Math.ceil(totalHistorias / this.registrosPorPagina));

    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = this.totalPaginas;
    }
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
      this.saveFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  cambiarRegistrosPorPagina(): void {
    this.resetearPaginacion();
  }

  obtenerHistoriasPaginadas(): HistoriaClinicaAdmin[] {
    const historiasFiltradas = this.filtrarHistorias();
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    return historiasFiltradas.slice(inicio, fin);
  }

  calcularEdad(fechaNacimiento: string): number | null {
    if (!fechaNacimiento) return null;

    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return edad;
  }

  toggleMateriasHistoricas(): void {
    this.mostrarMateriasHistoricas = !this.mostrarMateriasHistoricas;

    if (this.mostrarMateriasHistoricas) {
      this.materias = this.todasLasMaterias;
    } else {
      this.materias = this.todasLasMaterias.filter(m => !m.Archivado);

      if (this.materiaSeleccionadaId) {
        const materiaSeleccionada = this.materias.find(m => m.ID === this.materiaSeleccionadaId);
        if (!materiaSeleccionada) {
          this.materiaSeleccionadaId = null;
          this.actualizarEstadisticas();
        }
      }
    }

    this.contarHistoriasPorMateria();
    this.resetearPaginacion();
    this.saveFilters();
  }

  seleccionarMateriaArchivada(materiaId: number): void {
    this.filtroMateriaArchivada = materiaId;
    this.materiaSeleccionadaId = null;
    this.mostrarMateriasHistoricas = true;
    this.materias = this.todasLasMaterias;
    this.filtroEstado = 'archivadas';
    this.actualizarEstadisticas();
    this.resetearPaginacion();
    this.saveFilters();
  }

  saveFilters(): void {
    const filters = {
      filtroEstado: this.filtroEstado,
      filtroPaciente: this.filtroPaciente,
      filtroAlumno: this.filtroAlumno,
      filtroProfesor: this.filtroProfesor,
      ordenamiento: this.ordenamiento,
      materiaSeleccionadaId: this.materiaSeleccionadaId,
      paginaActual: this.paginaActual,
      registrosPorPagina: this.registrosPorPagina,
      filtroMateriaArchivada: this.filtroMateriaArchivada
    };
    localStorage.setItem('admin-dashboard-filters', JSON.stringify(filters));
  }

  private loadSavedFilters(): void {
    const savedFilters = localStorage.getItem('admin-dashboard-filters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);

        this.filtroEstado = filters.filtroEstado || 'todos';
        this.filtroPaciente = filters.filtroPaciente || '';
        this.filtroAlumno = filters.filtroAlumno || '';
        this.filtroProfesor = filters.filtroProfesor || '';
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
    localStorage.removeItem('admin-dashboard-filters');
    this.filtroEstado = 'todos';
    this.filtroPaciente = '';
    this.filtroAlumno = '';
    this.filtroProfesor = '';
    this.ordenamiento = 'recientes';
    this.materiaSeleccionadaId = null;
    this.paginaActual = 1;
    this.registrosPorPagina = 5;
    this.filtroMateriaArchivada = null;
  }

  aplicarFiltrosGuardados(): void {
    this.actualizarEstadisticas();
    this.calcularTotalPaginas();
  }

  // MÉTODOS DEL MENÚ DESPLEGABLE
  toggleMenu(historiaId: number, event: Event): void {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === historiaId ? null : historiaId;
  }

  cerrarMenu(): void {
    this.menuAbiertoId = null;
  }

  verComentarios(historiaId: number, event?: Event): void {
    if (event) event.stopPropagation();
    this.cerrarMenu();
    this.router.navigate(['/admin/historias', historiaId, 'comentarios']);
  }

  cambiarEstado(historiaId: number, nuevoEstado: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.cerrarMenu();

    if (confirm(`¿Estás seguro de cambiar el estado a "${nuevoEstado}"?`)) {
      this.adminService.actualizarEstadoHistoria(historiaId, nuevoEstado).subscribe({
        next: () => {
          const historia = this.historiasClinicas.find(h => h.ID === historiaId);
          if (historia) {
            historia.Estado = nuevoEstado;
            historia.FechaUltimaModificacion = new Date().toISOString();
          }
          this.calcularEstadisticasPorMateria();
          this.actualizarEstadisticas();
          alert('Estado actualizado correctamente');
        },
        error: (error) => {
          console.error('Error al actualizar estado:', error);
          alert('Error al actualizar el estado');
        }
      });
    }
  }

  archivarHistoria(historiaId: number, event?: Event): void {
    if (event) event.stopPropagation();
    this.cerrarMenu();

    const historia = this.historiasClinicas.find(h => h.ID === historiaId);
    const accion = historia?.Archivado ? 'desarchivar' : 'archivar';

    if (confirm(`¿Estás seguro de ${accion} esta historia clínica?`)) {
      this.adminService.archivarHistoria(historiaId, !historia?.Archivado).subscribe({
        next: () => {
          if (historia) {
            historia.Archivado = !historia.Archivado;
            historia.FechaUltimaModificacion = new Date().toISOString();
          }
          this.contarHistoriasPorMateria();
          this.calcularEstadisticasPorMateria();
          this.actualizarEstadisticas();
          alert(`Historia ${accion}da correctamente`);
        },
        error: (error) => {
          console.error(`Error al ${accion} historia:`, error);
          alert(`Error al ${accion} la historia`);
        }
      });
    }
  }

  eliminarHistoria(historiaId: number, event?: Event): void {
    if (event) event.stopPropagation();
    this.cerrarMenu();

    if (confirm('¿Estás seguro de eliminar esta historia clínica? Esta acción no se puede deshacer.')) {
      this.adminService.eliminarHistoria(historiaId).subscribe({
        next: () => {
          this.historiasClinicas = this.historiasClinicas.filter(h => h.ID !== historiaId);
          this.contarHistoriasPorMateria();
          this.calcularEstadisticasPorMateria();
          this.actualizarEstadisticas();
          this.calcularTotalPaginas();
          alert('Historia eliminada correctamente');
        },
        error: (error) => {
          console.error('Error al eliminar historia:', error);
          alert('Error al eliminar la historia');
        }
      });
    }
  }

  filtrarHistorias(): HistoriaClinicaAdmin[] {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return [];

    const terminoPaciente = this.filtroPaciente.trim();
    const terminoAlumno = this.filtroAlumno.trim();
    const terminoProfesor = this.filtroProfesor.trim();

    const historiasFiltradas = this.historiasClinicas.filter(historia => {
      const nombreCompletoPaciente = `${historia.Nombre} ${historia.ApellidoPaterno} ${historia.ApellidoMaterno}`.toLowerCase();
      const cumplePaciente = !terminoPaciente ||
        this.contieneTexto(nombreCompletoPaciente, terminoPaciente) ||
        this.contieneTexto(historia.CURP, terminoPaciente) ||
        this.contieneTexto(historia.IDSiSeCo, terminoPaciente);

      const cumpleAlumno = !terminoAlumno ||
        this.contieneTexto(historia.NombreAlumno, terminoAlumno) ||
        this.contieneTexto(historia.NumeroBoleta, terminoAlumno);

      const cumpleProfesor = !terminoProfesor ||
        this.contieneTexto(historia.NombreProfesor, terminoProfesor) ||
        this.contieneTexto(historia.NumeroEmpleado, terminoProfesor);

      const cumpleEstado = this.filtroEstado === 'todos' || historia.Estado === this.filtroEstado;

      let cumpleMateria = true;
      if (this.materiaSeleccionadaId !== null) {
        cumpleMateria = historia.MateriaProfesorID === this.materiaSeleccionadaId;
      } else if (this.filtroMateriaArchivada !== null) {
        cumpleMateria = historia.MateriaProfesorID === this.filtroMateriaArchivada;
      } else if (!this.mostrarMateriasHistoricas) {
        cumpleMateria = !historia.MateriaArchivada;
      }

      const cumpleArchivado = this.filtroEstado !== 'archivadas' ? !historia.Archivado : historia.Archivado;

      return cumplePaciente && cumpleAlumno && cumpleProfesor && cumpleEstado && cumpleMateria && cumpleArchivado;
    });

    return this.ordenarHistorias(historiasFiltradas);
  }

  private contieneTexto(texto: string | null | undefined, busqueda: string): boolean {
    if (!texto || !busqueda) return false;

    const textoNormalizado = texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    const busquedaNormalizada = busqueda
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    return textoNormalizado.includes(busquedaNormalizada);
  }

  ordenarHistorias(historias: HistoriaClinicaAdmin[]): HistoriaClinicaAdmin[] {
    return historias.sort((a, b) => {
      switch (this.ordenamiento) {
        case 'recientes':
          return new Date(b.FechaCreacion).getTime() - new Date(a.FechaCreacion).getTime();
        case 'antiguas':
          return new Date(a.FechaCreacion).getTime() - new Date(b.FechaCreacion).getTime();
        case 'alfabetico-asc':
          return `${a.Nombre} ${a.ApellidoPaterno}`.localeCompare(`${b.Nombre} ${b.ApellidoPaterno}`);
        case 'alfabetico-desc':
          return `${b.Nombre} ${b.ApellidoPaterno}`.localeCompare(`${a.Nombre} ${a.ApellidoPaterno}`);
        case 'edad-asc':
          return new Date(b.FechaNacimiento).getTime() - new Date(a.FechaNacimiento).getTime();
        case 'edad-desc':
          return new Date(a.FechaNacimiento).getTime() - new Date(b.FechaNacimiento).getTime();
        case 'semestre-reciente':
          return b.SemestreActual - a.SemestreActual;
        case 'semestre-antiguo':
          return a.SemestreActual - b.SemestreActual;
        default:
          return 0;
      }
    });
  }

  contarHistoriasPorMateria(): void {
    this.historiasPorMateria.clear();
    this.historiasClinicas.forEach(historia => {
      if (!historia.Archivado) {
        const count = this.historiasPorMateria.get(historia.MateriaProfesorID) || 0;
        this.historiasPorMateria.set(historia.MateriaProfesorID, count + 1);
      }
    });
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
    const todasHistorias = this.historiasClinicas.filter(h => !h.Archivado);
    this.actualizarEstadisticasMateria(estadisticasTodas, todasHistorias);
    estadisticasTodas.archivadas = this.historiasClinicas.filter(h => h.Archivado).length;
    this.estadisticasPorMateria.set(null, estadisticasTodas);
  }

  private clonarEstadisticas(estadisticas: EstadisticasAdmin): EstadisticasAdmin {
    return {
      total: estadisticas.total,
      archivadas: estadisticas.archivadas,
      porEstado: estadisticas.porEstado.map(e => ({ ...e })),
      totalAlumnos: estadisticas.totalAlumnos,
      totalProfesores: estadisticas.totalProfesores,
      totalMaterias: estadisticas.totalMaterias
    };
  }

  private actualizarEstadisticasMateria(estadisticas: EstadisticasAdmin, historias: HistoriaClinicaAdmin[]): void {
    estadisticas.total = historias.length;
    estadisticas.porEstado.forEach(estado => {
      estado.cantidad = historias.filter(h => h.Estado === estado.estado).length;
    });
  }

  actualizarEstadisticas(): void {
    const materiaId = this.materiaSeleccionadaId;
    const estadisticasActuales = this.estadisticasPorMateria.get(materiaId);

    if (estadisticasActuales) {
      this.estadisticas = estadisticasActuales;
    }
  }

  obtenerEstadosConValores(): { estado: string; cantidad: number }[] {
    if (!this.estadisticas || !this.estadisticas.porEstado) return [];

    const ordenEstados = ['Nuevo', 'Corregido', 'En proceso', 'Revisión', 'Corrección', 'Finalizado'];

    const estadosFiltrados = this.estadisticas.porEstado.filter(estado => {
      if (estado.estado === 'Finalizado') {
        return this.obtenerFinalizadasNoArchivadas() > 0;
      } else {
        return estado.cantidad > 0;
      }
    });

    return estadosFiltrados.sort((a, b) => {
      const indexA = ordenEstados.indexOf(a.estado);
      const indexB = ordenEstados.indexOf(b.estado);

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }
}