import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-booking-flow',
  imports: [CommonModule],
  templateUrl: './booking-flow.html',
  styleUrl: './booking-flow.css'
})
export class BookingFlow {
  @Input() vuelo: any = null;
  @Output() volverHome = new EventEmitter<void>();

  pasoActual = 1;

  pasos = [
    { numero: 1, titulo: 'Pasajeros' },
    { numero: 2, titulo: 'Asientos' },
    { numero: 3, titulo: 'Equipaje' },
    { numero: 4, titulo: 'Resumen' },
    { numero: 5, titulo: 'Pago' },
    { numero: 6, titulo: 'Confirmación' }
  ];

  siguientePaso() {
    if (this.pasoActual < this.pasos.length) {
      this.pasoActual++;
    }
  }

  pasoAnterior() {
    if (this.pasoActual > 1) {
      this.pasoActual--;
    }
  }

  volver() {
    this.volverHome.emit();
  }
}
