import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HistoriaClinicaService, HistoriaClinica, EstadisticasHistorias } from '../../services/historia-clinica.service';
import { AlumnoService, Perfil } from '../../services/alumno.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

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

  constructor(
    private historiaClinicaService: HistoriaClinicaService,
    private alumnoService: AlumnoService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  // Modificar el método cargarDatos para coordinar las llamadas
  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    // Banderas para controlar cuando ambos datos estén cargados
    let historiasListas = false;
    let estadisticasListas = false;

    // Cargar perfil del alumno (sin cambios)
    this.alumnoService.obtenerPerfil().subscribe({
      next: (perfil) => {
        console.log('Perfil cargado:', perfil);
        this.perfil = perfil;
      },
      error: (error) => {
        console.error('Error al cargar perfil:', error);
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

      // Aplicar ordenamiento inicial
      this.aplicarOrdenamiento();

      // Calcular total de páginas
      this.calcularTotalPaginas();

      // Marcar historias como cargadas
      historiasListas = true;

      // Si las estadísticas ya se cargaron, actualizar las finalizadas
      if (estadisticasListas) {
        this.actualizarEstadisticasFinalizadas();
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

      // Marcar estadísticas como cargadas
      estadisticasListas = true;

      // Si las historias ya se cargaron, actualizar las finalizadas
      if (historiasListas) {
        this.actualizarEstadisticasFinalizadas();
      }
    },
    error: (error) => {
      console.error('Error al cargar estadísticas:', error);
    }
  });
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

      // Comprobar si está archivado (convertir a booleano para evitar errores de tipo)
      const estaArchivado = !!(historia.Archivado as any);

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
        // Ordenar por semestre descendente (más reciente primero, considerando formato año-periodo)
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
        // Ordenar por semestre ascendente (más antiguo primero, considerando formato año-periodo)
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

  // Método actualizado para obtener historias finalizadas no archivadas
  obtenerFinalizadasNoArchivadas(): number {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return 0;

    // Contar las historias que están finalizadas pero NO archivadas
    return this.historiasClinicas.filter(historia => {
      // Comprobar de manera segura si está archivado
      // Convertimos explícitamente a booleano para evitar cualquier problema con valores 'truthy' o 'falsy'
      const estaArchivado = Boolean(historia.Archivado);

      // Solo contar las que están finalizadas Y no archivadas
      return historia.Estado === 'Finalizado' && !estaArchivado;
    }).length;
  }

  // Método para actualizar las estadísticas una vez cargadas las historias
  actualizarEstadisticasFinalizadas(): void {
    if (this.estadisticas) {
      // Actualizar el contador total para mostrar solo las no archivadas
      this.estadisticas.total = this.obtenerHistoriasNoArchivadas();

      // Actualizar el estado "Finalizado" en las estadísticas
      if (this.estadisticas.porEstado) {
        const estadoFinalizado = this.estadisticas.porEstado.find(e => e.estado === 'Finalizado');
        if (estadoFinalizado) {
          // Actualizar el contador para mostrar solo las no archivadas
          estadoFinalizado.cantidad = this.obtenerFinalizadasNoArchivadas();
        }
      }
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

  // Método para obtener el número de historias no archivadas
  obtenerHistoriasNoArchivadas(): number {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return 0;

    // Contar las historias que NO están archivadas
    return this.historiasClinicas.filter(historia => {
      // Comprobar de manera segura si NO está archivado
      const estaArchivado = Boolean(historia.Archivado);
      return !estaArchivado;
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