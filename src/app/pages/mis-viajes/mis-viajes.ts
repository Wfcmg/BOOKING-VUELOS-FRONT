import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AuthService } from '../../services/auth';

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
  tipoMensaje: 'info' | 'ok' | 'error' = 'info';
  pestanaActiva: 'reservas' | 'boletos' = 'reservas';

  constructor(
    private authService: AuthService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarViajes();
  }

  async cargarViajes(): Promise<void> {
    const usuarioAppId = this.authService.obtenerUsuarioAppId();

    if (!usuarioAppId) {
      this.mostrarMensaje('Debes iniciar sesion para ver tus viajes.', 'error');
      this.cargando = false;
      this.cd.detectChanges();
      return;
    }

    this.cargando = true;
    this.mensaje = '';
    this.cd.detectChanges();

    try {
      const respuesta = await fetch(`https://microserviciobookingvuelosapi20260501193602-bvdzesg6gzc6ekas.brazilsouth-01.azurewebsites.net/api/ClienteBooking/mis-viajes/${usuarioAppId}`, {
        method: 'GET',
        cache: 'no-store'
      });

      if (!respuesta.ok) {
        throw new Error(`Error HTTP ${respuesta.status}`);
      }

      const data = await respuesta.json();

      this.viajes = Array.isArray(data) ? data : [];
      this.cargando = false;

      if (this.viajes.length === 0) {
        this.mostrarMensaje('Aun no tienes viajes registrados.', 'info');
      } else {
        this.mensaje = '';
      }
    } catch (error) {
      console.error('Error cargando mis viajes:', error);
      this.viajes = [];
      this.cargando = false;
      this.mostrarMensaje('No se pudieron cargar tus viajes. Revisa backend o consola.', 'error');
    }

    this.cd.detectChanges();
  }

  get boletos(): any[] {
    const lista: any[] = [];

    for (const viaje of this.viajes) {
      const pasajeros = viaje?.pasajeros || [];

      for (const pasajero of pasajeros) {
        if (pasajero?.boleto) {
          lista.push({
            viaje,
            pasajero,
            boleto: pasajero.boleto
          });
        }
      }
    }

    return lista;
  }

  cambiarPestana(pestana: 'reservas' | 'boletos'): void {
    this.pestanaActiva = pestana;
    this.mensaje = '';
  }

  volver(): void {
    this.volverHome.emit();
  }

  pagar(viaje: any): void {
    if (this.estaPagado(viaje)) {
      this.mostrarMensaje('Esta reserva ya tiene un pago aprobado.', 'info');
      return;
    }

    this.mostrarMensaje('El pago desde Mis viajes aun no esta conectado.', 'info');
  }

  gestionarEquipaje(viaje: any): void {
    if (this.facturaEmitida(viaje)) {
      this.mostrarMensaje('No se puede agregar equipaje a una factura emitida.', 'error');
      return;
    }

    this.mostrarMensaje('La gestion de equipaje posterior aun no esta conectada.', 'info');
  }

  estaPagado(viaje: any): boolean {
    const estado = (viaje?.pago?.estado || '').toString().toUpperCase();
    return estado === 'APROBADO' || estado === 'PAGADO';
  }

  facturaEmitida(viaje: any): boolean {
    const estado = (viaje?.factura?.estadoFac || viaje?.factura?.estado || '').toString().toUpperCase();
    return estado === 'EMI' || estado === 'APR' || estado === 'EMITIDA' || estado === 'APROBADA' || estado === 'APROBADO';
  }

  textoEstadoFactura(viaje: any): string {
    const estado = (viaje?.factura?.estadoFac || viaje?.factura?.estado || '').toString().toUpperCase();

    if (!estado) return 'PENDIENTE';
    if (estado === 'EMI') return 'EMITIDA';
    if (estado === 'APR') return 'APROBADA';
    if (estado === 'ABI') return 'ABIERTA';
    if (estado === 'ANU') return 'ANULADA';

    return estado;
  }

  claseEstadoFactura(viaje: any): string {
    const estado = (viaje?.factura?.estadoFac || viaje?.factura?.estado || '').toString().toUpperCase();

    if (estado === 'EMI' || estado === 'APR' || estado === 'EMITIDA' || estado === 'APROBADA') return 'estado-ok';
    if (estado === 'ANU') return 'estado-error';

    return 'estado-warning';
  }

  textoEstadoPago(viaje: any): string {
    const estado = (viaje?.pago?.estado || '').toString().toUpperCase();
    return estado || 'PENDIENTE';
  }

  total(viaje: any): number {
    return Number(viaje?.total || viaje?.factura?.facTotal || viaje?.pago?.monto || 0);
  }

  qrTexto(item: any): string {
    const boleto = item?.boleto?.numeroBoleto || 'SIN-BOLETO';
    const reserva = item?.viaje?.codigoReserva || 'SIN-RESERVA';
    const asiento = item?.pasajero?.numeroAsiento || 'SIN-ASIENTO';

    return `${boleto}|${reserva}|${asiento}`;
  }

  descargarBoleto(item: any): void {
    const boleto = item?.boleto?.numeroBoleto || 'boleto';

    const contenido = [
      'BOARDING PASS - BOOKING VUELOS',
      '--------------------------------',
      `Boleto: ${item?.boleto?.numeroBoleto || 'N/D'}`,
      `E-ticket: ${item?.boleto?.eTicket || item?.boleto?.ETicket || item?.boleto?.eticket || 'N/D'}`,
      `Reserva: ${item?.viaje?.codigoReserva || 'N/D'}`,
      `Vuelo: ${item?.viaje?.vuelo?.numeroVuelo || 'N/D'}`,
      `Ruta: ${item?.viaje?.vuelo?.origenCodigo || 'N/D'} -> ${item?.viaje?.vuelo?.destinoCodigo || 'N/D'}`,
      `Pasajero: ${item?.pasajero?.nombres || ''} ${item?.pasajero?.apellidos || ''}`,
      `Documento: ${item?.pasajero?.numeroDocumento || 'N/D'}`,
      `Asiento: ${item?.pasajero?.numeroAsiento || 'N/D'}`,
      `Estado boleto: ${item?.boleto?.estadoBoleto || 'N/D'}`,
      `Factura: ${item?.viaje?.factura?.numeroFactura || 'N/D'}`
    ].join('\n');

    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${boleto}.txt`;
    a.click();

    URL.revokeObjectURL(url);
  }

  private mostrarMensaje(texto: string, tipo: 'info' | 'ok' | 'error'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
  }
}
