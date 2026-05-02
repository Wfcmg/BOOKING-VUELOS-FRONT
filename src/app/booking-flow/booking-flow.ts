import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth';
import { BookingClienteService } from '../services/booking-cliente';

interface PasajeroForm {
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero: string;
  nacionalidad: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaExpiracionDocumento: string;
  numeroAsiento: string;
  equipajeTipo: string;
  equipajeCantidad: number;
  equipajePesoKg: number;
  equipajePrecio: number;
}

interface AsientoMapa {
  numero: string;
  ocupado: boolean;
}

@Component({
  selector: 'app-booking-flow',
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-flow.html',
  styleUrl: './booking-flow.css'
})
export class BookingFlow implements OnChanges {
  @Input() vuelo: any = null;
  @Output() volverHome = new EventEmitter<void>();

  pasoActual = 1;
  mensaje = '';
  tipoMensaje: 'ok' | 'error' = 'error';
  procesando = false;

  fechaHoy = new Date().toISOString().slice(0, 10);
  fechaManana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  pasajeroActivoIndex = 0;

  pasajeros: PasajeroForm[] = [];
  asientos: AsientoMapa[] = this.generarAsientos();
  asientosOcupados: string[] = [];

  datosFacturacion = {
    tipoDocumento: 'CEDULA',
    rucCedula: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    pais: 'Ecuador',
    correo: '',
    telefono: '',
    metodoPago: 'Tarjeta',
    tarjetaNumero: '',
    tarjetaNombre: '',
    tarjetaVencimiento: '',
    tarjetaCvv: '',
    referenciaPago: ''
  };

  confirmacion: any = null;

  pasos = [
    { numero: 1, titulo: 'Pasajeros' },
    { numero: 2, titulo: 'Asientos' },
    { numero: 3, titulo: 'Equipaje' },
    { numero: 4, titulo: 'Resumen' },
    { numero: 5, titulo: 'Pago' },
    { numero: 6, titulo: 'Confirmacion' }
  ];

