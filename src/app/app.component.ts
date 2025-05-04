import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavComponent } from './components/nav/nav.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NavComponent
  ],
  template: `
    <app-nav *ngIf="authService.isAuthenticated()"></app-nav>
    <div [ngClass]="{'with-nav': authService.isAuthenticated()}" class="app-container theme-transition">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;

      &.with-nav {
        padding-top: 100px; /* Consistent padding for all screen sizes */
      }
    }

    .theme-transition {
      transition: background-color 0.3s ease,
                  color 0.3s ease,
                  border-color 0.3s ease;
    }
  `]
})
export class AppComponent implements OnInit {
  constructor(
    public authService: AuthService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // El ThemeService se inicializará automáticamente
    // al ser inyectado y aplicará el tema guardado
  }
}