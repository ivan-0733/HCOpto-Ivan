import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfesorService } from '../../../services/profesor.service';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { HistoriaClinicaService } from '../../../services/historia-clinica.service';

@Component({
  selector: 'app-comentario-box',
  templateUrl: './comentario-box.component.html',
  styleUrls: ['./comentario-box.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ComentarioBoxComponent implements OnInit {
  @Input() historiaId!: number;
  @Input() seccionId?: number;
  @Output() comentarioAgregado = new EventEmitter<void>();

  nuevoComentario: string = '';
  enviandoComentario = false;
  mensajeExito = false;

  constructor(
    private profesorService: ProfesorService,
    private adminService: AdminService,
    private authService: AuthService,
    private historiaClinicaService: HistoriaClinicaService
  ) {}

  ngOnInit(): void {
    if (!this.historiaId) {
      console.error('historiaId es requerido para ComentarioBoxComponent');
    }
  }

  agregarComentario(): void {
    if (!this.nuevoComentario.trim()) return;

    this.enviandoComentario = true;
    this.mensajeExito = false;

    // Detectar rol del usuario
    const userRole = this.authService.getUserRole()?.toLowerCase();
    const esProfesor = userRole === 'profesor';
    const esAdmin = userRole === 'admin';
    const esAlumno = userRole === 'alumno';

    console.log('Agregando comentario - Rol:', userRole);

    let observableComentario;

    if (esProfesor) {
      // Profesor usa su servicio
      observableComentario = this.profesorService.agregarComentario(
        this.historiaId,
        this.nuevoComentario.trim(),
        this.seccionId
      );
    } else if (esAdmin) {
      // Admin usa su servicio (admin no maneja secciones en comentarios)
      observableComentario = this.adminService.agregarComentario(
        this.historiaId,
        this.nuevoComentario.trim()
      );
    } else if (esAlumno) {
      // Alumno usa el servicio de historia clínica
      const comentarioData = {
        historiaId: this.historiaId,
        seccionId: this.seccionId || null,
        comentario: this.nuevoComentario.trim()
      };
      observableComentario = this.historiaClinicaService.agregarComentario(
        this.historiaId,
        comentarioData
      );
    } else {
      console.error('Rol no reconocido:', userRole);
      this.enviandoComentario = false;
      return;
    }

    observableComentario.subscribe({
      next: (response) => {
        console.log('Comentario agregado exitosamente:', response);
        this.nuevoComentario = '';
        this.enviandoComentario = false;
        this.mensajeExito = true;

        // Emitir evento
        this.comentarioAgregado.emit();

        setTimeout(() => {
          this.mensajeExito = false;
        }, 3000);
      },
      error: (error) => {
        console.error('Error al agregar comentario:', error);
        alert('Error al agregar el comentario. Por favor, intenta nuevamente.');
        this.enviandoComentario = false;
      }
    });
  }
}