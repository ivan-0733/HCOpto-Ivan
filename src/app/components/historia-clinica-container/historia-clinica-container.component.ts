import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { InterrogatorioComponent } from '../historia-clinica-interrogatorio/historia-clinica-interrogatorio.component';
import { HistoriaClinicaFormComponent } from '../historia-clinica-form/historia-clinica-form.component';
import { AntecedenteVisualComponent } from '../historia-clinica-antecedente-visual/historia-clinica-antecedente-visual.component';
import { ExamenPreliminarComponent } from '../historia-clinica-examen-preliminar/historia-clinica-examen-preliminar.component';
import { EstadoRefractivoComponent } from '../historia-clinica-estado-refractivo/historia-clinica-estado-refractivo.component';
import { BinocularidadComponent } from '../historia-clinica-binocularidad/historia-clinica-binocularidad.component';
import { DeteccionAlteracionesComponent } from '../historia-clinica-alteraciones/historia-clinica-alteraciones.component';
import { DiagnosticoComponent } from '../historia-clinica-diagnostico/historia-clinica-diagnostico.component';
import { RecetaFinalComponent } from '../historia-clinica-receta-final/historia-clinica-receta-final.component';
import { TitleCaseSectionPipe } from '../../pipes/title-case-section.pipe';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
selector: 'app-historia-clinica-container',
templateUrl: './historia-clinica-container.component.html',
styleUrls: ['./historia-clinica-container.component.scss'],
standalone: true,
imports: [
CommonModule,
RouterModule,
InterrogatorioComponent,
HistoriaClinicaFormComponent,
AntecedenteVisualComponent,
ExamenPreliminarComponent,
EstadoRefractivoComponent,
TitleCaseSectionPipe,
BinocularidadComponent,
DeteccionAlteracionesComponent,
DiagnosticoComponent,
RecetaFinalComponent
]
})

