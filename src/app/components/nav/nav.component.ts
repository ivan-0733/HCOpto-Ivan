import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Renderer2, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlumnoService } from '../../services/alumno.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ThemeService, ThemeMode } from '../../services/theme.service';

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
export class NavComponent implements OnInit, OnDestroy {

  // Añadir estas nuevas propiedades
  @ViewChild('navCollapse') navCollapse!: ElementRef;
  menuHeight: string = '0px';
  private resizeObserver!: ResizeObserver;

  isCollapsed = true;
  userSemestre: string = '';
  private authSubscription: Subscription | null = null;
  private themeSubscription: Subscription | null = null;
  currentTheme: ThemeMode = 'system';
  showThemeSelector = false;
  isMobileView = false;
  userPeriodo: string = '';

  constructor(
    public authService: AuthService,
    private alumnoService: AlumnoService,
    private router: Router,
    public themeService: ThemeService,
    private renderer: Renderer2
  ) { }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    // Detectar si estamos en vista móvil
    const wasMobile = this.isMobileView;
    this.isMobileView = window.innerWidth <= 1050;

    // Si cambiamos de desktop a móvil o viceversa, recalcular el menú
    if (wasMobile !== this.isMobileView) {
      if (!this.isCollapsed) {
        this.calculateMenuHeight();
      }
      // Importante: Ya no cerramos el selector de tema al cambiar de vista
    }
  }

  ngOnInit(): void {
    // Inicializar el estado de la vista móvil
    this.isMobileView = window.innerWidth <= 1050;

    if (this.authService.hasRole('alumno')) {
      this.cargarDatosAlumno();
    }

    // Suscribirse a los cambios del usuario actual
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      // Cualquier cambio en el usuario se reflejará automáticamente en el template
      // ya que estamos usando 'userName' como un getter que lee del authService.currentUserValue
      console.log('Usuario actualizado en NavComponent:', user?.nombreUsuario);
    });

    // Suscribirse a los cambios del tema
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });

    this.setupResizeObserver();
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.isCollapsed) {
        this.calculateMenuHeight();
      }
    });

    setTimeout(() => {
      if (this.navCollapse?.nativeElement) {
        this.resizeObserver.observe(this.navCollapse.nativeElement);
      }
    }, 0);
  }

  ngOnDestroy(): void {
    // Es importante desuscribirse para evitar memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }

    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

// En src/app/components/nav/nav.component.ts

// En nav.component.ts
cargarDatosAlumno(): void {
  this.alumnoService.obtenerPerfil().subscribe({
    next: (perfil) => {
      if (perfil) {
        // Obtener el período escolar actual
        this.alumnoService.obtenerPeriodoEscolarActual().subscribe({
          next: (periodo) => {
            if (periodo) {
              this.userPeriodo = periodo.Codigo;
            }
          },
          error: (error) => {
            console.error('Error al obtener período escolar:', error);
          }
        });
      }
    },
    error: (error) => {
      console.error('Error al cargar datos del alumno:', error);
    }
  });
}

  toggleMenu(): void {
    this.isCollapsed = !this.isCollapsed;

    // Solo agregar altura adicional si el menú está abierto
    if (!this.isCollapsed) {
      this.calculateMenuHeight();
    } else {
      // Si está cerrado, resetear la altura
      this.menuHeight = '0px';
    }

    // Ya no cerramos el selector de tema al abrir/cerrar menú
    // Eliminamos: this.showThemeSelector = false;
  }

  // Método modificado para calcular altura de manera más precisa
  private calculateMenuHeight(): void {
    setTimeout(() => {
      if (this.navCollapse?.nativeElement && window.innerWidth <= 1050) {
        const height = this.navCollapse.nativeElement.offsetHeight;
        // Limitamos la altura para evitar que ocupe demasiado espacio
        this.menuHeight = `${Math.min(height, 300)}px`;
        // Ya no establecemos una variable CSS personalizada, para evitar afectar al padding del contenido
      } else {
        this.menuHeight = '0px';
      }
    }, 0);
  }

  closeMenu(): void {
    this.isCollapsed = true;
    this.menuHeight = '0px'; // Resetear altura al cerrar
    // No cerramos el selector de tema al cerrar el menú
  }

  logout(): void {
    this.authService.logout();
  }

  toggleThemeSelector(): void {
    this.showThemeSelector = !this.showThemeSelector;
  }

  setTheme(theme: ThemeMode): void {
    this.themeService.setTheme(theme);
    this.showThemeSelector = false; // Cerrar el selector después de elegir
  }

  getThemeIcon(): string {
    switch (this.currentTheme) {
      case 'light': return 'brightness_high';
      case 'dark': return 'brightness_2';
      case 'system': return 'settings';
      default: return 'settings';
    }
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

  // Verificar si el usuario está autenticado
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}