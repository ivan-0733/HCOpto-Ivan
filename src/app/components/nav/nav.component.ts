import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlumnoService } from '../../services/alumno.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule  // Necesario para usar routerLink y routerLinkActive
  ]
})
export class NavComponent implements OnInit {
  isCollapsed = true;
  userSemestre: string = '';

  constructor(
    public authService: AuthService,
    private alumnoService: AlumnoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (this.authService.hasRole('alumno')) {
      this.cargarDatosAlumno();
    }
  }

  cargarDatosAlumno(): void {
    this.alumnoService.obtenerPerfil().subscribe({
      next: (perfil) => {
        if (perfil && perfil.SemestreActual) {
          this.userSemestre = `${perfil.SemestreActual}°`;
        }
      },
      error: (error) => {
        console.error('Error al cargar datos del alumno:', error);
      }
    });
  }

  toggleMenu(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  closeMenu(): void {
    this.isCollapsed = true;
  }

  logout(): void {
    this.authService.logout();
  }

  get isAdmin(): boolean {
    return this.authService.hasRole('admin');
  }

  get isProfesor(): boolean {
    return this.authService.hasRole('profesor');
  }

  get isAlumno(): boolean {
    return this.authService.hasRole('alumno');
  }

  get userName(): string {
    const user = this.authService.currentUserValue;
    return user ? user.nombreUsuario : '';
  }
}