import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, map } from 'rxjs/operators';
import { HistoriaClinicaService, HistoriaClinicaDetalle } from '../../services/historia-clinica.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ComentarioBoxComponent } from '../shared/comentario-box/comentario-box.component'; // ✅ Ajustar esta ruta
import { AuthService } from '../../services/auth.service';
import { ProfesorService } from '../../services/profesor.service';
import { AdminService } from '../../services/admin.service';

@Component({
selector: 'app-historia-clinica-detalle',
templateUrl: './historia-clinica-detalle.component.html',
styleUrls: ['./historia-clinica-detalle.component.scss'],
standalone: true,
imports: [
  CommonModule,
  RouterModule,
  FormsModule,
  ComentarioBoxComponent
]
})
export class HistoriaClinicaDetalleComponent implements OnInit {
historiaId: number | null = null;
historia: HistoriaClinicaDetalle | null = null;
currentTab = 'datos-generales';
imprimiendo = false;

loading = true;
error = '';
nuevoComentarioTexto: string = '';

mensajeExito: string = '';

esProfesor = false;
esAdmin = false;
esAlumno = false;

constructor(
  private historiaClinicaService: HistoriaClinicaService,
  private route: ActivatedRoute,
  private router: Router,
  private authService: AuthService,
  private profesorService: ProfesorService,
  private adminService: AdminService
) { }

ngOnInit(): void {
  // Obtenemos el rol y lo preparamos para la comparación
  const userRole = this.authService.getUserRole() || ''; // Usamos || '' para evitar errores si es nulo
  console.log('🔍 ROL DETECTADO:', userRole);

  this.esProfesor = userRole.toLowerCase() === 'profesor';
  this.esAdmin = userRole.toLowerCase() === 'admin';
  this.esAlumno = userRole.toLowerCase() === 'alumno';

  console.log('✅ esProfesor:', this.esProfesor);
  console.log('✅ esAlumno:', this.esAlumno);
  console.log('✅ esAdmin:', this.esAdmin);

  this.route.params.subscribe(params => {
    if (params['id']) {
      this.historiaId = +params['id'];
      this.loadHistoriaClinica();
    }
  });

  this.route.queryParams.subscribe(queryParams => {
    if (queryParams['tab']) {
      this.currentTab = queryParams['tab'];
      console.log('📂 Abriendo pestaña:', this.currentTab);
    }
  });
}

loadHistoriaClinica(): void {
  if (!this.historiaId) return;

  this.loading = true;
  this.error = '';

  // NUEVA LÓGICA: Usar el servicio correcto según el rol
  let observableHistoria;

  if (this.esAdmin) {
    // Para admin, usar el servicio de admin
    observableHistoria = this.adminService.obtenerHistoriaDetalle(this.historiaId)
      .pipe(
        map(response => response.data?.historia || response.data || response)
      );
  } else {
    // Para profesor y alumno, usar el servicio de historia clínica
    observableHistoria = this.historiaClinicaService.obtenerHistoriaClinica(this.historiaId);
  }

  observableHistoria
    .pipe(
      finalize(() => {
        this.loading = false;
      })
    )
    .subscribe({
      next: (historia) => {
        this.historia = historia;
        console.log('Historia cargada correctamente:', historia);

        // Verificar que historia no sea null antes de acceder a sus propiedades
        if (this.historia) {
          // Inicializar propiedades para validación de comentarios
          if (this.historia.comentarios) {
            this.historia.comentarios.forEach(comentario => {
              comentario.nuevaRespuesta = '';
              comentario.respuestaValida = false;
            });
          }

          // Cargar imágenes de método gráfico si están disponibles por ID
          if (this.historia.metodoGrafico?.imagenID) {
            this.cargarImagenMetodoGrafico(this.historia.metodoGrafico.imagenID);
          }

          // Cargar imágenes de detección de alteraciones
          this.cargarImagenesDeteccionAlteraciones();
        }
      },
      error: (error) => {
        this.error = 'No se pudo cargar la historia clínica. No tienes permiso para acceder a este recurso';
        console.error('Error al cargar historia clínica:', error);
      }
    });
}

cargarImagenMetodoGrafico(imagenID: number): void {
  if (!imagenID) return;

  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (typeof base64 === 'string' && base64.length > 0) {
          // Asegurar que la cadena tenga el formato correcto
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }

          // Actualizar la imagen en el objeto
          if (this.historia && this.historia.metodoGrafico) {
            this.historia.metodoGrafico.imagenBase64 = base64;
            console.log('Imagen de método gráfico cargada correctamente');
          }
        } else {
          console.error('La respuesta no contiene datos válidos de imagen');
        }
      },
      error: (error) => {
        console.error('Error al cargar la imagen del método gráfico:', error);
      }
    });
}

changeTab(tab: string): void {
  this.currentTab = tab;
}

// ✅ NUEVO MÉTODO - Agrégalo después de changeTab
verComentarios(): void {
  if (!this.historiaId) return;

  const baseRoute = this.esProfesor || this.esAdmin ? '/profesor' : '/alumno';
  this.router.navigate([baseRoute, 'comentarios', this.historiaId]);
}

getButtonClass(tab: string): string {
  return this.currentTab === tab ? 'active' : '';
}

