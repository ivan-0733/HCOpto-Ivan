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
          // Log para diagnosticar los valores de edad
          console.log('Edades:', historias.map(h => ({ id: h.ID, edad: h.Edad, tipo: typeof h.Edad })));

          // Asegurarse de que todos los objetos de historia tienen
          // las propiedades esperadas, incluso si son undefined
          this.historiasClinicas = historias.map(historia => ({
            ...historia,
            CorreoElectronico: historia.CorreoElectronico || undefined,
            TelefonoCelular: historia.TelefonoCelular || undefined,
            Edad: historia.Edad ? Number(historia.Edad) : undefined
          }));
          console.log('Historias cargadas:', this.historiasClinicas);
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

  filtrarHistorias(): HistoriaClinica[] {
    if (!this.historiasClinicas || this.historiasClinicas.length === 0) return [];

    const termino = this.filtroPaciente.trim().toLowerCase();

    return this.historiasClinicas.filter(historia => {
      // Filtrar por estado
      const cumpleEstado = this.filtroEstado === 'todos' || historia.Estado === this.filtroEstado;
      if (!cumpleEstado) return false;

      // Filtrar por paciente
      if (termino !== '') {
        const nombreCompleto = `${historia.Nombre} ${historia.ApellidoPaterno} ${historia.ApellidoMaterno || ''}`.toLowerCase();
        const cumplePaciente = nombreCompleto.includes(termino);
        if (!cumplePaciente) return false;
      }

      return true;
    });
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
      default:
        return '';
    }
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}