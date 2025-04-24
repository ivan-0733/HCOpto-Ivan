/*

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

// Módulos
import { AppRoutingModule } from './app-routing.module';

// Componentes
import { AppComponent } from './app.component';
import { NavComponent } from './components/nav/nav.component';
import { LoginComponent } from './components/login/login.component';
import { AlumnoDashboardComponent } from './components/alumno-dashboard/alumno-dashboard.component';
import { HistoriaClinicaFormComponent } from './components/historia-clinica-form/historia-clinica-form.component';
import { HistoriaClinicaDetalleComponent } from './components/historia-clinica-detalle/historia-clinica-detalle.component';

// Interceptores
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Servicios
import { AuthService } from './services/auth.service';
import { AlumnoService } from './services/alumno.service';
import { HistoriaClinicaService } from './services/historia-clinica.service';

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    LoginComponent,
    AlumnoDashboardComponent,
    HistoriaClinicaFormComponent,
    HistoriaClinicaDetalleComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    AuthService,
    AlumnoService,
    HistoriaClinicaService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }*/