obtenerClaseEstado(estado: string): string {
  switch (estado) {
    case 'Nuevo':
      return 'estado-nuevo';
    case 'Corregido':
      return 'estado-corregido';
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
  let baseRoute = '/alumno';
  if (this.esAdmin) {
    baseRoute = '/admin';
  } else if (this.esProfesor) {
    baseRoute = '/profesor';
  }
  this.router.navigate([baseRoute, 'historias', this.historiaId, 'editar']);
}

volverAlDashboard(): void {
  let baseRoute = '/alumno';
  if (this.esAdmin) {
    baseRoute = '/admin';
  } else if (this.esProfesor) {
    baseRoute = '/profesor';
  }
  this.router.navigate([baseRoute, 'dashboard']);
}

onComentarioAgregado(): void {
  // Opcionalmente recargar los datos si quieres mostrar los comentarios actualizados
  console.log('Comentario agregado exitosamente');
  // Si quieres recargar toda la historia:
  // this.loadHistoriaClinica();
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

/**
 * Valida si la respuesta tiene contenido válido
 */
validarRespuesta(comentario: any): void {
  const texto = comentario.nuevaRespuesta?.trim() || '';
  comentario.respuestaValida = texto.length > 0;
}

// Método auxiliar para formatear fechas (cambiar de private a public o moverlo arriba)
private formatearFechaParaImpresion(fecha: any): string {
  if (!fecha) return '-';

  try {
    const date = new Date(fecha);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
}

imprimirHistoria(): void {
  if (!this.historia) {
    console.error('No hay historia clínica para imprimir');
    return;
  }

  // Crear ventana de impresión
  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow) {
    console.error('No se pudo abrir la ventana de impresión');
    return;
  }

  // Construir el HTML completo para imprimir con TODAS las secciones
  const htmlParaImprimir = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Historia Clínica #${this.historiaId}</title>
      <style>
        /* Reset y estilos base */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 20px;
          color: #333;
          font-size: 10pt;
        }

        /* Header principal */
        .print-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #7A1E3E;
        }

        .print-header h1 {
          color: #7A1E3E;
          font-size: 20pt;
          margin-bottom: 10px;
        }

        .print-header p {
          margin: 5px 0;
          font-size: 10pt;
        }

        /* Secciones */
        .info-section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }

        .info-section h2 {
          color: #7A1E3E;
          font-size: 14pt;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e0e0e0;
        }

        .info-section h3 {
          color: #555;
          font-size: 11pt;
          margin: 15px 0 10px 0;
          font-weight: 600;
        }

        /* Grid de información - 3 columnas */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px 20px;
          margin-bottom: 20px;
        }

        .info-item {
          break-inside: avoid;
        }

        .info-item h3 {
          color: #666;
          font-size: 9pt;
          font-weight: 600;
          margin: 0 0 4px 0;
        }

        .info-item p {
          color: #333;
          font-size: 10pt;
          margin: 0;
          line-height: 1.4;
        }

        /* Grid completo (para textos largos) */
        .info-grid-full {
          display: grid;
          grid-template-columns: 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }

        /* Tablas */
        .table-responsive {
          margin: 15px 0;
          overflow: visible;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 9pt;
          page-break-inside: avoid;
        }

        table th,
        table td {
          padding: 8px;
          text-align: left;
          border: 1px solid #ddd;
        }

        table th {
          background-color: #f5f5f5;
          font-weight: 600;
          color: #555;
        }

        table tr:nth-child(even) {
          background-color: #fafafa;
        }

      /* Badges */
      .estado-badge, .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 8pt;
        color: white;
        font-weight: 500;
        /* ✅ LÍNEAS A AGREGAR */
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

        .estado-nuevo { background-color: #9C27B0; }       /* ✅ MORADO - Nuevo */
        .estado-revision { background-color: #FF9800; }    /* ✅ NARANJA - Revisión */
        .estado-correccion { background-color: #F44336; }  /* ✅ ROJO - Corrección */
        .estado-corregido { background-color: #4CAF50; }   /* ✅ VERDE - Corregido */
        .estado-finalizado { background-color: #2196F3; }  /* ✅ AZUL - Finalizado */
        .badge.archivado { background-color: #808080; }

        /* Listas */
        .reflejo-list, .caracteristicas-list {
          list-style: none;
          padding-left: 0;
          margin: 8px 0;
        }

        .reflejo-list li, .caracteristicas-list li {
          padding: 3px 0;
          position: relative;
          padding-left: 20px;
          font-size: 9pt;
        }

        .reflejo-list li:before, .caracteristicas-list li:before {
          content: "•";
          color: #7A1E3E;
          font-weight: bold;
          position: absolute;
          left: 0;
        }

        /* Imágenes */
        .metodo-grafico-imagen {
          margin: 15px 0;
          text-align: center;
          page-break-inside: avoid;
        }

        .metodo-grafico-imagen img {
          max-width: 80%;
          max-height: 400px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        /* Grid de 2 columnas para vergencias */
        .form-section-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 15px 0;
        }

        .grid-section {
          break-inside: avoid;
        }

        /* Saltos de página */
        .page-break {
          page-break-after: always;
        }

        /* Configuración de página */
        @page {
          size: A4;
          margin: 15mm;
        }

        @media print {
          body {
            padding: 0;
          }

          .info-section {
            page-break-inside: avoid;
          }

          table {
            page-break-inside: avoid;
          }
        }

        /* Ocultar elementos de comentarios */
        .add-comment-section,
        .comment-section,
        .comments-list,
        .reply-form,
        app-comentario-box,
        .badge-seccion,
        .no-comments {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <!-- Header Principal -->
      <div class="print-header">
        <h1>Historia Clínica #${this.historiaId}</h1>
        <p><strong>Paciente:</strong> ${this.historia.Nombre} ${this.historia.ApellidoPaterno} ${this.historia.ApellidoMaterno}</p>
        <p><strong>Fecha:</strong> ${this.formatearFechaParaImpresion(this.historia.Fecha)}</p>
        <p><strong>Estado:</strong> <span class="estado-badge ${this.obtenerClaseEstado(this.historia.Estado)}">${this.historia.Estado}</span></p>
      </div>

      ${this.generarSeccionDatosGenerales()}
      ${this.generarSeccionInterrogatorio()}
      ${this.generarSeccionAntecedenteVisual()}
      ${this.generarSeccionExamenPreliminar()}
      ${this.generarSeccionEstadoRefractivo()}
      ${this.generarSeccionBinocularidad()}
      ${this.generarSeccionDeteccionAlteraciones()}
      ${this.generarSeccionDiagnostico()}
      ${this.generarSeccionReceta()}
    </body>
    </html>
  `;

  printWindow.document.write(htmlParaImprimir);
  printWindow.document.close();

  // Esperar a que se cargue todo antes de imprimir
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
}

// ============ MÉTODOS AUXILIARES PARA GENERAR CADA SECCIÓN ============

private generarSeccionDatosGenerales(): string {
  if (!this.historia) return '';

  return `
    <div class="info-section">
      <h2>Información General</h2>
      <div class="info-grid">
        <div class="info-item">
          <h3>Fecha de Consulta</h3>
          <p>${this.formatearFechaParaImpresion(this.historia.Fecha)}</p>
        </div>
        <div class="info-item">
          <h3>Consultorio</h3>
          <p>${this.historia.Consultorio}</p>
        </div>
        <div class="info-item">
          <h3>Semestre</h3>
          <p>${this.historia.PeriodoEscolar}</p>
        </div>
        <div class="info-item">
          <h3>Estado de la H.C.</h3>
          <p>
            <span class="estado-badge ${this.obtenerClaseEstado(this.historia.Estado)}">
              ${this.historia.Estado}
            </span>
            ${this.historia.Archivado ? '<span class="badge archivado">Archivado</span>' : ''}
          </p>
        </div>
        <div class="info-item">
          <h3>Profesor</h3>
          <p>${this.nombreCompletoProfesor}</p>
        </div>
        <div class="info-item">
          <h3>Alumno</h3>
          <p>${this.nombreCompletoAlumno}</p>
        </div>
        <div class="info-item">
          <h3>Número de Boleta</h3>
          <p>${this.historia.AlumnoBoleta}</p>
        </div>
        <div class="info-item">
          <h3>Materia</h3>
          <p>${this.historia.NombreMateria || 'No disponible'}</p>
        </div>
        <div class="info-item">
          <h3>Sección</h3>
          <p>${this.historia.GrupoMateria || 'No disponible'}</p>
        </div>
      </div>
    </div>

    <div class="info-section">
      <h2>Información del Paciente</h2>
      <div class="info-grid">
        <div class="info-item">
          <h3>Nombre Completo</h3>
          <p>${this.historia.Nombre} ${this.historia.ApellidoPaterno} ${this.historia.ApellidoMaterno}</p>
        </div>
        <div class="info-item">
          <h3>CURP</h3>
          <p>${this.historia.CURP || 'No proporcionado'}</p>
        </div>
        <div class="info-item">
          <h3>ID SiSeCO</h3>
          <p>${this.historia.IDSiSeCO || 'No proporcionado'}</p>
        </div>
        <div class="info-item">
          <h3>Edad</h3>
          <p>${this.historia.Edad} años</p>
        </div>
        <div class="info-item">
          <h3>Género</h3>
          <p>${this.historia.GeneroID ? 'Masculino' : 'Femenino'}</p>
        </div>
        <div class="info-item">
          <h3>Correo Electrónico</h3>
          <p>${this.historia.CorreoElectronico || 'No proporcionado'}</p>
        </div>
        <div class="info-item">
          <h3>Teléfono Celular</h3>
          <p>${this.historia.TelefonoCelular || 'No proporcionado'}</p>
        </div>
        <div class="info-item">
          <h3>Teléfono Fijo</h3>
          <p>${this.historia.Telefono || 'No proporcionado'}</p>
        </div>
        <div class="info-item">
          <h3>Ocupación</h3>
          <p>${this.historia.Ocupacion || 'No proporcionado'}</p>
        </div>
        <div class="info-item">
          <h3>Dirección</h3>
          <p>${this.historia.DireccionLinea1 || 'No proporcionado'}</p>
        </div>
        <div class="info-item">
          <h3>Ciudad</h3>
          <p>${this.historia.Ciudad || 'No proporcionado'}</p>
        </div>
        <div class="info-item">
          <h3>Código Postal</h3>
          <p>${this.historia.CodigoPostal || 'No proporcionado'}</p>
        </div>
        <div class="info-item">
          <h3>Estado</h3>
          <p>${this.historia.PacienteEstadoID}</p>
        </div>
        <div class="info-item">
          <h3>País</h3>
          <p>${this.historia.Pais || 'México'}</p>
        </div>
      </div>
    </div>
    <div class="page-break"></div>
  `;
}

private generarSeccionInterrogatorio(): string {
  if (!this.historia?.interrogatorio) return '';

  return `
    <div class="info-section">
      <h2>Interrogatorio</h2>
      <div class="info-grid-full">
        <div class="info-item">
          <h3>Motivo de Consulta</h3>
          <p>${this.historia.interrogatorio.MotivoConsulta || '-'}</p>
        </div>
        <div class="info-item">
          <h3>Heredo Familiares</h3>
          <p>${this.historia.interrogatorio.HeredoFamiliares || '-'}</p>
        </div>
        <div class="info-item">
          <h3>No Patológicos</h3>
          <p>${this.historia.interrogatorio.NoPatologicos || '-'}</p>
        </div>
        <div class="info-item">
          <h3>Patológicos</h3>
          <p>${this.historia.interrogatorio.Patologicos || '-'}</p>
        </div>
        <div class="info-item">
          <h3>Visuales/Oculares</h3>
          <p>${this.historia.interrogatorio.VisualesOculares || '-'}</p>
        </div>
        <div class="info-item">
          <h3>Padecimiento Actual</h3>
          <p>${this.historia.interrogatorio.PadecimientoActual || '-'}</p>
        </div>
        <div class="info-item">
          <h3>Prediagnóstico</h3>
          <p>${this.historia.interrogatorio.Prediagnostico || '-'}</p>
        </div>
      </div>
    </div>
    <div class="page-break"></div>
  `;
}

private generarSeccionAntecedenteVisual(): string {
  if (!this.historia) return '';

  let html = '';

  // Agudeza Visual
  if (this.historia.agudezaVisual && this.historia.agudezaVisual.length > 0) {
    html += '<div class="info-section"><h2>Agudeza Visual</h2>';

    this.historia.agudezaVisual.forEach(agudeza => {
      html += `
        <h3>${this.obtenerNombreTipoMedicion(agudeza.TipoMedicion)}</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>OD</th>
                <th>OI</th>
                <th>AO</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (this.esMedicionLejos(agudeza.TipoMedicion)) {
        html += `
          <tr>
            <td><strong>Snellen</strong></td>
            <td>${agudeza.OjoDerechoSnellen || '-'}</td>
            <td>${agudeza.OjoIzquierdoSnellen || '-'}</td>
            <td>${agudeza.AmbosOjosSnellen || '-'}</td>
          </tr>
          <tr>
            <td><strong>Metros</strong></td>
            <td>${agudeza.OjoDerechoMetros || '-'}</td>
            <td>${agudeza.OjoIzquierdoMetros || '-'}</td>
            <td>${agudeza.AmbosOjosMetros || '-'}</td>
          </tr>
          <tr>
            <td><strong>MAR</strong></td>
            <td>${agudeza.OjoDerechoMAR || '-'}</td>
            <td>${agudeza.OjoIzquierdoMAR || '-'}</td>
            <td>${agudeza.AmbosOjosMAR || '-'}</td>
          </tr>
        `;
      } else if (this.esMedicionCerca(agudeza.TipoMedicion)) {
        html += `
          <tr>
            <td><strong>M</strong></td>
            <td>${agudeza.OjoDerechoM || '-'}</td>
            <td>${agudeza.OjoIzquierdoM || '-'}</td>
            <td>${agudeza.AmbosOjosM || '-'}</td>
          </tr>
          <tr>
            <td><strong>Jeager</strong></td>
            <td>${agudeza.OjoDerechoJeager || '-'}</td>
            <td>${agudeza.OjoIzquierdoJeager || '-'}</td>
            <td>${agudeza.AmbosOjosJeager || '-'}</td>
          </tr>
          <tr>
            <td><strong>Puntos</strong></td>
            <td>${agudeza.OjoDerechoPuntos || '-'}</td>
            <td>${agudeza.OjoIzquierdoPuntos || '-'}</td>
            <td>${agudeza.AmbosOjosPuntos || '-'}</td>
          </tr>
        `;
      } else if (agudeza.TipoMedicion === 'CAP_VISUAL') {
        html += `
          <tr>
            <td><strong>Capacidad Visual</strong></td>
            <td>${agudeza.CapacidadVisualOD || '-'}</td>
            <td>${agudeza.CapacidadVisualOI || '-'}</td>
            <td>${agudeza.CapacidadVisualAO || '-'}</td>
          </tr>
        `;
      }

      html += '</tbody></table></div>';
    });

    html += '</div>';
  }

  // Lensometría
  if (this.historia.lensometria) {
    html += `
      <div class="info-section">
        <h2>Lensometría</h2>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Esfera</th>
                <th>Cilindro</th>
                <th>Eje</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>OD</strong></td>
                <td>${this.historia.lensometria.OjoDerechoEsfera || '-'}</td>
                <td>${this.historia.lensometria.OjoDerechoCilindro || '-'}</td>
                <td>${this.historia.lensometria.OjoDerechoEje || '-'}</td>
              </tr>
              <tr>
                <td><strong>OI</strong></td>
                <td>${this.historia.lensometria.OjoIzquierdoEsfera || '-'}</td>
                <td>${this.historia.lensometria.OjoIzquierdoCilindro || '-'}</td>
                <td>${this.historia.lensometria.OjoIzquierdoEje || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <h3>Tipo de Lente</h3>
            <p>${this.obtenerTipoLente(this.historia.lensometria.TipoBifocalMultifocalID)}</p>
          </div>
          <div class="info-item">
            <h3>ADD</h3>
            <p>${this.historia.lensometria.ValorADD || 'No aplicable'}</p>
          </div>
          <div class="info-item">
            <h3>Distancia/Rango</h3>
            <p>${this.historia.lensometria.DistanciaRango || 'No registrado'}</p>
          </div>
        </div>
      </div>
    `;
  }

  if (html) html += '<div class="page-break"></div>';
  return html;
}

private generarSeccionExamenPreliminar(): string {
  if (!this.historia) return '';

  let html = '';

  // Alineación Ocular
  if (this.historia.alineacionOcular) {
    html += `
      <div class="info-section">
        <h2>Alineación Ocular</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>Lejos Horizontal</h3>
            <p>${this.historia.alineacionOcular.LejosHorizontal || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Lejos Vertical</h3>
            <p>${this.historia.alineacionOcular.LejosVertical || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Cerca Horizontal</h3>
            <p>${this.historia.alineacionOcular.CercaHorizontal || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Cerca Vertical</h3>
            <p>${this.historia.alineacionOcular.CercaVertical || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Método</h3>
            <p>${this.obtenerNombreMetodo(this.historia.alineacionOcular.MetodoID)}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Motilidad
  if (this.historia.motilidad) {
    html += `
      <div class="info-section">
        <h2>Motilidad</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>Versiones</h3>
            <p>${this.historia.motilidad.Versiones || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Ducciones</h3>
            <p>${this.historia.motilidad.Ducciones || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Sacádicos</h3>
            <p>${this.historia.motilidad.Sacadicos || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Persecución</h3>
            <p>${this.historia.motilidad.Persecucion || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Fijación</h3>
            <p>${this.historia.motilidad.Fijacion || '-'}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Exploración Física
  if (this.historia.exploracionFisica) {
    html += `
      <div class="info-section">
        <h2>Exploración Física</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>OD Anexos</h3>
            <p>${this.historia.exploracionFisica.OjoDerechoAnexos || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OI Anexos</h3>
            <p>${this.historia.exploracionFisica.OjoIzquierdoAnexos || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OD Segmento Anterior</h3>
            <p>${this.historia.exploracionFisica.OjoDerechoSegmentoAnterior || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OI Segmento Anterior</h3>
            <p>${this.historia.exploracionFisica.OjoIzquierdoSegmentoAnterior || '-'}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Vía Pupilar
  if (this.historia.viaPupilar) {
    const reflejosOD = this.generarReflejosOD();
    const reflejosOI = this.generarReflejosOI();
    const caracteristicas = this.generarCaracteristicasPupilares();

    html += `
      <div class="info-section">
        <h2>Vía Pupilar</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>Diámetro OD</h3>
            <p>${this.historia.viaPupilar.OjoDerechoDiametro ? (this.historia.viaPupilar.OjoDerechoDiametro + ' mm') : '-'}</p>
          </div>
          <div class="info-item">
            <h3>Diámetro OI</h3>
            <p>${this.historia.viaPupilar.OjoIzquierdoDiametro ? (this.historia.viaPupilar.OjoIzquierdoDiametro + ' mm') : '-'}</p>
          </div>
          <div class="info-item">
            <h3>Reflejos OD</h3>
            ${reflejosOD}
          </div>
          <div class="info-item">
            <h3>Reflejos OI</h3>
            ${reflejosOI}
          </div>
          <div class="info-item">
            <h3>Características Pupilares</h3>
            ${caracteristicas}
          </div>
          <div class="info-item">
            <h3>DIP</h3>
            <p>${this.historia.viaPupilar.DIP || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Dominancia Ocular</h3>
            <p>${this.obtenerDominanciaOcular(this.historia.viaPupilar.DominanciaOcularID)}</p>
          </div>
        </div>
      </div>
    `;
  }

  if (html) html += '<div class="page-break"></div>';
  return html;
}

private generarReflejosOD(): string {
  if (!this.historia?.viaPupilar || !this.tieneReflejosOD(this.historia.viaPupilar)) {
    return '<p>No registrados</p>';
  }

  const reflejos = [];
  if (this.historia.viaPupilar.OjoDerechoFotomotorPresente) reflejos.push('Fotomotor Presente');
  if (this.historia.viaPupilar.OjoDerechoConsensualPresente) reflejos.push('Consensual Presente');
  if (this.historia.viaPupilar.OjoDerechoAcomodativoPresente) reflejos.push('Acomodativo Presente');
  if (this.historia.viaPupilar.OjoDerechoFotomotorAusente) reflejos.push('Fotomotor Ausente');
  if (this.historia.viaPupilar.OjoDerechoConsensualAusente) reflejos.push('Consensual Ausente');
  if (this.historia.viaPupilar.OjoDerechoAcomodativoAusente) reflejos.push('Acomodativo Ausente');

  return '<ul class="reflejo-list">' + reflejos.map(r => `<li>${r}</li>`).join('') + '</ul>';
}

private generarReflejosOI(): string {
  if (!this.historia?.viaPupilar || !this.tieneReflejosOI(this.historia.viaPupilar)) {
    return '<p>No registrados</p>';
  }

  const reflejos = [];
  if (this.historia.viaPupilar.OjoIzquierdoFotomotorPresente) reflejos.push('Fotomotor Presente');
  if (this.historia.viaPupilar.OjoIzquierdoConsensualPresente) reflejos.push('Consensual Presente');
  if (this.historia.viaPupilar.OjoIzquierdoAcomodativoPresente) reflejos.push('Acomodativo Presente');
  if (this.historia.viaPupilar.OjoIzquierdoFotomotorAusente) reflejos.push('Fotomotor Ausente');
  if (this.historia.viaPupilar.OjoIzquierdoConsensualAusente) reflejos.push('Consensual Ausente');
  if (this.historia.viaPupilar.OjoIzquierdoAcomodativoAusente) reflejos.push('Acomodativo Ausente');

  return '<ul class="reflejo-list">' + reflejos.map(r => `<li>${r}</li>`).join('') + '</ul>';
}

private generarCaracteristicasPupilares(): string {
  if (!this.historia?.viaPupilar || !this.tieneCaracteristicasPupilares(this.historia.viaPupilar)) {
    return '<p>No registradas</p>';
  }

  const caracteristicas = [];
  if (this.historia.viaPupilar.EsIsocoria) caracteristicas.push('Isocoria');
  if (this.historia.viaPupilar.EsAnisocoria) caracteristicas.push('Anisocoria');
  if (this.historia.viaPupilar.RespuestaAcomodacion) caracteristicas.push('Respuesta a Acomodación');
  if (this.historia.viaPupilar.PupilasIguales) caracteristicas.push('Pupilas Iguales');
  if (this.historia.viaPupilar.PupilasRedondas) caracteristicas.push('Pupilas Redondas');
  if (this.historia.viaPupilar.RespuestaLuz) caracteristicas.push('Respuesta a Luz');

  return '<ul class="caracteristicas-list">' + caracteristicas.map(c => `<li>${c}</li>`).join('') + '</ul>';
}

private generarSeccionEstadoRefractivo(): string {
  if (!this.historia) return '';

  let html = '';

  // Estado Refractivo
  if (this.historia.estadoRefractivo) {
    html += `
      <div class="info-section">
        <h2>Queratometría y Retinoscopia</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>OD Queratometría</h3>
            <p>${this.historia.estadoRefractivo.OjoDerechoQueratometria || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OI Queratometría</h3>
            <p>${this.historia.estadoRefractivo.OjoIzquierdoQueratometria || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OD Astigmatismo Corneal</h3>
            <p>${this.historia.estadoRefractivo.OjoDerechoAstigmatismoCorneal || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OI Astigmatismo Corneal</h3>
            <p>${this.historia.estadoRefractivo.OjoIzquierdoAstigmatismoCorneal || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OD Regla Javal</h3>
            <p>${this.historia.estadoRefractivo.OjoDerechoAstigmatismoJaval || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OI Regla Javal</h3>
            <p>${this.historia.estadoRefractivo.OjoIzquierdoAstigmatismoJaval || '-'}</p>
          </div>
        </div>

        <h3>Retinoscopia</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Esfera</th>
                <th>Cilindro</th>
                <th>Eje</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>OD</strong></td>
                <td>${this.historia.estadoRefractivo.OjoDerechoRetinoscopiaEsfera || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoDerechoRetinosciopiaCilindro || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoDerechoRetinoscopiaEje || '-'}</td>
              </tr>
              <tr>
                <td><strong>OI</strong></td>
                <td>${this.historia.estadoRefractivo.OjoIzquierdoRetinoscopiaEsfera || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoIzquierdoRetinosciopiaCilindro || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoIzquierdoRetinoscopiaEje || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Subjetivo</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Esfera</th>
                <th>Cilindro</th>
                <th>Eje</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>OD</strong></td>
                <td>${this.historia.estadoRefractivo.OjoDerechoSubjetivoEsfera || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoDerechoSubjetivoCilindro || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoDerechoSubjetivoEje || '-'}</td>
              </tr>
              <tr>
                <td><strong>OI</strong></td>
                <td>${this.historia.estadoRefractivo.OjoIzquierdoSubjetivoEsfera || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoIzquierdoSubjetivoCilindro || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoIzquierdoSubjetivoEje || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Balance Binoculares</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Esfera</th>
                <th>Cilindro</th>
                <th>Eje</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>OD</strong></td>
                <td>${this.historia.estadoRefractivo.OjoDerechoBalanceBinocularesEsfera || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoDerechoBalanceBinocularesCilindro || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoDerechoBalanceBinocularesEje || '-'}</td>
              </tr>
              <tr>
                <td><strong>OI</strong></td>
                <td>${this.historia.estadoRefractivo.OjoIzquierdoBalanceBinocularesEsfera || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoIzquierdoBalanceBinocularesCilindro || '-'}</td>
                <td>${this.historia.estadoRefractivo.OjoIzquierdoBalanceBinocularesEje || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <h3>OD AV Lejana</h3>
            <p>${this.historia.estadoRefractivo.OjoDerechoAVLejana || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OI AV Lejana</h3>
            <p>${this.historia.estadoRefractivo.OjoIzquierdoAVLejana || '-'}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Subjetivo de Cerca
  if (this.historia.subjetivoCerca) {
    html += `
      <div class="info-section">
        <h2>Subjetivo de Cerca</h2>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>OD</th>
                <th>OI</th>
                <th>AO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>M</strong></td>
                <td>${this.historia.subjetivoCerca.OjoDerechoM || '-'}</td>
                <td>${this.historia.subjetivoCerca.OjoIzquierdoM || '-'}</td>
                <td>${this.historia.subjetivoCerca.AmbosOjosM || '-'}</td>
              </tr>
              <tr>
                <td><strong>Jaeger</strong></td>
                <td>${this.historia.subjetivoCerca.OjoDerechoJacger || '-'}</td>
                <td>${this.historia.subjetivoCerca.OjoIzquierdoJacger || '-'}</td>
                <td>${this.historia.subjetivoCerca.AmbosOjosJacger || '-'}</td>
              </tr>
              <tr>
                <td><strong>Puntos</strong></td>
                <td>${this.historia.subjetivoCerca.OjoDerechoPuntos || '-'}</td>
                <td>${this.historia.subjetivoCerca.OjoIzquierdoPuntos || '-'}</td>
                <td>${this.historia.subjetivoCerca.AmbosOjosPuntos || '-'}</td>
              </tr>
              <tr>
                <td><strong>Snellen</strong></td>
                <td>${this.historia.subjetivoCerca.OjoDerechoSnellen || '-'}</td>
                <td>${this.historia.subjetivoCerca.OjoIzquierdoSnellen || '-'}</td>
                <td>${this.historia.subjetivoCerca.AmbosOjosSnellen || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <h3>Valor ADD</h3>
            <p>${this.historia.subjetivoCerca.ValorADD || '-'}</p>
          </div>
          <div class="info-item">
            <h3>AV</h3>
            <p>${this.historia.subjetivoCerca.AV || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Distancia</h3>
            <p>${this.historia.subjetivoCerca.Distancia || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Rango</h3>
            <p>${this.historia.subjetivoCerca.Rango || '-'}</p>
          </div>
        </div>
      </div>
    `;
  }

  if (html) html += '<div class="page-break"></div>';
  return html;
}

private generarSeccionBinocularidad(): string {
  if (!this.historia) return '';

  let html = '';

  // Binocularidad
  if (this.historia.binocularidad) {
    html += `
      <div class="info-section">
        <h2>Binocularidad</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>PPC</h3>
            <p>${this.historia.binocularidad.PPC || '-'}</p>
          </div>
          <div class="info-item">
            <h3>ARN</h3>
            <p>${this.historia.binocularidad.ARN || '-'}</p>
          </div>
          <div class="info-item">
            <h3>ARP</h3>
            <p>${this.historia.binocularidad.ARP || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Hab. Acom. Lente</h3>
            <p>${this.historia.binocularidad.HabAcomLente || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Hab. Acom. Dificultad</h3>
            <p>${this.historia.binocularidad.HabAcomDificultad || '-'}</p>
          </div>
        </div>

        <h3>Amplitud de Acomodación</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>cm</th>
                <th>D</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>OD</strong></td>
                <td>${this.historia.binocularidad.OjoDerechoAmpAcomCm || '-'}</td>
                <td>${this.historia.binocularidad.OjoDerechoAmpAcomD || '-'}</td>
              </tr>
              <tr>
                <td><strong>OI</strong></td>
                <td>${this.historia.binocularidad.OjoIzquierdoAmpAcomCm || '-'}</td>
                <td>${this.historia.binocularidad.OjoIzquierdoAmpAcomD || '-'}</td>
              </tr>
              <tr>
                <td><strong>AO</strong></td>
                <td>${this.historia.binocularidad.AmbosOjosAmpAcomCm || '-'}</td>
                <td>${this.historia.binocularidad.AmbosOjosAmpAcomD || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Forias
  if (this.historia.forias) {
    html += `
      <div class="info-section">
        <h2>Forias</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>Horizontales Lejos</h3>
            <p>${this.historia.forias.HorizontalesLejos || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Horizontales Cerca</h3>
            <p>${this.historia.forias.HorizontalesCerca || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Vertical Lejos</h3>
            <p>${this.historia.forias.VerticalLejos || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Vertical Cerca</h3>
            <p>${this.historia.forias.VerticalCerca || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Método de Medición</h3>
            <p>${this.obtenerNombreMetodo(this.historia.forias.MetodoMedicionID)}</p>
          </div>
          <div class="info-item">
            <h3>CAA Calculada</h3>
            <p>${this.historia.forias.CAACalculada || '-'}</p>
          </div>
          <div class="info-item">
            <h3>CAA Medida</h3>
            <p>${this.historia.forias.CAAMedida || '-'}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Vergencias
  if (this.historia.vergencias) {
    html += `
      <div class="info-section">
        <h2>Vergencias</h2>

        <h3>Vergencias Positivas</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Borroso</th>
                <th>Ruptura</th>
                <th>Recuperación</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Lejos</strong></td>
                <td>${this.historia.vergencias.PositivasLejosBorroso || '-'}</td>
                <td>${this.historia.vergencias.PositivasLejosRuptura || '-'}</td>
                <td>${this.historia.vergencias.PositivasLejosRecuperacion || '-'}</td>
              </tr>
              <tr>
                <td><strong>Cerca</strong></td>
                <td>${this.historia.vergencias.PositivasCercaBorroso || '-'}</td>
                <td>${this.historia.vergencias.PositivasCercaRuptura || '-'}</td>
                <td>${this.historia.vergencias.PositivasCercaRecuperacion || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Vergencias Negativas</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Borroso</th>
                <th>Ruptura</th>
                <th>Recuperación</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Lejos</strong></td>
                <td>${this.historia.vergencias.NegativasLejosBorroso || '-'}</td>
                <td>${this.historia.vergencias.NegativasLejosRuptura || '-'}</td>
                <td>${this.historia.vergencias.NegativasLejosRecuperacion || '-'}</td>
              </tr>
              <tr>
                <td><strong>Cerca</strong></td>
                <td>${this.historia.vergencias.NegativasCercaBorroso || '-'}</td>
                <td>${this.historia.vergencias.NegativasCercaRuptura || '-'}</td>
                <td>${this.historia.vergencias.NegativasCercaRecuperacion || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="form-section-grid">
          <div class="grid-section">
            <h3>Supravergencias</h3>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Ruptura</th>
                    <th>Recuperación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Lejos</strong></td>
                    <td>${this.historia.vergencias.SupravergenciasLejosRuptura || '-'}</td>
                    <td>${this.historia.vergencias.SupravergenciasLejosRecuperacion || '-'}</td>
                  </tr>
                  <tr>
                    <td><strong>Cerca</strong></td>
                    <td>${this.historia.vergencias.SupravergenciasCercaRuptura || '-'}</td>
                    <td>${this.historia.vergencias.SupravergenciasCercaRecuperacion || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="grid-section">
            <h3>Infravergencias</h3>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Ruptura</th>
                    <th>Recuperación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Lejos</strong></td>
                    <td>${this.historia.vergencias.InfravergenciasLejosRuptura || '-'}</td>
                    <td>${this.historia.vergencias.InfravergenciasLejosRecuperacion || '-'}</td>
                  </tr>
                  <tr>
                    <td><strong>Cerca</strong></td>
                    <td>${this.historia.vergencias.InfravergenciasCercaRuptura || '-'}</td>
                    <td>${this.historia.vergencias.InfravergenciasCercaRecuperacion || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Método Gráfico
  if (this.historia.metodoGrafico) {
    const imagenSrc = this.historia.metodoGrafico.imagenBase64 ||
                     (this.historia.metodoGrafico.imagenID ? this.obtenerUrlImagen(this.historia.metodoGrafico.imagenID) : '');

    html += `
      <div class="info-section">
        <h2>Método Gráfico</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>Integración Binocular</h3>
            <p>${this.historia.metodoGrafico.integracionBinocular || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Tipo de Test</h3>
            <p>${this.obtenerTipoTest(this.historia.metodoGrafico.tipoID)}</p>
          </div>
          <div class="info-item">
            <h3>Visión Estereoscópica</h3>
            <p>${this.historia.metodoGrafico.visionEstereoscopica || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Tipo de Visión Estereoscópica</h3>
            <p>${this.obtenerTipoVision(this.historia.metodoGrafico.tipoVisionID)}</p>
          </div>
        </div>
        ${imagenSrc ? `
          <div class="metodo-grafico-imagen">
            <h3>Imagen</h3>
            <img src="${imagenSrc}" alt="Método Gráfico">
          </div>
        ` : ''}
      </div>
    `;
  }

  if (html) html += '<div class="page-break"></div>';
  return html;
}

private generarSeccionDeteccionAlteraciones(): string {
  if (!this.historia) return '';

  let html = '';

  // Grid de Amsler
  if (this.historia.gridAmsler) {
    html += `
      <div class="info-section">
        <h2>Grid de Amsler</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>Número de Cartilla</h3>
            <p>${this.historia.gridAmsler.numeroCartilla || '-'}</p>
          </div>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>OD</th>
                <th>OI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Sensibilidad al Contraste</strong></td>
                <td>${this.historia.gridAmsler.ojoDerechoSensibilidadContraste || '-'}</td>
                <td>${this.historia.gridAmsler.ojoIzquierdoSensibilidadContraste || '-'}</td>
              </tr>
              <tr>
                <td><strong>Visión Cromática</strong></td>
                <td>${this.historia.gridAmsler.ojoDerechoVisionCromatica || '-'}</td>
                <td>${this.historia.gridAmsler.ojoIzquierdoVisionCromatica || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Tonometría
  if (this.historia.tonometria) {
    html += `
      <div class="info-section">
        <h2>Tonometría</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>Método Anestésico</h3>
            <p>${this.historia.tonometria.metodoAnestesico || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Fecha</h3>
            <p>${this.formatearFechaParaImpresion(this.historia.tonometria.fecha)}</p>
          </div>
          <div class="info-item">
            <h3>Hora</h3>
            <p>${this.historia.tonometria.hora || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Tipo</h3>
            <p>${this.obtenerTipoTonometria(this.historia.tonometria.tipoID)}</p>
          </div>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>OD</th>
                <th>OI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Valor (mmHg)</strong></td>
                <td>${this.historia.tonometria.ojoDerecho || '-'}</td>
                <td>${this.historia.tonometria.ojoIzquierdo || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Paquimetría
  if (this.historia.paquimetria) {
    html += `
      <div class="info-section">
        <h2>Paquimetría</h2>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>OD</th>
                <th>OI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>CCT (μm)</strong></td>
                <td>${this.historia.paquimetria.ojoDerechoCCT || '-'}</td>
                <td>${this.historia.paquimetria.ojoIzquierdoCCT || '-'}</td>
              </tr>
              <tr>
                <td><strong>PIO Corregida</strong></td>
                <td>${this.historia.paquimetria.ojoDerechoPIOCorregida || '-'}</td>
                <td>${this.historia.paquimetria.ojoIzquierdoPIOCorregida || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Campimetría
  if (this.historia.campimetria) {
    const imagenSrc = this.historia.campimetria.imagenBase64 ||
                     (this.historia.campimetria.imagenID ? this.obtenerUrlImagen(this.historia.campimetria.imagenID) : '');

    html += `
      <div class="info-section">
        <h2>Campimetría</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>Distancia (cm)</h3>
            <p>${this.historia.campimetria.distancia || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Tamaño/Color Índice</h3>
            <p>${this.historia.campimetria.tamanoColorIndice || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Tamaño/Color Punto Fijación</h3>
            <p>${this.historia.campimetria.tamanoColorPuntoFijacion || '-'}</p>
          </div>
        </div>
        ${imagenSrc ? `
          <div class="metodo-grafico-imagen">
            <h3>Imagen de Campimetría</h3>
            <img src="${imagenSrc}" alt="Campimetría">
          </div>
        ` : ''}
      </div>
    `;
  }

  // Biomicroscopía
  if (this.historia.biomicroscopia) {
    html += `
      <div class="info-section">
        <h2>Biomicroscopía</h2>

        <h3>Anexos</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>OD</th>
                <th>OI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Pestañas</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoPestanas || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoPestanas || '-'}</td>
              </tr>
              <tr>
                <td><strong>Párpados/Índice</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoParpadosIndice || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoParpadosIndice || '-'}</td>
              </tr>
              <tr>
                <td><strong>Borde Palpebral</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoBordePalpebral || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoBordePalpebral || '-'}</td>
              </tr>
              <tr>
                <td><strong>Línea Gris</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoLineaGris || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoLineaGris || '-'}</td>
              </tr>
              <tr>
                <td><strong>Canto Externo</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoCantoExterno || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoCantoExterno || '-'}</td>
              </tr>
              <tr>
                <td><strong>Canto Interno</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoCantoInterno || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoCantoInterno || '-'}</td>
              </tr>
              <tr>
                <td><strong>Puntos Lagrimales</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoPuntosLagrimales || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoPuntosLagrimales || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Conjuntiva</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>OD</th>
                <th>OI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Conjuntiva Tarsal</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoConjuntivaTarsal || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoConjuntivaTarsal || '-'}</td>
              </tr>
              <tr>
                <td><strong>Conjuntiva Bulbar</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoConjuntivaBulbar || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoConjuntivaBulbar || '-'}</td>
              </tr>
              <tr>
                <td><strong>Fondo de Saco</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoFondoSaco || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoFondoSaco || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Córnea y Segmento Anterior</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>OD</th>
                <th>OI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Limbo</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoLimbo || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoLimbo || '-'}</td>
              </tr>
              <tr>
                <td><strong>Córnea</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoCorneaBiomicroscopia || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoCorneaBiomicroscopia || '-'}</td>
              </tr>
              <tr>
                <td><strong>Cámara Anterior</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoCamaraAnterior || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoCamaraAnterior || '-'}</td>
              </tr>
              <tr>
                <td><strong>Iris</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoIris || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoIris || '-'}</td>
              </tr>
              <tr>
                <td><strong>Cristalino</strong></td>
                <td>${this.historia.biomicroscopia.ojoDerechoCristalino || '-'}</td>
                <td>${this.historia.biomicroscopia.ojoIzquierdoCristalino || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Oftalmoscopia
  if (this.historia.oftalmoscopia) {
    const imagenOD = this.historia.oftalmoscopia.ojoDerechoImagenBase64 ||
                    (this.historia.oftalmoscopia.ojoDerechoImagenID ? this.obtenerUrlImagen(this.historia.oftalmoscopia.ojoDerechoImagenID) : '');
    const imagenOI = this.historia.oftalmoscopia.ojoIzquierdoImagenBase64 ||
                    (this.historia.oftalmoscopia.ojoIzquierdoImagenID ? this.obtenerUrlImagen(this.historia.oftalmoscopia.ojoIzquierdoImagenID) : '');

    html += `
      <div class="info-section">
        <h2>Oftalmoscopia</h2>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>OD</th>
                <th>OI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Papila</strong></td>
                <td>${this.historia.oftalmoscopia.ojoDerechoPapila || '-'}</td>
                <td>${this.historia.oftalmoscopia.ojoIzquierdoPapila || '-'}</td>
              </tr>
              <tr>
                <td><strong>Excavación</strong></td>
                <td>${this.historia.oftalmoscopia.ojoDerechoExcavacion || '-'}</td>
                <td>${this.historia.oftalmoscopia.ojoIzquierdoExcavacion || '-'}</td>
              </tr>
              <tr>
                <td><strong>Radio</strong></td>
                <td>${this.historia.oftalmoscopia.ojoDerechoRadio || '-'}</td>
                <td>${this.historia.oftalmoscopia.ojoIzquierdoRadio || '-'}</td>
              </tr>
              <tr>
                <td><strong>Profundidad</strong></td>
                <td>${this.historia.oftalmoscopia.ojoDerechoProfundidad || '-'}</td>
                <td>${this.historia.oftalmoscopia.ojoIzquierdoProfundidad || '-'}</td>
              </tr>
              <tr>
                <td><strong>Vasos</strong></td>
                <td>${this.historia.oftalmoscopia.ojoDerechoVasos || '-'}</td>
                <td>${this.historia.oftalmoscopia.ojoIzquierdoVasos || '-'}</td>
              </tr>
              <tr>
                <td><strong>RELAV</strong></td>
                <td>${this.historia.oftalmoscopia.ojoDerechoRELAV || '-'}</td>
                <td>${this.historia.oftalmoscopia.ojoIzquierdoRELAV || '-'}</td>
              </tr>
              <tr>
                <td><strong>Mácula</strong></td>
                <td>${this.historia.oftalmoscopia.ojoDerechoMacula || '-'}</td>
                <td>${this.historia.oftalmoscopia.ojoIzquierdoMacula || '-'}</td>
              </tr>
              <tr>
                <td><strong>Reflejo</strong></td>
                <td>${this.historia.oftalmoscopia.ojoDerechoReflejo || '-'}</td>
                <td>${this.historia.oftalmoscopia.ojoIzquierdoReflejo || '-'}</td>
              </tr>
              <tr>
                <td><strong>Retina Periférica</strong></td>
                <td>${this.historia.oftalmoscopia.ojoDerechoRetinaPeriferica || '-'}</td>
                <td>${this.historia.oftalmoscopia.ojoIzquierdoRetinaPeriferica || '-'}</td>
              </tr>
              <tr>
                <td><strong>ISNT</strong></td>
                <td>${this.historia.oftalmoscopia.ojoDerechoISNT || '-'}</td>
                <td>${this.historia.oftalmoscopia.ojoIzquierdoISNT || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${imagenOD ? `
          <div class="metodo-grafico-imagen">
            <h3>Imagen Oftalmoscopia - Ojo Derecho</h3>
            <img src="${imagenOD}" alt="Oftalmoscopia OD">
          </div>
        ` : ''}

        ${imagenOI ? `
          <div class="metodo-grafico-imagen">
            <h3>Imagen Oftalmoscopia - Ojo Izquierdo</h3>
            <img src="${imagenOI}" alt="Oftalmoscopia OI">
          </div>
        ` : ''}
      </div>
    `;
  }

  if (html) html += '<div class="page-break"></div>';
  return html;
}

private generarSeccionDiagnostico(): string {
  if (!this.historia) return '';

  let html = '';

  // Diagnóstico
  if (this.historia.diagnostico) {
    html += `
      <div class="info-section">
        <h2>Diagnóstico</h2>
        <div class="info-grid">
          <div class="info-item">
            <h3>OD Refractivo</h3>
            <p>${this.historia.diagnostico.OjoDerechoRefractivo || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OI Refractivo</h3>
            <p>${this.historia.diagnostico.OjoIzquierdoRefractivo || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OD Patológico</h3>
            <p>${this.historia.diagnostico.OjoDerechoPatologico || '-'}</p>
          </div>
          <div class="info-item">
            <h3>OI Patológico</h3>
            <p>${this.historia.diagnostico.OjoIzquierdoPatologico || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Binocular</h3>
            <p>${this.historia.diagnostico.Binocular || '-'}</p>
          </div>
          <div class="info-item">
            <h3>Sensorial</h3>
            <p>${this.historia.diagnostico.Sensorial || '-'}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Plan de Tratamiento
  if (this.historia.planTratamiento) {
    html += `
      <div class="info-section">
        <h2>Plan de Tratamiento</h2>
        <div class="info-grid-full">
          <div class="info-item">
            <p>${this.historia.planTratamiento.Descripcion || '-'}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Pronóstico
  if (this.historia.pronostico) {
    html += `
      <div class="info-section">
        <h2>Pronóstico</h2>
        <div class="info-grid-full">
          <div class="info-item">
            <p>${this.historia.pronostico.Descripcion || '-'}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Recomendaciones
  if (this.historia.recomendaciones) {
    html += `
      <div class="info-section">
        <h2>Recomendaciones</h2>
        <div class="info-grid-full">
          <div class="info-item">
            <p>${this.historia.recomendaciones.Descripcion || '-'}</p>
          </div>
        </div>
        ${this.historia.recomendaciones.ProximaCita ? `
          <div class="info-grid">
            <div class="info-item">
              <h3>Próxima Cita</h3>
              <p>${this.formatearFechaParaImpresion(this.historia.recomendaciones.ProximaCita)}</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  if (html) html += '<div class="page-break"></div>';
  return html;
}

private generarSeccionReceta(): string {
  if (!this.historia?.recetaFinal) return '';

  return `
    <div class="info-section">
      <h2>Receta Final</h2>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Esfera</th>
              <th>Cilindro</th>
              <th>Eje</th>
              <th>Prisma</th>
              <th>Eje Prisma</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>OD</strong></td>
              <td>${this.historia.recetaFinal.OjoDerechoEsfera || '-'}</td>
              <td>${this.historia.recetaFinal.OjoDerechoCilindro || '-'}</td>
              <td>${this.historia.recetaFinal.OjoDerechoEje || '-'}</td>
              <td>${this.historia.recetaFinal.OjoDerechoPrisma || '-'}</td>
              <td>${this.historia.recetaFinal.OjoDerechoEjePrisma || '-'}</td>
            </tr>
            <tr>
              <td><strong>OI</strong></td>
              <td>${this.historia.recetaFinal.OjoIzquierdoEsfera || '-'}</td>
              <td>${this.historia.recetaFinal.OjoIzquierdoCilindro || '-'}</td>
              <td>${this.historia.recetaFinal.OjoIzquierdoEje || '-'}</td>
              <td>${this.historia.recetaFinal.OjoIzquierdoPrisma || '-'}</td>
              <td>${this.historia.recetaFinal.OjoIzquierdoEjePrisma || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <h3>Tratamiento</h3>
          <p>${this.historia.recetaFinal.Tratamiento || 'No registrado'}</p>
        </div>
        <div class="info-item">
          <h3>Tipo de Lente</h3>
          <p>${this.obtenerTipoLente(this.historia.recetaFinal.TipoID)}</p>
        </div>
        <div class="info-item">
          <h3>DIP</h3>
          <p>${this.historia.recetaFinal.DIP || 'No registrado'}</p>
        </div>
        <div class="info-item">
          <h3>ADD</h3>
          <p>${this.historia.recetaFinal.ValorADD || 'No aplicable'}</p>
        </div>
        <div class="info-item">
          <h3>Material</h3>
          <p>${this.historia.recetaFinal.Material || 'No registrado'}</p>
        </div>
      </div>

      ${this.historia.recetaFinal.Observaciones ? `
        <div class="info-grid-full">
          <div class="info-item">
            <h3>Observaciones</h3>
            <p>${this.historia.recetaFinal.Observaciones}</p>
          </div>
        </div>
      ` : ''}
    </div>
  `;
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

/**
 * Responder a un comentario (solo alumno)
 */
responderComentario(comentario: any): void {
  if (!this.historiaId || !comentario.respuestaValida) {
    return;
  }

  const respuesta = comentario.nuevaRespuesta.trim();

  this.historiaClinicaService.responderComentario(this.historiaId, comentario.ID, respuesta)
    .subscribe({
      next: (response) => {
        // Agregar la nueva respuesta a la lista
        if (!comentario.respuestas) {
          comentario.respuestas = [];
        }
        comentario.respuestas.push(response.data);

        // Limpiar el formulario
        comentario.nuevaRespuesta = '';
        comentario.respuestaValida = false;

        console.log('Respuesta enviada correctamente');
      },
      error: (error) => {
        this.error = 'Error al responder el comentario. Por favor, intenta nuevamente.';
        console.error('Error respondiendo comentario:', error);
      }
    });
}

// Métodos para trabajar con la sección de Antecedente Visual
obtenerNombreTipoMedicion(tipoMedicion: string): string {
  const tipos: {[key: string]: string} = {
    'SIN_RX_LEJOS': 'Sin RX Lejos',
    'CON_RX_ANTERIOR_LEJOS': 'Con RX Anterior Lejos',
    'SIN_RX_CERCA': 'Sin RX Cerca',
    'CON_RX_ANTERIOR_CERCA': 'Con RX Anterior Cerca',
    'CAP_VISUAL': 'Capacidad Visual'
  };

  return tipos[tipoMedicion] || tipoMedicion;
}

esMedicionLejos(tipoMedicion: string): boolean {
  return tipoMedicion === 'SIN_RX_LEJOS' || tipoMedicion === 'CON_RX_ANTERIOR_LEJOS';
}

esMedicionCerca(tipoMedicion: string): boolean {
  return tipoMedicion === 'SIN_RX_CERCA' || tipoMedicion === 'CON_RX_ANTERIOR_CERCA';
}

obtenerTipoLente(tipoID: number | null | undefined): string {
  if (!tipoID) return '-';

  const tipos: {[key: number]: string} = {
    1: 'Bifocal',
    2: 'Multifocal',
    3: 'Monocal'
  };

  return tipos[tipoID] || '-';
}

obtenerNombreMetodo(metodoID: number | null | undefined): string {
  if (!metodoID) return '-';

  const metodos: {[key: number]: string} = {
    1: 'Pantalleo',
    2: 'Thorrigton',
    3: 'Maddox',
    4: 'Von Graeffe'
  };

  return metodos[metodoID] || '-';
}


tieneReflejosOD(viaPupilar: any): boolean {
  if (!viaPupilar) return false;

  return viaPupilar.OjoDerechoFotomotorPresente ||
        viaPupilar.OjoDerechoConsensualPresente ||
        viaPupilar.OjoDerechoAcomodativoPresente ||
        viaPupilar.OjoDerechoFotomotorAusente ||
        viaPupilar.OjoDerechoConsensualAusente ||
        viaPupilar.OjoDerechoAcomodativoAusente;
}

tieneReflejosOI(viaPupilar: any): boolean {
  if (!viaPupilar) return false;

  return viaPupilar.OjoIzquierdoFotomotorPresente ||
          viaPupilar.OjoIzquierdoConsensualPresente ||
          viaPupilar.OjoIzquierdoAcomodativoPresente ||
          viaPupilar.OjoIzquierdoFotomotorAusente ||
          viaPupilar.OjoIzquierdoConsensualAusente ||
          viaPupilar.OjoIzquierdoAcomodativoAusente;
}

tieneCaracteristicasPupilares(viaPupilar: any): boolean {
  if (!viaPupilar) return false;

  return viaPupilar.EsIsocoria ||
          viaPupilar.EsAnisocoria ||
          viaPupilar.RespuestaAcomodacion ||
          viaPupilar.PupilasIguales ||
          viaPupilar.PupilasRedondas ||
          viaPupilar.RespuestaLuz;
}

obtenerDominanciaOcular(dominanciaID: number | null | undefined): string {
  if (!dominanciaID) return 'No especificada';

  const dominancias: {[key: number]: string} = {
    29: 'Ojo Derecho (OD)',
    30: 'Ojo Izquierdo (OI)'
  };

  return dominancias[dominanciaID] || 'Desconocida';
}

// Métodos para trabajar con la sección de Estado Refractivo
mostrarEstadoRefractivo(): boolean {
  if (!this.historia) return false;
  return !!this.historia.estadoRefractivo || !!this.historia.subjetivoCerca;
}

formatearValorNumerico(valor: any): string {
  if (valor === null || valor === undefined || valor === '') return '-';
  return valor.toString();
}

formatearGrados(grados: any): string {
  if (grados === null || grados === undefined || grados === '') return '-';
  return `${grados}°`;
}

verificarSubjetivoCerca(): boolean {
  if (!this.historia || !this.historia.subjetivoCerca) return false;

  const subjetivoCerca = this.historia.subjetivoCerca;
  return !!(
    subjetivoCerca.OjoDerechoM ||
    subjetivoCerca.OjoIzquierdoM ||
    subjetivoCerca.AmbosOjosM ||
    subjetivoCerca.OjoDerechoJacger ||
    subjetivoCerca.OjoIzquierdoJacger ||
    subjetivoCerca.AmbosOjosJacger ||
    subjetivoCerca.OjoDerechoPuntos ||
    subjetivoCerca.OjoIzquierdoPuntos ||
    subjetivoCerca.AmbosOjosPuntos ||
    subjetivoCerca.OjoDerechoSnellen ||
    subjetivoCerca.OjoIzquierdoSnellen ||
    subjetivoCerca.AmbosOjosSnellen ||
    subjetivoCerca.ValorADD ||
    subjetivoCerca.AV ||
    subjetivoCerca.Distancia ||
    subjetivoCerca.Rango
  );
}

// Verifica si existen datos de binocularidad
tieneDatosBinocularidad(): boolean {
  if (!this.historia) return false;

  // Función auxiliar para verificar si un valor tiene datos significativos
  const tieneValor = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim() !== '';
    if (typeof val === 'number') return !isNaN(val);
    if (typeof val === 'boolean') return val;
    return true;
  };

  // Verificar datos en binocularidad
  const hasBinocularidadData = !!(
    this.historia.binocularidad &&
    Object.values(this.historia.binocularidad).some(tieneValor)
  );

  // Verificar datos en forias
  const hasForiasData = !!(
    this.historia.forias &&
    Object.values(this.historia.forias).some(tieneValor)
  );

  // Verificar datos en vergencias
  const hasVergenciasData = !!(
    this.historia.vergencias &&
    Object.values(this.historia.vergencias).some(tieneValor)
  );

  // Verificar datos en metodoGrafico
  const hasMetodoGraficoData = !!(
    this.historia.metodoGrafico && (
      Object.values(this.historia.metodoGrafico).some(tieneValor) ||
      this.historia.metodoGrafico.imagenID ||
      this.historia.metodoGrafico.imagenBase64
    )
  );

  return hasBinocularidadData || hasForiasData || hasVergenciasData || hasMetodoGraficoData;
}

// Obtiene el nombre del método de medición para forias
obtenerTipoTest(tipoID: number | null | undefined): string {
  if (!tipoID) return '-';

  const tipos: {[key: number]: string} = {
    35: 'Pola Mirror',
    36: 'Otro',
    37: 'P. de Worth'
  };

  return tipos[tipoID] || '-';
}

private mostrarMensajeExito(mensaje: string): void {
  this.mensajeExito = mensaje;
  setTimeout(() => {
    this.mensajeExito = '';
  }, 3000);
}

/**
 * Obtener nombre de sección por ID
 */
obtenerNombreSeccion(seccionId: number | null): string {
  if (!seccionId) return 'General';

  const secciones: {[key: number]: string} = {
    1: 'Datos Generales',
    2: 'Interrogatorio',
    3: 'Antecedente Visual',
    4: 'Examen Preliminar',
    8: 'Estado Refractivo',
    10: 'Binocularidad',
    14: 'Detección de Alteraciones',
    20: 'Diagnóstico',
    24: 'Receta Final'
  };

  return secciones[seccionId] || 'Sección Desconocida';
}

/**
 * Agregar comentario general (sin sección específica)
 */
agregarComentarioGeneral(): void {
  if (!this.historiaId || !this.nuevoComentarioTexto.trim()) {
    return;
  }

  // Si es profesor o admin, usar el servicio correspondiente
  if (this.esProfesor) {
    this.profesorService.agregarComentario(
      this.historiaId,
      this.nuevoComentarioTexto.trim(),
      undefined
    ).subscribe({
      next: (response) => {
        console.log('Comentario agregado exitosamente');
        this.nuevoComentarioTexto = '';
        this.loadHistoriaClinica();
      },
      error: (error) => {
        this.error = 'Error al agregar el comentario. Por favor, intenta nuevamente.';
        console.error('Error:', error);
      }
    });
  } else if (this.esAdmin) {
    // NUEVA LÓGICA PARA ADMIN
    this.adminService.agregarComentario(
      this.historiaId,
      this.nuevoComentarioTexto.trim()
    ).subscribe({
      next: (response) => {
        console.log('Comentario de admin agregado exitosamente');
        this.nuevoComentarioTexto = '';
        this.loadHistoriaClinica();
      },
      error: (error) => {
        this.error = 'Error al agregar el comentario. Por favor, intenta nuevamente.';
        console.error('Error:', error);
      }
    });
  } else {
    // Si es alumno, usar el servicio de historia clínica (respuesta a comentarios)
    const comentarioData = {
      historiaId: this.historiaId,
      seccionId: null,
      comentario: this.nuevoComentarioTexto.trim()
    };

    this.historiaClinicaService.agregarComentario(this.historiaId, comentarioData)
      .subscribe({
        next: (response) => {
          console.log('Comentario agregado exitosamente');
          this.nuevoComentarioTexto = '';
          this.loadHistoriaClinica();
        },
        error: (error) => {
          this.error = 'Error al agregar el comentario. Por favor, intenta nuevamente.';
          console.error('Error:', error);
        }
      });
  }
}

// Obtiene el tipo de visión estereoscópica
obtenerTipoVision(tipoVisionID: number | null | undefined): string {
  if (!tipoVisionID) return '-';

  const tiposVision: {[key: number]: string} = {
    38: 'Titmus',
    39: 'Random',
    40: 'Otro'
  };

  return tiposVision[tipoVisionID] || '-';
}

// Obtiene la URL de la imagen asociada al método gráfico
obtenerUrlImagen(imagenID: number | null | undefined): string {
  if (!imagenID) return '';
  return `${environment.apiUrl}/historias-clinicas/imagenes/${imagenID}`;
}

// método para cargar la imagen en base64
cargarImagenBase64(imagenID: number): void {
  if (!imagenID) return;

  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (typeof base64 === 'string' && base64.length > 0) {
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }
          if (this.historia && !this.historia.metodoGrafico) {
            this.historia.metodoGrafico = {};
          }

          if (this.historia && this.historia.metodoGrafico) {
            this.historia.metodoGrafico.imagenBase64 = base64;
            console.log('Imagen cargada correctamente en base64');
          }
        } else {
          console.error('La respuesta no contiene datos válidos de imagen en base64');
        }
      },
      error: (error) => {
        console.error('Error al cargar imagen:', error);
      }
    });
}

onImageError(event: Event): void {
  const imgElement = event.target as HTMLImageElement;

  // Marcar como error
  imgElement.classList.add('image-error');

  // Cambiar a una imagen de placeholder
  imgElement.src = 'assets/images/image-not-found.png';

  // Actualizar el caption
  const caption = imgElement.nextElementSibling;
  if (caption && caption.classList.contains('image-caption')) {
    caption.textContent = 'Error al cargar la imagen';
  }

  console.error('Error al cargar la imagen desde URL');
}

private getBlobAsBase64(url: string): Promise<string> {
  return fetch(url)
    .then(response => response.blob())
    .then(blob => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    });
}

recargarImagen(imagenID: number): void {
  if (!imagenID) return;

  this.loading = true;
  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (base64) => {
        if (this.historia && this.historia.metodoGrafico) {
          this.historia.metodoGrafico.imagenBase64 = base64;
        }
      },
      error: (error) => {
        this.error = 'No se pudo cargar la imagen. ' + error.message;
      }
    });
}

// Helper method to check if amplitud acomodacion has any data
tieneDatosAmplitudAcomodacion(binocularidad: any): boolean {
  if (!binocularidad) return false;

  return !!(
    binocularidad.ojoDerechoAmpAcomCm ||
    binocularidad.ojoDerechoAmpAcomD ||
    binocularidad.ojoIzquierdoAmpAcomCm ||
    binocularidad.ojoIzquierdoAmpAcomD ||
    binocularidad.ambosOjosAmpAcomCm ||
    binocularidad.ambosOjosAmpAcomD
  );
}

// Helper method to check if vergencias positivas has any data
tieneDatosVergenciasPositivas(vergencias: any): boolean {
  if (!vergencias) return false;

  return !!(
    vergencias.positivasLejosBorroso ||
    vergencias.positivasLejosRuptura ||
    vergencias.positivasLejosRecuperacion ||
    vergencias.positivasCercaBorroso ||
    vergencias.positivasCercaRuptura ||
    vergencias.positivasCercaRecuperacion
  );
}

// Helper method to check if vergencias negativas has any data
tieneDatosVergenciasNegativas(vergencias: any): boolean {
  if (!vergencias) return false;

  return !!(
    vergencias.negativasLejosBorroso ||
    vergencias.negativasLejosRuptura ||
    vergencias.negativasLejosRecuperacion ||
    vergencias.negativasCercaBorroso ||
    vergencias.negativasCercaRuptura ||
    vergencias.negativasCercaRecuperacion
  );
}

// Helper method to check if vergencias verticales has any data
tieneDatosVergenciasVerticales(vergencias: any): boolean {
  if (!vergencias) return false;

  return this.tieneDatosSupravergencias(vergencias) || this.tieneDatosInfravergencias(vergencias);
}

// Helper method to check if supravergencias has any data
tieneDatosSupravergencias(vergencias: any): boolean {
  if (!vergencias) return false;

  return !!(
    vergencias.supravergenciasLejosRuptura ||
    vergencias.supravergenciasLejosRecuperacion ||
    vergencias.supravergenciasCercaRuptura ||
    vergencias.supravergenciasCercaRecuperacion
  );
}

// Helper method to check if infravergencias has any data
tieneDatosInfravergencias(vergencias: any): boolean {
  if (!vergencias) return false;

  return !!(
    vergencias.infravergenciasLejosRuptura ||
    vergencias.infravergenciasLejosRecuperacion ||
    vergencias.infravergenciasCercaRuptura ||
    vergencias.infravergenciasCercaRecuperacion
  );
}

// Verificar si hay datos de detección de alteraciones
tieneDatosAlteraciones(): boolean {
  if (!this.historia) return false;

  // Función auxiliar para verificar si un valor tiene datos significativos
  const tieneValor = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim() !== '';
    if (typeof val === 'number') return !isNaN(val);
    if (typeof val === 'boolean') return val;
    return true;
  };

  // Verificar datos en Grid de Amsler
  const hasGridAmslerData = !!(
    this.historia.gridAmsler &&
    Object.values(this.historia.gridAmsler).some(tieneValor)
  );

  // Verificar datos en Tonometría
  const hasTonometriaData = !!(
    this.historia.tonometria &&
    Object.values(this.historia.tonometria).some(tieneValor)
  );

  // Verificar datos en Paquimetría
  const hasPaquimetriaData = !!(
    this.historia.paquimetria &&
    Object.values(this.historia.paquimetria).some(tieneValor)
  );

  // Verificar datos en Campimetría
  const hasCampimetriaData = !!(
    this.historia.campimetria && (
      Object.values(this.historia.campimetria).some(tieneValor) ||
      this.historia.campimetria.imagenID ||
      this.historia.campimetria.imagenBase64
    )
  );

  // Verificar datos en Biomicroscopía
  const hasBiomicroscopiaData = !!(
    this.historia.biomicroscopia &&
    Object.values(this.historia.biomicroscopia).some(tieneValor)
  );

  // Verificar datos en Oftalmoscopía
  const hasOftalmoscopiaData = !!(
    this.historia.oftalmoscopia && (
      Object.values(this.historia.oftalmoscopia).some(tieneValor) ||
      this.historia.oftalmoscopia.ojoDerechoImagenID ||
      this.historia.oftalmoscopia.ojoIzquierdoImagenID ||
      this.historia.oftalmoscopia.ojoDerechoImagenBase64 ||
      this.historia.oftalmoscopia.ojoIzquierdoImagenBase64
    )
  );

  return hasGridAmslerData || hasTonometriaData || hasPaquimetriaData || hasCampimetriaData || hasBiomicroscopiaData || hasOftalmoscopiaData;
}

// Verificar si hay datos de diagnóstico
tieneDatosDiagnostico(): boolean {
  if (!this.historia) return false;

  // Función auxiliar para verificar si un valor tiene datos significativos
  const tieneValor = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim() !== '';
    if (typeof val === 'number') return !isNaN(val);
    if (typeof val === 'boolean') return val;
    return true;
  };

  // Verificar datos en Diagnóstico
  const hasDiagnosticoData = !!(
    this.historia.diagnostico &&
    Object.values(this.historia.diagnostico).some(tieneValor)
  );

  // Verificar datos en Plan de Tratamiento
  const hasPlanTratamientoData = !!(
    this.historia.planTratamiento &&
    Object.values(this.historia.planTratamiento).some(tieneValor)
  );

  // Verificar datos en Pronóstico
  const hasPronosticoData = !!(
    this.historia.pronostico &&
    Object.values(this.historia.pronostico).some(tieneValor)
  );

  // Verificar datos en Recomendaciones
  const hasRecomendacionesData = !!(
    this.historia.recomendaciones &&
    Object.values(this.historia.recomendaciones).some(tieneValor)
  );

  return hasDiagnosticoData || hasPlanTratamientoData || hasPronosticoData || hasRecomendacionesData;
}

// Obtener el tipo de tonometría según el ID
obtenerTipoTonometria(tipoID: number | null | undefined): string {
  if (!tipoID) return 'No especificado';

  const tipos: {[key: number]: string} = {
    31: 'Aplanación',
    32: 'Identación',
    33: 'Aire'
  };

  return tipos[tipoID] || 'Desconocido';
}

// Método para cargar imágenes desde el servidor
cargarImagenesDeteccionAlteraciones(): void {
  if (!this.historia) return;

  // Cargar imagen de campimetría si hay ID pero no base64
  if (this.historia.campimetria?.imagenID && !this.historia.campimetria?.imagenBase64) {
    this.cargarImagenCampimetria(this.historia.campimetria.imagenID);
  }

  // Cargar imágenes de oftalmoscopía si hay IDs pero no base64
  if (this.historia.oftalmoscopia?.ojoDerechoImagenID && !this.historia.oftalmoscopia?.ojoDerechoImagenBase64) {
    this.cargarImagenOftalmoscopiaOD(this.historia.oftalmoscopia.ojoDerechoImagenID);
  }

  if (this.historia.oftalmoscopia?.ojoIzquierdoImagenID && !this.historia.oftalmoscopia?.ojoIzquierdoImagenBase64) {
    this.cargarImagenOftalmoscopiaOI(this.historia.oftalmoscopia.ojoIzquierdoImagenID);
  }
}

// Método para cargar la imagen de campimetría
cargarImagenCampimetria(imagenID: number): void {
  if (!imagenID) return;

  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (typeof base64 === 'string' && base64.length > 0) {
          // Asegurar formato correcto de data URL
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }

          // Actualizar en el objeto historia
          if (this.historia && this.historia.campimetria) {
            this.historia.campimetria.imagenBase64 = base64;
            console.log('Imagen de campimetría cargada correctamente');
          }
        } else {
          console.error('La respuesta no contiene datos válidos de imagen de campimetría');
        }
      },
      error: (error) => {
        console.error('Error al cargar la imagen de campimetría:', error);
      }
    });
}

// Método para cargar la imagen de oftalmoscopía OD
cargarImagenOftalmoscopiaOD(imagenID: number): void {
  if (!imagenID) return;

  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (typeof base64 === 'string' && base64.length > 0) {
          // Asegurar formato correcto de data URL
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }

          // Actualizar en el objeto historia
          if (this.historia && this.historia.oftalmoscopia) {
            this.historia.oftalmoscopia.ojoDerechoImagenBase64 = base64;
            console.log('Imagen de oftalmoscopía OD cargada correctamente');
          }
        } else {
          console.error('La respuesta no contiene datos válidos de imagen de oftalmoscopía OD');
        }
      },
      error: (error) => {
        console.error('Error al cargar la imagen de oftalmoscopía OD:', error);
      }
    });
}

// Método para cargar la imagen de oftalmoscopía OI
cargarImagenOftalmoscopiaOI(imagenID: number): void {
  if (!imagenID) return;

  this.historiaClinicaService.obtenerImagenBase64(imagenID)
    .subscribe({
      next: (base64) => {
        if (typeof base64 === 'string' && base64.length > 0) {
          // Asegurar formato correcto de data URL
          if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
          }

          // Actualizar en el objeto historia
          if (this.historia && this.historia.oftalmoscopia) {
            this.historia.oftalmoscopia.ojoIzquierdoImagenBase64 = base64;
            console.log('Imagen de oftalmoscopía OI cargada correctamente');
          }
        } else {
          console.error('La respuesta no contiene datos válidos de imagen de oftalmoscopía OI');
        }
      },
      error: (error) => {
        console.error('Error al cargar la imagen de oftalmoscopía OI:', error);
      }
    });
}

}