export class HistoriaClinicaContainerComponent implements OnInit, AfterViewInit, OnDestroy {
// ViewChild para acceder al contenedor de tabs
@ViewChild('tabsContainer') tabsContainer!: ElementRef<HTMLDivElement>;

scrollSub: Subscription | null = null;
resizeSub: Subscription | null = null;

// Propiedades para controlar la navegación de tabs
canScrollLeft = false;
canScrollRight = false;
scrollAmount = 200; // Cantidad de píxeles a desplazar con cada clic

historiaId: number | null = null;
currentSection = 'datos-generales';
isNewHistoria = true;
loading = false;
submitting = false;
error = '';
success = '';
title = 'Nueva Historia Clínica';
allSectionsRequired = false;
showNavButtons = true;

private destroy$ = new Subject<void>();
ultimoGuardadoLocal: Date | null = null;
mostrarModalBorrador = false;
borradorPendiente: { values: any, timestamp: Date } | null = null;
mostrarModalDescartar = false;

// Lista ordenada de secciones con los nuevos nombres
sections = [
'datos-generales',
'interrogatorio',
'antecedente-visual',
'examen-preliminar',
'estado-refractivo',
'binocularidad',
'deteccion-alteraciones',
'diagnostico',
'receta'
];

// Estado de compleción de cada sección
sectionStatus: {[key: string]: boolean} = {
'datos-generales': false,
'interrogatorio': false,
'antecedente-visual': false,
'examen-preliminar': false,
'estado-refractivo': false,
'binocularidad': false,
'deteccion-alteraciones': false,
'diagnostico': false,
'receta': false
};

// Referencia a los formularios de cada sección
sectionForms: {[key: string]: FormGroup} = {};

// Formularios específicos para antecedente visual
agudezaVisualForm: FormGroup | null = null;
lensometriaForm: FormGroup | null = null;

// Formularios específicos para examen preliminar
alineacionForm: FormGroup | null = null;
motilidadForm: FormGroup | null = null;
exploracionForm: FormGroup | null = null;
viaPupilarForm: FormGroup | null = null;

//Formularios para Estado refractivo
refraccionForm: FormGroup | null = null;
subjetivoCercaForm: FormGroup | null = null;

// Formularios específicos para binocularidad
binocularidadForm: FormGroup | null = null;
selectedFile: File | null = null;
selectedFileName: string = '';
foriasForm: FormGroup | null = null;
vergenciasForm: FormGroup | null = null;
metodoGraficoForm: FormGroup | null = null;
imgPreview: string | null = null;

//Formularios para deteccion de alteraciones
gridAmslerForm: FormGroup | null = null;
tonometriaForm: FormGroup | null = null;
paquimetriaForm: FormGroup | null = null;
campimetriaForm: FormGroup | null = null;
biomicroscopiaForm: FormGroup | null = null;
oftalmoscopiaForm: FormGroup | null = null;
imagenPreviewsDeteccion: {[key: string]: string | null} = {
  gridAmslerOD: null,
  gridAmslerOI: null,
  campimetriaOD: null,
  campimetriaOI: null,
  biomicroscopiaOD1: null,
  biomicroscopiaOI1: null,
  biomicroscopiaOD2: null,
  biomicroscopiaOI2: null,
  biomicroscopiaOD3: null,
  biomicroscopiaOI3: null,
  oftalmoscopiaOD: null,
  oftalmoscopiaOI: null
};

//formularios para diagnostico
diagnosticoForm: FormGroup | null = null;
planTratamientoForm: FormGroup | null = null;
pronosticoForm: FormGroup | null = null;
recomendacionesForm: FormGroup | null = null;

//formulario para receta final
recetaFinalForm: FormGroup | null = null;

// Almacén para los valores de los formularios (persistencia entre navegaciones)
formValues: {[key: string]: any} = {
'datos-generales': null,
'interrogatorio': null,
'agudeza-visual': null,
'lensometria': null,
'alineacion-ocular': null,
'motilidad': null,
'exploracion-fisica': null,
'via-pupilar': null,
'examen-preliminar': null,
'estado-refractivo': null,
'subjetivo-cerca': null,
'binocularidad': null,
'deteccion-alteraciones': null,
'diagnostico': null,
'receta': null,
// Añadir los que faltaban para resetearFormularios
'forias': null,
'vergencias': null,
'metodo-grafico': null,
'grid-amsler': null,
'tonometria': null,
'paquimetria': null,
'campimetria': null,
'biomicroscopia': null,
'oftalmoscopia': null,
'plan-tratamiento': null,
'pronostico': null,
'recomendaciones': null
};

constructor(
private route: ActivatedRoute,
private router: Router,
private historiaClinicaService: HistoriaClinicaService,
private changeDetectorRef: ChangeDetectorRef
) { }

ngOnInit(): void {
  this.route.params.subscribe(params => {
    if (params['id']) {
      this.historiaId = +params['id'];
      this.isNewHistoria = false;
      this.title = `Editar Historia Clínica #${this.historiaId}`;

      // Cargar del servidor PRIMERO
      this.loadHistoriaStatus(); // Esto poblará this.formValues desde la BD
      // La carga del borrador por ID se hace DENTRO de loadHistoriaStatus

    } else {
      // Caso de nueva historia
      this.isNewHistoria = true;
      this.currentSection = 'datos-generales';
      // Inicializar el estado de las secciones para nueva historia
      this.initializeNewHistoriaStatus();

      //Revisar si existe un borrador para NUEVA historia
      this.revisarBorradorNuevaHistoria();
    }
  });
}

// Método para recibir el formulario de datos generales y restaurar sus valores si existen
onFormReady(form: FormGroup): void {
this.sectionForms['datos-generales'] = form;

// Restaurar valores previos si existen
if (this.formValues['datos-generales']) {
  form.patchValue(this.formValues['datos-generales']);
}

// Suscribirse a cambios en el formulario para guardar
this.subscribeToFormChanges('datos-generales', form);
}

// Método para recibir el formulario de interrogatorio y restaurar sus valores si existen
onInterrogatorioFormReady(form: FormGroup): void {
this.sectionForms['interrogatorio'] = form;

// Restaurar valores previos si existen
if (this.formValues['interrogatorio']) {
  form.patchValue(this.formValues['interrogatorio']);
}

// Suscribirse a cambios en el formulario para guardar
this.subscribeToFormChanges('interrogatorio', form);
}

ngAfterViewInit(): void {
  if (this.tabsContainer) {
    this.scrollSub = fromEvent(this.tabsContainer.nativeElement, 'scroll').subscribe(() => {
      this.checkScrollableStatus();
    });
  }
  this.resizeSub = fromEvent(window, 'resize').subscribe(() => {
    this.checkIfNavigationButtonsNeeded();
  });
  // Llama una vez al inicio
  this.checkIfNavigationButtonsNeeded();
}

// Escuchar cambios de tamaño de ventana para actualizar estado de scroll
@HostListener('window:resize')
onResize(): void {
  this.checkIfNavigationButtonsNeeded();
}

// Comprobar si el contenedor de tabs puede desplazarse
checkScrollableStatus(): void {
  if (this.tabsContainer) {
    const element = this.tabsContainer.nativeElement;
    const maxScroll = element.scrollWidth - element.clientWidth;

    // Usar un umbral de 1px para evitar errores de redondeo
    this.canScrollLeft = element.scrollLeft > 1;
    this.canScrollRight = element.scrollLeft < maxScroll - 1;

    // Asegurar que si el scroll está en los extremos, los botones se desactiven
    if (element.scrollLeft <= 0) {
      this.canScrollLeft = false;
    }
    if (element.scrollLeft >= maxScroll) {
      this.canScrollRight = false;
    }
  }
}

scrollTabs(direction: 'left' | 'right'): void {
  if (!this.tabsContainer) return;

  const element = this.tabsContainer.nativeElement;
  const currentScroll = element.scrollLeft;

  // Si tenemos tabs visibles, usamos su ancho como referencia
  const visibleTabs = element.querySelectorAll('button:not(.nav-tab-button)');
  let scrollAmount = this.scrollAmount; // Valor por defecto

  // Si hay tabs visibles, usamos el ancho de la primera como referencia
  if (visibleTabs.length > 0) {
    // Necesitamos hacer un cast a HTMLElement para acceder a offsetWidth
    const firstTabElement = visibleTabs[0] as HTMLElement;
    // Scroll por aproximadamente 2 tabs
    scrollAmount = firstTabElement.offsetWidth * 2;
  }

  // Calcular la nueva posición de scroll
  const newScroll = direction === 'left'
    ? Math.max(0, currentScroll - scrollAmount)
    : currentScroll + scrollAmount;

  // Aplicar el scroll
  element.scrollTo({
    left: newScroll,
    behavior: 'smooth'
  });

  // Actualizar botones después del scroll
  setTimeout(() => {
    this.checkScrollableStatus();
  }, 300);
}

makeActiveTabVisible(): void {
  if (!this.tabsContainer) return;

  setTimeout(() => {
    const element = this.tabsContainer.nativeElement;
    const activeTab = element.querySelector('.active') as HTMLElement;

    if (activeTab) {
      // Obtenemos las posiciones relativas a la página
      const tabRect = activeTab.getBoundingClientRect();
      const containerRect = element.getBoundingClientRect();

      // Calculamos los bordes del área de visualización (teniendo en cuenta los botones)
      const leftVisibleEdge = containerRect.left + 50; // 50px es el ancho aproximado del botón izquierdo
      const rightVisibleEdge = containerRect.right - 50; // 50px es el ancho aproximado del botón derecho

      // Verificamos si el botón activo está dentro del área visible
      if (tabRect.left < leftVisibleEdge) {
        // Si está a la izquierda del área visible, centramos la pestaña en la vista
        const scrollAdjustment = tabRect.left - leftVisibleEdge - 10; // 10px de margen
        element.scrollLeft += scrollAdjustment;
      } else if (tabRect.right > rightVisibleEdge) {
        // Si está a la derecha del área visible, centramos la pestaña en la vista
        const scrollAdjustment = tabRect.right - rightVisibleEdge + 10; // 10px de margen
        element.scrollLeft += scrollAdjustment;
      }

      // Actualizamos el estado de los botones de navegación
      this.checkScrollableStatus();
    }
  }, 100);
}

// Detector de eventos de scroll para los tabs
@HostListener('scroll', ['$event'])
onScroll(event: Event): void {
  const target = event.target as HTMLElement;
  if (target === this.tabsContainer?.nativeElement) {
    // Pequeño retraso para asegurar que el scroll ha terminado
    setTimeout(() => {
      this.checkScrollableStatus();
    }, 100);
  }
}

// Métodos para recibir los formularios de antecedente visual
onAntecedenteVisualFormReady(form: FormGroup): void {
  // Verificar el tipo de formulario recibido analizando sus controles
  if (form.contains('sinRxLejosODSnellen') || form.contains('diametroMM')) {
    this.agudezaVisualForm = form;
    console.log('Formulario de agudeza visual recibido:', form);

    // Restaurar valores previos si existen
    if (this.formValues['agudeza-visual']) {
      form.patchValue(this.formValues['agudeza-visual']);
    }

    this.subscribeToFormChanges('agudeza-visual', form);

  }
  else if (form.contains('ojoDerechoEsfera') || form.contains('tipoBifocalMultifocalID')) {
    this.lensometriaForm = form;
    console.log('Formulario de lensometría recibido:', form);

    // Restaurar valores previos si existen
    if (this.formValues['lensometria']) {
      form.patchValue(this.formValues['lensometria']);
    }

    this.subscribeToFormChanges('lensometria', form);
  }
}

// Método para inicializar el estado de secciones para nueva historia clínica
private initializeNewHistoriaStatus(): void {
  // Inicializar todas las secciones como no completadas
  this.sectionStatus = {
    'datos-generales': false,
    'interrogatorio': false,
    'antecedente-visual': false,
    'examen-preliminar': false,
    'estado-refractivo': false,
    'binocularidad': false,
    'deteccion-alteraciones': false,
    'diagnostico': false,
    'receta': false
  };

  console.log('Estado de secciones inicializado para nueva historia:', this.sectionStatus);
}

// Métodos para recibir los formularios de examen preliminar
onExamenPreliminarFormReady(form: FormGroup): void {
// Verificar el tipo de formulario recibido analizando sus controles
if (form.contains('lejosHorizontal')) {
  this.alineacionForm = form;
  console.log('Formulario de alineación ocular recibido:', form);

  if (this.formValues['alineacion-ocular']) {
    form.patchValue(this.formValues['alineacion-ocular']);
  }
  this.subscribeToFormChanges('alineacion-ocular', form);
}
else if (form.contains('versiones')) {
  this.motilidadForm = form;
  console.log('Formulario de motilidad recibido:', form);

  if (this.formValues['motilidad']) {
    form.patchValue(this.formValues['motilidad']);
  }
  this.subscribeToFormChanges('motilidad', form);
}
else if (form.contains('ojoDerechoAnexos')) {
  this.exploracionForm = form;
  console.log('Formulario de exploración física recibido:', form);

  if (this.formValues['exploracion-fisica']) {
    form.patchValue(this.formValues['exploracion-fisica']);
  }
  this.subscribeToFormChanges('exploracion-fisica', form);
}
else if (form.contains('ojoDerechoDiametro')) {
  this.viaPupilarForm = form;
  console.log('Formulario de vía pupilar recibido:', form);

  if (this.formValues['via-pupilar']) {
    form.patchValue(this.formValues['via-pupilar']);
  }
  this.subscribeToFormChanges('via-pupilar', form);
}
}

// Métodos para recibir los formularios de estado refractivo
onEstadoRefractivoFormReady(form: FormGroup): void {
// Verificar el tipo de formulario recibido analizando sus controles
if (form.contains('ojoDerechoQueratometria')) {
  this.refraccionForm = form;
  console.log('Formulario de refracción recibido:', form);

  if (this.formValues['estado-refractivo']) {
    form.patchValue(this.formValues['estado-refractivo']);
  }
  this.subscribeToFormChanges('estado-refractivo', form);
}
else if (form.contains('valorADD')) {
  this.subjetivoCercaForm = form;
  console.log('Formulario de subjetivo cerca recibido:', form);

  if (this.formValues['subjetivo-cerca']) {
    form.patchValue(this.formValues['subjetivo-cerca']);
  }
  this.subscribeToFormChanges('subjetivo-cerca', form);
}
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();

  if (this.scrollSub) {
    this.scrollSub.unsubscribe();
  }
  if (this.resizeSub) {
    this.resizeSub.unsubscribe();
  }

  if (this.historiaId && this.calculateProgress() === 100) {
    const statusKey = `historia_${this.historiaId}_status`;
    localStorage.removeItem(statusKey);
    console.log('Estado de progreso limpiado del localStorage');
  }
}

// Métodos para recibir los formularios de binocularidad
onBinocularidadFormReady(form: FormGroup): void {
  // Verificar el tipo de formulario recibido analizando sus controles
  if (form.contains('ppc')) {
    this.binocularidadForm = form;
    console.log('Formulario de binocularidad recibido:', form);

    if (this.formValues['binocularidad']) {
      form.patchValue(this.formValues['binocularidad']);
    }
    this.subscribeToFormChanges('binocularidad', form);
  }
  else if (form.contains('horizontalesLejos')) {
    this.foriasForm = form;
    console.log('Formulario de forias recibido:', form);

    if (this.formValues['forias']) {
      form.patchValue(this.formValues['forias']);
    }
    this.subscribeToFormChanges('forias', form);
  }
  else if (form.contains('positivasLejosBorroso')) {
    this.vergenciasForm = form;
    console.log('Formulario de vergencias recibido:', form);

    if (this.formValues['vergencias']) {
      form.patchValue(this.formValues['vergencias']);
    }
    this.subscribeToFormChanges('vergencias', form);
  }
  else if (form.contains('integracionBinocular')) {
    this.metodoGraficoForm = form;
    console.log('Formulario de método gráfico recibido:', form);

    if (this.formValues['metodo-grafico']) {
      form.patchValue(this.formValues['metodo-grafico']);

      if (this.formValues['metodo-grafico'] && this.formValues['metodo-grafico'].imagenBase64) {
        this.imgPreview = this.formValues['metodo-grafico'].imagenBase64;
      }
    }

    if (this.imgPreview) {
      setTimeout(() => {
        this.onImageBase64Change(this.imgPreview);
      }, 100);
    }
    this.subscribeToFormChanges('metodo-grafico', form);
  }
}


// Métodos para recibir los formularios de alteraciones
onDeteccionAlteracionesFormReady(form: FormGroup): void {
  // Verificar el tipo de formulario recibido analizando sus controles
  if (form.contains('numeroCartilla')) {
    this.gridAmslerForm = form;
    console.log('Formulario de Grid de Amsler recibido:', form);

    if (this.formValues['grid-amsler']) {
      form.patchValue(this.formValues['grid-amsler']);
    }

    if (this.formValues['tonometria']) {
      const datosTonometria = { ...this.formValues['tonometria'] };
      if (datosTonometria.fecha) {
        datosTonometria.fecha = new Date(datosTonometria.fecha).toISOString().split('T')[0];
      }
      form.patchValue(datosTonometria);
    }
    this.subscribeToFormChanges('grid-amsler', form);
  }
  else if (form.contains('metodoAnestesico')) {
    this.tonometriaForm = form;
    console.log('Formulario de Tonometría recibido:', form);

    if (this.formValues['tonometria']) {
      form.patchValue(this.formValues['tonometria']);
    }
    this.subscribeToFormChanges('tonometria', form);
  }
  else if (form.contains('ojoDerechoCCT')) {
    this.paquimetriaForm = form;
    console.log('Formulario de Paquimetría recibido:', form);

    if (this.formValues['paquimetria']) {
      form.patchValue(this.formValues['paquimetria']);
    }
    this.subscribeToFormChanges('paquimetria', form);
  }
  else if (form.contains('tamanoColorIndice')) {
    this.campimetriaForm = form;
    console.log('Formulario de Campimetría recibido:', form);

    if (this.formValues['campimetria']) {
      form.patchValue(this.formValues['campimetria']);
    }
    this.subscribeToFormChanges('campimetria', form);
  }
  else if (form.contains('ojoDerechoPestanas')) {
    this.biomicroscopiaForm = form;
    console.log('Formulario de Biomicroscopía recibido:', form);

    if (this.formValues['biomicroscopia']) {
      form.patchValue(this.formValues['biomicroscopia']);
    }
    this.subscribeToFormChanges('biomicroscopia', form);
  }
  else if (form.contains('ojoDerechoPapila')) {
    this.oftalmoscopiaForm = form;
    console.log('Formulario de Oftalmoscopía recibido:', form);

    if (this.formValues['oftalmoscopia']) {
      form.patchValue(this.formValues['oftalmoscopia']);
    }
    this.subscribeToFormChanges('oftalmoscopia', form);
  }
}

onDiagnosticoFormReady(form: FormGroup): void {
  // 1. Identificar diagnóstico por campos únicos
  if (form.contains('ojoDerechoRefractivo')) {
    this.diagnosticoForm = form;
    console.log('Formulario de diagnóstico registrado');

    if (this.formValues['diagnostico']) {
      form.patchValue(this.formValues['diagnostico']);
    }
    this.subscribeToFormChanges('diagnostico', form);
  }
  // 2. Identificar Plan de Tratamiento (es el único con Validators.required)
  else if (form.contains('descripcion') && form.get('descripcion')?.hasValidator(Validators.required)) {
    this.planTratamientoForm = form;
    console.log('Formulario de plan de tratamiento registrado');

    if (this.formValues['plan-tratamiento']) {
      form.patchValue(this.formValues['plan-tratamiento']);
    }
    this.subscribeToFormChanges('plan-tratamiento', form);
  }
  // 3. Identificar Pronóstico (sin validadores requeridos)
  else if (form.contains('descripcion') && !this.pronosticoForm) {
    this.pronosticoForm = form;
    console.log('Formulario de pronóstico registrado');

    if (this.formValues['pronostico']) {
      form.patchValue(this.formValues['pronostico']);
    }
    this.subscribeToFormChanges('pronostico', form);
  }
  // 4. Identificar Recomendaciones (último formulario restante)
  else if (form.contains('descripcion')) {
    this.recomendacionesForm = form;
    console.log('Formulario de recomendaciones registrado');

    if (this.formValues['recomendaciones']) {
      form.patchValue(this.formValues['recomendaciones']);
    }
    this.subscribeToFormChanges('recomendaciones', form);
  }
}

onRecetaFinalFormReady(form: FormGroup): void {
  this.recetaFinalForm = form;
  console.log('Formulario de receta final recibido:', form);

  if (this.formValues['receta']) {
    form.patchValue(this.formValues['receta']);
  }
  this.subscribeToFormChanges('receta', form);
}

// ⭐ INICIO: MÉTODOS AÑADIDOS/MODIFICADOS PARA AUTOGUARDADO

/**
 * Suscripción a cambios del formulario (con debounce).
 */
private subscribeToFormChanges(sectionKey: string, form: FormGroup): void {
  form.valueChanges
    .pipe(
      debounceTime(1000),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      takeUntil(this.destroy$)
    )
    .subscribe(values => {
      if (sectionKey === 'metodo-grafico') {
        this.formValues['metodo-grafico'] = {
          ...values,
          imagenBase64: this.imgPreview || (this.formValues['metodo-grafico'] ? this.formValues['metodo-grafico'].imagenBase64 : null)
        };
      } else {
        this.formValues[sectionKey] = values;
      }

      this.guardarBorradorLocal();

      console.log(`💾 Sección "${sectionKey}" autoguardada en localStorage`);
    });
}

/**
 * Acepta el borrador encontrado y lo carga en los formularios.
 */
aceptarBorrador(): void {
  if (!this.borradorPendiente) return;

  this.formValues = this.borradorPendiente.values;
  this.ultimoGuardadoLocal = this.borradorPendiente.timestamp;
  this.actualizarFormulariosDesdeFormValues();
  this.cerrarModalBorrador();
  console.log('Borrador de nueva historia ACEPTADO y cargado.');
}

/**
 * Rechaza el borrador encontrado, lo limpia y resetea los formularios.
 */
rechazarBorrador(): void {
  this.cerrarModalBorrador();
  this.limpiarBorradorLocal('nueva'); // Limpia solo el borrador de "nueva"
  this.resetearFormularios(); // Resetea los valores en memoria y los forms
  console.log('Borrador de nueva historia RECHAZADO y limpiado.');
}

/**
 * Cierra el modal de confirmación de borrador.
 */
private cerrarModalBorrador(): void {
  this.mostrarModalBorrador = false;
  this.borradorPendiente = null;
}

/**
 * Abre el modal para confirmar el descarte manual del borrador.
 */
abrirModalDescartar(): void {
  this.mostrarModalDescartar = true;
}

/**
 * Cierra el modal de descarte manual.
 */
cerrarModalDescartar(): void {
  this.mostrarModalDescartar = false;
}

/**
 * Confirma el descarte manual del borrador actual (nuevo o por ID).
 */
confirmarDescartarBorrador(): void {
  const tipo = this.isNewHistoria ? 'nueva' : 'id';
  this.limpiarBorradorLocal(tipo);
  this.resetearFormularios();

  // Si es una historia existente, recargar desde el servidor para restaurar datos
  if (!this.isNewHistoria) {
    this.loadHistoriaStatus();
  }

  this.cerrarModalDescartar();
  console.log(`Borrador manual descartado (tipo: ${tipo}).`);
}

// ==========================================
// LÓGICA PRINCIPAL DE BORRADORES
// ==========================================

/**
 * Resetea todos los valores en memoria (formValues) y los FormGroups.
 */
private resetearFormularios(): void {
  // 1. Resetear el almacén de valores
  this.formValues = {
    'datos-generales': null,
    'interrogatorio': null,
    'agudeza-visual': null,
    'lensometria': null,
    'alineacion-ocular': null,
    'motilidad': null,
    'exploracion-fisica': null,
    'via-pupilar': null,
    'examen-preliminar': null,
    'estado-refractivo': null,
    'subjetivo-cerca': null,
    'binocularidad': null,
    'deteccion-alteraciones': null,
    'diagnostico': null,
    'receta': null,
    'forias': null,
    'vergencias': null,
    'metodo-grafico': null,
    'grid-amsler': null,
    'tonometria': null,
    'paquimetria': null,
    'campimetria': null,
    'biomicroscopia': null,
    'oftalmoscopia': null,
    'plan-tratamiento': null,
    'pronostico': null,
    'recomendaciones': null
  };

  // 2. Resetear todos los FormGroups
  Object.values(this.sectionForms).forEach(form => form?.reset());
  this.agudezaVisualForm?.reset();
  this.lensometriaForm?.reset();
  this.alineacionForm?.reset();
  this.motilidadForm?.reset();
  this.exploracionForm?.reset();
  this.viaPupilarForm?.reset();
  this.refraccionForm?.reset();
  this.subjetivoCercaForm?.reset();
  this.binocularidadForm?.reset();
  this.foriasForm?.reset();
  this.vergenciasForm?.reset();
  this.metodoGraficoForm?.reset();
  this.gridAmslerForm?.reset();
  this.tonometriaForm?.reset();
  this.paquimetriaForm?.reset();
  this.campimetriaForm?.reset();
  this.biomicroscopiaForm?.reset();
  this.oftalmoscopiaForm?.reset();
  this.diagnosticoForm?.reset();
  this.planTratamientoForm?.reset();
  this.pronosticoForm?.reset();
  this.recomendacionesForm?.reset();
  this.recetaFinalForm?.reset();

  // 3. Resetear vistas previas de imágenes
  this.imgPreview = null;
  this.imagenPreviewsDeteccion = {
    gridAmslerOD: null,
    gridAmslerOI: null,
    campimetriaOD: null,
    campimetriaOI: null,
    biomicroscopiaOD1: null,
    biomicroscopiaOI1: null,
    biomicroscopiaOD2: null,
    biomicroscopiaOI2: null,
    biomicroscopiaOD3: null,
    biomicroscopiaOI3: null,
    oftalmoscopiaOD: null,
    oftalmoscopiaOI: null
  };

  console.log('Formularios y valores en memoria reseteados.');
}

/**
 * Revisa si existe un borrador para una NUEVA historia.
 * Si es válido, muestra el modal de confirmación.
 * Si es inválido (antiguo), lo limpia.
 */
private revisarBorradorNuevaHistoria(): void {
  const storageKey = 'historia_nueva_borradores';
  const timestampKey = 'historia_nueva_timestamp_local';

  const borradorJSON = localStorage.getItem(storageKey);
  const timestampJSON = localStorage.getItem(timestampKey);

  if (borradorJSON && timestampJSON) {
    try {
      const values = JSON.parse(borradorJSON);
      const timestamp = new Date(timestampJSON);

      if (this.validarAntiguedadBorrador(timestamp)) {
        // Borrador válido encontrado, mostrar modal
        this.borradorPendiente = { values, timestamp };
        this.mostrarModalBorrador = true;
        console.warn(`Borrador de NUEVA HISTORIA encontrado. Mostrando modal.`);
      } else {
        // Borrador muy antiguo, descartar
        console.log('Borrador de nueva historia es muy antiguo (mayor a 7 días), descartando.');
        this.limpiarBorradorLocal('nueva');
      }
    } catch (e) {
      console.error('Error al parsear borrador de nueva historia', e);
      this.limpiarBorradorLocal('nueva');
    }
  }
}

/**
 * Valida si un borrador tiene menos de X días de antigüedad.
 */
private validarAntiguedadBorrador(timestamp: Date): boolean {
  const maxDias = 7; // 7 días de antigüedad máxima
  const diasDiferencia = (new Date().getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
  return diasDiferencia <= maxDias;
}

/**
 * Carga el borrador guardado desde localStorage para una HISTORIA EXISTENTE (por ID).
 */
private cargarBorradorLocalPorId(): void {
  // Guard clause: Solo para historias con ID
  if (!this.historiaId) return;

  const storageKey = `historia_${this.historiaId}_borradores`;
  const timestampKey = `historia_${this.historiaId}_timestamp_local`;

  const borradorJSON = localStorage.getItem(storageKey);
  const timestampJSON = localStorage.getItem(timestampKey);

  if (borradorJSON && timestampJSON) {
    try {
      // Aquí podríamos comparar timestamps con el servidor, pero por ahora
      // asumimos que el borrador local es el deseado si existe.
      this.formValues = JSON.parse(borradorJSON);
      this.ultimoGuardadoLocal = new Date(timestampJSON);
      console.warn(`BORRADOR LOCAL (ID: ${this.historiaId}) CARGADO: Se han restaurado los cambios de ${this.ultimoGuardadoLocal.toLocaleString()}`);

      // Forzar la actualización de los formularios que ya estén listos
      this.actualizarFormulariosDesdeFormValues();

    } catch (e) {
      console.error(`Error al parsear borrador de localStorage (ID: ${this.historiaId})`, e);
      localStorage.removeItem(storageKey);
      localStorage.removeItem(timestampKey);
    }
  }
}

/**
 * Fuerza la actualización de todos los formularios existentes con los datos
 * de this.formValues. Útil después de cargar un borrador local.
 */
private actualizarFormulariosDesdeFormValues(): void {
  console.log('Forzando actualización de formularios desde formValues cargados');

  if (this.sectionForms['datos-generales'] && this.formValues['datos-generales']) {
    this.sectionForms['datos-generales'].patchValue(this.formValues['datos-generales'], { emitEvent: false });
  }
  if (this.sectionForms['interrogatorio'] && this.formValues['interrogatorio']) {
    this.sectionForms['interrogatorio'].patchValue(this.formValues['interrogatorio'], { emitEvent: false });
  }
  if (this.agudezaVisualForm && this.formValues['agudeza-visual']) {
    this.agudezaVisualForm.patchValue(this.formValues['agudeza-visual'], { emitEvent: false });
  }
  if (this.lensometriaForm && this.formValues['lensometria']) {
    this.lensometriaForm.patchValue(this.formValues['lensometria'], { emitEvent: false });
  }
  if (this.alineacionForm && this.formValues['alineacion-ocular']) {
    this.alineacionForm.patchValue(this.formValues['alineacion-ocular'], { emitEvent: false });
  }
  if (this.motilidadForm && this.formValues['motilidad']) {
    this.motilidadForm.patchValue(this.formValues['motilidad'], { emitEvent: false });
  }
  if (this.exploracionForm && this.formValues['exploracion-fisica']) {
    this.exploracionForm.patchValue(this.formValues['exploracion-fisica'], { emitEvent: false });
  }
  if (this.viaPupilarForm && this.formValues['via-pupilar']) {
    this.viaPupilarForm.patchValue(this.formValues['via-pupilar'], { emitEvent: false });
  }
  if (this.refraccionForm && this.formValues['estado-refractivo']) {
    this.refraccionForm.patchValue(this.formValues['estado-refractivo'], { emitEvent: false });
  }
  if (this.subjetivoCercaForm && this.formValues['subjetivo-cerca']) {
    this.subjetivoCercaForm.patchValue(this.formValues['subjetivo-cerca'], { emitEvent: false });
  }
  if (this.binocularidadForm && this.formValues['binocularidad']) {
    this.binocularidadForm.patchValue(this.formValues['binocularidad'], { emitEvent: false });
  }
  if (this.foriasForm && this.formValues['forias']) {
    this.foriasForm.patchValue(this.formValues['forias'], { emitEvent: false });
  }
  if (this.vergenciasForm && this.formValues['vergencias']) {
    this.vergenciasForm.patchValue(this.formValues['vergencias'], { emitEvent: false });
  }
  if (this.metodoGraficoForm && this.formValues['metodo-grafico']) {
    this.metodoGraficoForm.patchValue(this.formValues['metodo-grafico'], { emitEvent: false });
  }
  if (this.gridAmslerForm && this.formValues['grid-amsler']) {
    this.gridAmslerForm.patchValue(this.formValues['grid-amsler'], { emitEvent: false });
  }
  if (this.tonometriaForm && this.formValues['tonometria']) {
    this.tonometriaForm.patchValue(this.formValues['tonometria'], { emitEvent: false });
  }
  if (this.paquimetriaForm && this.formValues['paquimetria']) {
    this.paquimetriaForm.patchValue(this.formValues['paquimetria'], { emitEvent: false });
  }
  if (this.campimetriaForm && this.formValues['campimetria']) {
    this.campimetriaForm.patchValue(this.formValues['campimetria'], { emitEvent: false });
  }
  if (this.biomicroscopiaForm && this.formValues['biomicroscopia']) {
    this.biomicroscopiaForm.patchValue(this.formValues['biomicroscopia'], { emitEvent: false });
  }
  if (this.oftalmoscopiaForm && this.formValues['oftalmoscopia']) {
    this.oftalmoscopiaForm.patchValue(this.formValues['oftalmoscopia'], { emitEvent: false });
  }
  if (this.diagnosticoForm && this.formValues['diagnostico']) {
    this.diagnosticoForm.patchValue(this.formValues['diagnostico'], { emitEvent: false });
  }
  if (this.planTratamientoForm && this.formValues['plan-tratamiento']) {
    this.planTratamientoForm.patchValue(this.formValues['plan-tratamiento'], { emitEvent: false });
  }
  if (this.pronosticoForm && this.formValues['pronostico']) {
    this.pronosticoForm.patchValue(this.formValues['pronostico'], { emitEvent: false });
  }
  if (this.recomendacionesForm && this.formValues['recomendaciones']) {
    this.recomendacionesForm.patchValue(this.formValues['recomendaciones'], { emitEvent: false });
  }
  if (this.recetaFinalForm && this.formValues['receta']) {
    this.recetaFinalForm.patchValue(this.formValues['receta'], { emitEvent: false });
  }
}

/**
 * Guarda todos los datos del formulario en localStorage
 * Se ejecuta con cada cambio del usuario (con debounce de 1 segundo)
 */
private guardarBorradorLocal(): void {
  const storageKey = this.historiaId
    ? `historia_${this.historiaId}_borradores`
    : 'historia_nueva_borradores';

  const timestampKey = this.historiaId
    ? `historia_${this.historiaId}_timestamp_local`
    : 'historia_nueva_timestamp_local';

  localStorage.setItem(storageKey, JSON.stringify(this.formValues));
  localStorage.setItem(timestampKey, new Date().toISOString());

  this.ultimoGuardadoLocal = new Date();

  console.log('💾 Borrador guardado en localStorage');
}

/**
 * Limpia el borrador de localStorage después de un guardado exitoso.
 */
private limpiarBorradorLocal(tipo: 'nueva' | 'id' | 'ambos'): void {
  console.log(`Limpiando borrador local (tipo: ${tipo})`);

  if (tipo === 'nueva' || tipo === 'ambos') {
    localStorage.removeItem('historia_nueva_borradores');
    localStorage.removeItem('historia_nueva_timestamp_local');
    console.log('Borrador de "nueva historia" limpiado.');
  }

  // Limpia el ID actual si se especifica 'id' o 'ambos'
  if ((tipo === 'id' || tipo === 'ambos') && this.historiaId) {
    const storageKeyId = `historia_${this.historiaId}_borradores`;
    const timestampKeyId = `historia_${this.historiaId}_timestamp_local`;
    localStorage.removeItem(storageKeyId);
    localStorage.removeItem(timestampKeyId);
    console.log(`Borrador de historia ID ${this.historiaId} limpiado.`);
  } else if (tipo === 'id' && !this.historiaId) {
    console.warn('Se intentó limpiar borrador "id" pero this.historiaId es null.');
  }

  // Si se limpió el borrador que se está usando
  if ((tipo === 'nueva' && this.isNewHistoria) || (tipo === 'id' && !this.isNewHistoria && this.historiaId)) {
    this.ultimoGuardadoLocal = null;
  }
}

// ⭐ FIN: MÉTODOS DE MANEJO DE BORRADOR


checkIfNavigationButtonsNeeded(): void {
  if (!this.tabsContainer) return;

  const element = this.tabsContainer.nativeElement;
  const availableWidth = element.clientWidth - 100; // 50px por botón
  const contentWidth = element.scrollWidth;

  this.showNavButtons = contentWidth > availableWidth;
  this.checkScrollableStatus(); // Forzar actualización
}

loadHistoriaStatus(): void {
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
        console.log('Historia clínica cargada:', historia);

        // ... (TODA LA LÓGICA DE CARGA DE DATOS DE 'historia' A 'sectionStatus' y 'formValues') ...
        this.sectionStatus['datos-generales'] = true;
        this.sectionStatus['interrogatorio'] = !!historia.interrogatorio;
        this.sectionStatus['antecedente-visual'] =
          (!!historia.agudezaVisual && historia.agudezaVisual.length > 0) ||
          !!historia.lensometria;
        this.sectionStatus['examen-preliminar'] =
          !!historia.alineacionOcular ||
          !!historia.motilidad ||
          !!historia.exploracionFisica ||
          !!historia.viaPupilar;
        this.sectionStatus['estado-refractivo'] =
          !!historia.estadoRefractivo || !!historia.subjetivoCerca;
        this.sectionStatus['binocularidad'] =
          !!historia.binocularidad ||
          !!historia.forias ||
          !!historia.vergencias ||
          !!historia.metodoGrafico;
        this.sectionStatus['deteccion-alteraciones'] =
          !!historia.gridAmsler ||
          !!historia.tonometria ||
          !!historia.paquimetria ||
          !!historia.campimetria ||
          !!historia.biomicroscopia ||
          !!historia.oftalmoscopia;
        this.sectionStatus['diagnostico'] = !!historia.diagnostico;
        this.sectionStatus['receta'] = !!historia.recetaFinal;

        this.formValues['datos-generales'] = {
          fecha: new Date(historia.Fecha).toISOString().split('T')[0],
          materiaProfesorID: historia.MateriaProfesorID,
          consultorioID: historia.ConsultorioID,
          periodoEscolarID: historia.PeriodoEscolarID,
          paciente: {
            id: historia.PacienteID,
            nombre: historia.Nombre,
            apellidoPaterno: historia.ApellidoPaterno,
            apellidoMaterno: historia.ApellidoMaterno || '',
            edad: historia.Edad,
            generoID: historia.GeneroID,
            estadoCivilID: historia.EstadoCivilID,
            escolaridadID: historia.EscolaridadID,
            ocupacion: historia.Ocupacion,
            direccionLinea1: historia.DireccionLinea1,
            ciudad: historia.Ciudad,
            estadoID: historia.PacienteEstadoID,
            codigoPostal: historia.CodigoPostal,
            pais: historia.Pais,
            correoElectronico: historia.CorreoElectronico,
            telefonoCelular: historia.TelefonoCelular,
            telefono: historia.Telefono
          }
        };

        if (historia.interrogatorio) {
        this.formValues['interrogatorio'] = {
          motivoConsulta: historia.interrogatorio.MotivoConsulta,
          heredoFamiliares: historia.interrogatorio.HeredoFamiliares,
          noPatologicos: historia.interrogatorio.NoPatologicos,
          patologicos: historia.interrogatorio.Patologicos,
          visualesOculares: historia.interrogatorio.VisualesOculares,
          padecimientoActual: historia.interrogatorio.PadecimientoActual,
          prediagnostico: historia.interrogatorio.Prediagnostico
        };
      }
        if (historia.agudezaVisual) {
          this.formValues['agudeza-visual'] = historia.agudezaVisual;
        }
        if (historia.lensometria) {
          this.formValues['lensometria'] = historia.lensometria;
        }
        if (historia.alineacionOcular) {
          this.formValues['alineacion-ocular'] = historia.alineacionOcular;
        }
        if (historia.motilidad) {
          this.formValues['motilidad'] = historia.motilidad;
        }
        if (historia.exploracionFisica) {
          this.formValues['exploracion-fisica'] = historia.exploracionFisica;
        }
        if (historia.viaPupilar) {
          this.formValues['via-pupilar'] = historia.viaPupilar;
        }
        if (historia.estadoRefractivo) {
          this.formValues['estado-refractivo'] = historia.estadoRefractivo;
        }
        if (historia.subjetivoCerca) {
          this.formValues['subjetivo-cerca'] = historia.subjetivoCerca;
        }
        if (historia.binocularidad) {
          this.formValues['binocularidad'] = historia.binocularidad;
        }
        if (historia.forias) {
          this.formValues['forias'] = historia.forias;
        }
        if (historia.vergencias) {
          this.formValues['vergencias'] = historia.vergencias;
        }
        if (historia.metodoGrafico) {
          this.formValues['metodo-grafico'] = historia.metodoGrafico;
        }
        if (historia.gridAmsler) {
          this.formValues['grid-amsler'] = historia.gridAmsler;
        }
        if (historia.tonometria) {
          const tonometriaData = { ...historia.tonometria };
          if (tonometriaData.fecha) {
            tonometriaData.fecha = new Date(tonometriaData.fecha).toISOString().split('T')[0];
          }
          this.formValues['tonometria'] = tonometriaData;
        }
        if (historia.paquimetria) {
          this.formValues['paquimetria'] = historia.paquimetria;
        }
        if (historia.campimetria) {
          this.formValues['campimetria'] = historia.campimetria;
        }
        if (historia.biomicroscopia) {
          this.formValues['biomicroscopia'] = historia.biomicroscopia;
        }
        if (historia.oftalmoscopia) {
          this.formValues['oftalmoscopia'] = historia.oftalmoscopia;
        }
        if (historia.diagnostico) {
          this.formValues['diagnostico'] = historia.diagnostico;
        }
        if (historia.planTratamiento) {
          this.formValues['plan-tratamiento'] = historia.planTratamiento;
        }
        if (historia.pronostico) {
          this.formValues['pronostico'] = historia.pronostico;
        }
        if (historia.recomendaciones) {
          const recomendacionesData = { ...historia.recomendaciones };
          (recomendacionesData as any).proximaCita = recomendacionesData.ProximaCita;
          if (recomendacionesData.ProximaCita) {
            recomendacionesData.ProximaCita = new Date(recomendacionesData.ProximaCita).toISOString().split('T')[0];
          }
          this.formValues['recomendaciones'] = recomendacionesData;
        }
        if (historia.recetaFinal) {
          this.formValues['receta'] = historia.recetaFinal;
        }

        console.log('Historia cargada para edición - FormValues actualizados:', this.formValues);

        // ⭐ CORREGIDO: Llamar al método renombrado para cargar borrador por ID
        this.cargarBorradorLocalPorId();

        const statusKey = `historia_${this.historiaId}_status`;
        localStorage.setItem(statusKey, JSON.stringify(this.sectionStatus));
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Error al cargar la historia clínica. Intente nuevamente';
        console.error('Error al cargar historia clínica:', error);
      }
    });
}

