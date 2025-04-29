import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { HistoriaClinicaService, HistoriaClinicaDetalle } from '../../services/historia-clinica.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-historia-clinica-detalle',
  templateUrl: './historia-clinica-detalle.component.html',
  styleUrls: ['./historia-clinica-detalle.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ]
})
export class HistoriaClinicaDetalleComponent implements OnInit {
  historiaId: number | null = null;
  historia: HistoriaClinicaDetalle | null = null;
  currentTab = 'datos-generales';

  loading = true;
  error = '';

  constructor(
    private historiaClinicaService: HistoriaClinicaService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.historiaId = +params['id'];
        this.loadHistoriaClinica();
      }
    });
  }

  loadHistoriaClinica(): void {
    if (!this.historiaId) return;

    this.loading = true;
    this.error = '';

    this.historiaClinicaService.obtenerHistoriaClinica(this.historiaId)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (historia) => {
          this.historia = historia;
          console.log('Historia cargada correctamente:', historia);
        },
        error: (error) => {
          this.error = 'No se pudo cargar la historia clínica. ' + error.message;
          console.error('Error al cargar historia clínica:', error);
        }
      });
  }

  changeTab(tab: string): void {
    this.currentTab = tab;
  }

  getButtonClass(tab: string): string {
    return this.currentTab === tab ? 'active' : '';
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

  editarHistoria(): void {
    this.router.navigate(['/alumno/historias', this.historiaId, 'editar']);
  }

  volverAlDashboard(): void {
    this.router.navigate(['/alumno/dashboard']);
  }

  responderComentario(comentarioId: number, respuesta: string): void {
    if (!this.historiaId) return;

    this.historiaClinicaService.responderComentario(this.historiaId, comentarioId, respuesta).subscribe({
      next: () => {
        // Recargar historia para mostrar la respuesta
        this.loadHistoriaClinica();
      },
      error: (error) => {
        this.error = 'Error al responder el comentario. Por favor, intenta nuevamente.';
        console.error('Error respondiendo comentario:', error);
      }
    });
  }

  cambiarEstado(nuevoEstadoId: number): void {
    if (!this.historiaId) return;

    this.historiaClinicaService.cambiarEstado(this.historiaId, nuevoEstadoId).subscribe({
      next: () => {
        // Recargar historia para mostrar el nuevo estado
        this.loadHistoriaClinica();
      },
      error: (error) => {
        this.error = 'Error al cambiar el estado de la historia clínica. Por favor, intenta nuevamente.';
        console.error('Error cambiando estado:', error);
      }
    });
  }

  imprimirHistoria(): void {
    window.print();
  }

  get nombreCompletoAlumno(): string {
    if (!this.historia) return '';
    const { AlumnoNombre, AlumnoApellidoPaterno, AlumnoApellidoMaterno } = this.historia;
    return `${AlumnoNombre} ${AlumnoApellidoPaterno} ${AlumnoApellidoMaterno ?? ''}`.trim();
  }

  get nombreCompletoProfesor(): string {
    if (!this.historia) return '';
    const { ProfesorNombre, ProfesorApellidoPaterno, ProfesorApellidoMaterno } = this.historia;
    return `${ProfesorNombre} ${ProfesorApellidoPaterno} ${ProfesorApellidoMaterno ?? ''}`.trim();
  }
}