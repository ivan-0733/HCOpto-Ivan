// AlumnoDashboardComponent.ts - Con estadísticas por profesor

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HistoriaClinicaService, HistoriaClinica } from '../../services/historia-clinica.service';
import { AlumnoService, Perfil, Profesor } from '../../services/alumno.service';
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
  estadisticasPorProfesor: Map<number | null, EstadisticasHistorias> = new Map(); // Para almacenar estadísticas por profesor
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

  // Propiedades para filtrado de profesores
  profesores: Profesor[] = [];
  profesorSeleccionadoId: number | null = null;

  // Map para almacenar conteo de historias por profesor
  historiasPorProfesor: Map<number, number> = new Map();

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

    // Cargar profesores asignados al alumno
    this.alumnoService.obtenerProfesoresAsignados().subscribe({
      next: (profesores) => {
        this.profesores = profesores;
        console.log('Profesores cargados:', profesores);

        // Si solo hay un profesor, pre-seleccionarlo
        if (this.profesores.length === 1) {
          this.profesorSeleccionadoId = this.profesores[0].ProfesorID;
        } else {
          // Por defecto, seleccionar "Todos los profesores"
          this.profesorSeleccionadoId = null;
        }
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
          CorreoElectronico: historia.CorreoElectronico || undefined,
          TelefonoCelular: historia.TelefonoCelular || undefined,
          Edad: historia.Edad !== undefined && historia.Edad !== null ? Number(historia.Edad) : undefined
        }));
        console.log('Historias cargadas:', this.historiasClinicas);

        // Calcular el número de historias por profesor
        this.calcularHistoriasPorProfesor();

        // Aplicar ordenamiento inicial
        this.aplicarOrdenamiento();

        // Calcular total de páginas
        this.calcularTotalPaginas();

        // Calcular estadísticas para cada profesor
        this.calcularEstadisticasPorProfesor();

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
          this.calcularEstadisticasPorProfesor();
          this.actualizarEstadisticas();
        }
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
      }
    });
  }