// Método centralizado para guardar toda la historia clínica
guardarSeccionActual(): void {
this.actualizarFormValues();

if (this.isNewHistoria && !this.historiaId) {
  this.crearNuevaHistoria();
} else {
  this.actualizarHistoriaCompleta();
}
}

// Actualizar todos los valores de formularios
private actualizarFormValues(): void {
  if (this.sectionForms['datos-generales']) {
    this.formValues['datos-generales'] = this.sectionForms['datos-generales'].value;
  }
  if (this.sectionForms['interrogatorio']) {
    this.formValues['interrogatorio'] = this.sectionForms['interrogatorio'].value;
  }
  if (this.agudezaVisualForm) {
    this.formValues['agudeza-visual'] = this.agudezaVisualForm.value;
  }
  if (this.lensometriaForm) {
    this.formValues['lensometria'] = this.lensometriaForm.value;
  }
  if (this.alineacionForm) {
    this.formValues['alineacion-ocular'] = this.alineacionForm.value;
  }
  if (this.motilidadForm) {
    this.formValues['motilidad'] = this.motilidadForm.value;
  }
  if (this.exploracionForm) {
    this.formValues['exploracion-fisica'] = this.exploracionForm.value;
  }
  if (this.viaPupilarForm) {
    this.formValues['via-pupilar'] = this.viaPupilarForm.value;
  }
  if (this.refraccionForm) {
    this.formValues['estado-refractivo'] = this.refraccionForm.value;
  }
  if (this.subjetivoCercaForm) {
    this.formValues['subjetivo-cerca'] = this.subjetivoCercaForm.value;
  }
  if (this.binocularidadForm) {
    this.formValues['binocularidad'] = this.binocularidadForm.value;
  }
  if (this.foriasForm) {
    this.formValues['forias'] = this.foriasForm.value;
  }
  if (this.vergenciasForm) {
    this.formValues['vergencias'] = this.vergenciasForm.value;
  }
  if (this.metodoGraficoForm) {
    this.formValues['metodo-grafico'] = this.metodoGraficoForm.value;
  }
  if (this.gridAmslerForm) {
    this.formValues['grid-amsler'] = this.gridAmslerForm.value;
  }
  if (this.tonometriaForm) {
    this.formValues['tonometria'] = this.tonometriaForm.value;
  }
  if (this.paquimetriaForm) {
    this.formValues['paquimetria'] = this.paquimetriaForm.value;
  }
  if (this.campimetriaForm) {
    this.formValues['campimetria'] = this.campimetriaForm.value;
  }
  if (this.biomicroscopiaForm) {
    this.formValues['biomicroscopia'] = this.biomicroscopiaForm.value;
  }
  if (this.oftalmoscopiaForm) {
    this.formValues['oftalmoscopia'] = this.oftalmoscopiaForm.value;
  }
  if (this.diagnosticoForm) {
    this.formValues['diagnostico'] = this.diagnosticoForm.value;
  }
  if (this.planTratamientoForm) {
    this.formValues['plan-tratamiento'] = this.planTratamientoForm.value;
  }
  if (this.pronosticoForm) {
    this.formValues['pronostico'] = this.pronosticoForm.value;
  }
  if (this.recomendacionesForm) {
    this.formValues['recomendaciones'] = this.recomendacionesForm.value;
  }
  if (this.recetaFinalForm) {
  this.formValues['receta'] = this.recetaFinalForm.value;
  }
}

