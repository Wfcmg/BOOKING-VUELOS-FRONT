import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
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

interface Vuelo {
  vueloId: number;
  rutaId: number;
  avionId: number;
  numeroVuelo: string;
  tipoVuelo?: string;
  escala?: {
    codigoIATA?: string;
    ciudad?: string;
  };
  fechaSalidaProgramada: string;
  fechaLlegadaProgramada: string;
  estado: string;
  activo: boolean;
  precioBase?: number;
  ruta?: any;
  avion?: any;
}

@Component({
  selector: 'app-buscar-vuelos',
  imports: [FormsModule, CommonModule],
  templateUrl: './buscar-vuelos.html',
  styleUrl: './buscar-vuelos.css'
})
export class BuscarVuelos {
  @Output() vueloSeleccionado = new EventEmitter<any>();

  aeropuertos: Aeropuerto[] = [];
  vuelosEncontrados: Vuelo[] = [];

  origenId: number | null = null;
  destinoId: number | null = null;

  fechaSalida = this.obtenerFechaHoy();
  fechaRegreso = '';
  pasajeros = 1;
  clase = 'Económica';

  minFecha = this.obtenerFechaHoy();
  buscando = false;
  mensajeBusqueda = '';
  errorBusqueda = false;

  private apiUrl = 'https://localhost:44398/api';
  private temporizadorBusqueda: any = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.cargarAeropuertos();
  }

  private obtenerFechaHoy(): string {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private cerrarCarga() {
    this.buscando = false;
    this.cdr.detectChanges();

    if (this.temporizadorBusqueda) {
      clearTimeout(this.temporizadorBusqueda);
      this.temporizadorBusqueda = null;
    }
  }

  cargarAeropuertos() {
    this.http.get<Aeropuerto[]>(`${this.apiUrl}/Aeropuertos`).subscribe({
      next: (data) => {
        this.aeropuertos = data || [];
      },
      error: (error) => {
        console.error('Error cargando aeropuertos:', error);
        this.mensajeBusqueda = 'No se pudieron cargar los aeropuertos desde la API.';
        this.errorBusqueda = true;
      }
    });
  }

  async buscarVuelos() {
    this.mensajeBusqueda = '';
    this.errorBusqueda = false;
    this.vuelosEncontrados = [];

    if (!this.origenId || !this.destinoId || !this.fechaSalida) {
      this.mensajeBusqueda = 'Selecciona origen, destino y fecha de salida.';
      this.errorBusqueda = true;
      return;
    }

    if (this.origenId === this.destinoId) {
      this.mensajeBusqueda = 'El origen y destino no pueden ser iguales.';
      this.errorBusqueda = true;
      return;
    }

    if (this.fechaSalida < this.minFecha) {
      this.mensajeBusqueda = 'No se permiten fechas pasadas.';
      this.errorBusqueda = true;
      return;
    }

    if (this.fechaRegreso && this.fechaRegreso < this.fechaSalida) {
      this.mensajeBusqueda = 'La fecha de regreso no puede ser menor que la fecha de salida.';
      this.errorBusqueda = true;
      return;
    }

    this.buscando = true;

    const url =
      `${this.apiUrl}/ClienteBooking/vuelos-disponibles` +
      `?origenId=${this.origenId}` +
      `&destinoId=${this.destinoId}` +
      `&fechaSalida=${this.fechaSalida}`;

    console.log('Buscando vuelos en:', url);

    try {
      const controller = new AbortController();

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.errorBusqueda = true;
        this.mensajeBusqueda = `Error de API: ${response.status}`;
        return;
      }

      const data = await response.json();

      console.log('Respuesta vuelos:', data);

      this.vuelosEncontrados = Array.isArray(data) ? data : [];

      if (this.vuelosEncontrados.length === 0) {
        this.mensajeBusqueda = 'No hay vuelos reales disponibles para esa ruta y fecha.';
        this.errorBusqueda = false;
        return;
      }

      this.mensajeBusqueda = `Se encontraron ${this.vuelosEncontrados.length} vuelo(s) disponibles.`;
    } catch (error) {
      console.error('Error buscando vuelos:', error);
      this.errorBusqueda = true;
      this.mensajeBusqueda = 'No se pudo obtener la respuesta de vuelos desde la API.';
    } finally {
      this.buscando = false;
      this.cdr.detectChanges();
    }
  }

  seleccionarOferta(origenId: number, destinoId: number) {
    this.origenId = origenId;
    this.destinoId = destinoId;

    if (!this.fechaSalida || this.fechaSalida < this.minFecha) {
      this.fechaSalida = this.minFecha;
    }

    this.fechaRegreso = '';
    this.pasajeros = Math.max(1, Number(this.pasajeros || 1));
    this.clase = this.clase || 'Económica';

    this.mensajeBusqueda = 'Oferta cargada. Buscando vuelos disponibles...';
    this.errorBusqueda = false;
    this.vuelosEncontrados = [];
    this.cdr.detectChanges();

    setTimeout(() => {
      this.buscarVuelos();
    }, 180);
  }

  seleccionarVuelo(vuelo: Vuelo) {
    this.vueloSeleccionado.emit({
      ...vuelo,
      pasajeros: this.pasajeros,
      fechaRegreso: this.fechaRegreso,
      clase: this.clase
    });
  }
}




