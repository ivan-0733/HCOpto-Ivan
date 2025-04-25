import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { HistoriaClinicaService } from '../../services/historia-clinica.service';
import { InterrogatorioComponent } from '../historia-clinica-interrogatorio/historia-clinica-interrogatorio.component';
import { HistoriaClinicaFormComponent } from '../historia-clinica-form/historia-clinica-form.component';
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

  // Lista ordenada de secciones
  sections = [
    'datos-generales',
    'interrogatorio',
    'agudeza-visual',
    'lensometria',
    'diagnostico',
    'plan-tratamiento',
    'pronostico',
    'receta'
  ];

  // Estado de compleción de cada sección
  sectionStatus = {
    'datos-generales': false,
    'interrogatorio': false,
    'agudeza-visual': false,
    'lensometria': false,
    'diagnostico': false,
    'plan-tratamiento': false,
    'pronostico': false,
    'receta': false
  };

  // Referencia a los formularios de cada sección
  sectionForms: {[key: string]: FormGroup} = {};
  
  // Almacén para los valores de los formularios (persistencia entre navegaciones)
  formValues: {[key: string]: any} = {
    'datos-generales': null,
    'interrogatorio': null,
    'agudeza-visual': null,
    'lensometria': null,
    'diagnostico': null,
    'plan-tratamiento': null,
    'pronostico': null,
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
          this.sectionStatus['agudeza-visual'] = !!historia.agudezaVisual && historia.agudezaVisual.length > 0;
          this.sectionStatus['lensometria'] = !!historia.lensometria;
          this.sectionStatus['diagnostico'] = !!historia.diagnostico;
          this.sectionStatus['plan-tratamiento'] = !!historia.planTratamiento;
          this.sectionStatus['pronostico'] = !!historia.pronostico;
          this.sectionStatus['receta'] = !!historia.recetaFinal;
          
          // Guardar datos en el almacén de formularios para preservarlos
          if (historia.interrogatorio) {
            this.formValues['interrogatorio'] = historia.interrogatorio;
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

  // Método centralizado para guardar la sección actual
  guardarSeccionActual(): void {
    // Verificar si hay un formulario para la sección actual
    if (!this.sectionForms[this.currentSection]) {
      this.error = 'No se puede guardar esta sección.';
      return;
    }

    // Actualizar el almacén de valores con los datos actuales
    this.formValues[this.currentSection] = this.sectionForms[this.currentSection].value;

    // Si es una nueva historia y no hay ID, primero creamos la historia
    if (this.isNewHistoria && !this.historiaId) {
      this.crearNuevaHistoria();
    } else {
      this.actualizarSeccionActual();
    }
  }

  // Método para crear una nueva historia clínica
  crearNuevaHistoria(): void {
    if (!this.sectionForms['datos-generales']) {
      this.error = 'No se puede crear la historia clínica.';
      return;
    }

    if (this.sectionForms['datos-generales'].invalid) {
      this.error = 'Por favor, complete todos los campos obligatorios antes de guardar.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    const historiaData = this.sectionForms['datos-generales'].value;

    this.historiaClinicaService.crearHistoriaClinica(historiaData)
      .pipe(
        finalize(() => {
          this.submitting = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.success = 'Historia clínica creada correctamente.';
          
          // Obtener el ID de la historia creada
          const newHistoriaId = response.ID || response.ID || (response as any).data?.ID;
          
          if (newHistoriaId) {
            this.onHistoriaCreated(newHistoriaId);
            
            // Si estamos en la sección de datos generales y queremos pasar a la siguiente
            if (this.currentSection === 'datos-generales') {
              setTimeout(() => {
                this.goToNextSection();
              }, 1500);
            }
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

  // Método para actualizar la sección actual
  actualizarSeccionActual(): void {
    if (!this.historiaId) {
      this.error = 'No hay una historia clínica activa para guardar.';
      return;
    }

    // Verificar si el formulario de la sección es válido
    if (this.sectionForms[this.currentSection].invalid) {
      this.error = 'Por favor, complete todos los campos obligatorios antes de guardar.';
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    const sectionData = this.sectionForms[this.currentSection].value;

    this.historiaClinicaService.actualizarSeccion(
      this.historiaId,
      this.currentSection,
      sectionData
    )
    .pipe(
      finalize(() => {
        this.submitting = false;
      })
    )
    .subscribe({
      next: () => {
        this.success = 'Sección guardada correctamente.';
        this.sectionStatus[this.currentSection as keyof typeof this.sectionStatus] = true;
      },
      error: (error) => {
        this.error = 'Error al guardar la sección: ' + (error.message || 'Intente nuevamente');
        console.error('Error al guardar sección:', error);
      }
    });
  }

  // Cambiar a otra sección manteniendo datos
  changeSection(section: string): void {
    // Guardar los valores actuales del formulario antes de cambiar
    if (this.sectionForms[this.currentSection]) {
      this.formValues[this.currentSection] = this.sectionForms[this.currentSection].value;
      console.log(`Datos de la sección ${this.currentSection} guardados en memoria:`, this.formValues[this.currentSection]);
    }

    // Cambiar a la nueva sección
    this.currentSection = section;
    this.error = ''; 
    this.success = '';
  }

  onSectionCompleted(sectionName: string, completed: boolean): void {
    // Actualizar el estado de compleción de la sección
    this.sectionStatus[sectionName as keyof typeof this.sectionStatus] = completed;
    
    // Si acabamos de crear la historia y obtuvimos un ID, actualizar el estado
    if (sectionName === 'datos-generales' && completed && this.isNewHistoria) {
      this.isNewHistoria = false;
    }
  }

  onNextSection(): void {
    this.goToNextSection();
  }

  getButtonClass(section: string): string {
    let classes = '';
    
    if (this.currentSection === section) {
      classes += 'active';
    }
    
    if (this.sectionStatus[section as keyof typeof this.sectionStatus]) {
      classes += ' completed';
    }
    
    return classes;
  }

  onHistoriaCreated(id: number): void {
    this.historiaId = id;
    this.isNewHistoria = false;
    this.title = `Editar Historia Clínica #${id}`;
    this.sectionStatus['datos-generales'] = true;
  }

  // Verificar si todas las secciones requeridas están completas
  isHistoriaCompleta(): boolean {
    if (this.allSectionsRequired) {
      // Si todas las secciones son obligatorias
      return Object.values(this.sectionStatus).every(Boolean);
    } else {
      // Si solo algunas secciones son obligatorias (como datos generales)
      return this.sectionStatus['datos-generales'] && this.sectionStatus['interrogatorio'];
    }
  }

  cancelar(): void {
    this.router.navigate(['/alumno/dashboard']);
  }

  volverAlDashboard(): void {
    this.router.navigate(['/alumno/dashboard']);
  }

  // Calcular el porcentaje de progreso
  calculateProgress(): number {
    const completedSections = Object.values(this.sectionStatus).filter(Boolean).length;
    return (completedSections / this.sections.length) * 100;
  }

  // Obtener el índice de la sección actual
  getCurrentSectionIndex(): number {
    return this.sections.indexOf(this.currentSection);
  }

  // Ir a la sección anterior
  goToPreviousSection(): void {
    const currentIndex = this.getCurrentSectionIndex();
    if (currentIndex > 0) {
      this.changeSection(this.sections[currentIndex - 1]);
    }
  }

  // Ir a la siguiente sección
  goToNextSection(): void {
    const currentIndex = this.getCurrentSectionIndex();
    if (currentIndex < this.sections.length - 1) {
      this.changeSection(this.sections[currentIndex + 1]);
    }
  }
}