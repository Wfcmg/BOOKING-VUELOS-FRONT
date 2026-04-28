import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AuthService } from '../../services/auth';
import { BookingClienteService } from '../../services/booking-cliente';

@Component({
  selector: 'app-mis-viajes',
  imports: [CommonModule],
  templateUrl: './mis-viajes.html',
  styleUrl: './mis-viajes.css'
})
export class MisViajes implements OnInit {
  @Output() volverHome = new EventEmitter<void>();

  viajes: any[] = [];
  cargando = false;
  mensaje = '';

  constructor(
    private authService: AuthService,
    private bookingService: BookingClienteService
  ) {}

  ngOnInit(): void {
    this.cargarViajes();
  }

  cargarViajes() {
    const usuarioAppId = this.authService.obtenerUsuarioAppId();

    if (!usuarioAppId) {
      this.mensaje = 'Debes iniciar sesión para ver tus viajes.';
      return;
    }

    this.cargando = true;

    this.bookingService.misViajes(usuarioAppId).subscribe({
      next: (data) => {
        this.viajes = data;
        this.cargando = false;
        this.mensaje = data.length === 0 ? 'Aún no tienes viajes registrados.' : '';
      },
      error: () => {
        this.cargando = false;
        this.mensaje = 'No se pudieron cargar tus viajes.';
      }
    });
  }

  volver() {
    this.volverHome.emit();
  }
}

