import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Perfil {
  AlumnoInfoID: number;
  NumeroBoleta: string;
  SemestreActual: number;
  UsuarioID: number;
  NombreUsuario: string;
  CorreoElectronico: string;
  EstaActivo: boolean;
  TelefonoCelular: string | null;
  FechaCreacion: string;
  FechaUltimoAcceso: string | null;
}

export interface Profesor {
  ProfesorInfoID: number;
  NumeroEmpleado: string;
  NombreUsuario: string;
  CorreoElectronico: string;
  TelefonoCelular: string | null;
  FechaInicio: string;
}

export interface Semestre {
  ID: number;
  Nombre: string;
  FechaInicio: string;
  FechaFin: string;
}

export interface Consultorio {
  ID: number;
  Nombre: string;
  Descripcion: string | null;
}

export interface CatalogoItem {
  ID: number;
  Valor: string;
  Descripcion: string | null;
  Orden: number;
}

export interface Paciente {
  ID: number;
  Nombre: string;
  ApellidoPaterno: string;
  ApellidoMaterno: string | null;
  CorreoElectronico: string;
  TelefonoCelular: string;
  Edad: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlumnoService {
  private apiUrl = `${environment.apiUrl}/alumnos`;

  constructor(private http: HttpClient) { }

  // Obtener perfil del alumno
  obtenerPerfil(): Observable<Perfil> {
    return this.http.get<Perfil>(`${this.apiUrl}/perfil`);
  }

  // Actualizar perfil del alumno
  actualizarPerfil(datos: { nombreUsuario?: string; telefonoCelular?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/perfil`, datos);
  }

  // Obtener profesores asignados
  obtenerProfesoresAsignados(): Observable<Profesor[]> {
    return this.http.get<Profesor[]>(`${this.apiUrl}/profesores`);
  }

  // Obtener semestre actual
  obtenerSemestreActual(): Observable<Semestre> {
    return this.http.get<Semestre>(`${this.apiUrl}/semestre-actual`);
  }

  // Obtener consultorios disponibles
  obtenerConsultorios(): Observable<Consultorio[]> {
    return this.http.get<Consultorio[]>(`${this.apiUrl}/consultorios`);
  }

  // Obtener catálogos
  obtenerCatalogo(tipo: string): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/catalogos/${tipo}`);
  }

  // Buscar pacientes
  buscarPacientes(termino: string): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(`${this.apiUrl}/pacientes/buscar`, {
      params: { termino }
    });
  }
}