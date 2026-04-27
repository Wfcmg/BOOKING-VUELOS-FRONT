import { Component, signal } from '@angular/core';
import { BuscarVuelos } from './pages/buscar-vuelos/buscar-vuelos';
import { Login } from './pages/login/login';
import { AuthService } from './services/auth';
import { AdminDashboard } from './admin/admin-dashboard';

@Component({
  selector: 'app-root',
  imports: [BuscarVuelos, Login, AdminDashboard],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('booking-vuelos-front');

  mostrarLogin = false;
  vistaActual: 'home' | 'admin' = 'home';

  constructor(public authService: AuthService) {
    if (this.authService.obtenerRol() === 'ADMIN') {
      this.vistaActual = 'admin';
    }
  }

  abrirLogin() {
    this.mostrarLogin = true;
  }

  cerrarLogin() {
    this.mostrarLogin = false;
  }

  procesarLogin(rol: string) {
    this.cerrarLogin();

    if (rol === 'ADMIN') {
      this.vistaActual = 'admin';
    } else {
      this.vistaActual = 'home';
    }
  }

  cerrarSesion() {
    this.authService.logout();
    this.vistaActual = 'home';
  }

  salirAdmin() {
    this.authService.logout();
    this.vistaActual = 'home';
  }
}