// Método para calcular las estadísticas para cada profesor
calcularEstadisticasPorProfesor(): void {
  if (!this.estadisticas || !this.historiasClinicas.length) return;

  // Inicializar estadísticas para todos los profesores
  this.profesores.forEach(profesor => {
    // Crear una copia de las estadísticas originales para este profesor
    const estadisticasProfesor = this.clonarEstadisticas(this.estadisticas!);

    // Filtrar historias no archivadas de este profesor
    const historiasProfesor = this.historiasClinicas.filter(h =>
      !Boolean(h.Archivado) && h.ProfesorID === profesor.ProfesorID
    );

    // Filtrar historias ARCHIVADAS de este profesor
    const historiasArchivadasProfesor = this.historiasClinicas.filter(h =>
      Boolean(h.Archivado) && h.ProfesorID === profesor.ProfesorID
    );

    // Actualizar estadísticas para este profesor
    this.actualizarEstadisticasProfesor(estadisticasProfesor, historiasProfesor);

    // Asignar el conteo de archivadas específico del profesor
    estadisticasProfesor.archivadas = historiasArchivadasProfesor.length;

    // Guardar estadísticas actualizadas para este profesor
    this.estadisticasPorProfesor.set(profesor.ProfesorID, estadisticasProfesor);
  });

  // También calcular estadísticas para "todos los profesores" (null)
  const estadisticasTodos = this.clonarEstadisticas(this.estadisticas!);
  const historiasTodos = this.historiasClinicas.filter(h => !Boolean(h.Archivado));
  const historiasArchivadasTodos = this.historiasClinicas.filter(h => Boolean(h.Archivado));

  this.actualizarEstadisticasProfesor(estadisticasTodos, historiasTodos);
  estadisticasTodos.archivadas = historiasArchivadasTodos.length;
  this.estadisticasPorProfesor.set(null, estadisticasTodos);

  console.log('Estadísticas por profesor calculadas:',
    Array.from(this.estadisticasPorProfesor.entries()).map(([id, stats]) =>
      `ProfesorID: ${id}, Total: ${stats.total}, Archivadas: ${stats.archivadas}`));
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

  // Método para actualizar las estadísticas para un profesor específico
  actualizarEstadisticasProfesor(estadisticas: EstadisticasHistorias, historias: HistoriaClinica[]): void {
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
        semestreItem.cantidad = historias.filter(h => h.Semestre === semestreItem.semestre).length;
      });
    }
  }

  // Método para calcular cuántas historias tiene cada profesor
  calcularHistoriasPorProfesor(): void {
    // Reiniciar el mapa
    this.historiasPorProfesor = new Map();

    // Para cada profesor, contar historias no archivadas
    this.profesores.forEach(profesor => {
      const count = this.historiasClinicas.filter(historia => {
        // Verificar si el ProfesorID coincide y no está archivada
        const estaArchivado = Boolean(historia.Archivado);
        return historia.ProfesorID === profesor.ProfesorID && !estaArchivado;
      }).length;

      // Guardar el conteo en el mapa
      this.historiasPorProfesor.set(profesor.ProfesorID, count);
    });

    console.log('Historias por profesor calculadas:',
      Array.from(this.historiasPorProfesor.entries()).map(([id, count]) =>
        `ProfesorID: ${id}, Count: ${count}`));
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

  // Método para filtrar historias por profesor
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

      // FILTRADO POR PROFESOR - APLICAR EN TODOS LOS CASOS (ARCHIVADOS Y NO ARCHIVADOS)
      if (this.profesorSeleccionadoId !== null) {
        // Debug para ver si el ProfesorID existe en las historias
        console.log(`Filtrando por profesor ${this.profesorSeleccionadoId}, historia ProfesorID:`, historia.ProfesorID);

        // Si la historia no tiene ProfesorID o es diferente al seleccionado, excluirla
        if (historia.ProfesorID === undefined || historia.ProfesorID === null ||
            historia.ProfesorID !== this.profesorSeleccionadoId) {
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

  // Obtener solo los primeros dos profesores para la primera fila
  obtenerPrimerosDos(): Profesor[] {
    return this.profesores.slice(0, 2);
  }

  // Obtener los profesores restantes después de los primeros dos
  obtenerProfesoresAdicionales(): Profesor[] {
    return this.profesores.slice(2);
  }

  // Aplicar filtro por profesor seleccionado
  aplicarFiltroProfesor(profesorId: number | null): void {
    console.log(`Aplicando filtro de profesor: ${profesorId}`);
    this.profesorSeleccionadoId = profesorId;

    // Actualizar las estadísticas basadas en el profesor seleccionado
    this.actualizarEstadisticas();

    // Resetear paginación al cambiar de profesor
    this.resetearPaginacion();

    // Resetear filtro de paciente para una mejor experiencia de usuario
    this.filtroPaciente = '';
  }

  // Método para obtener número de historias por profesor
  obtenerHistoriasPorProfesor(profesorId: number): number {
    // Usar el mapa calculado previamente
    return this.historiasPorProfesor.get(profesorId) || 0;
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
        // Ordenar por semestre descendente (más reciente primero)
        return historiasOrdenadas.sort((a, b) => {
          // Manejar casos donde el semestre no existe o tiene formato inválido
          if (!a.Semestre) return 1; // Mover valores vacíos al final
          if (!b.Semestre) return -1;

          // Dividir el semestre en año y periodo
          const [yearA, periodA] = a.Semestre.split('-').map(part => parseInt(part));
          const [yearB, periodB] = b.Semestre.split('-').map(part => parseInt(part));

          // Comparar primero por año (descendente)
          if (yearA !== yearB) return yearB - yearA;

          // Si los años son iguales, comparar por periodo (2 es más reciente que 1)
          return periodB - periodA;
        });

      case 'semestre-antiguo':
        // Ordenar por semestre ascendente (más antiguo primero)
        return historiasOrdenadas.sort((a, b) => {
          // Manejar casos donde el semestre no existe o tiene formato inválido
          if (!a.Semestre) return 1; // Mover valores vacíos al final
          if (!b.Semestre) return -1;

          // Dividir el semestre en año y periodo
          const [yearA, periodA] = a.Semestre.split('-').map(part => parseInt(part));
          const [yearB, periodB] = b.Semestre.split('-').map(part => parseInt(part));

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

  // Método para actualizar las estadísticas según el profesor seleccionado
  actualizarEstadisticas(): void {
    if (!this.estadisticas || !this.estadisticasPorProfesor.size) return;

    // Obtener las estadísticas correspondientes al profesor seleccionado o todas
    const estadisticasActuales = this.estadisticasPorProfesor.get(this.profesorSeleccionadoId);

    if (estadisticasActuales) {
      // Actualiza las estadísticas mostradas en el dashboard
      this.estadisticas = estadisticasActuales;
      console.log(`Estadísticas actualizadas para profesor ID ${this.profesorSeleccionadoId}:`, this.estadisticas);
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

  // Método para obtener el número de historias no archivadas (del profesor seleccionado)
  obtenerHistoriasNoArchivadas(): number {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return 0;

    // Contar las historias que NO están archivadas (y coinciden con el profesor seleccionado si hay uno)
    return this.historiasClinicas.filter(historia => {
      // Comprobar si NO está archivado
      const estaArchivado = Boolean(historia.Archivado);
      if (estaArchivado) return false;

      // Si hay un profesor seleccionado, filtrar por él
      if (this.profesorSeleccionadoId !== null) {
        return historia.ProfesorID === this.profesorSeleccionadoId;
      }

      // Si no hay profesor seleccionado, incluir todas las no archivadas
      return true;
    }).length;
  }

  // Método para obtener historias finalizadas no archivadas (del profesor seleccionado)
  obtenerFinalizadasNoArchivadas(): number {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return 0;

    // Contar las historias que están finalizadas pero NO archivadas (y coinciden con el profesor seleccionado si hay uno)
    return this.historiasClinicas.filter(historia => {
      // Comprobar si NO está archivado
      const estaArchivado = Boolean(historia.Archivado);
      if (estaArchivado || historia.Estado !== 'Finalizado') return false;

      // Si hay un profesor seleccionado, filtrar por él
      if (this.profesorSeleccionadoId !== null) {
        return historia.ProfesorID === this.profesorSeleccionadoId;
      }

      // Si no hay profesor seleccionado, incluir todas las finalizadas no archivadas
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