// Método para crear una nueva historia clínica
crearNuevaHistoria(): void {
  // ... (Validaciones) ...
  if (!this.sectionForms['datos-generales']) {
    this.error = 'No se puede crear la historia clínica.';
    return;
  }
  if (this.sectionForms['datos-generales'].invalid) {
    this.error = 'Por favor, complete todos los campos obligatorios en Datos Generales antes de guardar.';
    this.marcarFormularioComoTocado(this.sectionForms['datos-generales']);
    this.currentSection = 'datos-generales';
    return;
  }
  if (this.sectionForms['interrogatorio'] && this.sectionForms['interrogatorio'].invalid) {
    this.error = 'Por favor, complete todos los campos obligatorios en Interrogatorio antes de guardar.';
    this.marcarFormularioComoTocado(this.sectionForms['interrogatorio']);
    this.currentSection = 'interrogatorio';
    return;
  }

  this.submitting = true;
  this.error = '';
  this.success = '';

  const datosHistoria = {...this.formValues['datos-generales']};
  datosHistoria.NombreMateria = "Materia Seleccionada";
  if (datosHistoria.periodoEscolarID) {
    datosHistoria.PeriodoEscolarID = datosHistoria.periodoEscolarID;
  } else {
    this.error = 'Por favor, seleccione un período escolar antes de guardar.';
    this.marcarFormularioComoTocado(this.sectionForms['datos-generales']);
    this.currentSection = 'datos-generales';
    this.submitting = false;
    return;
  }

  console.log('Datos a enviar al servidor:', datosHistoria);

  const imagenesBase64 = {
    metodoGrafico: this.formValues['metodo-grafico']?.imagenBase64 || this.imgPreview,
    campimetria: this.formValues['campimetria']?.imagenBase64 || this.imgPreview,
    oftalmoscopiaOD: this.formValues['oftalmoscopia']?.ojoDerechoImagenBase64,
    oftalmoscopiaOI: this.formValues['oftalmoscopia']?.ojoIzquierdoImagenBase64
  };

  const secciones = {
    interrogatorio: this.formValues['interrogatorio'],
    agudezaVisual: this.formValues['agudeza-visual'] ?
    this.convertirFormDataAAgudezaVisual(this.formValues['agudeza-visual']) : [],
    lensometria: this.formValues['lensometria'],
    alineacionOcular: this.formValues['alineacion-ocular'],
    motilidad: this.formValues['motilidad'],
    exploracionFisica: this.formValues['exploracion-fisica'],
    viaPupilar: this.formValues['via-pupilar'],
    estadoRefractivo: this.formValues['estado-refractivo'],
    subjetivoCerca: this.formValues['subjetivo-cerca'],
    binocularidad: this.formValues['binocularidad'],
    forias: this.formValues['forias'],
    vergencias: this.formValues['vergencias'],
    metodoGrafico: { ...this.formValues['metodo-grafico'] },
    gridAmsler: this.formValues['grid-amsler'],
    tonometria: this.formValues['tonometria'],
    paquimetria: this.formValues['paquimetria'],
    campimetria: this.formValues['campimetria'],
    biomicroscopia: this.formValues['biomicroscopia'],
    oftalmoscopia: this.formValues['oftalmoscopia'],
    diagnostico: this.formValues['diagnostico'],
    planTratamiento: this.formValues['plan-tratamiento'],
    pronostico: this.formValues['pronostico'],
    recomendaciones: this.formValues['recomendaciones'],
    recetaFinal: this.formValues['receta']
  };

  if (secciones.metodoGrafico && 'imagenBase64' in secciones.metodoGrafico) {
    delete secciones.metodoGrafico.imagenBase64;
  }
  if (secciones.campimetria && 'imagenBase64' in secciones.campimetria) {
    delete secciones.campimetria.imagenBase64;
  }

  this.historiaClinicaService.crearHistoriaClinicaCompleta(datosHistoria, secciones)
    .pipe(
      finalize(() => {
        this.submitting = false;
      })
    )
    .subscribe({
      next: (response) => {
        const newHistoriaId = response.data.historiaCreada.ID;

        if (newHistoriaId) {
          this.onHistoriaCreated(newHistoriaId);
          this.success = 'Historia clínica creada correctamente.';

          // ⭐ ESTE ES EL ARREGLO IMPORTANTE
          this.limpiarBorradorLocal('ambos');

          for (const seccionKey in secciones) {
            if (
              Object.prototype.hasOwnProperty.call(secciones, seccionKey) &&
              secciones[seccionKey as keyof typeof secciones] &&
              typeof secciones[seccionKey as keyof typeof secciones] === 'object' &&
              Object.keys(secciones[seccionKey as keyof typeof secciones]).length > 0
            ) {
              const statusKey = this.convertirNombreSeccionAStatusKey(seccionKey);
              if (statusKey) {
                this.sectionStatus[statusKey] = true;
              }
            }
          }

          const promesasImagenes: Promise<void>[] = [];
          // ... (Lógica de subida de imágenes - sin cambios) ...
          if (imagenesBase64.metodoGrafico) {
            promesasImagenes.push(
              this.uploadBase64Image(
                newHistoriaId,
                imagenesBase64.metodoGrafico,
                '12',
                '2'
              ).then(imageId => {
                if (imageId) {
                  return new Promise<void>((resolve) => {
                    this.historiaClinicaService.actualizarSeccion(
                      newHistoriaId,
                      'metodo-grafico',
                      {
                        ...this.formValues['metodo-grafico'],
                        imagenID: imageId,
                        imagenBase64: undefined
                      }
                    ).subscribe({
                      next: () => {
                        console.log('Sección metodoGrafico actualizada con ID de imagen:', imageId);
                        resolve();
                      },
                      error: (err) => {
                        console.error('Error al actualizar sección con ID de imagen:', err);
                        resolve();
                      }
                    });
                  });
                }
                return Promise.resolve();
              })
            );
          }
          if (imagenesBase64.campimetria) {
            promesasImagenes.push(
              this.uploadBase64Image(
                newHistoriaId,
                imagenesBase64.campimetria,
                '9',
                '3'
              ).then(imageId => {
                if (imageId) {
                  return new Promise<void>((resolve) => {
                    this.historiaClinicaService.actualizarSeccion(
                      newHistoriaId,
                      'campimetria',
                      {
                        ...this.formValues['campimetria'],
                        imagenID: imageId,
                        imagenBase64: undefined
                      }
                    ).subscribe({
                      next: () => {
                        console.log('Sección campimetría actualizada con ID de imagen:', imageId);
                        resolve();
                      },
                      error: (err) => {
                        console.error('Error al actualizar sección campimetría con ID de imagen:', err);
                        resolve();
                      }
                    });
                  });
                }
                return Promise.resolve();
              })
            );
          }
          if (imagenesBase64.oftalmoscopiaOD) {
            promesasImagenes.push(
              this.uploadBase64Image(
                newHistoriaId,
                imagenesBase64.oftalmoscopiaOD,
                '11',
                '5',
                true
              ).then(imageId => {
                if (imageId) {
                  return new Promise<void>((resolve) => {
                    const datosOftalmoscopia = {
                      ...this.formValues['oftalmoscopia'],
                      ojoDerechoImagenID: imageId,
                      ojoDerechoImagenBase64: undefined
                    };
                    this.historiaClinicaService.actualizarSeccion(
                      newHistoriaId,
                      'oftalmoscopia',
                      datosOftalmoscopia
                    ).subscribe({
                      next: () => {
                        console.log('Sección oftalmoscopía OD actualizada con ID de imagen:', imageId);
                        resolve();
                      },
                      error: (err) => {
                        console.error('Error al actualizar oftalmoscopía OD con ID de imagen:', err);
                        resolve();
                      }
                    });
                  });
                }
                return Promise.resolve();
              })
            );
          }
          if (imagenesBase64.oftalmoscopiaOI) {
            promesasImagenes.push(
              this.uploadBase64Image(
                newHistoriaId,
                imagenesBase64.oftalmoscopiaOI,
                '11',
                '5',
                false
              ).then(imageId => {
                if (imageId) {
                  return new Promise<void>((resolve) => {
                    const datosOftalmoscopia = {
                      ...this.formValues['oftalmoscopia'],
                      ojoIzquierdoImagenID: imageId,
                      ojoIzquierdoImagenBase64: undefined
                    };
                    this.historiaClinicaService.actualizarSeccion(
                      newHistoriaId,
                      'oftalmoscopia',
                      datosOftalmoscopia
                    ).subscribe({
                      next: () => {
                        console.log('Sección oftalmoscopía OI actualizada con ID de imagen:', imageId);
                        resolve();
                      },
                      error: (err) => {
                        console.error('Error al actualizar oftalmoscopía OI con ID de imagen:', err);
                        resolve();
                      }
                    });
                  });
                }
                return Promise.resolve();
              })
            );
          }

          Promise.all(promesasImagenes)
          .then(() => {
            console.log('Todas las imágenes procesadas correctamente');
            this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
              this.router.navigateByUrl(`/alumno/historias/${newHistoriaId}`);
            });
          })
          .catch(err => {
            console.error('Error procesando imágenes:', err);
            this.success = 'Historia clínica creada correctamente, pero hubo problemas al subir algunas imágenes.';
            setTimeout(() => {
              this.router.navigate(['/alumno/historias', newHistoriaId]);
            }, 1500);
          });
        } else {
          this.error = 'Se creó la historia pero hubo un problema al obtener su identificador.';
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Error al crear la historia clínica. Por favor, intente nuevamente.';
      }
    });
}

