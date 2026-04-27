import { Component, signal } from '@angular/core';
import { BuscarVuelos } from './pages/buscar-vuelos/buscar-vuelos';
import { Login } from './pages/login/login';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  imports: [BuscarVuelos, Login],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('booking-vuelos-front');

  mostrarLogin = false;

  constructor(public authService: AuthService) {}

  abrirLogin() {
    this.mostrarLogin = true;
  }

  cerrarLogin() {
    this.mostrarLogin = false;
  }

  cerrarSesion() {
    this.authService.logout();
  }
}