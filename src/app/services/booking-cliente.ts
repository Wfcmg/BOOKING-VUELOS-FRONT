import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConfirmarReservaClienteRequest {
  usuarioAppId: number;
  vueloId: number;
  clase: string;
  precioBase: number;
  impuestos: number;
  equipajeTotal: number;
  datosFacturacion: any;
  pasajeros: any[];
}

@Injectable({
  providedIn: 'root'
})
export class BookingClienteService {

  // Backend local: cuando trabajas desde Angular local
  private readonly apiLocal = 'https://localhost:44398/api';

  // Backend desplegado en Azure: cuando el front está en Netlify
  private readonly apiProduccion = 'https://microserviciobookingvuelosapi20260501193602-bvdzesg6gzc6ekas.brazilsouth-01.azurewebsites.net/api';

  constructor(private http: HttpClient) {}

  private get apiUrl(): string {
    // Evita error si Angular corre en modo SSR/server
    if (typeof window === 'undefined') {
      return this.apiProduccion;
    }

    const host = window.location.hostname;

    // Si estás en local: http://localhost:4200
    if (host === 'localhost' || host === '127.0.0.1') {
      return this.apiLocal;
    }

    // Si estás en Netlify: https://booking-vuelos-front.netlify.app
    return this.apiProduccion;
  }

  listarAeropuertos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Aeropuertos`);
  }

  buscarVuelos(origenId: number, destinoId: number, fechaSalida: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/ClienteBooking/vuelos-disponibles?origenId=${origenId}&destinoId=${destinoId}&fechaSalida=${fechaSalida}`
    );
  }

  confirmarReserva(request: ConfirmarReservaClienteRequest): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/ClienteBooking/confirmar-reserva`,
      request
    );
  }

  misViajes(usuarioAppId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/ClienteBooking/mis-viajes/${usuarioAppId}`
    );
  }
}