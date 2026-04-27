import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  @Output() salirAdmin = new EventEmitter<void>();

  modulos = [
    { titulo: 'Usuarios', descripcion: 'Gestionar usuarios y accesos', icono: '👤' },
    { titulo: 'Roles', descripcion: 'Controlar permisos del sistema', icono: '🛡️' },
    { titulo: 'Auditoría', descripcion: 'Revisar acciones realizadas', icono: '📋' },
    { titulo: 'Países', descripcion: 'Administrar catálogo de países', icono: '🌎' },
    { titulo: 'Ciudades', descripcion: 'Administrar ciudades disponibles', icono: '🏙️' },
    { titulo: 'Aeropuertos', descripcion: 'Gestionar aeropuertos de origen y destino', icono: '🛫' },
    { titulo: 'Aviones', descripcion: 'Registrar y editar aviones', icono: '✈️' },
    { titulo: 'Rutas', descripcion: 'Crear rutas entre aeropuertos', icono: '🧭' },
    { titulo: 'Vuelos', descripcion: 'Programar y administrar vuelos', icono: '🗓️' },
    { titulo: 'Escalas', descripcion: 'Gestionar escalas por vuelo', icono: '🔁' },
    { titulo: 'Asientos', descripcion: 'Administrar asientos por vuelo', icono: '💺' },
    { titulo: 'Reservas', descripcion: 'Consultar y controlar reservas', icono: '🎫' },
    { titulo: 'Pagos', descripcion: 'Revisar pagos realizados', icono: '💳' },
    { titulo: 'Facturas', descripcion: 'Consultar facturas y detalles', icono: '🧾' },
    { titulo: 'Boletos', descripcion: 'Revisar boletos emitidos', icono: '🎟️' },
    { titulo: 'Check-in', descripcion: 'Consultar check-ins realizados', icono: '✅' }
  ];

  cerrarPanel() {
    this.salirAdmin.emit();
  }
}
