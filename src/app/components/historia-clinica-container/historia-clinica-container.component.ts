import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { InterrogatorioComponent } from '../historia-clinica-interrogatorio/historia-clinica-interrogatorio.component';
import { HistoriaClinicaFormComponent } from '../historia-clinica-form/historia-clinica-form.component';
import { AntecedenteVisualComponent } from '../historia-clinica-antecedente-visual/historia-clinica-antecedente-visual.component';
import { ExamenPreliminarComponent } from '../historia-clinica-examen-preliminar/historia-clinica-examen-preliminar.component';
import { EstadoRefractivoComponent } from '../historia-clinica-estado-refractivo/historia-clinica-estado-refractivo.component';
import { forkJoin } from 'rxjs';
import { TitleCaseSectionPipe } from '../../pipes/title-case-section.pipe';

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
  TitleCaseSectionPipe
]
})

export class HistoriaClinicaContainerComponent implements OnInit {
historiaId: number | null = null;
currentSection = 'datos-generales';
isNewHistoria = true;
loading = false;
submitting = false;
error = '';
success = '';
title = 'Nueva Historia Clínica';
allSectionsRequired = false; // Para indicar si se requieren todas las secciones


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
  'receta': null
};

constructor(
  private route: ActivatedRoute,
  private router: Router,
  private historiaClinicaService: HistoriaClinicaService
) { }