// Método auxiliar para convertir nombres de sección del formato API al formato del componente
private convertirNombreSeccionAStatusKey(nombreSeccion: string): string | null {
  const mapeo: { [key: string]: string } = {
    'interrogatorio': 'interrogatorio',
    'agudezaVisual': 'antecedente-visual',
    'lensometria': 'antecedente-visual',
    'alineacionOcular': 'examen-preliminar',
    'motilidad': 'examen-preliminar',
    'exploracionFisica': 'examen-preliminar',
    'viaPupilar': 'examen-preliminar',
    'estadoRefractivo': 'estado-refractivo',
    'subjetivoCerca': 'estado-refractivo',
    'binocularidad': 'binocularidad',
    'forias': 'binocularidad',
    'vergencias': 'binocularidad',
    'metodoGrafico': 'binocularidad',
    'gridAmsler': 'deteccion-alteraciones',
    'tonometria': 'deteccion-alteraciones',
    'paquimetria': 'deteccion-alteraciones',
    'campimetria': 'deteccion-alteraciones',
    'biomicroscopia': 'deteccion-alteraciones',
    'oftalmoscopia': 'deteccion-alteraciones',
    'diagnostico': 'diagnostico',
    'planTratamiento': 'diagnostico',
    'pronostico': 'diagnostico',
    'recomendaciones': 'diagnostico',
    'recetaFinal': 'receta'
  };

  return mapeo[nombreSeccion] || null;
}


private actualizarHistoriaCompleta(): void {
if (!this.historiaId) {
    this.error = 'No hay una historia clínica activa para actualizar.';
    return;
  }
  if (!this.validarFormulariosObligatorios()) {
    return;
  }
  this.submitting = true;
  this.error = '';
  this.success = '';
  const datosGenerales = this.formValues['datos-generales'];

  this.historiaClinicaService.actualizarSeccion(this.historiaId, 'datos-generales', datosGenerales)
    .pipe(
      finalize(() => {
        this.submitting = false;
      })
    )
    .subscribe({
      next: () => {
        if (this.historiaId) {
          this.actualizarSeccionesAdicionales(this.historiaId)
            .then(() => {
              this.success = 'Historia clínica actualizada correctamente.';

              this.limpiarBorradorLocal('id');

              this.sectionStatus['datos-generales'] = true;
              setTimeout(() => {
              if (this.historiaId) {
                this.router.navigate(['/alumno/historias', this.historiaId], { replaceUrl: true });
              }
            }, 3000);
            })
            .catch(error => {
              this.error = 'Los datos generales se actualizaron pero hubo un problema con algunas secciones.';
              console.error('Error actualizando secciones adicionales:', error);
            });
        } else {
          this.error = 'Error: ID de historia clínica perdido durante la actualización.';
        }
      },
      error: (error) => {
        this.error = 'Error al actualizar la historia clínica: ' + (error.message || 'Intente nuevamente');
      }
    });
}

