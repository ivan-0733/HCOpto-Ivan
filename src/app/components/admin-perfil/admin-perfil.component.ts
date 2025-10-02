import { Component, OnInit } from '@angular/core';
import { AdminService, AdminPerfil, EstadisticasAdmin } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-perfil',
  templateUrl: './admin-perfil.component.html',
  styleUrls: ['../../components/profesor-perfil/profesor-perfil.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class AdminPerfilComponent implements OnInit {
  perfil: AdminPerfil | null = null;
  estadisticas: EstadisticasAdmin | null = null;
  loading = true;
  error = '';

  constructor(
    private adminService: AdminService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    this.loading = true;
    this.error = '';

    this.adminService.obtenerPerfil().subscribe({
      next: (response) => {
        this.perfil = response.data.perfil;
        this.estadisticas = response.data.estadisticas;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error al cargar el perfil. Por favor, intenta nuevamente.';
        console.error('Error al cargar perfil:', error);
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

  obtenerEstadosConValores(): { estado: string; cantidad: number }[] {
    if (!this.estadisticas || !this.estadisticas.porEstado) return [];

    const ordenEstados = ['Nuevo', 'Corregido', 'En proceso', 'Revisión', 'Corrección', 'Finalizado'];

    return this.estadisticas.porEstado
      .filter(estado => estado.cantidad > 0)
      .sort((a, b) => {
        const indexA = ordenEstados.indexOf(a.estado);
        const indexB = ordenEstados.indexOf(b.estado);

        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
      });
  }

  cerrarSesion(): void {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      this.authService.logout();
    }
  }
}