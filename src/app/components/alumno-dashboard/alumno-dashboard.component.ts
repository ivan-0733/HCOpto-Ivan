// AlumnoDashboardComponent.ts - Con estadísticas por materia

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HistoriaClinicaService, HistoriaClinica } from '../../services/historia-clinica.service';
import { AlumnoService, Profesor, Perfil, Semestre, Consultorio, CatalogoItem, Paciente, PeriodoEscolar, MateriaAlumno } from '../../services/alumno.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

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
  ) { }

  ngOnInit(): void {
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
          Edad: historia.Edad !== undefined && historia.Edad !== null ? Number(historia.Edad) : undefined,
          MateriaID: this.obtenerMateriaIdPorProfesor(historia.ProfesorID)
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

  // Método para obtener el ID de materia basado en el profesor (simulación)
  obtenerMateriaIdPorProfesor(profesorId: number): number | undefined {
    if (!profesorId || !this.profesores.length) return undefined;

    // Buscar un profesor que coincida con el ID
    const profesor = this.profesores.find(p => p.ProfesorID === profesorId);
    if (!profesor) return undefined;

    // Buscar una materia asociada a este profesor
    const materia = this.materias.find(m => {
      // Verificar si el nombre o ID del profesor coincide
      return m.NombreProfesor && m.NombreProfesor.includes(profesor.Nombre);
    });

    return materia ? materia.ID : undefined;
  }

  // Método para calcular las estadísticas para cada materia
  calcularEstadisticasPorMateria(): void {
    if (!this.estadisticas || !this.historiasClinicas.length) return;

    // Inicializar estadísticas para todas las materias
    this.materias.forEach(materia => {
      // Crear una copia de las estadísticas originales para esta materia
      const estadisticasMateria = this.clonarEstadisticas(this.estadisticas!);

      // Filtrar historias no archivadas de esta materia
      const historiasMateria = this.historiasClinicas.filter(h =>
        !Boolean(h.Archivado) && h.ID === materia.ID
      );

      // Filtrar historias ARCHIVADAS de esta materia
      const historiasArchivadasMateria = this.historiasClinicas.filter(h =>
        Boolean(h.Archivado) && h.ID === materia.ID
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

    console.log('Estadísticas por materia calculadas:',
      Array.from(this.estadisticasPorMateria.entries()).map(([id, stats]) =>
        `ID: ${id}, Total: ${stats.total}, Archivadas: ${stats.archivadas}`));
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
        // Verificar si el ID coincide y no está archivada
        const estaArchivado = Boolean(historia.Archivado);
        return historia.ID === materia.ID && !estaArchivado;
      }).length;

      // Guardar el conteo en el mapa
      this.historiasPorMateria.set(materia.ID, count);
    });

    console.log('Historias por materia calculadas:',
      Array.from(this.historiasPorMateria.entries()).map(([id, count]) =>
        `ID: ${id}, Count: ${count}`));
  }

  crearNuevaHistoria(): void {
    this.router.navigate(['/alumno/historias/nueva']);
  }

  verHistoria(id: number): void {
    // Navegar a la página de detalle de historia clínica
    this.router.navigate(['/alumno/historias', id]);
  }

  editarHistoria(id: number): void {
    this.router.navigate(['/alumno/historias', id, 'editar']);
  }

  // Método para resetear la paginación cuando cambian los filtros
  resetearPaginacion(): void {
    this.registrosPorPagina = 5;
    this.paginaActual = 1;
    this.calcularTotalPaginas();
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
        // Debug para ver si el ID existe en las historias
        console.log(`Filtrando por materia ${this.materiaSeleccionadaId}, historia ID:`, historia.ID);

        // Si la historia no tiene ID o es diferente a la seleccionada, excluirla
        if (historia.ID === undefined || historia.ID === null ||
            historia.ID !== this.materiaSeleccionadaId) {
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

  // Aplicar filtro por materia seleccionada
  aplicarFiltroMateria(materiaId: number | null): void {
    console.log(`Aplicando filtro de materia: ${materiaId}`);
    this.materiaSeleccionadaId = materiaId;

    // Actualizar las estadísticas basadas en la materia seleccionada
    this.actualizarEstadisticas();

    // Resetear paginación al cambiar de materia
    this.resetearPaginacion();

    // Resetear filtro de paciente para una mejor experiencia de usuario
    this.filtroPaciente = '';
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
    }
  }

  cambiarRegistrosPorPagina(): void {
    // Volver a la primera página cuando se cambia el número de registros por página
    this.paginaActual = 1;
    // Recalcular el total de páginas
    this.calcularTotalPaginas();
  }

  // Método para obtener el número de historias no archivadas (de la materia seleccionada)
  obtenerHistoriasNoArchivadas(): number {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return 0;

    // Contar las historias que NO están archivadas (y coinciden con la materia seleccionada si hay una)
    return this.historiasClinicas.filter(historia => {
      // Comprobar si NO está archivado
      const estaArchivado = Boolean(historia.Archivado);
      if (estaArchivado) return false;

      // Si hay una materia seleccionada, filtrar por ella
      if (this.materiaSeleccionadaId !== null) {
        return historia.ID === this.materiaSeleccionadaId;
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

      // Si hay una materia seleccionada, filtrar por ella
      if (this.materiaSeleccionadaId !== null) {
        return historia.ID === this.materiaSeleccionadaId;
      }

      // Si no hay materia seleccionada, incluir todas las finalizadas no archivadas
      return true;
    }).length;
  }

  // Método para aplicar filtro al hacer click en una card
  aplicarFiltroCard(estado: string): void {
    // Actualizar el filtro de estado
    this.filtroEstado = estado;

    // Resetear la paginación
    this.resetearPaginacion();

    // Resetear el filtro de paciente
    this.filtroPaciente = '';

    // Opcional: hacer scroll hacia la tabla para que el usuario vea los resultados
    setTimeout(() => {
      const tablaElement = document.querySelector('.tabla-container');
      if (tablaElement) {
        tablaElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }
}