// Validar formularios obligatorios
private validarFormulariosObligatorios(): boolean {
if (this.sectionForms['datos-generales']) {
  if (this.sectionForms['datos-generales'].invalid) {
    this.error = 'Por favor, complete todos los campos obligatorios en Datos Generales.';
    this.marcarFormularioComoTocado(this.sectionForms['datos-generales']);
    this.currentSection = 'datos-generales';
    return false;
  }
} else {
  this.error = 'No se puede acceder al formulario de Datos Generales.';
  return false;
}

if (this.sectionForms['interrogatorio']) {
  if (this.sectionForms['interrogatorio'].invalid) {
    this.error = 'Por favor, complete todos los campos obligatorios en Interrogatorio.';
    this.marcarFormularioComoTocado(this.sectionForms['interrogatorio']);
    this.currentSection = 'interrogatorio';
    return false;
  }
} else {
  this.error = 'No se puede acceder al formulario de Interrogatorio.';
  return false;
}

return true;
}

// Método para marcar todos los campos de un formulario como tocados
private marcarFormularioComoTocado(form: FormGroup): void {
Object.keys(form.controls).forEach(key => {
  const control = form.get(key);
  if (control) {
    control.markAsTouched();
    if (control instanceof FormGroup) {
      this.marcarFormularioComoTocado(control);
    }
  }
});
}

// Actualizar secciones adicionales de la historia clínica
private async actualizarSeccionesAdicionales(historiaId: number): Promise<void> {
const promesas = [];

if (this.formValues['interrogatorio']) {
  promesas.push(
    this.convertirObservableAPromise(
      this.historiaClinicaService.actualizarSeccion(
        historiaId,
        'interrogatorio',
        this.formValues['interrogatorio']
      )
    )
  );
  this.sectionStatus['interrogatorio'] = true;
}

if (this.formValues['agudeza-visual']) {
  const agudezaVisualData = this.formValues['agudeza-visual'];
  promesas.push(
    this.convertirObservableAPromise(
      this.historiaClinicaService.actualizarSeccion(
        historiaId,
        'agudeza-visual',
        { agudezaVisual: agudezaVisualData }
      )
    )
  );
  this.sectionStatus['antecedente-visual'] = true;
}

if (this.formValues['lensometria']) {
  const lensometriaData = this.formValues['lensometria'];
  if (Object.values(lensometriaData).some(val => val !== '' && val !== null && val !== undefined)) {
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId,
          'lensometria',
          lensometriaData
        )
      )
    );
    this.sectionStatus['antecedente-visual'] = true;
  }
}

if (this.formValues['alineacion-ocular']) {
  const alineacionData = this.formValues['alineacion-ocular'];
  if (Object.values(alineacionData).some(val => val !== '' && val !== null && val !== undefined)) {
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId,
          'alineacion-ocular',
          alineacionData
        )
      )
    );
    this.sectionStatus['examen-preliminar'] = true;
  }
}

if (this.formValues['motilidad']) {
  const motilidadData = this.formValues['motilidad'];
  if (Object.values(motilidadData).some(val => val !== '' && val !== null && val !== undefined)) {
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId,
          'motilidad',
          motilidadData
        )
      )
    );
    this.sectionStatus['examen-preliminar'] = true;
  }
}

if (this.formValues['exploracion-fisica']) {
  const exploracionData = this.formValues['exploracion-fisica'];
  if (Object.values(exploracionData).some(val => val !== '' && val !== null && val !== undefined)) {
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId,
          'exploracion-fisica',
          exploracionData
        )
      )
    );
    this.sectionStatus['examen-preliminar'] = true;
  }
}

if (this.formValues['via-pupilar']) {
  const viaPupilarData = this.formValues['via-pupilar'];
  if (Object.values(viaPupilarData).some(val => val !== false && val !== '' && val !== null && val !== undefined)) {
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId,
          'via-pupilar',
          viaPupilarData
        )
      )
    );
    this.sectionStatus['examen-preliminar'] = true;
  }
}

if (this.formValues['estado-refractivo']) {
  const estadoRefractivoData = this.formValues['estado-refractivo'];
  if (Object.values(estadoRefractivoData).some(val => val !== '' && val !== null && val !== undefined)) {
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId,
          'estado-refractivo',
          estadoRefractivoData
        )
      )
    );
    this.sectionStatus['estado-refractivo'] = true;
  }
}

if (this.formValues['subjetivo-cerca']) {
  const subjetivoCercaData = this.formValues['subjetivo-cerca'];
  if (Object.values(subjetivoCercaData).some(val => val !== '' && val !== null && val !== undefined)) {
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId,
          'subjetivo-cerca',
          subjetivoCercaData
        )
      )
    );
    this.sectionStatus['estado-refractivo'] = true;
  }
}

if (this.formValues['binocularidad']) {
  const binocularidadData = this.formValues['binocularidad'];
  if (Object.values(binocularidadData).some(val => val !== false && val !== '' && val !== null && val !== undefined)) {
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId,
          'binocularidad',
          binocularidadData
        )
      )
    );
    this.sectionStatus['binocularidad'] = true;
  }
}

if (this.formValues['forias']) {
  const foriasData = this.formValues['forias'];
  if (Object.values(foriasData).some(val => val !== null && val !== '' && val !== undefined)) {
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId,
          'forias',
          foriasData
        )
      )
    );
    this.sectionStatus['binocularidad'] = true;
  }
}

if (this.formValues['vergencias']) {
  const vergenciasData = this.formValues['vergencias'];
  if (Object.values(vergenciasData).some(val => val !== '' && val !== null && val !== undefined)) {
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId,
          'vergencias',
          vergenciasData
        )
      )
    );
    this.sectionStatus['binocularidad'] = true;
  }
}

if (this.formValues['metodo-grafico']) {
  const metodoGraficoData = this.formValues['metodo-grafico'];
  if (Object.values(metodoGraficoData).some(val => val !== null && val !== '' && val !== undefined)) {
    if (this.imgPreview && !metodoGraficoData.imagenID) {
      const subirImagenPromesa = new Promise<void>((resolve, reject) => {
        const base64String = this.imgPreview as string;
        if (base64String && base64String.includes('base64')) {
          try {
            const arr = base64String.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const file = new File([u8arr], 'metodo-grafico.png', { type: mime });
            const formData = new FormData();
            formData.append('file', file);
            formData.append('seccionID', '12');
            formData.append('tipoImagenID', '2');

            this.historiaClinicaService.subirImagen(historiaId, formData)
              .subscribe({
                next: (response) => {
                  if (response && response.imageId) {
                    metodoGraficoData.imagenID = response.imageId;
                    this.historiaClinicaService.actualizarSeccion(
                      historiaId,
                      'metodo-grafico',
                      metodoGraficoData
                    ).subscribe({
                      next: () => resolve(),
                      error: (err) => {
                        console.error('Error al actualizar método gráfico con ID de imagen:', err);
                        reject(err);
                      }
                    });
                  } else {
                    resolve();
                  }
                },
                error: (err) => {
                  console.error('Error al subir imagen de método gráfico:', err);
                  this.historiaClinicaService.actualizarSeccion(
                    historiaId,
                    'metodo-grafico',
                    metodoGraficoData
                  ).subscribe({
                    next: () => resolve(),
                    error: (updateErr) => reject(updateErr)
                  });
                }
              });
          } catch (error) {
            console.error('Error al procesar la imagen:', error);
            reject(error);
          }
        } else {
          this.historiaClinicaService.actualizarSeccion(
            historiaId,
            'metodo-grafico',
            metodoGraficoData
          ).subscribe({
            next: () => resolve(),
            error: (err) => reject(err)
          });
        }
      });
      promesas.push(subirImagenPromesa);
    } else {
      promesas.push(
        this.convertirObservableAPromise(
          this.historiaClinicaService.actualizarSeccion(
            historiaId,
            'metodo-grafico',
            metodoGraficoData
          )
        )
      );
    }
    this.sectionStatus['binocularidad'] = true;
  }
}

 if (this.formValues['grid-amsler']) {
    const gridAmslerData = this.formValues['grid-amsler'];
    if (Object.values(gridAmslerData).some(val => val !== null && val !== '' && val !== undefined)) {
      promesas.push(
        this.convertirObservableAPromise(
          this.historiaClinicaService.actualizarSeccion(
            historiaId,
            'grid-amsler',
            gridAmslerData
          )
        )
      );
      this.sectionStatus['deteccion-alteraciones'] = true;
    }
  }

  if (this.formValues['tonometria']) {
    const tonometriaData = this.formValues['tonometria'];
    if (Object.values(tonometriaData).some(val => val !== null && val !== '' && val !== undefined)) {
      promesas.push(
        this.convertirObservableAPromise(
          this.historiaClinicaService.actualizarSeccion(
            historiaId,
            'tonometria',
            tonometriaData
          )
        )
      );
      this.sectionStatus['deteccion-alteraciones'] = true;
    }
  }

  if (this.formValues['paquimetria']) {
    const paquimetriaData = this.formValues['paquimetria'];
    if (Object.values(paquimetriaData).some(val => val !== null && val !== '' && val !== undefined)) {
      promesas.push(
        this.convertirObservableAPromise(
          this.historiaClinicaService.actualizarSeccion(
            historiaId,
            'paquimetria',
            paquimetriaData
          )
        )
      );
      this.sectionStatus['deteccion-alteraciones'] = true;
    }
  }

  if (this.formValues['campimetria']) {
    const campimetriaData = this.formValues['campimetria'];
    if (Object.values(campimetriaData).some(val => val !== null && val !== '' && val !== undefined)) {
      promesas.push(
        this.convertirObservableAPromise(
          this.historiaClinicaService.actualizarSeccion(
            historiaId,
            'campimetria',
            campimetriaData
          )
        )
      );
      this.sectionStatus['deteccion-alteraciones'] = true;
    }
  }

  if (this.formValues['biomicroscopia']) {
    const biomicroscopiaData = this.formValues['biomicroscopia'];
    if (Object.values(biomicroscopiaData).some(val => val !== null && val !== '' && val !== undefined)) {
      promesas.push(
        this.convertirObservableAPromise(
          this.historiaClinicaService.actualizarSeccion(
            historiaId,
            'biomicroscopia',
            biomicroscopiaData
          )
        )
      );
      this.sectionStatus['deteccion-alteraciones'] = true;
    }
  }

  if (this.formValues['oftalmoscopia']) {
    const oftalmoscopiaData = this.formValues['oftalmoscopia'];
    if (Object.values(oftalmoscopiaData).some(val => val !== null && val !== '' && val !== undefined)) {
      promesas.push(
        this.convertirObservableAPromise(
          this.historiaClinicaService.actualizarSeccion(
            historiaId,
            'oftalmoscopia',
            oftalmoscopiaData
          )
        )
      );
      this.sectionStatus['deteccion-alteraciones'] = true;
    }
  }

  // ... (diagnostico, plan, pronostico, recomendaciones, receta) ...
  if (this.formValues['diagnostico']) {
    promesas.push(this.convertirObservableAPromise(this.historiaClinicaService.actualizarSeccion(historiaId, 'diagnostico', this.formValues['diagnostico'])));
    this.sectionStatus['diagnostico'] = true;
  }
  if (this.formValues['plan-tratamiento']) {
    promesas.push(this.convertirObservableAPromise(this.historiaClinicaService.actualizarSeccion(historiaId, 'plan-tratamiento', this.formValues['plan-tratamiento'])));
    this.sectionStatus['diagnostico'] = true;
  }
  if (this.formValues['pronostico']) {
    promesas.push(this.convertirObservableAPromise(this.historiaClinicaService.actualizarSeccion(historiaId, 'pronostico', this.formValues['pronostico'])));
    this.sectionStatus['diagnostico'] = true;
  }
  if (this.formValues['recomendaciones']) {
    promesas.push(this.convertirObservableAPromise(this.historiaClinicaService.actualizarSeccion(historiaId, 'recomendaciones', this.formValues['recomendaciones'])));
    this.sectionStatus['diagnostico'] = true;
  }
  if (this.formValues['receta']) {
    promesas.push(this.convertirObservableAPromise(this.historiaClinicaService.actualizarSeccion(historiaId, 'receta', this.formValues['receta'])));
    this.sectionStatus['receta'] = true;
  }

