import { Component, OnInit, HostListener } from '@angular/core';
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
  styleUrls: ['../../components/admin-dashboard/admin-dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class AdminDashboardComponent implements OnInit {
  historiasClinicas: HistoriaClinicaAdmin[] = [];
  estadisticas: EstadisticasAdmin | null = null;
  estadisticasPorMateria: Map<number | null, EstadisticasAdmin> = new Map();
  todasLasMaterias: MateriaAdmin[] = [];
  materiasDelPeriodoActual: MateriaAdmin[] = []; // Para las cards
  loading = true;
  error = '';

  // Filtros
  filtroEstado: string = 'todos';
  filtroPaciente: string = '';
  filtroAlumno: string = '';
  filtroProfesor: string = '';
  filtroMateriaArchivada: number | null = null;

  // Ordenamiento
  ordenamiento: string = 'recientes';

  periodoEscolar: any = null;

  // Paginación
  paginaActual: number = 1;
  registrosPorPagina: number = 5;
  totalPaginas: number = 1;

  materias: MateriaAdmin[] = []; // <- AGREGAR ESTA LÍNEA
  mostrarMateriasHistoricas: boolean = false; // <- AGREGAR ESTA LÍNEA
  historiasPorMateria: Map<number, number> = new Map(); // <- AGREGAR ESTA LÍNEA

  Math = Math;

  materiaSeleccionadaId: number | null = null;
  regresandoDeHistoriaDetalle: boolean = false;
  menuAbiertoId: number | null = null;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: any) => {
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

    // Primero cargar el periodo escolar actual
    this.adminService.obtenerPeriodoEscolarActual().subscribe({
      next: (response) => {
        this.periodoEscolar = response.data;
        console.log('Período escolar actual cargado:', this.periodoEscolar);

        // Una vez cargado el periodo, cargar las historias
        this.adminService.obtenerTodasHistorias().subscribe({
          next: (response) => {
            this.historiasClinicas = response.data.historias;
            this.todasLasMaterias = this.extraerMaterias(this.historiasClinicas);

            // MODIFICACIÓN: Filtrar materias solo del periodo activo
            if (this.periodoEscolar) {
              this.materias = this.todasLasMaterias.filter(m =>
                m.PeriodoEscolar === this.periodoEscolar.Codigo
              );
            } else {
              this.materias = this.todasLasMaterias;
            }

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
      },
      error: (error) => {
        console.error('Error al cargar período escolar:', error);
        // Continuar cargando historias aunque falle el periodo
        this.adminService.obtenerTodasHistorias().subscribe({
          next: (response) => {
            this.historiasClinicas = response.data.historias;
            this.todasLasMaterias = this.extraerMaterias(this.historiasClinicas);
            this.materias = this.todasLasMaterias;

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

  cargarHistoriasYEstadisticas(): void {
    this.adminService.obtenerTodasHistorias().subscribe({
      next: (response) => {
        this.historiasClinicas = response.data.historias;
        this.calcularEstadisticasPorMateria();
        this.actualizarEstadisticas();
        this.calcularTotalPaginas();
        this.loading = false;

        if (!this.regresandoDeHistoriaDetalle) {
          this.loadSavedFilters();
        } else {
            this.aplicarFiltrosGuardados();
        }
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

        if (!cumplePaciente || !cumpleAlumno || !cumpleProfesor) {
            return false;
        }

        if (this.filtroEstado === 'archivadas') {
            if (!historia.Archivado) return false;
            if (this.filtroMateriaArchivada !== null) {
                return historia.MateriaProfesorID === this.filtroMateriaArchivada;
            }
            return true;
        }

        if (historia.Archivado) return false;

        const cumpleEstado = this.filtroEstado === 'todos' || historia.Estado === this.filtroEstado;
        if (!cumpleEstado) return false;

        if (this.materiaSeleccionadaId !== null) {
            return historia.MateriaProfesorID === this.materiaSeleccionadaId;
        }

        return true;
    });

    return this.ordenarHistorias(historiasFiltradas);
  }

  aplicarFiltroMateria(materiaId: number | null): void {
    this.materiaSeleccionadaId = materiaId;
    this.filtroEstado = 'todos';
    this.filtroMateriaArchivada = null;
    this.actualizarEstadisticas();
    this.resetearPaginacion();
    this.filtroPaciente = '';
    this.filtroAlumno = '';
    this.filtroProfesor = '';
    this.saveFilters();
  }

  aplicarFiltroEstado(estado: string): void {
    this.filtroEstado = estado;

    if (estado !== 'archivadas') {
        this.filtroMateriaArchivada = null;
    }

    this.materiaSeleccionadaId = null;
    this.actualizarEstadisticas();
    this.resetearPaginacion();
  }

  aplicarFiltroMateriaArchivada(): void {
    this.resetearPaginacion();
    this.saveFilters();
  }

  obtenerMateriasConHistoriasArchivadas(): MateriaAdmin[] {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return [];

    const historiasArchivadas = this.historiasClinicas.filter(h => h.Archivado);
    const materiasMap = new Map<number, MateriaAdmin>();

    historiasArchivadas.forEach(historia => {
      if (materiasMap.has(historia.MateriaProfesorID)) return;

      const materiaInfo = this.todasLasMaterias.find(m => m.MateriaProfesorID === historia.MateriaProfesorID);
      if (materiaInfo) {
        materiasMap.set(historia.MateriaProfesorID, materiaInfo);
      }
    });

    return Array.from(materiasMap.values()).sort((a, b) => {
      const comparaPeriodo = b.PeriodoEscolar.localeCompare(a.PeriodoEscolar);
      if (comparaPeriodo !== 0) return comparaPeriodo;
      return a.NombreMateria.localeCompare(b.NombreMateria);
    });
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
        this.paginaActual = filters.paginaActual || 1;
        this.registrosPorPagina = Number(filters.registrosPorPagina) || 5;
        this.filtroMateriaArchivada = filters.filtroMateriaArchivada;

        this.aplicarFiltrosGuardados();

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

  obtenerHistoriasNoArchivadas(): number {
    let historiasAContar = this.historiasClinicas.filter(h => !h.Archivado);
    if(this.materiaSeleccionadaId !== null) {
      historiasAContar = historiasAContar.filter(h => h.MateriaProfesorID === this.materiaSeleccionadaId);
    }
    return historiasAContar.length;
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
    return this.filtrarHistorias().filter(h => h.Estado === 'Finalizado' && !h.Archivado).length;
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
    const fin = inicio + Number(this.registrosPorPagina);
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

  obtenerClaseEstado(estado: string): string {
    switch (estado) {
        case 'Nuevo': return 'estado-nuevo';
        case 'Corregido': return 'estado-corregido';
        case 'En proceso': return 'estado-en-proceso';
        case 'Revisión': return 'estado-revision';
        case 'Corrección': return 'estado-correccion';
        case 'Finalizado': return 'estado-finalizado';
        default: return '';
    }
  }

  toggleMateriasHistoricas(): void {
    this.mostrarMateriasHistoricas = !this.mostrarMateriasHistoricas;

    if (this.mostrarMateriasHistoricas) {
      this.materias = this.todasLasMaterias;
    } else {
      // MODIFICACIÓN: Filtrar por periodo activo
      if (this.periodoEscolar) {
        this.materias = this.todasLasMaterias.filter(m =>
          m.PeriodoEscolar === this.periodoEscolar.Codigo
        );
      } else {
        this.materias = this.todasLasMaterias;
      }

      if (this.materiaSeleccionadaId) {
        const materiaSeleccionada = this.materias.find(m => m.MateriaProfesorID === this.materiaSeleccionadaId);
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

  toggleMenu(historiaId: number, event: Event): void {
    event.stopPropagation();
    if (this.menuAbiertoId === historiaId) {
      this.menuAbiertoId = null;
    } else {
      this.menuAbiertoId = historiaId;
    }
  }

  // Método para alternar el submenú
  toggleSubmenu(event: Event): void {
    event.stopPropagation();
    const submenu = (event.target as HTMLElement).parentElement;
    if (submenu) {
      submenu.classList.toggle('active');
    }
  }

  // Cerrar menú al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.menuAbiertoId = null;
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

    // Determinar si es archivar o desarchivar
    const esArchivar = !historia?.Archivado;
    const accion = esArchivar ? 'archivar' : 'desarchivar';

    if (confirm(`¿Estás seguro de ${accion} esta historia clínica?`)) {
      this.adminService.archivarHistoria(historiaId, esArchivar).subscribe({
        next: () => {
          if (historia) {
            historia.Archivado = esArchivar;
            // Si se archiva, cambiar estado a Finalizado
            if (esArchivar) {
              historia.Estado = 'Finalizado';
            }
            historia.FechaUltimaModificacion = new Date().toISOString();
          }
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

  desarchivarHistoria(historiaId: number, event?: Event): void {
    this.archivarHistoria(historiaId, event); // Usa el mismo método
  }

  private contieneTexto(texto: string | null | undefined, busqueda: string): boolean {
    if (!texto || !busqueda) return false;
    const textoNormalizado = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const busquedaNormalizada = busqueda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return textoNormalizado.includes(busquedaNormalizada);
  }

  ordenarHistorias(historias: HistoriaClinicaAdmin[]): HistoriaClinicaAdmin[] {
    return historias.sort((a, b) => {
        switch (this.ordenamiento) {
            case 'recientes': return new Date(b.FechaCreacion).getTime() - new Date(a.FechaCreacion).getTime();
            case 'antiguas': return new Date(a.FechaCreacion).getTime() - new Date(b.FechaCreacion).getTime();
            case 'alfabetico-asc': return `${a.Nombre} ${a.ApellidoPaterno}`.localeCompare(`${b.Nombre} ${b.ApellidoPaterno}`);
            case 'alfabetico-desc': return `${b.Nombre} ${b.ApellidoPaterno}`.localeCompare(`${a.Nombre} ${a.ApellidoPaterno}`);
            case 'edad-asc': return new Date(b.FechaNacimiento).getTime() - new Date(a.FechaNacimiento).getTime();
            case 'edad-desc': return new Date(a.FechaNacimiento).getTime() - new Date(b.FechaNacimiento).getTime();
            case 'semestre-reciente': return b.SemestreActual - a.SemestreActual;
            case 'semestre-antiguo': return a.SemestreActual - b.SemestreActual;
            default: return 0;
        }
    });
  }

  contarHistoriasPorMateria(): void {
    this.historiasPorMateria.clear();

    this.materias.forEach(materia => {
      const count = this.historiasClinicas.filter(h =>
        h.MateriaProfesorID === materia.MateriaProfesorID && !h.Archivado
      ).length;
      this.historiasPorMateria.set(materia.MateriaProfesorID, count);
    });
  }

  calcularEstadisticasPorMateria(): void {
    if (!this.estadisticas || !this.historiasClinicas.length) return;

    const todasLasMateriasUnicas = [...new Set(this.todasLasMaterias.map(item => item.MateriaProfesorID))]
      .map(id => this.todasLasMaterias.find(m => m.MateriaProfesorID === id)!);

    todasLasMateriasUnicas.forEach(materia => {
      const estadisticasMateria = this.clonarEstadisticas(this.estadisticas!);
      const historiasMateria = this.historiasClinicas.filter(h => !h.Archivado && h.MateriaProfesorID === materia.MateriaProfesorID);
      const historiasArchivadasMateria = this.historiasClinicas.filter(h => h.Archivado && h.MateriaProfesorID === materia.MateriaProfesorID);
      this.actualizarEstadisticasMateria(estadisticasMateria, historiasMateria);
      estadisticasMateria.archivadas = historiasArchivadasMateria.length;
      this.estadisticasPorMateria.set(materia.MateriaProfesorID, estadisticasMateria);
    });

    const estadisticasTodas = this.clonarEstadisticas(this.estadisticas!);
    const todasHistoriasNoArchivadas = this.historiasClinicas.filter(h => !h.Archivado);
    this.actualizarEstadisticasMateria(estadisticasTodas, todasHistoriasNoArchivadas);
    estadisticasTodas.archivadas = this.historiasClinicas.filter(h => h.Archivado).length;
    this.estadisticasPorMateria.set(null, estadisticasTodas);
  }

  private clonarEstadisticas(estadisticas: EstadisticasAdmin): EstadisticasAdmin {
    return {
        ...estadisticas,
        porEstado: estadisticas.porEstado.map(e => ({ ...e }))
    };
  }

  private actualizarEstadisticasMateria(estadisticas: EstadisticasAdmin, historias: HistoriaClinicaAdmin[]): void {
    estadisticas.total = historias.length;
    estadisticas.porEstado.forEach(estado => {
        estado.cantidad = historias.filter(h => h.Estado === estado.estado).length;
    });
  }

  actualizarEstadisticas(): void {
    const id = this.materiaSeleccionadaId;
    const estadisticasActuales = this.estadisticasPorMateria.get(id);
    if (estadisticasActuales) {
      this.estadisticas = estadisticasActuales;
    } else {
      this.estadisticas = this.estadisticasPorMateria.get(null) || this.estadisticas;
    }
  }

  extraerMaterias(historias: HistoriaClinicaAdmin[]): MateriaAdmin[] {
    const materiasMap = new Map<number, MateriaAdmin>();

    historias.forEach(h => {
      if (!materiasMap.has(h.MateriaProfesorID)) {
        materiasMap.set(h.MateriaProfesorID, {
          MateriaProfesorID: h.MateriaProfesorID,
          MateriaID: h.MateriaProfesorID, // Usar el mismo ID
          Codigo: h.ClaveMateria,
          NombreMateria: h.NombreMateria,
          Semestre: h.SemestreActual || 0, // Usar SemestreActual del alumno
          EjeFormativo: undefined,
          Descripcion: undefined,
          Grupo: h.GrupoMateria || 'N/A',
          PeriodoEscolar: h.PeriodoEscolar,
          EsActual: true, // Por defecto true
          Turno: 'Matutino', // Valor por defecto
          NombreProfesor: h.NombreProfesor,
          NumeroEmpleado: h.NumeroEmpleado,
          ProfesorInfoID: 0, // No disponible en HistoriaClinicaAdmin
          FechaAsignacion: h.FechaCreacion, // Usar fecha de creación como aproximación
          CantidadAlumnos: 0,
          CantidadHistorias: 0,
          Alumnos: [] // Array vacío
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