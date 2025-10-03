import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfesorService, ComentarioConRespuestas } from '../../services/profesor.service';
import { ComentarioBoxComponent } from '../shared/comentario-box/comentario-box.component'; // ✅ Ajustar esta ruta

@Component({
  selector: 'app-profesor-comentarios',
  templateUrl: './profesor-comentarios.component.html',
  styleUrls: ['./profesor-comentarios.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ComentarioBoxComponent]
})
export class ProfesorComentariosComponent implements OnInit {
  historiaId: number = 0;
  comentarios: ComentarioConRespuestas[] = [];
  loading = true;
  error = '';

  // Para manejar respuestas
  respuestaTexto: { [key: number]: string } = {};
  enviandoRespuesta: { [key: number]: boolean } = {};
  mostrarFormRespuesta: { [key: number]: boolean } = {};

  // Para cambio de estado
  estadoSeleccionado: string = '';
  estadosDisponibles = [
    { valor: 'Revisión', descripcion: 'En proceso de revisión por el profesor' },
    { valor: 'Corrección', descripcion: 'Requiere correcciones del alumno' },
    { valor: 'Finalizado', descripcion: 'Aprobado y completo' },
    { valor: 'Archivado', descripcion: 'Finalizado y archivado' }
  ];
  estadoActual: string = '';
  cambiandoEstado = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private profesorService: ProfesorService
  ) {}

  ngOnInit(): void {
    this.historiaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    // Cargar comentarios
    this.profesorService.obtenerComentariosConRespuestas(this.historiaId).subscribe({
      next: (response) => {
        this.comentarios = response.data.comentarios;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error al cargar los comentarios.';
        console.error('Error:', error);
      }
    });

    // Cargar estado actual
    this.profesorService.obtenerEstadoHistoria(this.historiaId).subscribe({
      next: (response) => {
        this.estadoActual = response.data.estado;
        this.estadoSeleccionado = this.estadoActual;

        // Si es "Nuevo", cambiar automáticamente a "Revisión"
        if (this.estadoActual === 'Nuevo') {
          this.cambiarEstadoAutomatico('Revisión');
        }
      },
      error: (error) => {
        console.error('Error al cargar estado:', error);
      }
    });
  }

  cambiarEstadoAutomatico(nuevoEstado: string): void {
    this.profesorService.cambiarEstadoHistoria(this.historiaId, nuevoEstado).subscribe({
      next: () => {
        this.estadoActual = nuevoEstado;
        this.estadoSeleccionado = nuevoEstado;
      },
      error: (error) => {
        console.error('Error al cambiar estado automático:', error);
      }
    });
  }

  cambiarEstado(): void {
    if (this.estadoSeleccionado === this.estadoActual) {
      alert('No hay cambios en el estado');
      return;
    }

    if (!confirm(`¿Confirmar cambio de estado a "${this.estadoSeleccionado}"?`)) {
      return;
    }

    this.cambiandoEstado = true;

    this.profesorService.cambiarEstadoHistoria(this.historiaId, this.estadoSeleccionado).subscribe({
      next: () => {
        this.estadoActual = this.estadoSeleccionado;
        this.cambiandoEstado = false;
        alert('Estado actualizado correctamente');

        // Si se archivó, redirigir al dashboard
        if (this.estadoSeleccionado === 'Archivado') {
          this.router.navigate(['/profesor/dashboard']);
        }
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
        alert('Error al cambiar el estado');
        this.cambiandoEstado = false;
        this.estadoSeleccionado = this.estadoActual;
      }
    });
  }

  toggleFormRespuesta(comentarioId: number): void {
    this.mostrarFormRespuesta[comentarioId] = !this.mostrarFormRespuesta[comentarioId];
  }

  agregarRespuesta(comentarioId: number): void {
    const texto = this.respuestaTexto[comentarioId]?.trim();
    if (!texto) {
      alert('Por favor escribe una respuesta');
      return;
    }

    this.enviandoRespuesta[comentarioId] = true;

    this.profesorService.agregarRespuesta(comentarioId, texto).subscribe({
      next: () => {
        this.respuestaTexto[comentarioId] = '';
        this.mostrarFormRespuesta[comentarioId] = false;
        this.enviandoRespuesta[comentarioId] = false;
        this.cargarDatos(); // Recargar para mostrar la nueva respuesta
      },
      error: (error) => {
        console.error('Error al agregar respuesta:', error);
        alert('Error al agregar la respuesta');
        this.enviandoRespuesta[comentarioId] = false;
      }
    });
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  obtenerNombreSeccion(seccionId: number | null): string {
    if (!seccionId) return 'General';

    const secciones: {[key: number]: string} = {
      1: 'Ficha de Identificación',
      2: 'Agudeza Visual',
      3: 'Lensometría',
      // ... agregar todas las secciones según tu BD
      30: 'General'
    };

    return secciones[seccionId] || 'Desconocida';
  }

  volver(): void {
    this.router.navigate(['/profesor/dashboard']);
  }

  onComentarioAgregado(): void {
    this.cargarDatos();
  }
}