await Promise.all(promesas);
}

//metodo para imagenes
onImageSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.imgPreview = reader.result as string;
      this.formValues['metodo-grafico'] = {
        ...this.formValues['metodo-grafico'],
        imagenBase64: this.imgPreview
      };
      if (this.metodoGraficoForm) {
        this.metodoGraficoForm.patchValue({ imagenBase64: this.imgPreview });
      }

      this.guardarBorradorLocal();
    };
    reader.readAsDataURL(file);
  }
}

onImageBase64Change(event: any): void {
  if (event && typeof event === 'object' && 'base64' in event && 'imageType' in event) {
    const { base64, imageType } = event;
    this.imagenPreviewsDeteccion[imageType] = base64;

    if (imageType.startsWith('gridAmsler')) {
      this.formValues['grid-amsler-images'] = {
        ...this.formValues['grid-amsler-images'] || {},
        [imageType]: base64
      };
    } else if (imageType.startsWith('campimetria')) {
      this.formValues['campimetria-images'] = {
        ...this.formValues['campimetria-images'] || {},
        [imageType]: base64
      };
    } else if (imageType.startsWith('biomicroscopia')) {
      this.formValues['biomicroscopia-images'] = {
        ...this.formValues['biomicroscopia-images'] || {},
        [imageType]: base64
      };
    } else if (imageType.startsWith('oftalmoscopia')) {
      this.formValues['oftalmoscopia-images'] = {
        ...this.formValues['oftalmoscopia-images'] || {},
        [imageType]: base64
      };
    }
  } else {
    this.imgPreview = event;
    this.formValues['metodo-grafico'] = {
      ...this.formValues['metodo-grafico'] || {},
      imagenBase64: event
    };

    if (this.metodoGraficoForm) {
      this.metodoGraficoForm.patchValue({ imagenBase64: event });
    }
  }

  this.guardarBorradorLocal();
}

private uploadBase64Image(historiaId: number, base64String: string, seccionID: string, tipoImagenID: string, esOjoDerecho?: boolean): Promise<number | null> {
  return new Promise((resolve, reject) => {
    if (!base64String || !base64String.includes('base64')) {
      console.warn('No hay imagen base64 válida para subir');
      resolve(null);
      return;
    }

    try {
      const arr = base64String.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      const fileName = seccionID === '11'
        ? `oftalmoscopia-${esOjoDerecho ? 'OD' : 'OI'}-${Date.now()}.png`
        : `seccion-${seccionID}-${Date.now()}.png`;

      const file = new File([u8arr], fileName, { type: mime });

      console.log(`Tipo de archivo creado: ${file.type}, tamaño: ${file.size} bytes, nombre: ${fileName}`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('seccionID', seccionID);
      formData.append('tipoImagenID', tipoImagenID);

      if (seccionID === '11' && typeof esOjoDerecho !== 'undefined') {
        formData.append('esOjoDerecho', esOjoDerecho ? 'true' : 'false');
        console.log(`Subiendo imagen de oftalmoscopía para ojo ${esOjoDerecho ? 'derecho' : 'izquierdo'}`);
      }

      this.historiaClinicaService.subirImagen(historiaId, formData)
        .subscribe({
          next: (response) => {
            console.log('Respuesta completa de subir imagen:', response);
            const imageId = response.data?.imageId ||
              response.data?.id ||
              response.imageId ||
              response.id;

            if (imageId) {
              console.log('ID de imagen recuperado:', imageId);
              resolve(imageId);
            } else {
              console.warn('No se encontró ID de imagen en la respuesta', response);
              resolve(null);
            }
          },
          error: (err) => {
            console.error('Error al subir imagen:', err);
            console.error('Detalles del error:', err.error || err.message);
            resolve(null);
          }
        });
    } catch (error) {
      console.error('Error al procesar imagen base64:', error);
      resolve(null);
    }
  });
}

private convertirObservableAPromise<T>(observable: Observable<T>): Promise<T> {
return new Promise<T>((resolve, reject) => {
  observable.subscribe({
    next: (value) => resolve(value),
    error: (error) => reject(error)
  });
});
}

private convertirFormDataAAgudezaVisual(formData: any): any[] {
  return [
    {
      tipoMedicion: 'SIN_RX_LEJOS',
      ojoDerechoSnellen: formData.sinRxLejosODSnellen || null,
      ojoIzquierdoSnellen: formData.sinRxLejosOISnellen || null,
      ambosOjosSnellen: formData.sinRxLejosAOSnellen || null,
      ojoDerechoMetros: formData.sinRxLejosODMetros || null,
      ojoIzquierdoMetros: formData.sinRxLejosOIMetros || null,
      ambosOjosMetros: formData.sinRxLejosAOMetros || null,
      ojoDerechoDecimal: formData.sinRxLejosODDecimal || null,
      ojoIzquierdoDecimal: formData.sinRxLejosOIDecimal || null,
      ambosOjosDecimal: formData.sinRxLejosAODecimal || null,
      ojoDerechoMAR: formData.sinRxLejosODMAR || null,
      ojoIzquierdoMAR: formData.sinRxLejosOIMAR || null,
      ambosOjosMAR: formData.sinRxLejosAOMAR || null
    },
    {
      tipoMedicion: 'CON_RX_ANTERIOR_LEJOS',
      ojoDerechoSnellen: formData.conRxLejosODSnellen || null,
      ojoIzquierdoSnellen: formData.conRxLejosOISnellen || null,
      ambosOjosSnellen: formData.conRxLejosAOSnellen || null,
      ojoDerechoMetros: formData.conRxLejosODMetros || null,
      ojoIzquierdoMetros: formData.conRxLejosOIMetros || null,
      ambosOjosMetros: formData.conRxLejosAOMetros || null,
      ojoDerechoDecimal: formData.conRxLejosODDecimal || null,
      ojoIzquierdoDecimal: formData.conRxLejosOIDecimal || null,
      ambosOjosDecimal: formData.conRxLejosAODecimal || null,
      ojoDerechoMAR: formData.conRxLejosODMAR || null,
      ojoIzquierdoMAR: formData.conRxLejosOIMAR || null,
      ambosOjosMAR: formData.conRxLejosAOMAR || null
    },
    {
      tipoMedicion: 'SIN_RX_CERCA',
      ojoDerechoM: formData.sinRxCercaODM || null,
      ojoIzquierdoM: formData.sinRxCercaOIM || null,
      ambosOjosM: formData.sinRxCercaAOM || null,
      ojoDerechoJeager: formData.sinRxCercaODJeager || null,
      ojoIzquierdoJeager: formData.sinRxCercaOIJeager || null,
      ambosOjosJeager: formData.sinRxCercaAOJeager || null,
      ojoDerechoPuntos: formData.sinRxCercaODPuntos || null,
      ojoIzquierdoPuntos: formData.sinRxCercaOIPuntos || null,
      ambosOjosPuntos: formData.sinRxCercaAOPuntos || null
    },
    {
      tipoMedicion: 'CON_RX_ANTERIOR_CERCA',
      ojoDerechoM: formData.conRxCercaODM || null,
      ojoIzquierdoM: formData.conRxCercaOIM || null,
      ambosOjosM: formData.conRxCercaAOM || null,
      ojoDerechoJeager: formData.conRxCercaODJeager || null,
      ojoIzquierdoJeager: formData.conRxCercaOIJeager || null,
      ambosOjosJeager: formData.conRxCercaAOJeager || null,
      ojoDerechoPuntos: formData.conRxCercaODPuntos || null,
      ojoIzquierdoPuntos: formData.conRxCercaOIPuntos || null,
      ambosOjosPuntos: formData.conRxCercaAOPuntos || null
    },
    {
      tipoMedicion: 'CAP_VISUAL',
      diametroMM: formData.diametroMM || null,
      capacidadVisualOD: formData.capacidadVisualOD || null,
      capacidadVisualOI: formData.capacidadVisualOI || null,
      capacidadVisualAO: formData.capacidadVisualAO || null
    }
  ];
}

// Método para cancelar la edición
cancelar(): void {

if (this.historiaId) {
  this.router.navigate(['/alumno/historias', this.historiaId]);
} else {
  this.router.navigate(['/alumno/historias']);
}
}
// Método para guardar una historia clínica editada (similar a crearNuevaHistoria)
guardarHistoriaEditada(): void {
  // ... (Validaciones) ...
  if (!this.sectionForms['datos-generales']) {
    this.error = 'No se puede guardar la historia clínica.';
    return;
  }
  if (this.sectionForms['datos-generales'].invalid) {
    this.error = 'Por favor, complete todos los campos obligatorios en Datos Generales antes de guardar.';
    this.marcarFormularioComoTocado(this.sectionForms['datos-generales']);
    this.currentSection = 'datos-generales';
    return;
  }
  if (this.sectionForms['interrogatorio'] && this.sectionForms['interrogatorio'].invalid) {
    this.error = 'Por favor, complete todos los campos obligatorios en Interrogatorio antes de guardar.';
    this.marcarFormularioComoTocado(this.sectionForms['interrogatorio']);
    this.currentSection = 'interrogatorio';
    return;
  }

  this.submitting = true;
  this.error = '';
  this.success = '';

  this.actualizarFormValues();

  const datosGenerales = {...this.formValues['datos-generales']};

  if (datosGenerales.periodoEscolarID) {
    datosGenerales.PeriodoEscolarID = datosGenerales.periodoEscolarID;
  }

  const imagenesBase64 = {
    metodoGrafico: this.formValues['metodo-grafico']?.imagenBase64 || this.imgPreview,
    campimetria: this.formValues['campimetria']?.imagenBase64 || this.imgPreview,
    oftalmoscopiaOD: this.formValues['oftalmoscopia']?.ojoDerechoImagenBase64,
    oftalmoscopiaOI: this.formValues['oftalmoscopia']?.ojoIzquierdoImagenBase64
  };

  const secciones = {
    interrogatorio: this.formValues['interrogatorio'],
    agudezaVisual: this.formValues['agudeza-visual'] ?
      this.convertirFormDataAAgudezaVisual(this.formValues['agudeza-visual']) : [],
    lensometria: this.formValues['lensometria'],
    alineacionOcular: this.formValues['alineacion-ocular'],
    motilidad: this.formValues['motilidad'],
    exploracionFisica: this.formValues['exploracion-fisica'],
    viaPupilar: this.formValues['via-pupilar'],
    estadoRefractivo: this.formValues['estado-refractivo'],
    subjetivoCerca: this.formValues['subjetivo-cerca'],
    binocularidad: this.formValues['binocularidad'],
    forias: this.formValues['forias'],
    vergencias: this.formValues['vergencias'],
    metodoGrafico: { ...this.formValues['metodo-grafico'] },
    gridAmsler: this.formValues['grid-amsler'],
    tonometria: this.formValues['tonometria'],
    paquimetria: this.formValues['paquimetria'],
    campimetria: this.formValues['campimetria'],
    biomicroscopia: this.formValues['biomicroscopia'],
    oftalmoscopia: this.formValues['oftalmoscopia'],
    diagnostico: this.formValues['diagnostico'],
    planTratamiento: this.formValues['plan-tratamiento'],
    pronostico: this.formValues['pronostico'],
    recomendaciones: this.formValues['recomendaciones'],
    recetaFinal: this.formValues['receta']
  };

  if (secciones.metodoGrafico && 'imagenBase64' in secciones.metodoGrafico) {
    delete secciones.metodoGrafico.imagenBase64;
  }
  if (secciones.campimetria && 'imagenBase64' in secciones.campimetria) {
    delete secciones.campimetria.imagenBase64;
  }

  const datosHistoriaCompleta = {
    historiaId: this.historiaId,
    datosGenerales: datosGenerales,
    secciones: secciones
  };

  console.log('Datos a enviar al servidor (editada):', datosHistoriaCompleta);

  this.historiaClinicaService.actualizarHistoriaCompleta(datosHistoriaCompleta)
    .pipe(
      finalize(() => {
        this.submitting = false;
      })
    )
    .subscribe({
      next: (response) => {
        this.success = 'Historia clínica actualizada exitosamente';

        this.limpiarBorradorLocal('id');

        for (const seccionKey in secciones) {
          if (
            Object.prototype.hasOwnProperty.call(secciones, seccionKey) &&
            secciones[seccionKey as keyof typeof secciones] &&
            typeof secciones[seccionKey as keyof typeof secciones] === 'object' &&
            Object.keys(secciones[seccionKey as keyof typeof secciones]).length > 0
          ) {
            const statusKey = this.convertirNombreSeccionAStatusKey(seccionKey);
            if (statusKey) {
              this.sectionStatus[statusKey] = true;
            }
          }
        }

        const statusKey = `historia_${this.historiaId}_status`;
        localStorage.removeItem(statusKey);

        if (this.historiaId) {
          this.procesarImagenesEnEdicion(this.historiaId, imagenesBase64);
        }

        console.log('Historia actualizada:', response);
      },
      error: (error) => {
        this.error = error.error?.message || 'Error al actualizar la historia clínica';
        console.error('Error:', error);
      }
    });
}

// Método auxiliar para procesar imágenes en edición
private procesarImagenesEnEdicion(historiaId: number, imagenesBase64: any): void {
  const promesasImagenes: Promise<void>[] = [];

  // ... (Lógica de subida de imágenes - sin cambios) ...
  if (imagenesBase64.metodoGrafico) {
    promesasImagenes.push(
      this.uploadBase64Image(
        historiaId,
        imagenesBase64.metodoGrafico,
        '12',
        '2'
      ).then(imageId => {
        if (imageId) {
          return new Promise<void>((resolve) => {
            this.historiaClinicaService.actualizarSeccion(
              historiaId,
              'metodo-grafico',
              {
                ...this.formValues['metodo-grafico'],
                imagenID: imageId,
                imagenBase64: undefined
              }
            ).subscribe({
              next: () => {
                console.log('Sección metodoGrafico actualizada con ID de imagen:', imageId);
                resolve();
              },
              error: (err) => {
                console.error('Error al actualizar sección con ID de imagen:', err);
                resolve();
              }
            });
          });
        }
        return Promise.resolve();
      })
    );
  }
  if (imagenesBase64.campimetria) {
    promesasImagenes.push(
      this.uploadBase64Image(
        historiaId,
        imagenesBase64.campimetria,
        '9',
        '3'
      ).then(imageId => {
        if (imageId) {
          return new Promise<void>((resolve) => {
            this.historiaClinicaService.actualizarSeccion(
              historiaId,
              'campimetria',
              {
                ...this.formValues['campimetria'],
                imagenID: imageId,
                imagenBase64: undefined
              }
            ).subscribe({
              next: () => {
                console.log('Sección campimetría actualizada con ID de imagen:', imageId);
                resolve();
              },
              error: (err) => {
                console.error('Error al actualizar sección campimetría con ID de imagen:', err);
                resolve();
              }
            });
          });
        }
        return Promise.resolve();
      })
    );
  }
  if (imagenesBase64.oftalmoscopiaOD) {
    promesasImagenes.push(
      this.uploadBase64Image(
        historiaId,
        imagenesBase64.oftalmoscopiaOD,
        '11',
        '5',
        true
      ).then(imageId => {
        if (imageId) {
          return new Promise<void>((resolve) => {
            const datosOftalmoscopia = {
              ...this.formValues['oftalmoscopia'],
              ojoDerechoImagenID: imageId,
              ojoDerechoImagenBase64: undefined
            };
            this.historiaClinicaService.actualizarSeccion(
              historiaId,
              'oftalmoscopia',
              datosOftalmoscopia
            ).subscribe({
              next: () => {
                console.log('Sección oftalmoscopía OD actualizada con ID de imagen:', imageId);
                resolve();
              },
              error: (err) => {
                console.error('Error al actualizar oftalmoscopía OD con ID de imagen:', err);
                resolve();
              }
            });
          });
        }
        return Promise.resolve();
      })
    );
  }
  if (imagenesBase64.oftalmoscopiaOI) {
    promesasImagenes.push(
      this.uploadBase64Image(
        historiaId,
        imagenesBase64.oftalmoscopiaOI,
        '11',
        '5',
        false
      ).then(imageId => {
        if (imageId) {
          return new Promise<void>((resolve) => {
            const datosOftalmoscopia = {
              ...this.formValues['oftalmoscopia'],
              ojoIzquierdoImagenID: imageId,
              ojoIzquierdoImagenBase64: undefined
            };
            this.historiaClinicaService.actualizarSeccion(
              historiaId,
              'oftalmoscopia',
              datosOftalmoscopia
            ).subscribe({
              next: () => {
                console.log('Sección oftalmoscopía OI actualizada con ID de imagen:', imageId);
                resolve();
              },
              error: (err) => {
                console.error('Error al actualizar oftalmoscopía OI con ID de imagen:', err);
                resolve();
              }
            });
          });
        }
        return Promise.resolve();
      })
    );
  }

  Promise.all(promesasImagenes)
    .then(() => {
      console.log('Todas las imágenes procesadas correctamente en edición');
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigateByUrl(`/alumno/historias/${historiaId}`);
      });
    })
    .catch(err => {
      console.error('Error procesando imágenes en edición:', err);
      this.success = 'Historia clínica actualizada correctamente, pero hubo problemas al subir algunas imágenes.';
      setTimeout(() => {
        this.router.navigate(['/alumno/historias', historiaId]);
      }, 1500);
    });
}