  constructor(
    private authService: AuthService,
    private bookingService: BookingClienteService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vuelo']) {
      this.inicializarPasajeros();
    }
  }

  inicializarPasajeros(): void {
    const cantidad = Number(this.vuelo?.pasajeros || 1);

    this.pasajeros = Array.from({ length: cantidad }, () => ({
      nombres: '',
      apellidos: '',
      fechaNacimiento: '',
      genero: 'N/A',
      nacionalidad: 'Ecuatoriana',
      tipoDocumento: 'CEDULA',
      numeroDocumento: '',
      fechaExpiracionDocumento: '',
      numeroAsiento: '',
      equipajeTipo: 'Sin equipaje extra',
      equipajeCantidad: 0,
      equipajePesoKg: 0,
      equipajePrecio: 0
    }));

    this.asientos = this.generarAsientos();
    this.cargarAsientosOcupados();
  }

  generarAsientos(): AsientoMapa[] {
    const letras = ['A', 'B', 'C', 'D'];
    const lista: AsientoMapa[] = [];

    for (let fila = 1; fila <= 12; fila++) {
      for (const letra of letras) {
        lista.push({ numero: `${fila}${letra}`, ocupado: false });
      }
    }

    return lista;
  }

  async cargarAsientosOcupados(): Promise<void> {
    const vueloId = Number(this.vuelo?.vueloId || 0);

    this.asientosOcupados = [];

    if (!vueloId) {
      this.marcarAsientosOcupados();
      return;
    }

    try {
      const respuesta = await fetch(`https://localhost:44398/api/ClienteBooking/asientos-ocupados/${vueloId}`, {
        method: 'GET',
        cache: 'no-store'
      });

      if (!respuesta.ok) {
        throw new Error(`Error HTTP ${respuesta.status}`);
      }

      const data = await respuesta.json();

      this.asientosOcupados = Array.isArray(data)
        ? data.map((x: any) => String(x).trim().toUpperCase())
        : [];

      this.marcarAsientosOcupados();
    } catch (error) {
      console.error('No se pudieron cargar asientos ocupados:', error);
      this.asientosOcupados = [];
      this.marcarAsientosOcupados();
    }
  }

  marcarAsientosOcupados(): void {
    this.asientos = this.asientos.map(asiento => ({
      ...asiento,
      ocupado: this.asientosOcupados.includes(String(asiento.numero).trim().toUpperCase())
    }));

    for (const p of this.pasajeros) {
      const asientoActual = String(p.numeroAsiento || '').trim().toUpperCase();

      if (asientoActual && this.asientosOcupados.includes(asientoActual)) {
        p.numeroAsiento = '';
      }
    }
  }

  seleccionarAsiento(pasajero: PasajeroForm, asiento: AsientoMapa): void {
    if (asiento.ocupado) {
      this.error(`El asiento ${asiento.numero} ya esta ocupado. Selecciona otro.`);
      return;
    }

    if (this.asientoSeleccionadoPorOtro(pasajero, asiento.numero)) {
      this.error(`El asiento ${asiento.numero} ya fue seleccionado por otro pasajero.`);
      return;
    }

    this.mensaje = '';
    pasajero.numeroAsiento = asiento.numero;
    this.guardarEstadoTemporal();
  }

  asientoSeleccionadoPorOtro(pasajeroActual: PasajeroForm, asiento: string): boolean {
    return this.pasajeros.some(p => p !== pasajeroActual && p.numeroAsiento === asiento);
  }

  pasajeroActivo(): PasajeroForm | null {
    return this.pasajeros[this.pasajeroActivoIndex] || this.pasajeros[0] || null;
  }

  seleccionarPasajeroParaAsiento(index: number): void {
    if (index < 0 || index >= this.pasajeros.length) return;

    this.pasajeroActivoIndex = index;
    this.mensaje = '';
  }

  seleccionarAsientoActivo(asiento: AsientoMapa): void {
    const pasajero = this.pasajeroActivo();

    if (!pasajero) {
      this.error('Primero registra un pasajero.');
      return;
    }

    this.seleccionarAsiento(pasajero, asiento);
  }

  asientoSeleccionado(asiento: string): boolean {
    const numero = String(asiento || '').trim().toUpperCase();
    return this.pasajeros.some(p => String(p.numeroAsiento || '').trim().toUpperCase() === numero);
  }

  actualizarDocumentoPasajero(p: PasajeroForm): void {
    const tipo = String(p.tipoDocumento || '').trim().toUpperCase();

    if (tipo === 'CEDULA') {
      p.numeroDocumento = this.soloDigitos(p.numeroDocumento).slice(0, 10);
      return;
    }

    if (tipo === 'PASAPORTE') {
      p.numeroDocumento = String(p.numeroDocumento || '')
        .replace(/[^0-9A-Za-z-]/g, '')
        .slice(0, 20)
        .toUpperCase();
      return;
    }

    p.numeroDocumento = String(p.numeroDocumento || '').slice(0, 20);
  }


  actualizarEquipaje(p: PasajeroForm): void {
    if (p.equipajeTipo === 'Sin equipaje extra') {
      p.equipajeCantidad = 0;
      p.equipajePesoKg = 0;
      p.equipajePrecio = 0;
    }

    if (p.equipajeTipo === 'Maleta 23kg') {
      p.equipajeCantidad = 1;
      p.equipajePesoKg = 23;
      p.equipajePrecio = 35;
    }

    if (p.equipajeTipo === 'Maleta extra 32kg') {
      p.equipajeCantidad = 1;
      p.equipajePesoKg = 32;
      p.equipajePrecio = 60;
    }
  }

  validarPasoActual(): boolean {
    this.mensaje = '';

    if (this.pasoActual === 1) return this.validarPasajeros();
    if (this.pasoActual === 2) return this.validarAsientos();
    if (this.pasoActual === 5) return this.validarPago();

    return true;
  }


  private soloDigitos(valor: string): string {
    return String(valor || '').replace(/\D/g, '');
  }

  private validarCedulaEcuador(cedula: string): boolean {
    const digitos = this.soloDigitos(cedula);

    if (!/^\d{10}$/.test(digitos)) return false;

    const provincia = Number(digitos.substring(0, 2));
    return provincia >= 1 && provincia <= 24;
  }

  private validarRucEcuador(ruc: string): boolean {
    const digitos = this.soloDigitos(ruc);

    if (!/^\d{13}$/.test(digitos)) return false;

    const provincia = Number(digitos.substring(0, 2));
    if (provincia < 1 || provincia > 24) return false;

    return digitos.endsWith('001');
  }

  private validarDocumentoEcuador(tipo: string, documento: string): boolean {
    const tipoNormalizado = String(tipo || '').trim().toUpperCase();
    const digitos = this.soloDigitos(documento);

    if (tipoNormalizado === 'CEDULA') {
      return this.validarCedulaEcuador(digitos);
    }

    if (tipoNormalizado === 'RUC') {
      return this.validarRucEcuador(digitos);
    }

    return /^[0-9A-Za-z\-]{5,20}$/.test(String(documento || '').trim());
  }

  private validarTelefonoEcuador(telefono: string): boolean {
    const digitos = this.soloDigitos(telefono);
    return /^09\d{8}$/.test(digitos);
  }

  private validarNombreTexto(valor: string): boolean {
    return /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]{2,80}$/.test(String(valor || '').trim());
  }

  private normalizarValidaciones(): void {
    this.datosFacturacion.rucCedula = this.soloDigitos(this.datosFacturacion.rucCedula);
    this.datosFacturacion.telefono = this.soloDigitos(this.datosFacturacion.telefono);

    for (const p of this.pasajeros) {
      p.numeroDocumento = this.soloDigitos(p.numeroDocumento);
      p.nombres = String(p.nombres || '').trim();
      p.apellidos = String(p.apellidos || '').trim();
    }
  }

  validarPasajeros(): boolean {
    this.normalizarValidaciones();

    for (let i = 0; i < this.pasajeros.length; i++) {
      const p = this.pasajeros[i];

      if (!p.nombres.trim() || !p.apellidos.trim() || !p.fechaNacimiento || !p.numeroDocumento.trim()) {
        return this.error(`Completa nombres, apellidos, nacimiento y documento del pasajero ${i + 1}.`);
      }

      if (!this.validarNombreTexto(p.nombres) || !this.validarNombreTexto(p.apellidos)) {
        return this.error(`El pasajero ${i + 1} tiene nombres o apellidos invalidos. Solo letras y espacios.`);
      }

      if (!this.validarDocumentoEcuador(p.tipoDocumento, p.numeroDocumento)) {
        if (String(p.tipoDocumento).toUpperCase() === 'CEDULA') {
          return this.error(`La cedula del pasajero ${i + 1} no es valida. Debe tener 10 digitos y pasar validacion ecuatoriana.`);
        }

        if (String(p.tipoDocumento).toUpperCase() === 'RUC') {
          return this.error(`El RUC del pasajero ${i + 1} no es valido. Debe tener 13 digitos y terminar en 001.`);
        }

        return this.error(`El documento del pasajero ${i + 1} no es valido.`);
      }

      if (p.fechaNacimiento >= this.fechaHoy) {
        return this.error(`La fecha de nacimiento del pasajero ${i + 1} no puede ser hoy ni futura.`);
      }

      if (!p.fechaExpiracionDocumento) {
        return this.error(`Completa la fecha de expiracion del documento del pasajero ${i + 1}.`);
      }

      if (p.fechaExpiracionDocumento <= this.fechaHoy) {
        return this.error(`La fecha de expiracion del documento del pasajero ${i + 1} debe ser mayor a la fecha actual.`);
      }
    }

    return true;
  }

  validarAsientos(): boolean {
    const asientos = this.pasajeros.map(p => p.numeroAsiento).filter(x => !!x);

    if (asientos.length !== this.pasajeros.length) {
      return this.error('Todos los pasajeros deben tener un asiento seleccionado.');
    }

    if (new Set(asientos).size !== asientos.length) {
      return this.error('No puedes repetir el mismo asiento para dos pasajeros.');
    }

    const ocupado = asientos.find(a => this.asientosOcupados.includes(String(a).trim().toUpperCase()));

    if (ocupado) {
      return this.error(`El asiento ${ocupado} ya esta ocupado. Selecciona otro.`);
    }

    return true;
  }

  validarPago(): boolean {
    this.normalizarValidaciones();

    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!this.datosFacturacion.rucCedula.trim() || !this.datosFacturacion.direccion.trim() || !this.datosFacturacion.ciudad.trim()) {
      return this.error('Completa cedula/RUC, direccion y ciudad para facturacion.');
    }

    if (!this.validarDocumentoEcuador(this.datosFacturacion.tipoDocumento, this.datosFacturacion.rucCedula)) {
      if (String(this.datosFacturacion.tipoDocumento).toUpperCase() === 'CEDULA') {
        return this.error('La cedula de facturacion no es valida. Debe tener 10 digitos y empezar con provincia 01 a 24.');
      }

      if (String(this.datosFacturacion.tipoDocumento).toUpperCase() === 'RUC') {
        return this.error('El RUC de facturacion no es valido. Debe tener 13 digitos y terminar en 001.');
      }

      return this.error('El documento de facturacion no es valido.');
    }

    if (!this.validarTelefonoEcuador(this.datosFacturacion.telefono)) {
      return this.error('El telefono debe ser un celular ecuatoriano valido: 10 digitos y empezar con 09.');
    }

    if (!correoRegex.test(this.datosFacturacion.correo.trim())) {
      return this.error('Ingresa un correo valido para la factura.');
    }

    const tarjetaLimpia = this.datosFacturacion.tarjetaNumero.replace(/\s/g, '');

    if (!/^[0-9]{13,19}$/.test(tarjetaLimpia)) {
      return this.error('Ingresa un numero de tarjeta valido para el pago simulado.');
    }

    if (!/^[0-9]{3,4}$/.test(this.datosFacturacion.tarjetaCvv)) {
      return this.error('El CVV debe tener 3 o 4 numeros.');
    }

    if (!this.validarNombreTexto(this.datosFacturacion.tarjetaNombre)) {
      return this.error('El nombre de la tarjeta debe contener solo letras y espacios.');
    }

    if (!this.datosFacturacion.tarjetaVencimiento) {
      return this.error('Completa el vencimiento de la tarjeta.');
    }

    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    if (this.datosFacturacion.tarjetaVencimiento < mesActual) {
      return this.error('La tarjeta no puede estar vencida.');
    }

    this.datosFacturacion.referenciaPago = 'SIM-' + tarjetaLimpia.slice(-4) + '-' + Date.now();
    return true;
  }

  siguientePaso(): void {
    if (!this.validarPasoActual()) return;

    if (this.pasoActual === 5) {
      this.confirmarReserva();
      return;
    }

    if (this.pasoActual < this.pasos.length) {
      this.pasoActual++;
      this.guardarEstadoTemporal();
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1 && !this.procesando) {
      this.pasoActual--;
      this.guardarEstadoTemporal();
      this.mensaje = '';
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    }
  }

  confirmarReserva(): void {
    if (!this.authService.estaLogueado()) {
      this.error('Debes iniciar sesion para confirmar la reserva.');
      return;
    }

    this.procesando = true;
    this.mensaje = '';

    const request = {
      usuarioAppId: this.authService.obtenerUsuarioAppId(),
      vueloId: Number(this.vuelo?.vueloId || 0),
      clase: this.vuelo?.clase || 'Economica',
      precioBase: this.precioBase,
      impuestos: this.impuestos,
      equipajeTotal: this.totalEquipaje,
      datosFacturacion: {
        tipoDocumento: this.datosFacturacion.tipoDocumento,
        rucCedula: this.datosFacturacion.rucCedula,
        direccion: this.datosFacturacion.direccion,
        ciudad: this.datosFacturacion.ciudad,
        provincia: this.datosFacturacion.provincia,
        pais: this.datosFacturacion.pais,
        correo: this.datosFacturacion.correo,
        telefono: this.datosFacturacion.telefono,
        metodoPago: 'Tarjeta',
        referenciaPago: this.datosFacturacion.referenciaPago
      },
      pasajeros: this.pasajeros.map((p: PasajeroForm) => ({
        nombres: p.nombres,
        apellidos: p.apellidos,
        fechaNacimiento: p.fechaNacimiento,
        genero: p.genero,
        nacionalidad: p.nacionalidad,
        tipoDocumento: p.tipoDocumento,
        numeroDocumento: p.numeroDocumento,
        fechaExpiracionDocumento: p.fechaExpiracionDocumento || null,
        numeroAsiento: p.numeroAsiento,
        equipajeTipo: p.equipajeTipo,
        equipajeCantidad: p.equipajeCantidad,
        equipajePesoKg: p.equipajePesoKg,
        equipajePrecio: p.equipajePrecio
      }))
    };

    this.bookingService.confirmarReserva(request).subscribe({
      next: (resp: any) => {
        console.log('Reserva confirmada OK:', resp);

        this.procesando = false;
        this.confirmacion = resp;
        this.tipoMensaje = 'ok';
        this.mensaje = 'Reserva confirmada correctamente.';
        this.pasoActual = 6;
        this.cd.detectChanges();

        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('booking_flow_estado');
            setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
          }
        } catch {}
      },
      error: (err: any) => {
        this.procesando = false;
        this.error(err?.error?.mensaje || 'No se pudo confirmar la reserva.');
        this.cd.detectChanges();
      }
    });
  }

  error(mensaje: string): false {
    this.tipoMensaje = 'error';
    this.mensaje = mensaje;
    return false;
  }

  volver(): void {
    this.volverHome.emit();
  }

  get precioBase(): number {
    return Number(this.vuelo?.precioBase || 129);
  }

  get impuestos(): number {
    return Number(this.vuelo?.impuestos || 18);
  }

  get totalBoletos(): number {
    return this.precioBase * this.pasajeros.length;
  }

  get totalEquipaje(): number {
    return this.pasajeros.reduce((acc, p) => acc + Number(p.equipajePrecio || 0), 0);
  }

  get subtotal(): number {
    return this.totalBoletos + this.totalEquipaje;
  }

  get iva(): number {
    return Math.round(this.subtotal * 0.12 * 100) / 100;
  }

  get total(): number {
    return Math.round((this.subtotal + this.iva) * 100) / 100;
  }

  get origenCodigo(): string {
    return this.vuelo?.ruta?.aeropuertoOrigen?.codigoIATA || this.vuelo?.origenCodigo || 'ORI';
  }

  get origenCiudad(): string {
    return this.vuelo?.ruta?.aeropuertoOrigen?.ciudad?.nombre || this.vuelo?.origenCiudad || '';
  }

  get destinoCodigo(): string {
    return this.vuelo?.ruta?.aeropuertoDestino?.codigoIATA || this.vuelo?.destinoCodigo || 'DES';
  }

  get destinoCiudad(): string {
    return this.vuelo?.ruta?.aeropuertoDestino?.ciudad?.nombre || this.vuelo?.destinoCiudad || '';
  }

  get avionModelo(): string {
    return this.vuelo?.avion?.modelo || this.vuelo?.nombreAvion || 'Avion asignado';
  }

  guardarEstadoTemporal(): void {
    try {
      const estado = {
        pasoActual: this.pasoActual,
        pasajeros: this.pasajeros,
        datosFacturacion: this.datosFacturacion,
        confirmacion: this.confirmacion
      };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('booking_flow_estado', JSON.stringify(estado));
      }
    } catch (error) {
      console.warn('No se pudo guardar el estado temporal:', error);
    }
  }

  restaurarEstadoTemporal(): void {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('booking_flow_estado') : null;
      if (!raw) return;

      const estado = JSON.parse(raw);

      if (estado.pasoActual) this.pasoActual = estado.pasoActual;
      if (estado.pasajeros) this.pasajeros = estado.pasajeros;
      if (estado.datosFacturacion) this.datosFacturacion = estado.datosFacturacion;
      if (estado.confirmacion) this.confirmacion = estado.confirmacion;
    } catch (error) {
      console.warn('No se pudo restaurar el estado temporal:', error);
    }
  }
}




