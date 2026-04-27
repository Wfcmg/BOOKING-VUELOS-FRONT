import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Aeropuerto {
  aeropuertoId: number;
  nombre: string;
  codigoIATA: string;
  ciudad?: {
    nombre: string;
    pais?: {
      nombre: string;
    };
  };
}

interface Ruta {
  rutaId: number;
  aeropuertoOrigenId: number;
  aeropuertoDestinoId: number;
  distanciaKm: number;
  duracionMinutos: number;
  aeropuertoOrigen?: Aeropuerto;
  aeropuertoDestino?: Aeropuerto;
}

interface Avion {
  avionId: number;
  modelo?: string;
  matricula?: string;
}

interface Vuelo {
  vueloId: number;
  rutaId: number;
  avionId: number;
  numeroVuelo: string;
  fechaSalidaProgramada: string;
  fechaLlegadaProgramada: string;
  estado: string;
  activo: boolean;
  ruta?: Ruta;
  avion?: Avion;
}

@Component({
  selector: 'app-buscar-vuelos',
  imports: [FormsModule, CommonModule],
  templateUrl: './buscar-vuelos.html',
  styleUrl: './buscar-vuelos.css'
})
export class BuscarVuelos {
  aeropuertos: Aeropuerto[] = [];
  vuelosEncontrados: Vuelo[] = [];

  origenId: number | null = null;
  destinoId: number | null = null;

  fechaSalida = '';
  fechaRegreso = '';
  pasajeros = 1;
  clase = 'Económica';

  mensajeBusqueda = '';

  private apiUrl = 'http://localhost:5123/api';

  constructor(private http: HttpClient) {
    this.cargarAeropuertos();
  }

  cargarAeropuertos() {
    this.http.get<Aeropuerto[]>(`${this.apiUrl}/Aeropuertos`).subscribe({
      next: (data) => {
        this.aeropuertos = data;
        console.log('Aeropuertos cargados:', this.aeropuertos);
      },
      error: (error) => {
        console.error('Error cargando aeropuertos:', error);
      }
    });
  }

  buscarVuelos() {
    this.mensajeBusqueda = '';
    this.vuelosEncontrados = [];

    if (!this.origenId || !this.destinoId || !this.fechaSalida) {
      this.mensajeBusqueda = 'Selecciona origen, destino y fecha de salida.';
      return;
    }

    if (this.origenId === this.destinoId) {
      this.mensajeBusqueda = 'El origen y destino no pueden ser iguales.';
      return;
    }

    if (this.fechaRegreso && this.fechaRegreso < this.fechaSalida) {
      this.mensajeBusqueda = 'La fecha de regreso no puede ser menor que la fecha de salida.';
      return;
    }

    const origen = this.aeropuertos.find(a => a.aeropuertoId === this.origenId);
    const destino = this.aeropuertos.find(a => a.aeropuertoId === this.destinoId);

    this.vuelosEncontrados = [
      {
        vueloId: 1,
        rutaId: 1,
        avionId: 1,
        numeroVuelo: 'BV-101',
        fechaSalidaProgramada: `${this.fechaSalida}T08:30:00`,
        fechaLlegadaProgramada: `${this.fechaSalida}T10:15:00`,
        estado: 'Disponible',
        activo: true,
        ruta: {
          rutaId: 1,
          aeropuertoOrigenId: this.origenId,
          aeropuertoDestinoId: this.destinoId,
          distanciaKm: 450,
          duracionMinutos: 105,
          aeropuertoOrigen: origen,
          aeropuertoDestino: destino
        },
        avion: {
          avionId: 1,
          modelo: 'Airbus A320',
          matricula: 'HC-BV101'
        }
      }
    ];

    this.mensajeBusqueda = `Se encontraron ${this.vuelosEncontrados.length} vuelo(s) disponibles.`;
  }
}