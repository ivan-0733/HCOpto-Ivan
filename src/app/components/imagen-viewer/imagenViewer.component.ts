import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
selector: 'app-imagen-viewer',
template: `
<div class="imagen-container">
    <div *ngIf="loading" class="loading-spinner">
    <div class="spinner"></div>
    <p>Cargando imagen...</p>
    </div>
    
    <img *ngIf="!loading && imageUrl" [src]="imageUrl" 
        alt="Imagen clínica" class="img-responsive"
        (error)="handleError($event)">
    
    <div *ngIf="error" class="error-message">
    <i class="fas fa-exclamation-circle"></i>
    <p>{{ errorMessage }}</p>
    </div>
</div>
`,
styles: [`
.imagen-container {
    position: relative;
    min-height: 150px;
    display: flex;
    justify-content: center;
    align-items: center;
}
.loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #3498db;
    animation: spin 1s linear infinite;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
.img-responsive {
    max-width: 100%;
    height: auto;
    max-height: 400px;
}
.error-message {
    color: #e74c3c;
    text-align: center;
    margin-top: 10px;
}
`],
standalone: true,
imports: [CommonModule]
})
export class ImagenViewerComponent implements OnChanges {
@Input() imagenId: number | null = null;

imageUrl: SafeUrl | null = null;
loading: boolean = false;
error: boolean = false;
errorMessage: string = 'No se pudo cargar la imagen.';

constructor(
private historiaService: HistoriaClinicaService,
private sanitizer: DomSanitizer
) {}

ngOnChanges(changes: SimpleChanges): void {
if (changes['imagenId'] && this.imagenId) {
    this.loadImage();
}
}

loadImage(): void {
if (!this.imagenId) return;

this.loading = true;
this.error = false;

// Aquí simplemente construimos la URL de la imagen directamente
// en lugar de hacer una petición HTTP para obtener el blob
const imageUrl = `${this.historiaService.baseUrl}/uploads/imagenes/${this.imagenId}`;
this.imageUrl = this.sanitizer.bypassSecurityTrustUrl(imageUrl);
this.loading = false;
}

handleError(event: any): void {
console.error('Error al mostrar imagen:', event);
this.error = true;
this.errorMessage = 'Error al visualizar la imagen.';
}
}