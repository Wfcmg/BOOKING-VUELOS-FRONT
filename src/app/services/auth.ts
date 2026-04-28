import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface LoginRequest {
  userName: string;
  password: string;
}

interface LoginResponse {
  token: string;
  usuarioAppId: number;
  userName: string;
  nombreCompleto: string;
  rol: string;
  expiraEn: string;
}

interface RegisterRequest {
  userName: string;
  password: string;
  nombreCompleto: string;
  correoElectronico: string;
  telefono?: string;
}

interface RegisterResponse {
  mensaje: string;
  usuarioAppId: number;
  userName: string;
  nombreCompleto: string;
  correoElectronico: string;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5123/api/Auth';

  constructor(private http: HttpClient) {}

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((respuesta) => {
        if (!this.isBrowser()) return;

        localStorage.setItem('token', respuesta.token);
        localStorage.setItem('usuarioAppId', respuesta.usuarioAppId.toString());
        localStorage.setItem('userName', respuesta.userName);
        localStorage.setItem('nombreCompleto', respuesta.nombreCompleto);
        localStorage.setItem('rol', respuesta.rol);
      })
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data);
  }

  estaLogueado(): boolean {
    if (!this.isBrowser()) return false;
    return !!localStorage.getItem('token');
  }

  obtenerToken(): string {
    if (!this.isBrowser()) return '';
    return localStorage.getItem('token') || '';
  }

  obtenerUsuarioAppId(): number {
    if (!this.isBrowser()) return 0;
    return Number(localStorage.getItem('usuarioAppId') || 0);
  }

  obtenerNombreUsuario(): string {
    if (!this.isBrowser()) return 'Usuario';
    return localStorage.getItem('nombreCompleto') || localStorage.getItem('userName') || 'Usuario';
  }

  obtenerRol(): string {
    if (!this.isBrowser()) return '';
    return localStorage.getItem('rol') || '';
  }

  logout(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem('token');
    localStorage.removeItem('usuarioAppId');
    localStorage.removeItem('userName');
    localStorage.removeItem('nombreCompleto');
    localStorage.removeItem('rol');
  }
}