ngOnInit(): void {
  this.route.params.subscribe(params => {
    if (params['id']) {
      this.historiaId = +params['id'];
      this.isNewHistoria = false;
      this.title = `Editar Historia Clínica #${this.historiaId}`;
      this.loadHistoriaStatus();
    } else {
      // Caso de nueva historia
      this.isNewHistoria = true;
      this.currentSection = 'datos-generales';
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

// Métodos para recibir los formularios de antecedente visual
onAgudezaVisualFormReady(form: FormGroup): void {
  this.agudezaVisualForm = form;
  console.log('Formulario de agudeza visual recibido:', form);
  
  // Restaurar valores previos si existen
  if (this.formValues['agudeza-visual']) {
    form.patchValue(this.formValues['agudeza-visual']);
  }
  
  // Suscribirse a cambios en el formulario para guardar
  form.valueChanges.subscribe(values => {
    this.formValues['agudeza-visual'] = values;
  });
}

onLensometriaFormReady(form: FormGroup): void {
  this.lensometriaForm = form;
  console.log('Formulario de lensometría recibido:', form);
  
  // Restaurar valores previos si existen
  if (this.formValues['lensometria']) {
    form.patchValue(this.formValues['lensometria']);
  }
  
  // Suscribirse a cambios en el formulario para guardar
  form.valueChanges.subscribe(values => {
    this.formValues['lensometria'] = values;
  });
}

// Métodos para recibir los formularios de examen preliminar
onExamenPreliminarFormReady(form: FormGroup): void {
  // Verificar el tipo de formulario recibido analizando sus controles
  if (form.contains('lejosHorizontal')) {
    this.alineacionForm = form;
    console.log('Formulario de alineación ocular recibido:', form);
    
    // Restaurar valores previos si existen
    if (this.formValues['alineacion-ocular']) {
      form.patchValue(this.formValues['alineacion-ocular']);
    }
    
    // Suscribirse a cambios en el formulario para guardar
    form.valueChanges.subscribe(values => {
      this.formValues['alineacion-ocular'] = values;
    });
  } 
  else if (form.contains('versiones')) {
    this.motilidadForm = form;
    console.log('Formulario de motilidad recibido:', form);
    
    // Restaurar valores previos si existen
    if (this.formValues['motilidad']) {
      form.patchValue(this.formValues['motilidad']);
    }
    
    // Suscribirse a cambios en el formulario para guardar
    form.valueChanges.subscribe(values => {
      this.formValues['motilidad'] = values;
    });
  }
  else if (form.contains('ojoDerechoAnexos')) {
    this.exploracionForm = form;
    console.log('Formulario de exploración física recibido:', form);
    
    // Restaurar valores previos si existen
    if (this.formValues['exploracion-fisica']) {
      form.patchValue(this.formValues['exploracion-fisica']);
    }
    
    // Suscribirse a cambios en el formulario para guardar
    form.valueChanges.subscribe(values => {
      this.formValues['exploracion-fisica'] = values;
    });
  }
  else if (form.contains('ojoDerechoDiametro')) {
    this.viaPupilarForm = form;
    console.log('Formulario de vía pupilar recibido:', form);
    
    // Restaurar valores previos si existen
    if (this.formValues['via-pupilar']) {
      form.patchValue(this.formValues['via-pupilar']);
    }
    
    // Suscribirse a cambios en el formulario para guardar
    form.valueChanges.subscribe(values => {
      this.formValues['via-pupilar'] = values;
    });
  }
}

// Métodos para recibir los formularios de estado refractivo
onEstadoRefractivoFormReady(form: FormGroup): void {
  // Verificar el tipo de formulario recibido analizando sus controles
  if (form.contains('ojoDerechoQueratometria')) {
    this.refraccionForm = form;
    console.log('Formulario de refracción recibido:', form);
    
    // Restaurar valores previos si existen
    if (this.formValues['estado-refractivo']) {
      form.patchValue(this.formValues['estado-refractivo']);
    }
    
    // Suscribirse a cambios en el formulario para guardar
    form.valueChanges.subscribe(values => {
      this.formValues['estado-refractivo'] = values;
    });
  }
  else if (form.contains('valorADD')) {
    this.subjetivoCercaForm = form;
    console.log('Formulario de subjetivo cerca recibido:', form);
    
    // Restaurar valores previos si existen
    if (this.formValues['subjetivo-cerca']) {
      form.patchValue(this.formValues['subjetivo-cerca']);
    }
    
    // Suscribirse a cambios en el formulario para guardar
    form.valueChanges.subscribe(values => {
      this.formValues['subjetivo-cerca'] = values;
    });
  }
}

// Suscribirse a cambios en el formulario para guardar los valores mientras se editan
private subscribeToFormChanges(sectionName: string, form: FormGroup): void {
  form.valueChanges.subscribe(values => {
    this.formValues[sectionName] = values;
  });
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
        // Actualizar el estado de compleción de cada sección basándose en la presencia de datos
        this.sectionStatus['datos-generales'] = true; // Siempre true si existe la historia
        this.sectionStatus['interrogatorio'] = !!historia.interrogatorio;
        
        // Para antecedente visual, verificamos agudeza visual y lensometría
        this.sectionStatus['antecedente-visual'] = 
          (!!historia.agudezaVisual && historia.agudezaVisual.length > 0) || 
          !!historia.lensometria;
        
        // Para examen preliminar, verificamos alguna de sus subsecciones
        this.sectionStatus['examen-preliminar'] = 
          !!historia.alineacionOcular || 
          !!historia.motilidad || 
          !!historia.exploracionFisica || 
          !!historia.viaPupilar;
        
        // Verificaciones para las otras secciones
        this.sectionStatus['estado-refractivo'] = 
        !!historia.estadoRefractivo || 
        !!historia.subjetivoCerca;

        this.sectionStatus['binocularidad'] = false; // Implementar cuando se tenga el componente
        this.sectionStatus['deteccion-alteraciones'] = false; // Implementar cuando se tenga el componente
        this.sectionStatus['diagnostico'] = !!historia.diagnostico;
        this.sectionStatus['receta'] = !!historia.recetaFinal;
        
        // Guardar datos en el almacén de formularios para preservarlos
        if (historia.interrogatorio) {
          this.formValues['interrogatorio'] = historia.interrogatorio;
        }
        
        // Guardar datos de examen preliminar si existen
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
        
        // También podríamos pre-cargar otros valores de secciones aquí
        // a medida que se implementen los componentes
      },
      error: (error) => {
        this.error = 'Error al cargar la historia clínica: ' + (error.message || 'Intente nuevamente');
        console.error('Error al cargar historia clínica:', error);
      }
    });
}

// Método centralizado para guardar toda la historia clínica
guardarSeccionActual(): void {
  // Actualizar formValues con los datos actuales de todos los formularios
  this.actualizarFormValues();
  
  // Si es una nueva historia y no hay ID, primero creamos la historia
  if (this.isNewHistoria && !this.historiaId) {
    this.crearNuevaHistoria();
  } else {
    this.actualizarHistoriaCompleta();
  }
}

// Actualizar todos los valores de formularios
private actualizarFormValues(): void {
  // Actualizar datos generales
  if (this.sectionForms['datos-generales']) {
    this.formValues['datos-generales'] = this.sectionForms['datos-generales'].value;
  }
  
  // Actualizar interrogatorio
  if (this.sectionForms['interrogatorio']) {
    this.formValues['interrogatorio'] = this.sectionForms['interrogatorio'].value;
  }
  
  // Actualizar agudeza visual
  if (this.agudezaVisualForm) {
    this.formValues['agudeza-visual'] = this.agudezaVisualForm.value;
  }
  
  // Actualizar lensometría
  if (this.lensometriaForm) {
    this.formValues['lensometria'] = this.lensometriaForm.value;
  }
  
  // Actualizar formularios de examen preliminar
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
  
  // Actualizar formularios de estado refractivo
  if (this.refraccionForm) {
    this.formValues['estado-refractivo'] = this.refraccionForm.value;
  }
  
  if (this.subjetivoCercaForm) {
    this.formValues['subjetivo-cerca'] = this.subjetivoCercaForm.value;
  }
  
  // Añadir actualización para otras secciones cuando estén implementadas
}

// Método para crear una nueva historia clínica
crearNuevaHistoria(): void {
  // Validar el formulario de datos generales que es obligatorio para crear la historia
  if (!this.sectionForms['datos-generales']) {
    this.error = 'No se puede crear la historia clínica.';
    return;
  }

  if (this.sectionForms['datos-generales'].invalid) {
    this.error = 'Por favor, complete todos los campos obligatorios en Datos Generales antes de guardar.';
    this.marcarFormularioComoTocado(this.sectionForms['datos-generales']);
    this.currentSection = 'datos-generales'; // Asegurarse que el usuario vea la sección con errores
    return;
  }

  // También validamos el interrogatorio que es obligatorio
  if (this.sectionForms['interrogatorio'] && this.sectionForms['interrogatorio'].invalid) {
    this.error = 'Por favor, complete todos los campos obligatorios en Interrogatorio antes de guardar.';
    this.marcarFormularioComoTocado(this.sectionForms['interrogatorio']);
    this.currentSection = 'interrogatorio'; // Cambiar a la sección con errores
    return;
  }

  this.submitting = true;
  this.error = '';
  this.success = '';

  // Obtener los datos principales del formulario de datos generales
  const historiaData = this.formValues['datos-generales'];

  this.historiaClinicaService.crearHistoriaClinica(historiaData)
    .pipe(
      finalize(() => {
        this.submitting = false;
      })
    )
    .subscribe({
      next: (response) => {
        // Obtener el ID de la historia creada
        const newHistoriaId = response.ID;
        
        if (newHistoriaId) {
          this.onHistoriaCreated(newHistoriaId);
          
          // Ahora que tenemos un ID, actualizar las demás secciones
          this.actualizarSeccionesAdicionales(newHistoriaId)
            .then(() => {
              this.success = 'Historia clínica creada correctamente.';
              setTimeout(() => {
                this.router.navigate(['/alumno/historias', newHistoriaId]);
              }, 1500);
            })
            .catch(error => {
              this.error = 'La historia clínica se creó pero hubo un problema al actualizar algunas secciones.';
              console.error('Error actualizando secciones adicionales:', error);
            });
        } else {
          console.error('No se pudo obtener el ID de la historia creada:', response);
          this.error = 'Se creó la historia pero hubo un problema al obtener su identificador.';
        }
      },
      error: (error) => {
        this.error = error.error?.message || 'Error al crear la historia clínica. Por favor, intente nuevamente.';
        console.error('Error al crear historia clínica:', error);
      }
    });
}

private actualizarHistoriaCompleta(): void {
  if (!this.historiaId) {
    this.error = 'No hay una historia clínica activa para actualizar.';
    return;
  }

  // Validar todos los formularios obligatorios
  if (!this.validarFormulariosObligatorios()) {
    return; // El mensaje de error ya se establece en validarFormulariosObligatorios
  }

  this.submitting = true;
  this.error = '';
  this.success = '';

  // Actualizar los datos generales primero
  const datosGenerales = this.formValues['datos-generales'];
  
  this.historiaClinicaService.actualizarSeccion(this.historiaId, 'datos-generales', datosGenerales)
    .pipe(
      finalize(() => {
        this.submitting = false;
      })
    )
    .subscribe({
      next: () => {
        // Ahora actualizar las demás secciones
        // Verificamos que historiaId no sea null antes de pasarlo
        if (this.historiaId) {
          this.actualizarSeccionesAdicionales(this.historiaId)
            .then(() => {
              this.success = 'Historia clínica actualizada correctamente.';
              this.sectionStatus['datos-generales'] = true;
              
              setTimeout(() => {
                if (this.historiaId) { // También verificamos aquí
                  this.router.navigate(['/alumno/historias', this.historiaId]);
                }
              }, 1500);
            })
            .catch(error => {
              this.error = 'Los datos generales se actualizaron pero hubo un problema con algunas secciones.';
              console.error('Error actualizando secciones adicionales:', error);
            });
        } else {
          this.error = 'Error: ID de historia clínica perdido durante la actualización.';
          console.error('Historia ID se volvió null después de actualizar datos generales');
        }
      },
      error: (error) => {
        this.error = 'Error al actualizar la historia clínica: ' + (error.message || 'Intente nuevamente');
        console.error('Error al actualizar historia clínica:', error);
      }
    });
}

// Validar formularios obligatorios
private validarFormulariosObligatorios(): boolean {
  // Validar datos generales (requerido)
  if (this.sectionForms['datos-generales']) {
    if (this.sectionForms['datos-generales'].invalid) {
      this.error = 'Por favor, complete todos los campos obligatorios en Datos Generales.';
      this.marcarFormularioComoTocado(this.sectionForms['datos-generales']);
      this.currentSection = 'datos-generales'; // Ir a la sección con error
      return false;
    }
  } else {
    this.error = 'No se puede acceder al formulario de Datos Generales.';
    return false;
  }
  
  // Validar interrogatorio (requerido)
  if (this.sectionForms['interrogatorio']) {
    if (this.sectionForms['interrogatorio'].invalid) {
      this.error = 'Por favor, complete todos los campos obligatorios en Interrogatorio.';
      this.marcarFormularioComoTocado(this.sectionForms['interrogatorio']);
      this.currentSection = 'interrogatorio'; // Ir a la sección con error
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
  
  // Actualizar interrogatorio
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
  
  // Actualizar agudeza visual si hay datos
  if (this.formValues['agudeza-visual']) {
    // Preparar datos en el formato correcto para la API
    const agudezaVisualData = this.prepararDatosAgudezaVisual();
    
    if (agudezaVisualData.length > 0) {
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
  }
  
  // Actualizar lensometría si hay datos
  if (this.formValues['lensometria']) {
    const lensometriaData = this.formValues['lensometria'];
    
    // Solo enviar si hay al menos un dato
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
  
  // Actualizar subsecciones de examen preliminar si hay datos
  
  // Alineación ocular
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
  
  // Motilidad
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
  
  // Exploración física
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
  
  // Vía pupilar
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

  // Estado refractivo
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
  
  // Subjetivo cerca
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
  
  // Agregar más secciones aquí cuando se implementen
  
  
  await Promise.all(promesas);
}

// Añade este método auxiliar para convertir Observable a Promise
private convertirObservableAPromise<T>(observable: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    observable.subscribe({
      next: (value) => resolve(value),
      error: (error) => reject(error)
    });
  });
}

// Preparar datos de agudeza visual para enviar al API
private prepararDatosAgudezaVisual(): any[] {
  const formValue = this.formValues['agudeza-visual'];
  const agudezaVisualArray = [];
  
  // Datos Sin RX Lejos
  if (formValue.sinRxLejosODSnellen || formValue.sinRxLejosOISnellen || formValue.sinRxLejosAOSnellen ||
      formValue.sinRxLejosODMetros || formValue.sinRxLejosOIMetros || formValue.sinRxLejosAOMetros ||
      formValue.sinRxLejosODMAR || formValue.sinRxLejosOIMAR || formValue.sinRxLejosAOMAR) {
    
    agudezaVisualArray.push({
      TipoMedicion: 'SIN_RX_LEJOS',
      OjoDerechoSnellen: formValue.sinRxLejosODSnellen,
      OjoIzquierdoSnellen: formValue.sinRxLejosOISnellen,
      AmbosOjosSnellen: formValue.sinRxLejosAOSnellen,
      OjoDerechoMetros: formValue.sinRxLejosODMetros,
      OjoIzquierdoMetros: formValue.sinRxLejosOIMetros,
      AmbosOjosMetros: formValue.sinRxLejosAOMetros,
      OjoDerechoMAR: formValue.sinRxLejosODMAR,
      OjoIzquierdoMAR: formValue.sinRxLejosOIMAR,
      AmbosOjosMAR: formValue.sinRxLejosAOMAR
    });
  }
  
  // Datos Con RX Anterior Lejos
  if (formValue.conRxLejosODSnellen || formValue.conRxLejosOISnellen || formValue.conRxLejosAOSnellen ||
      formValue.conRxLejosODMetros || formValue.conRxLejosOIMetros || formValue.conRxLejosAOMetros ||
      formValue.conRxLejosODMAR || formValue.conRxLejosOIMAR || formValue.conRxLejosAOMAR) {
    
    agudezaVisualArray.push({
      TipoMedicion: 'CON_RX_ANTERIOR_LEJOS',
      OjoDerechoSnellen: formValue.conRxLejosODSnellen,
      OjoIzquierdoSnellen: formValue.conRxLejosOISnellen,
      AmbosOjosSnellen: formValue.conRxLejosAOSnellen,
      OjoDerechoMetros: formValue.conRxLejosODMetros,
      OjoIzquierdoMetros: formValue.conRxLejosOIMetros,
      AmbosOjosMetros: formValue.conRxLejosAOMetros,
      OjoDerechoMAR: formValue.conRxLejosODMAR,
      OjoIzquierdoMAR: formValue.conRxLejosOIMAR,
      AmbosOjosMAR: formValue.conRxLejosAOMAR
    });
  }
  
  // Datos Sin RX Cerca
  if (formValue.sinRxCercaODM || formValue.sinRxCercaOIM || formValue.sinRxCercaAOM ||
      formValue.sinRxCercaODJeager || formValue.sinRxCercaOIJeager || formValue.sinRxCercaAOJeager ||
      formValue.sinRxCercaODPuntos || formValue.sinRxCercaOIPuntos || formValue.sinRxCercaAOPuntos) {
    
    agudezaVisualArray.push({
      TipoMedicion: 'SIN_RX_CERCA',
      OjoDerechoM: formValue.sinRxCercaODM,
      OjoIzquierdoM: formValue.sinRxCercaOIM,
      AmbosOjosM: formValue.sinRxCercaAOM,
      OjoDerechoJeager: formValue.sinRxCercaODJeager,
      OjoIzquierdoJeager: formValue.sinRxCercaOIJeager,
      AmbosOjosJeager: formValue.sinRxCercaAOJeager,
      OjoDerechoPuntos: formValue.sinRxCercaODPuntos,
      OjoIzquierdoPuntos: formValue.sinRxCercaOIPuntos,
      AmbosOjosPuntos: formValue.sinRxCercaAOPuntos
    });
  }
  
  // Datos Con RX Anterior Cerca
  if (formValue.conRxCercaODM || formValue.conRxCercaOIM || formValue.conRxCercaAOM ||
      formValue.conRxCercaODJeager || formValue.conRxCercaOIJeager || formValue.conRxCercaAOJeager ||
      formValue.conRxCercaODPuntos || formValue.conRxCercaOIPuntos || formValue.conRxCercaAOPuntos) {
    
    agudezaVisualArray.push({
      TipoMedicion: 'CON_RX_ANTERIOR_CERCA',
      OjoDerechoM: formValue.conRxCercaODM,
      OjoIzquierdoM: formValue.conRxCercaOIM,
      AmbosOjosM: formValue.conRxCercaAOM,
      OjoDerechoJeager: formValue.conRxCercaODJeager,
      OjoIzquierdoJeager: formValue.conRxCercaOIJeager,
      AmbosOjosJeager: formValue.conRxCercaAOJeager,
      OjoDerechoPuntos: formValue.conRxCercaODPuntos,
      OjoIzquierdoPuntos: formValue.conRxCercaOIPuntos,
      AmbosOjosPuntos: formValue.conRxCercaAOPuntos
    });
  }
  
  // Datos Capacidad Visual
  if (formValue.capacidadVisualOD || formValue.capacidadVisualOI || formValue.capacidadVisualAO || formValue.diametroMM) {
    agudezaVisualArray.push({
      TipoMedicion: 'CAP_VISUAL',
      CapacidadVisualOD: formValue.capacidadVisualOD,
      CapacidadVisualOI: formValue.capacidadVisualOI,
      CapacidadVisualAO: formValue.capacidadVisualAO,
      DiametroMM: formValue.diametroMM
    });
  }
  
  return agudezaVisualArray;
}

// Método para cancelar la edición
cancelar(): void {
  // Aquí podría ir lógica para confirmar la cancelación
  if (this.historiaId) {
    this.router.navigate(['/alumno/historias', this.historiaId]);
  } else {
    this.router.navigate(['/alumno/historias']);
  }
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
  // Actualizar la URL para reflejar la edición sin recargar
  this.router.navigate(['/alumno/historias', id], { replaceUrl: true });
}

// Método para manejar la compleción de una sección
onSectionCompleted(section: string, completed: boolean): void {
  this.sectionStatus[section] = completed;
  console.log(`Sección ${section} marcada como ${completed ? 'completada' : 'incompleta'}`);
  
  // Si la sección se completó exitosamente, podríamos mostrar un mensaje
  if (completed) {
    this.success = `Sección ${section} guardada correctamente`;
    setTimeout(() => {
      this.success = '';
    }, 3000);
  }
}

// Método para navegar a la siguiente sección
onNextSection(): void {
  const currentIndex = this.sections.indexOf(this.currentSection);
  if (currentIndex < this.sections.length - 1) {
    this.changeSection(this.sections[currentIndex + 1]);
  }
}

// Estos métodos ya existen pero podrían necesitar implementación adicional
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

// Método para calcular el progreso general
calculateProgress(): number {
  const completedSections = Object.values(this.sectionStatus).filter(Boolean).length;
  return (completedSections / this.sections.length) * 100;
}

// Método para obtener la clase CSS de un botón de sección
getButtonClass(section: string): string {
  return this.currentSection === section ? 'section-button active' : 'section-button';
}

// Cambiar a otra sección manteniendo datos
changeSection(section: string): void {
  // Guardar los valores actuales del formulario antes de cambiar
  if (this.currentSection === 'antecedente-visual') {
    if (this.agudezaVisualForm) {
      this.formValues['agudeza-visual'] = this.agudezaVisualForm.value;
    }
    if (this.lensometriaForm) {
      this.formValues['lensometria'] = this.lensometriaForm.value;
    }
  } else if (this.currentSection === 'examen-preliminar') {
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
  } else if (this.currentSection === 'estado-refractivo') {
    if (this.refraccionForm) {
      this.formValues['estado-refractivo'] = this.refraccionForm.value;
    }
    if (this.subjetivoCercaForm) {
      this.formValues['subjetivo-cerca'] = this.subjetivoCercaForm.value;
    }
  } else if (this.sectionForms[this.currentSection]) {
    this.formValues[this.currentSection] = this.sectionForms[this.currentSection].value;
    console.log(`Datos de la sección ${this.currentSection} guardados en memoria:`, this.formValues[this.currentSection]);
  }

  // Cambiar a la nueva sección
  this.currentSection = section;
  this.error = ''; 
  this.success = '';
  }
}