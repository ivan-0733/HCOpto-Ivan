import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService, ComentarioHistoria } from '../../services/admin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-comentarios',
  templateUrl: './admin-comentarios.component.html',
  styleUrls: ['./admin-comentarios.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class AdminComentariosComponent implements OnInit {
  historiaId: number = 0;
  comentarios: ComentarioHistoria[] = [];
  nuevoComentario: string = '';
  loading = true;
  error = '';
  enviandoComentario = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.historiaId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarComentarios();
  }

  cargarComentarios(): void {
    this.loading = true;
    this.error = '';

    this.adminService.obtenerComentarios(this.historiaId).subscribe({
      next: (response) => {
        this.comentarios = response.data.comentarios;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error al cargar los comentarios. Por favor, intenta nuevamente.';
        console.error('Error al cargar comentarios:', error);
      }
    });
  }

  agregarComentario(): void {
    if (!this.nuevoComentario.trim()) {
      alert('Por favor escribe un comentario');
      return;
    }

    this.enviandoComentario = true;

    this.adminService.agregarComentario(this.historiaId, this.nuevoComentario).subscribe({
      next: () => {
        this.nuevoComentario = '';
        this.cargarComentarios();
        this.enviandoComentario = false;
      },
      error: (error) => {
        console.error('Error al agregar comentario:', error);
        alert('Error al agregar el comentario');
        this.enviandoComentario = false;
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

  volver(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}