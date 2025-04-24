import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavComponent } from './components/nav/nav.component';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';

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
    <div [ngClass]="{'with-nav': authService.isAuthenticated()}" class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;

      &.with-nav {
        padding-top: 4rem; /* Altura de la barra de navegación */
      }
    }
  `]
})
export class AppComponent {
  constructor(public authService: AuthService) {}
}