// Método para volver al dashboard
volverAlDashboard(): void {
this.router.navigate(['/alumno/dashboard']);
}

// Método para manejar la creación de una historia
onHistoriaCreated(id: number): void {
  this.historiaId = id;
  this.isNewHistoria = false;
  this.title = `Editar Historia Clínica #${id}`;

  this.sectionStatus['datos-generales'] = true;

  const statusKey = `historia_${this.historiaId}_status`;
  localStorage.setItem(statusKey, JSON.stringify(this.sectionStatus));

  this.changeDetectorRef.detectChanges();
}

// Método para manejar la compleción de una sección
onSectionCompleted(section: string, completed: boolean): void {
  this.sectionStatus[section] = completed;
  console.log(`Sección ${section} marcada como ${completed ? 'completada' : 'incompleta'}`);
  console.log(`Progreso actualizado: ${this.calculateProgress()}%`);

  if (this.historiaId && completed) {
    const statusKey = `historia_${this.historiaId}_status`;
    localStorage.setItem(statusKey, JSON.stringify(this.sectionStatus));
  }
}

// Método para navegar a la siguiente sección
onNextSection(): void {
const currentIndex = this.sections.indexOf(this.currentSection);
if (currentIndex < this.sections.length - 1) {
  this.changeSection(this.sections[currentIndex + 1]);
}
}

goToNextSection(): void {
  const currentIndex = this.getCurrentSectionIndex();
  if (currentIndex < this.sections.length - 1) {
    this.changeSection(this.sections[currentIndex + 1]);
  }
  }

goToPreviousSection(): void {
const currentIndex = this.getCurrentSectionIndex();
if (currentIndex > 0) {
  this.changeSection(this.sections[currentIndex - 1]);
}
}

// Método para obtener el índice de la sección actual
getCurrentSectionIndex(): number {
return this.sections.indexOf(this.currentSection);
}

// Método para calcular el progreso general basado en la sección más avanzada
calculateProgress(): number {
  const currentIndex = this.sections.indexOf(this.currentSection);
  if (currentIndex === -1) {
    return 0;
  }
  const progress = ((currentIndex + 1) / this.sections.length) * 100;
  console.log(`📊 Progreso calculado: Sección ${currentIndex + 1} de ${this.sections.length} = ${progress.toFixed(0)}%`);
  return progress;
}

// Método para obtener la clase CSS de un botón de sección
getButtonClass(section: string): string {
return this.currentSection === section ? 'section-button active' : 'section-button';
}

// Cambiar a otra sección manteniendo datos
changeSection(section: string): void {
  if (this.currentSection) {
    this.sectionStatus[this.currentSection] = true;
    console.log(`✅ Sección "${this.currentSection}" marcada como visitada`);
  }

  // Guardado manual antes de cambiar (aunque el debounce ya debería haberlo hecho)
  switch (this.currentSection) {
    case 'datos-generales':
      if (this.sectionForms['datos-generales']) {
        this.formValues['datos-generales'] = this.sectionForms['datos-generales'].value;
      }
      break;
    case 'interrogatorio':
      if (this.sectionForms['interrogatorio']) {
        this.formValues['interrogatorio'] = this.sectionForms['interrogatorio'].value;
      }
      break;
    case 'antecedente-visual':
      if (this.agudezaVisualForm) {
        this.formValues['agudeza-visual'] = this.agudezaVisualForm.value;
      }
      if (this.lensometriaForm) {
        this.formValues['lensometria'] = this.lensometriaForm.value;
      }
      break;
    case 'examen-preliminar':
      if (this.alineacionForm) {
        this.formValues['alineacion-ocular'] = this.alineacionForm.value;
      }
      if (this.motilidadForm) {
        this.formValues['motilidad'] = this.motilidadForm.value;
      }
      if (this.exploracionForm) {
        this.formValues['exploracion-fisica'] = this.exploracionForm.value;
      }
      if (this.viaPupilarForm) {
        this.formValues['via-pupilar'] = this.viaPupilarForm.value;
      }
      break;
    case 'estado-refractivo':
      if (this.refraccionForm) {
        this.formValues['estado-refractivo'] = this.refraccionForm.value;
      }
      if (this.subjetivoCercaForm) {
        this.formValues['subjetivo-cerca'] = this.subjetivoCercaForm.value;
      }
      break;
    case 'binocularidad':
      if (this.binocularidadForm) {
        this.formValues['binocularidad'] = this.binocularidadForm.value;
      }
      if (this.foriasForm) {
        this.formValues['forias'] = this.foriasForm.value;
      }
      if (this.vergenciasForm) {
        this.formValues['vergencias'] = this.vergenciasForm.value;
      }
      if (this.metodoGraficoForm) {
        this.formValues['metodo-grafico'] = this.metodoGraficoForm.value;
      }
      break;
    case 'deteccion-alteraciones':
      if (this.gridAmslerForm) {
        this.formValues['grid-amsler'] = this.gridAmslerForm.value;
      }
      if (this.tonometriaForm) {
        this.formValues['tonometria'] = this.tonometriaForm.value;
      }
      if (this.paquimetriaForm) {
        this.formValues['paquimetria'] = this.paquimetriaForm.value;
      }
      if (this.campimetriaForm) {
        this.formValues['campimetria'] = this.campimetriaForm.value;
      }
      if (this.biomicroscopiaForm) {
        this.formValues['biomicroscopia'] = this.biomicroscopiaForm.value;
      }
      if (this.oftalmoscopiaForm) {
        this.formValues['oftalmoscopia'] = this.oftalmoscopiaForm.value;
      }
      break;
    case 'diagnostico':
      if (this.diagnosticoForm) {
        this.formValues['diagnostico'] = this.diagnosticoForm.value;
      }
      if (this.planTratamientoForm) {
        this.formValues['plan-tratamiento'] = this.planTratamientoForm.value;
      }
      if (this.pronosticoForm) {
        this.formValues['pronostico'] = this.pronosticoForm.value;
      }
      if (this.recomendacionesForm) {
        this.formValues['recomendaciones'] = this.recomendacionesForm.value;
      }
      break;
    case 'receta':
      if (this.recetaFinalForm) {
        this.formValues['receta'] = this.recetaFinalForm.value;
      }
      break;
  }

  this.currentSection = section;
  console.log(`📍 Cambiando a sección: ${section}`);
  console.log(`📊 Progreso actual: ${this.calculateProgress()}%`);

  if (this.historiaId) {
    const statusKey = `historia_${this.historiaId}_status`;
    localStorage.setItem(statusKey, JSON.stringify(this.sectionStatus));
  }

  this.changeDetectorRef.detectChanges();

  if (this.tabsContainer) {
    setTimeout(() => {
      const activeButton = this.tabsContainer.nativeElement.querySelector('button.active');
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 100);
  }

  this.checkScrollableStatus();
}

}
