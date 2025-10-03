import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfesorService } from '../../../services/profesor.service';

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
  @Output() comentarioAgregado = new EventEmitter<void>(); // AGREGAR ESTO

  nuevoComentario: string = '';
  enviandoComentario = false;
  mensajeExito = false;

  constructor(private profesorService: ProfesorService) {}

  ngOnInit(): void {
    if (!this.historiaId) {
      console.error('historiaId es requerido para ComentarioBoxComponent');
    }
  }

  agregarComentario(): void {
    if (!this.nuevoComentario.trim()) {
      return;
    }

    this.enviandoComentario = true;
    this.mensajeExito = false;

    this.profesorService.agregarComentario(
      this.historiaId,
      this.nuevoComentario,
      this.seccionId
    ).subscribe({
      next: () => {
        this.nuevoComentario = '';
        this.enviandoComentario = false;
        this.mensajeExito = true;

        // Emitir evento
        this.comentarioAgregado.emit(); // AGREGAR ESTO

        setTimeout(() => {
          this.mensajeExito = false;
        }, 3000);
      },
      error: (error) => {
        console.error('Error al agregar comentario:', error);
        alert('Error al agregar el comentario');
        this.enviandoComentario = false;
      }
    });
  }
}