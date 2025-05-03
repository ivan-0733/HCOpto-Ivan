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
import { BinocularidadComponent } from '../historia-clinica-binocularidad/historia-clinica-binocularidad.component';
import { DeteccionAlteracionesComponent } from '../historia-clinica-alteraciones/historia-clinica-alteraciones.component';
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
TitleCaseSectionPipe,
BinocularidadComponent,
DeteccionAlteracionesComponent 
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
allSectionsRequired = false; 


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
onAntecedenteVisualFormReady(form: FormGroup): void {
  // Verificar el tipo de formulario recibido analizando sus controles
  if (form.contains('sinRxLejosODSnellen') || form.contains('diametroMM')) {
    this.agudezaVisualForm = form;
    console.log('Formulario de agudeza visual recibido:', form);
    
    // Restaurar valores previos si existen
    if (this.formValues['agudeza-visual']) {
      form.patchValue(this.formValues['agudeza-visual']);
    }
    
    // Suscribirse a cambios en el formulario para guardar
    form.valueChanges.subscribe(values => {
      this.formValues['agudeza-visual'] = values;
      console.log('Valores de agudeza visual actualizados:', values);
    });
  } 
  else if (form.contains('ojoDerechoEsfera') || form.contains('tipoBifocalMultifocalID')) {
    this.lensometriaForm = form;
    console.log('Formulario de lensometría recibido:', form);
    
    // Restaurar valores previos si existen
    if (this.formValues['lensometria']) {
      form.patchValue(this.formValues['lensometria']);
    }
    
    // Suscribirse a cambios en el formulario para guardar
    form.valueChanges.subscribe(values => {
      this.formValues['lensometria'] = values;
      console.log('Valores de lensometría actualizados:', values);
    });
  }
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

// Métodos para recibir los formularios de binocularidad
onBinocularidadFormReady(form: FormGroup): void {
  // Verificar el tipo de formulario recibido analizando sus controles
  if (form.contains('ppc')) {
    this.binocularidadForm = form;
    console.log('Formulario de binocularidad recibido:', form);

    // Restaurar valores previos si existen
    if (this.formValues['binocularidad']) {
      form.patchValue(this.formValues['binocularidad']);
    }

    // Suscribirse a cambios en el formulario para guardar
    form.valueChanges.subscribe(values => {
      this.formValues['binocularidad'] = values;
    });
  }
  else if (form.contains('horizontalesLejos')) {
    this.foriasForm = form;
    console.log('Formulario de forias recibido:', form);

    if (this.formValues['forias']) {
      form.patchValue(this.formValues['forias']);
    }

    form.valueChanges.subscribe(values => {
      this.formValues['forias'] = values;
    });
  }
  else if (form.contains('positivasLejosBorroso')) {
    this.vergenciasForm = form;
    console.log('Formulario de vergencias recibido:', form);

    if (this.formValues['vergencias']) {
      form.patchValue(this.formValues['vergencias']);
    }

    form.valueChanges.subscribe(values => {
      this.formValues['vergencias'] = values;
    });
  }
  else if (form.contains('integracionBinocular')) {
    this.metodoGraficoForm = form;
    console.log('Formulario de método gráfico recibido:', form);

    // Restaurar valores previos si existen
    if (this.formValues['metodo-grafico']) {
      form.patchValue(this.formValues['metodo-grafico']);
    } 
     // Restaurar la imagen si existe
      if (this.formValues['metodo-grafico'].imagenBase64) {
        this.imgPreview = this.formValues['metodo-grafico'].imagenBase64;
      }
    }

    if (this.imgPreview) {
      // Podríamos necesitar un pequeño retraso para asegurar que el componente hijo esté listo
      setTimeout(() => {
        this.onImageBase64Change(this.imgPreview);
      }, 100);

    if (this.formValues['metodo-grafico']?.imagenBase64) {
      this.imgPreview = this.formValues['metodo-grafico'].imagenBase64;
    } else {
      this.imgPreview = null;
    }
    
    // Suscribirse a cambios en el formulario para guardar, incluyendo la imagen base64
    form.valueChanges.subscribe(values => {
      this.formValues['metodo-grafico'] = {
        ...values,
        imagenBase64: this.imgPreview || this.formValues['metodo-grafico']?.imagenBase64 
      };
    });
    
  }
}

// Métodos para recibir los formularios de alteraciones
onDeteccionAlteracionesFormReady(form: FormGroup): void {
  // Verificar el tipo de formulario recibido analizando sus controles
  if (form.contains('numeroCartilla')) {
    this.gridAmslerForm = form;
    console.log('Formulario de Grid de Amsler recibido:', form);
    
    // Restaurar valores previos si existen
    if (this.formValues['grid-amsler']) {
      form.patchValue(this.formValues['grid-amsler']);
    }
    
    // Suscribirse a cambios en el formulario para guardar
    form.valueChanges.subscribe(values => {
      this.formValues['grid-amsler'] = values;
    });
  }
  else if (form.contains('metodoAnestesico')) {
    this.tonometriaForm = form;
    console.log('Formulario de Tonometría recibido:', form);
    
    if (this.formValues['tonometria']) {
      form.patchValue(this.formValues['tonometria']);
    }
    
    form.valueChanges.subscribe(values => {
      this.formValues['tonometria'] = values;
    });
  }
  else if (form.contains('ojoDerechoCCT')) {
    this.paquimetriaForm = form;
    console.log('Formulario de Paquimetría recibido:', form);
    
    if (this.formValues['paquimetria']) {
      form.patchValue(this.formValues['paquimetria']);
    }
    
    form.valueChanges.subscribe(values => {
      this.formValues['paquimetria'] = values;
    });
  }
  else if (form.contains('tamanoColorIndice')) {
    this.campimetriaForm = form;
    console.log('Formulario de Campimetría recibido:', form);
    
    if (this.formValues['campimetria']) {
      form.patchValue(this.formValues['campimetria']);
    }
    
    form.valueChanges.subscribe(values => {
      this.formValues['campimetria'] = values;
    });
  }
  else if (form.contains('ojoDerechoPestanas')) {
    this.biomicroscopiaForm = form;
    console.log('Formulario de Biomicroscopía recibido:', form);
    
    if (this.formValues['biomicroscopia']) {
      form.patchValue(this.formValues['biomicroscopia']);
    }
    
    form.valueChanges.subscribe(values => {
      this.formValues['biomicroscopia'] = values;
    });
  }
  else if (form.contains('ojoDerechoPapila')) {
    this.oftalmoscopiaForm = form;
    console.log('Formulario de Oftalmoscopía recibido:', form);
    
    if (this.formValues['oftalmoscopia']) {
      form.patchValue(this.formValues['oftalmoscopia']);
    }
    
    form.valueChanges.subscribe(values => {
      this.formValues['oftalmoscopia'] = values;
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
        console.log('Historia clínica cargada:', historia);
        
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

        // Verificaciones para binocularidad
        this.sectionStatus['binocularidad'] = 
          !!historia.binocularidad || 
          !!historia.forias || 
          !!historia.vergencias || 
          !!historia.metodoGrafico;

        //verificaciones para alteraciones 
        this.sectionStatus['deteccion-alteraciones'] = 
          !!historia.gridAmsler || 
          !!historia.tonometria || 
          !!historia.paquimetria || 
          !!historia.campimetria || 
          !!historia.biomicroscopia || 
          !!historia.oftalmoscopia;
          
        this.sectionStatus['diagnostico'] = !!historia.diagnostico;
        this.sectionStatus['receta'] = !!historia.recetaFinal;
        
        // Cargar los datos del paciente para el formulario de datos generales
        this.formValues['datos-generales'] = {
          nombre: historia.Nombre,
          apellidoPaterno: historia.ApellidoPaterno,
          apellidoMaterno: historia.ApellidoMaterno || '',
          edad: historia.Edad,
          generoID: historia.GeneroID,
          estadoCivilID: historia.EstadoCivilID,
          escolaridadID: historia.EscolaridadID,
          ocupacion: historia.Ocupacion,
          direccionLinea1: historia.DireccionLinea1,
          direccionLinea2: historia.DireccionLinea2,
          ciudad: historia.Ciudad,
          estadoID: historia.PacienteEstadoID,
          codigoPostal: historia.CodigoPostal,
          pais: historia.Pais,
          correoElectronico: historia.CorreoElectronico,
          telefonoCelular: historia.TelefonoCelular,
          telefono: historia.Telefono,
          // Datos adicionales para la historia clínica
          profesorID: historia.ProfesorID,
          consultorioID: historia.ConsultorioID,
          semestreID: historia.SemestreID,
          pacienteID: historia.PacienteID
        };
        
        // Guardar datos del interrogatorio
        if (historia.interrogatorio) {
          this.formValues['interrogatorio'] = historia.interrogatorio;
        }
        
        // Guardar datos de lensometría
        if (historia.lensometria) {
          this.formValues['lensometria'] = historia.lensometria;
        }
        
        // Guardar datos de examen preliminar
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
        
        // Guardar datos de estado refractivo
        if (historia.estadoRefractivo) {
          this.formValues['estado-refractivo'] = historia.estadoRefractivo;
        }
        
        if (historia.subjetivoCerca) {
          this.formValues['subjetivo-cerca'] = historia.subjetivoCerca;
        }
        
        // Guardar datos de binocularidad
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

        // Guardar datos de grid amsler
        if (historia.gridAmsler) {
          this.formValues['grid-amsler'] = historia.gridAmsler;
        }
        
        // Guardar datos de tonometría
        if (historia.tonometria) {
          this.formValues['tonometria'] = historia.tonometria;
        }
        
        // Guardar datos de paquimetría
        if (historia.paquimetria) {
          this.formValues['paquimetria'] = historia.paquimetria;
        }
        
        // Guardar datos de campimetría
        if (historia.campimetria) {
          this.formValues['campimetria'] = historia.campimetria;
        }
        
        // Guardar datos de biomicroscopía
        if (historia.biomicroscopia) {
          this.formValues['biomicroscopia'] = historia.biomicroscopia;
        }
        
        // Guardar datos de oftalmoscopía
        if (historia.oftalmoscopia) {
          this.formValues['oftalmoscopia'] = historia.oftalmoscopia;
        }
        
        // Guardar datos de diagnóstico
        if (historia.diagnostico) {
          this.formValues['diagnostico'] = historia.diagnostico;
        }
        
        // Guardar datos de receta final
        if (historia.recetaFinal) {
          this.formValues['receta'] = historia.recetaFinal;
        }
        
        console.log('Datos cargados en formValues:', this.formValues);
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

  // Actualizar agudeza visual - asegurar que se capture el valor actual
  if (this.agudezaVisualForm) {
    this.formValues['agudeza-visual'] = this.agudezaVisualForm.value;
    console.log('Valores actualizados de agudeza visual:', this.agudezaVisualForm.value);
  }

  // Actualizar lensometría - asegurar que se capture el valor actual
  if (this.lensometriaForm) {
    this.formValues['lensometria'] = this.lensometriaForm.value;
    console.log('Valores actualizados de lensometría:', this.lensometriaForm.value);
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

  // Actualizar formularios de binocularidad
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

  //Actualizar formularios de alteraciones
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

//actualizar agudeza visual 
if (this.formValues['agudeza-visual']) {
  const agudezaVisualData = this.formValues['agudeza-visual'];
  
  // Verificar si hay datos para enviar
  if (Object.values(agudezaVisualData).some(val => val !== '' && val !== null && val !== undefined)) {
    // Crear un array para conformar con el formato que espera la API
    const agudezaVisualArray = [agudezaVisualData];
    promesas.push(
      this.convertirObservableAPromise(
        this.historiaClinicaService.actualizarSeccion(
          historiaId, 
          'agudeza-visual', 
          { agudezaVisual: agudezaVisualArray }
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

// Binocularidad
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

// Forias
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

// Vergencias
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

// Método Gráfico
if (this.formValues['metodo-grafico']) {
  const metodoGraficoData = this.formValues['metodo-grafico'];
  
  if (Object.values(metodoGraficoData).some(val => val !== null && val !== '' && val !== undefined)) {
    // Si tenemos una imagen en base64 que aún no se ha subido
    if (this.imgPreview && !metodoGraficoData.imagenID) {
      // Crear una promesa para subir la imagen
      const subirImagenPromesa = new Promise<void>((resolve, reject) => {
        // Convertir base64 a File
        const base64String = this.imgPreview as string;
        if (base64String && base64String.includes('base64')) {
          try {
            // Extraer la parte de datos del string base64
            const arr = base64String.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            
            const file = new File([u8arr], 'metodo-grafico.png', { type: mime });
            
            // Crear FormData para la subida
            const formData = new FormData();
            formData.append('file', file);
            formData.append('seccionID', '12'); // ID de la sección de binocularidad
            formData.append('tipoImagenID', '2'); // ID del tipo de imagen para método gráfico
            
            // Subir la imagen
            this.historiaClinicaService.subirImagen(historiaId, formData)
              .subscribe({
                next: (response) => {
                  if (response && response.imageId) {
                    // Actualizar el ID de la imagen en el objeto de datos
                    metodoGraficoData.imagenID = response.imageId;
                    
                    // Actualizar la sección con el nuevo ID de imagen
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
                    resolve(); // Continuar aunque no haya ID de imagen
                  }
                },
                error: (err) => {
                  console.error('Error al subir imagen de método gráfico:', err);
                  // Continuar con el guardado de los datos del método gráfico sin la imagen
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
          // Si no hay imagen base64 válida, solo actualizamos los datos
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
      // Si no hay imagen nueva, o ya tenemos ID de imagen, solo actualizamos los datos
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

 // Grid de Amsler
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

  // Tonometría
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

  // Paquimetría
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

  // Campimetría
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

  // Biomicroscopía
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

  // Oftalmoscopía
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


// Agregar más secciones aquí cuando se implementen


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
    };
    reader.readAsDataURL(file);
  }
}

onImageBase64Change(event: any): void {
  // Si el evento es un objeto con las propiedades base64 e imageType
  if (event && typeof event === 'object' && 'base64' in event && 'imageType' in event) {
    const { base64, imageType } = event;
    
    // Almacenar la imagen en el objeto de previsualizaciones
    this.imagenPreviewsDeteccion[imageType] = base64;
    
    // Almacenar en el objeto formValues según el tipo de imagen
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
    // Es el formato original para binocularidad (método gráfico)
    this.imgPreview = event;
    this.formValues['metodo-grafico'] = {
      ...this.formValues['metodo-grafico'] || {},
      imagenBase64: event
    };
    
    // Actualizar el formulario reactivo si existe
    if (this.metodoGraficoForm) {
      this.metodoGraficoForm.patchValue({ imagenBase64: event });
    }
  }
}


private convertirObservableAPromise<T>(observable: Observable<T>): Promise<T> {
return new Promise<T>((resolve, reject) => {
  observable.subscribe({
    next: (value) => resolve(value),
    error: (error) => reject(error)
  });
});
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
      // Actualizar correctamente ambos formularios del antecedente visual
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
        this.formValues['metodo-grafico'] = {
          ...this.metodoGraficoForm.value,
          imagenBase64: this.imgPreview 
        };
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
        
        // Guardar el estado actual de las imágenes
        this.formValues['imagen-previews-deteccion'] = { ...this.imagenPreviewsDeteccion };
        break;
    }

  // Cambiar a la nueva sección
  this.currentSection = section;
  this.error = '';
  this.success = '';
  
  console.log('Datos temporales guardados:', this.formValues);
}
}