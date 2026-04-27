import { Component, signal } from '@angular/core';
import { BuscarVuelos } from './pages/buscar-vuelos/buscar-vuelos';
import { Login } from './pages/login/login';
import { AuthService } from './services/auth';
import { AdminDashboard } from './admin/admin-dashboard';
import { BookingFlow } from './booking-flow/booking-flow';

@Component({
  selector: 'app-root',
  imports: [BuscarVuelos, Login, AdminDashboard, BookingFlow],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('booking-vuelos-front');

  mostrarLogin = false;
  vistaActual: 'home' | 'admin' | 'booking' = 'home';
  vueloSeleccionado: any = null;

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

  iniciarFlujoReserva(vuelo: any) {
    this.vueloSeleccionado = vuelo;

    if (!this.authService.estaLogueado()) {
      this.abrirLogin();
      return;
    }

    if (this.authService.obtenerRol() === 'ADMIN') {
      this.vistaActual = 'admin';
      return;
    }

    this.vistaActual = 'booking';
  }

  volverHomeDesdeBooking() {
    this.vistaActual = 'home';
  }

  cerrarSesion() {
    this.authService.logout();
    this.vistaActual = 'home';
    this.vueloSeleccionado = null;
  }

  salirAdmin() {
    this.authService.logout();
    this.vistaActual = 'home';
    this.vueloSeleccionado = null;
  }
}
