import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminApiService, RegistroAdmin } from './services/admin-api';

type CampoTipo =
  | 'text'
  | 'password'
  | 'email'
  | 'number'
  | 'date'
  | 'datetime-local'
  | 'checkbox'
  | 'select'
  | 'textarea';

interface OpcionSelect {
  valor: string | number | boolean;
  texto: string;
}

interface CampoAdmin {
  nombre: string;
  etiqueta: string;
  tipo: CampoTipo;
  requerido?: boolean;
  soloLectura?: boolean;
  valorInicial?: any;
  opciones?: () => OpcionSelect[];
}

interface ModuloAdmin {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  endpoint: string;
  pk: string;
  modo: 'crud' | 'lectura';
  estadoCampo?: string;
  permitirCrear?: boolean;
  permitirEditar?: boolean;
  permitirInactivar?: boolean;
  catalogos?: string[];
  columnas: CampoAdmin[];
  campos: CampoAdmin[];
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  @Output() salirAdmin = new EventEmitter<void>();

  readonly apiBase = 'http://localhost:5123/api';

  moduloActual: ModuloAdmin | null = null;
  registros: RegistroAdmin[] = [];
  registrosFiltradosCache: RegistroAdmin[] = [];
  catalogos: Record<string, RegistroAdmin[]> = {};

  busqueda = '';
  cargando = false;
  guardando = false;
  formAbierto = false;
  modoEdicion = false;
  mensaje = '';
  error = '';

  formulario: RegistroAdmin = {};
  registroEditando: RegistroAdmin | null = null;

  constructor(private adminApi: AdminApiService, private cd: ChangeDetectorRef) {
    setTimeout(() => {
      const modulosSeguros = [
        'paises',
        'ciudades',
        'aeropuertos',
        'rutas',
        'usuarios',
        'usuario-roles',
        'roles',
        'auditoria'
      ];

      this.modulos = this.modulos.filter((m) => modulosSeguros.includes(m.id));
      this.cd.detectChanges();
    }, 0);
  }

  modulos: ModuloAdmin[] = [
    {
      id: 'paises',
      titulo: 'Países',
      descripcion: 'Crear, editar e inactivar países',
      icono: '🌎',
      endpoint: 'Paises',
      pk: 'paisId',
      modo: 'crud',
      estadoCampo: 'activo',
      columnas: [
        this.col('paisId', 'ID', 'number'),
        this.col('codigoISO2', 'ISO2', 'text'),
        this.col('codigoISO3', 'ISO3', 'text'),
        this.col('nombre', 'Nombre', 'text'),
        this.col('nacionalidad', 'Nacionalidad', 'text'),
        this.col('activo', 'Estado', 'checkbox')
      ],
      campos: [
        this.campo('codigoISO2', 'Código ISO2', 'text', true),
        this.campo('codigoISO3', 'Código ISO3', 'text'),
        this.campo('nombre', 'Nombre', 'text', true),
        this.campo('nacionalidad', 'Nacionalidad', 'text'),
        this.campo('activo', 'Activo', 'checkbox', false, true)
      ]
    },
    {
      id: 'ciudades',
      titulo: 'Ciudades',
      descripcion: 'Administrar ciudades disponibles',
      icono: '🏙️',
      endpoint: 'Ciudades',
      pk: 'ciudadId',
      modo: 'crud',
      estadoCampo: 'activo',
      catalogos: ['Paises'],
      columnas: [
        this.col('ciudadId', 'ID', 'number'),
        this.col('paisId', 'País', 'select', false, false, undefined, () => this.opcionesPaises()),
        this.col('nombre', 'Nombre', 'text'),
        this.col('codigoPostal', 'Código postal', 'text'),
        this.col('zonaHoraria', 'Zona horaria', 'text'),
        this.col('esCapital', 'Capital', 'checkbox'),
        this.col('activo', 'Estado', 'checkbox')
      ],
      campos: [
        this.campo('paisId', 'País', 'select', true, undefined, () => this.opcionesPaises()),
        this.campo('nombre', 'Nombre', 'text', true),
        this.campo('codigoPostal', 'Código postal', 'text'),
        this.campo('esCapital', 'Es capital', 'checkbox', false, false),
        this.campo('zonaHoraria', 'Zona horaria', 'text', true, 'America/Guayaquil'),
        this.campo('activo', 'Activo', 'checkbox', false, true)
      ]
    },
    {
      id: 'aeropuertos',
      titulo: 'Aeropuertos',
      descripcion: 'Gestionar aeropuertos de origen y destino',
      icono: '🛫',
      endpoint: 'Aeropuertos',
      pk: 'aeropuertoId',
      modo: 'crud',
      estadoCampo: 'activo',
      catalogos: ['Ciudades'],
      columnas: [
        this.col('aeropuertoId', 'ID', 'number'),
        this.col('ciudadId', 'Ciudad', 'select', false, false, undefined, () => this.opcionesCiudades()),
        this.col('nombre', 'Nombre', 'text'),
        this.col('codigoIATA', 'IATA', 'text'),
        this.col('codigoICAO', 'ICAO', 'text'),
        this.col('esInternacional', 'Internacional', 'checkbox'),
        this.col('activo', 'Estado', 'checkbox')
      ],
      campos: [
        this.campo('ciudadId', 'Ciudad', 'select', true, undefined, () => this.opcionesCiudades()),
        this.campo('nombre', 'Nombre', 'text', true),
        this.campo('codigoIATA', 'Código IATA', 'text', true),
        this.campo('codigoICAO', 'Código ICAO', 'text'),
        this.campo('esInternacional', 'Es internacional', 'checkbox', false, true),
        this.campo('telefonoContacto', 'Teléfono contacto', 'text'),
        this.campo('emailContacto', 'Email contacto', 'email'),
        this.campo('activo', 'Activo', 'checkbox', false, true)
      ]
    },
    {
      id: 'aviones',
      titulo: 'Aviones',
      descripcion: 'Registrar y editar aviones',
      icono: '✈️',
      endpoint: 'Aviones',
      pk: 'avionId',
      modo: 'crud',
      estadoCampo: 'activo',
      columnas: [
        this.col('avionId', 'ID', 'number'),
        this.col('matricula', 'Matrícula', 'text'),
        this.col('fabricante', 'Fabricante', 'text'),
        this.col('modelo', 'Modelo', 'text'),
        this.col('capacidadEconomica', 'Económica', 'number'),
        this.col('capacidadEjecutiva', 'Ejecutiva', 'number'),
        this.col('capacidadPrimera', 'Primera', 'number'),
        this.col('anioFabricacion', 'Año', 'number'),
        this.col('activo', 'Estado', 'checkbox')
      ],
      campos: [
        this.campo('matricula', 'Matrícula', 'text', true),
        this.campo('fabricante', 'Fabricante', 'text', true),
        this.campo('modelo', 'Modelo', 'text', true),
        this.campo('capacidadEconomica', 'Capacidad económica', 'number', true, 0),
        this.campo('capacidadEjecutiva', 'Capacidad ejecutiva', 'number', true, 0),
        this.campo('capacidadPrimera', 'Capacidad primera', 'number', true, 0),
        this.campo('anioFabricacion', 'Año fabricación', 'number', true, new Date().getFullYear()),
        this.campo('activo', 'Activo', 'checkbox', false, true)
      ]
    },
    {
      id: 'rutas',
      titulo: 'Rutas',
      descripcion: 'Visualizar rutas automáticas entre aeropuertos',
      icono: '🧭',
      endpoint: 'Rutas',
      pk: 'rutaId',
      modo: 'lectura',
      estadoCampo: 'activo',
      catalogos: ['Aeropuertos'],
      columnas: [
        this.col('rutaId', 'ID', 'number'),
        this.col('aeropuertoOrigenId', 'Origen', 'select', false, false, undefined, () => this.opcionesAeropuertos()),
        this.col('aeropuertoDestinoId', 'Destino', 'select', false, false, undefined, () => this.opcionesAeropuertos()),
        this.col('distanciaKm', 'Distancia KM', 'number'),
        this.col('duracionMinutos', 'Duración min', 'number'),
        this.col('activo', 'Estado', 'checkbox')
      ],
      campos: [
        this.campo('aeropuertoOrigenId', 'Aeropuerto origen', 'select', true, undefined, () => this.opcionesAeropuertos()),
        this.campo('aeropuertoDestinoId', 'Aeropuerto destino', 'select', true, undefined, () => this.opcionesAeropuertos()),
        this.campo('distanciaKm', 'Distancia KM', 'number', true, 0),
        this.campo('duracionMinutos', 'Duración minutos', 'number', true, 60),
        this.campo('activo', 'Activo', 'checkbox', false, true)
      ]
    },
    {
      id: 'vuelos',
      titulo: 'Vuelos',
      descripcion: 'Programar y administrar vuelos',
      icono: '🗓️',
      endpoint: 'Vuelos',
      pk: 'vueloId',
      modo: 'crud',
      estadoCampo: 'activo',
      catalogos: ['Rutas', 'Aviones'],
      columnas: [
        this.col('vueloId', 'ID', 'number'),
        this.col('numeroVuelo', 'Vuelo', 'text'),
        this.col('rutaId', 'Ruta', 'select', false, false, undefined, () => this.opcionesRutas()),
        this.col('avionId', 'Avión', 'select', false, false, undefined, () => this.opcionesAviones()),
        this.col('fechaSalidaProgramada', 'Salida', 'datetime-local'),
        this.col('fechaLlegadaProgramada', 'Llegada', 'datetime-local'),
        this.col('estado', 'Estado', 'text'),
        this.col('activo', 'Activo', 'checkbox')
      ],
      campos: [
        this.campo('rutaId', 'Ruta', 'select', true, undefined, () => this.opcionesRutas()),
        this.campo('avionId', 'Avión', 'select', true, undefined, () => this.opcionesAviones()),
        this.campo('numeroVuelo', 'Número de vuelo', 'text', true),
        this.campo('fechaSalidaProgramada', 'Fecha salida', 'datetime-local', true, this.ahoraLocal()),
        this.campo('fechaLlegadaProgramada', 'Fecha llegada', 'datetime-local', true, this.ahoraLocal()),
        this.campo('estado', 'Estado', 'text', true, 'A_TIEMPO'),
        this.campo('activo', 'Activo', 'checkbox', false, true)
      ]
    },
    {
      id: 'tarifas',
      titulo: 'Tarifas',
      descripcion: 'Precios por vuelo y clase',
      icono: '💰',
      endpoint: 'TarifasVuelo',
      pk: 'tarifaVueloId',
      modo: 'crud',
      estadoCampo: 'activa',
      catalogos: ['Vuelos'],
      columnas: [
        this.col('tarifaVueloId', 'ID', 'number'),
        this.col('vueloId', 'Vuelo', 'select', false, false, undefined, () => this.opcionesVuelos()),
        this.col('clase', 'Clase', 'text'),
        this.col('precioBase', 'Precio base', 'number'),
        this.col('impuestos', 'Impuestos', 'number'),
        this.col('tasaAeroportuaria', 'Tasa', 'number'),
        this.col('activa', 'Estado', 'checkbox')
      ],
      campos: [
        this.campo('vueloId', 'Vuelo', 'select', true, undefined, () => this.opcionesVuelos()),
        this.campo('clase', 'Clase', 'text', true, 'Económica'),
        this.campo('precioBase', 'Precio base', 'number', true, 129),
        this.campo('impuestos', 'Impuestos', 'number', true, 0),
        this.campo('tasaAeroportuaria', 'Tasa aeroportuaria', 'number', true, 12),
        this.campo('activa', 'Activa', 'checkbox', false, true),
        this.campo('fechaCreacion', 'Fecha creación', 'datetime-local', true, this.ahoraLocal())
      ]
    },
    {
      id: 'asientos',
      titulo: 'Asientos',
      descripcion: 'Administrar asientos por vuelo',
      icono: '💺',
      endpoint: 'AsientosVuelo',
      pk: 'asientoVueloId',
      modo: 'crud',
      estadoCampo: 'activo',
      catalogos: ['Vuelos'],
      columnas: [
        this.col('asientoVueloId', 'ID', 'number'),
        this.col('vueloId', 'Vuelo', 'select', false, false, undefined, () => this.opcionesVuelos()),
        this.col('numeroAsiento', 'Asiento', 'text'),
        this.col('clase', 'Clase', 'text'),
        this.col('disponible', 'Disponible', 'checkbox'),
        this.col('activo', 'Activo', 'checkbox')
      ],
      campos: [
        this.campo('vueloId', 'Vuelo', 'select', true, undefined, () => this.opcionesVuelos()),
        this.campo('numeroAsiento', 'Número asiento', 'text', true),
        this.campo('clase', 'Clase', 'text', true, 'Económica'),
        this.campo('disponible', 'Disponible', 'checkbox', false, true),
        this.campo('activo', 'Activo', 'checkbox', false, true)
      ]
    },
    {
      id: 'escalas',
      titulo: 'Escalas',
      descripcion: 'Gestionar escalas por ruta',
      icono: '🔁',
      endpoint: 'Escalas',
      pk: 'escalaId',
      modo: 'crud',
      estadoCampo: 'activo',
      catalogos: ['Rutas', 'Aeropuertos'],
      columnas: [
        this.col('escalaId', 'ID', 'number'),
        this.col('rutaId', 'Ruta', 'select', false, false, undefined, () => this.opcionesRutas()),
        this.col('aeropuertoId', 'Aeropuerto', 'select', false, false, undefined, () => this.opcionesAeropuertos()),
        this.col('orden', 'Orden', 'number'),
        this.col('duracionMinutos', 'Duración', 'number'),
        this.col('activo', 'Activo', 'checkbox')
      ],
      campos: [
        this.campo('rutaId', 'Ruta', 'select', true, undefined, () => this.opcionesRutas()),
        this.campo('aeropuertoId', 'Aeropuerto', 'select', true, undefined, () => this.opcionesAeropuertos()),
        this.campo('orden', 'Orden', 'number', true, 1),
        this.campo('duracionMinutos', 'Duración minutos', 'number', true, 45),
        this.campo('activo', 'Activo', 'checkbox', false, true)
      ]
    },
    {
      id: 'usuarios',
      titulo: 'Usuarios',
      descripcion: 'Crear y editar usuarios del sistema',
      icono: '👤',
      endpoint: 'UsuariosApp',
      pk: 'usuarioAppId',
      modo: 'crud',
      estadoCampo: 'activo',
      permitirInactivar: false,
      columnas: [
        this.col('usuarioAppId', 'ID', 'number'),
        this.col('userName', 'Usuario', 'text'),
        this.col('nombreCompleto', 'Nombre', 'text'),
        this.col('correoElectronico', 'Correo', 'email'),
        this.col('telefono', 'Teléfono', 'text'),
        this.col('activo', 'Activo', 'checkbox')
      ],
      campos: [
        this.campo('userName', 'Usuario', 'text', true),
        this.campo('passwordHash', 'Contraseña temporal', 'password', true),
        this.campo('nombreCompleto', 'Nombre completo', 'text', true),
        this.campo('correoElectronico', 'Correo electrónico', 'email', true),
        this.campo('telefono', 'Teléfono', 'text'),
        this.campo('activo', 'Activo', 'checkbox', false, true),
        this.campo('fechaRegistro', 'Fecha registro', 'datetime-local', true, this.ahoraLocal())
      ]
    },
    {
      id: 'usuario-roles',
      titulo: 'Asignar roles',
      descripcion: 'Vincular usuarios con roles',
      icono: '🔐',
      endpoint: 'UsuariosRol',
      pk: 'usuarioRolId',
      modo: 'crud',
      catalogos: ['UsuariosApp', 'Roles'],
      columnas: [
        this.col('usuarioRolId', 'ID', 'number'),
        this.col('usuarioAppId', 'Usuario', 'select', false, false, undefined, () => this.opcionesUsuarios()),
        this.col('rolId', 'Rol', 'select', false, false, undefined, () => this.opcionesRoles()),
        this.col('fechaAsignacion', 'Fecha', 'datetime-local')
      ],
      campos: [
        this.campo('usuarioAppId', 'Usuario', 'select', true, undefined, () => this.opcionesUsuarios()),
        this.campo('rolId', 'Rol', 'select', true, undefined, () => this.opcionesRoles()),
        this.campo('fechaAsignacion', 'Fecha asignación', 'datetime-local', true, this.ahoraLocal())
      ]
    },
    {
      id: 'roles',
      titulo: 'Roles',
      descripcion: 'Consultar roles base del sistema',
      icono: '🛡️',
      endpoint: 'Roles',
      pk: 'rolId',
      modo: 'lectura',
      columnas: [
        this.col('rolId', 'ID', 'number'),
        this.col('nombre', 'Rol', 'text'),
        this.col('descripcion', 'Descripción', 'text'),
        this.col('activo', 'Activo', 'checkbox'),
        this.col('fechaCreacion', 'Fecha creación', 'datetime-local')
      ],
      campos: []
    },
    {
      id: 'auditoria',
      titulo: 'Auditoría',
      descripcion: 'Solo consulta de acciones realizadas',
      icono: '📋',
      endpoint: 'Auditorias',
      pk: 'auditoriaId',
      modo: 'lectura',
      columnas: [
        this.col('auditoriaId', 'ID', 'number'),
        this.col('tabla', 'Tabla', 'text'),
        this.col('accion', 'Acción', 'text'),
        this.col('registroId', 'Registro', 'text'),
        this.col('usuario', 'Usuario', 'text'),
        this.col('fecha', 'Fecha', 'datetime-local'),
        this.col('observacion', 'Observación', 'text')
      ],
      campos: []
    },
    {
      id: 'clientes',
      titulo: 'Clientes',
      descripcion: 'Consultar y editar datos de clientes',
      icono: '🧑‍💼',
      endpoint: 'Clientes',
      pk: 'clienteId',
      modo: 'crud',
      estadoCampo: 'activo',
      columnas: [
        this.col('clienteId', 'ID', 'number'),
        this.col('tipoCliente', 'Tipo', 'text'),
        this.col('nombres', 'Nombres', 'text'),
        this.col('apellidos', 'Apellidos', 'text'),
        this.col('email', 'Email', 'email'),
        this.col('numeroDocumento', 'Documento', 'text'),
        this.col('activo', 'Activo', 'checkbox')
      ],
      campos: [
        this.campo('tipoCliente', 'Tipo cliente', 'text', true, 'PERSONA'),
        this.campo('nombres', 'Nombres', 'text'),
        this.campo('apellidos', 'Apellidos', 'text'),
        this.campo('razonSocial', 'Razón social', 'text'),
        this.campo('tipoDocumento', 'Tipo documento', 'text', true, 'CEDULA'),
        this.campo('numeroDocumento', 'Número documento', 'text', true),
        this.campo('email', 'Email', 'email', true),
        this.campo('telefono', 'Teléfono', 'text'),
        this.campo('celular', 'Celular', 'text'),
        this.campo('direccion', 'Dirección', 'text'),
        this.campo('ciudad', 'Ciudad', 'text'),
        this.campo('provincia', 'Provincia', 'text'),
        this.campo('pais', 'País', 'text'),
        this.campo('codigoPostal', 'Código postal', 'text'),
        this.campo('activo', 'Activo', 'checkbox', false, true)
      ]
    },
    {
      id: 'pasajeros',
      titulo: 'Pasajeros',
      descripcion: 'Administrar pasajeros registrados',
      icono: '🧳',
      endpoint: 'Pasajeros',
      pk: 'pasajeroId',
      modo: 'crud',
      estadoCampo: 'activo',
      columnas: [
        this.col('pasajeroId', 'ID', 'number'),
        this.col('nombres', 'Nombres', 'text'),
        this.col('apellidos', 'Apellidos', 'text'),
        this.col('tipoDocumento', 'Tipo doc.', 'text'),
        this.col('numeroDocumento', 'Documento', 'text'),
        this.col('nacionalidad', 'Nacionalidad', 'text'),
        this.col('activo', 'Activo', 'checkbox')
      ],
      campos: [
        this.campo('nombres', 'Nombres', 'text', true),
        this.campo('apellidos', 'Apellidos', 'text', true),
        this.campo('fechaNacimiento', 'Fecha nacimiento', 'date', true),
        this.campo('genero', 'Género', 'text', true, 'N/A'),
        this.campo('nacionalidad', 'Nacionalidad', 'text', true, 'Ecuatoriana'),
        this.campo('tipoDocumento', 'Tipo documento', 'text', true, 'CEDULA'),
        this.campo('numeroDocumento', 'Número documento', 'text', true),
        this.campo('fechaExpiracionDocumento', 'Expira documento', 'date'),
        this.campo('activo', 'Activo', 'checkbox', false, true)
      ]
    },
    {
      id: 'reservas',
      titulo: 'Reservas',
      descripcion: 'Consultar reservas generadas',
      icono: '🎫',
      endpoint: 'Reservas',
      pk: 'reservaId',
      modo: 'lectura',
      columnas: [
        this.col('reservaId', 'ID', 'number'),
        this.col('clienteId', 'Cliente', 'number'),
        this.col('vueloId', 'Vuelo', 'number'),
        this.col('codigoReserva', 'Código', 'text'),
        this.col('estado', 'Estado', 'text'),
        this.col('subtotal', 'Subtotal', 'number'),
        this.col('impuestos', 'IVA', 'number'),
        this.col('total', 'Total', 'number'),
        this.col('activa', 'Activa', 'checkbox')
      ],
      campos: []
    },
    {
      id: 'pagos',
      titulo: 'Pagos',
      descripcion: 'Revisar pagos realizados',
      icono: '💳',
      endpoint: 'Pagos',
      pk: 'pagoId',
      modo: 'lectura',
      columnas: [
        this.col('pagoId', 'ID', 'number'),
        this.col('reservaId', 'Reserva', 'number'),
        this.col('metodoPagoId', 'Método', 'number'),
        this.col('monto', 'Monto', 'number'),
        this.col('moneda', 'Moneda', 'text'),
        this.col('estado', 'Estado', 'text'),
        this.col('fechaPago', 'Fecha pago', 'datetime-local')
      ],
      campos: []
    },
    {
      id: 'facturas',
      titulo: 'Facturas',
      descripcion: 'Consultar facturas emitidas',
      icono: '🧾',
      endpoint: 'Facturas',
      pk: 'facturaId',
      modo: 'lectura',
      columnas: [
        this.col('facturaId', 'ID', 'number'),
        this.col('numeroFactura', 'Número', 'text'),
        this.col('clienteId', 'Cliente', 'number'),
        this.col('reservaId', 'Reserva', 'number'),
        this.col('facSubtotal', 'Subtotal', 'number'),
        this.col('facIVA', 'IVA', 'number'),
        this.col('facTotal', 'Total', 'number'),
        this.col('estadoFac', 'Estado', 'text')
      ],
      campos: []
    },
    {
      id: 'boletos',
      titulo: 'Boletos',
      descripcion: 'Revisar boletos emitidos',
      icono: '🎟️',
      endpoint: 'Boletos',
      pk: 'boletoId',
      modo: 'lectura',
      columnas: [
        this.col('boletoId', 'ID', 'number'),
        this.col('reservaPasajeroId', 'Reserva pasajero', 'number'),
        this.col('numeroBoleto', 'Boleto', 'text'),
        this.col('eTicket', 'E-ticket', 'text'),
        this.col('estadoBoleto', 'Estado', 'text'),
        this.col('fechaEmision', 'Fecha emisión', 'datetime-local')
      ],
      campos: []
    },
    {
      id: 'checkin',
      titulo: 'Check-in',
      descripcion: 'Consultar check-ins realizados',
      icono: '✅',
      endpoint: 'CheckIns',
      pk: 'checkInId',
      modo: 'lectura',
      columnas: [
        this.col('checkInId', 'ID', 'number'),
        this.col('reservaPasajeroId', 'Reserva pasajero', 'number'),
        this.col('fechaCheckIn', 'Fecha', 'datetime-local'),
        this.col('estado', 'Estado', 'text'),
        this.col('canal', 'Canal', 'text')
      ],
      campos: []
    }
  ];

  private campo(
    nombre: string,
    etiqueta: string,
    tipo: CampoTipo,
    requerido = false,
    valorInicial?: any,
    opciones?: () => OpcionSelect[]
  ): CampoAdmin {
    return { nombre, etiqueta, tipo, requerido, valorInicial, opciones };
  }

  private col(
    nombre: string,
    etiqueta: string,
    tipo: CampoTipo,
    requerido = false,
    soloLectura = false,
    valorInicial?: any,
    opciones?: () => OpcionSelect[]
  ): CampoAdmin {
    return { nombre, etiqueta, tipo, requerido, soloLectura, valorInicial, opciones };
  }

  cerrarPanel() {
    this.salirAdmin.emit();
  }

  async seleccionarModulo(modulo: ModuloAdmin) {
    this.moduloActual = modulo;
    this.registros = [];
    this.registrosFiltradosCache = [];
    this.busqueda = '';
    this.error = '';
    this.mensaje = '';
    this.formAbierto = false;

    await this.cargarCatalogosNecesarios(modulo);
    await this.cargarDatos();
    this.cd.detectChanges();
  }

  volverDashboard() {
    this.moduloActual = null;
    this.registros = [];
    this.error = '';
    this.mensaje = '';
    this.formAbierto = false;
  }

  async cargarCatalogosNecesarios(modulo: ModuloAdmin) {
    const catalogos = modulo.catalogos || [];

    for (const catalogo of catalogos) {
      try {
        this.catalogos[catalogo] = await firstValueFrom(this.adminApi.listar(catalogo));
      } catch {
        this.catalogos[catalogo] = [];
      }
    }
  }

  async cargarDatos() {
    if (!this.moduloActual) return;

    this.cargando = true;
    this.error = '';
    this.mensaje = '';
    this.registros = [];
    this.registrosFiltradosCache = [];

    try {
      const token = typeof window !== 'undefined'
        ? window.localStorage.getItem('token')
        : null;

      const respuesta = await fetch(`${this.apiBase}/${this.moduloActual.endpoint}`, {
        method: 'GET',
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {}
      });

      if (!respuesta.ok) {
        const textoError = await respuesta.text();
        throw new Error(textoError || `Error HTTP ${respuesta.status}`);
      }

      const data = await respuesta.json();

      this.registros = Array.isArray(data) ? data : [];
      this.registrosFiltradosCache = [...this.registros];
      this.mensaje = `Datos cargados: ${this.registros.length}`;
    } catch (e: any) {
      this.error = e?.message || 'No se pudieron cargar los datos del módulo.';
      this.registros = [];
      this.registrosFiltradosCache = [];
    } finally {
      this.cargando = false;
      setTimeout(() => {
        this.cd.detectChanges();
      }, 0);
    }
  }

  abrirNuevo() {
    if (!this.moduloActual || this.moduloActual.modo === 'lectura') return;

    this.formulario = {};
    this.modoEdicion = false;
    this.registroEditando = null;

    for (const campo of this.moduloActual.campos) {
      if (campo.valorInicial !== undefined) {
        this.formulario[campo.nombre] = campo.valorInicial;
      } else if (campo.tipo === 'checkbox') {
        this.formulario[campo.nombre] = true;
      } else if (campo.tipo === 'number') {
        this.formulario[campo.nombre] = 0;
      } else if (campo.tipo === 'date') {
        this.formulario[campo.nombre] = this.hoy();
      } else if (campo.tipo === 'datetime-local') {
        this.formulario[campo.nombre] = this.ahoraLocal();
      } else if (campo.tipo === 'select') {
        const opciones = this.obtenerOpciones(campo);
        this.formulario[campo.nombre] = opciones.length ? opciones[0].valor : 0;
      } else {
        this.formulario[campo.nombre] = '';
      }
    }

    this.formAbierto = true;
    this.error = '';
    this.mensaje = '';
  }

  editar(registro: RegistroAdmin) {
    if (!this.moduloActual || this.moduloActual.modo === 'lectura') return;

    this.formulario = {};
    this.modoEdicion = true;
    this.registroEditando = registro;

    for (const campo of this.moduloActual.campos) {
      let valor = this.valorCrudo(registro, campo.nombre);

      if (campo.nombre === 'passwordHash' && !valor) {
        valor = '';
      }

      if (campo.tipo === 'datetime-local') {
        valor = this.formatearDateTimeLocal(valor);
      }

      if (campo.tipo === 'date') {
        valor = this.formatearDate(valor);
      }

      if (valor === undefined || valor === null) {
        valor = campo.valorInicial ?? (campo.tipo === 'checkbox' ? false : '');
      }

      this.formulario[campo.nombre] = valor;
    }

    this.formAbierto = true;
    this.error = '';
    this.mensaje = '';
  }

  cancelarFormulario() {
    this.formAbierto = false;
    this.formulario = {};
    this.registroEditando = null;
    this.modoEdicion = false;
  }

  async guardar() {
    if (!this.moduloActual || this.moduloActual.modo === 'lectura') return;

    const validacion = this.validarFormulario();

    if (validacion) {
      this.error = validacion;
      this.mensaje = '';
      this.guardando = false;
      this.cd.detectChanges();
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.cd.detectChanges();

    try {
      const payload = this.prepararPayload();

      if (this.modoEdicion && this.registroEditando) {
        const id = this.valorCrudo(this.registroEditando, this.moduloActual.pk);
        await firstValueFrom(this.adminApi.actualizar(this.moduloActual.endpoint, id, payload));
        this.mensaje = 'Registro actualizado correctamente.';
      } else {
        await firstValueFrom(this.adminApi.crear(this.moduloActual.endpoint, payload));
        this.mensaje = 'Registro creado correctamente.';
      }

      this.catalogos = {};
      this.cancelarFormulario();
      await this.cargarCatalogosNecesarios(this.moduloActual);
      await this.cargarDatos();
    } catch (e: any) {
      this.mensaje = '';
      this.error = this.obtenerMensajeError(e);
    } finally {
      this.guardando = false;
      this.cd.detectChanges();
    }
  }

  async inactivar(registro: RegistroAdmin) {
    if (!this.moduloActual || this.moduloActual.modo === 'lectura') return;
    if (this.moduloActual.permitirInactivar === false) return;
    if (!this.moduloActual.estadoCampo) return;

    const ok = confirm('¿Seguro que deseas inactivar este registro? No se elimina físicamente.');
    if (!ok) return;

    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    try {
      const payload: RegistroAdmin = {};

      for (const campo of this.moduloActual.campos) {
        payload[campo.nombre] = this.valorCrudo(registro, campo.nombre);
      }

      payload[this.moduloActual.estadoCampo] = false;

      const id = this.valorCrudo(registro, this.moduloActual.pk);
      await firstValueFrom(this.adminApi.actualizar(this.moduloActual.endpoint, id, payload));

      this.mensaje = 'Registro inactivado correctamente.';
      this.catalogos = {};
      await this.cargarCatalogosNecesarios(this.moduloActual);
      await this.cargarDatos();
    } catch (e: any) {
      this.error = this.obtenerMensajeError(e);
    } finally {
      this.guardando = false;
    }
  }

  registrosFiltrados(): RegistroAdmin[] {
    return this.registrosFiltradosCache;
  }

  actualizarRegistrosFiltrados() {
    const texto = this.busqueda.trim().toLowerCase();

    if (!texto || !this.moduloActual) {
      this.registrosFiltradosCache = this.registros;
      return;
    }

    this.registrosFiltradosCache = this.registros.filter((registro) =>
      this.moduloActual!.columnas.some((campo) =>
        String(this.mostrarValor(registro, campo)).toLowerCase().includes(texto)
      )
    );
  }

  mostrarValor(registro: RegistroAdmin, campo: CampoAdmin): string {
    const valor = this.valorCrudo(registro, campo.nombre);

    if (valor === null || valor === undefined || valor === '') {
      return '-';
    }

    if (campo.tipo === 'checkbox') {
      return valor ? 'Sí' : 'No';
    }

    if (campo.tipo === 'select') {
      const opcion = this.obtenerOpciones(campo).find((x) => String(x.valor) === String(valor));
      return opcion?.texto ?? String(valor);
    }

    if (campo.tipo === 'datetime-local' || campo.tipo === 'date') {
      return this.formatearFechaLegible(valor);
    }

    if (typeof valor === 'object') {
      return JSON.stringify(valor);
    }

    return String(valor);
  }

  obtenerOpciones(campo: CampoAdmin): OpcionSelect[] {
    return campo.opciones ? campo.opciones() : [];
  }

  private prepararPayload(): RegistroAdmin {
    if (!this.moduloActual) return {};

    const payload: RegistroAdmin = {};

    for (const campo of this.moduloActual.campos) {
      let valor = this.formulario[campo.nombre];

      if (this.moduloActual.id === 'paises') {
        if (campo.nombre === 'codigoISO2' || campo.nombre === 'codigoISO3') {
          valor = String(valor || '').trim().toUpperCase();
        }

        if (campo.nombre === 'nombre' || campo.nombre === 'nacionalidad') {
          valor = String(valor || '').trim().replace(/\s+/g, ' ');
        }
      }

      if (campo.tipo === 'number') {
        valor = Number(valor || 0);
      }

      if (campo.tipo === 'datetime-local' && !valor) {
        valor = this.ahoraLocal();
      }

      if (campo.tipo === 'date' && !valor) {
        valor = this.hoy();
      }

      payload[campo.nombre] = valor;
    }

    return payload;
  }

  private validarFormulario(): string {
    if (!this.moduloActual) return '';

    for (const campo of this.moduloActual.campos) {
      const valor = this.formulario[campo.nombre];

      if (campo.requerido && (valor === null || valor === undefined || valor === '')) {
        return `Completa el campo: ${campo.etiqueta}`;
      }
    }

    if (this.moduloActual.id === 'paises') {
      const iso2 = String(this.formulario['codigoISO2'] || '').trim().toUpperCase();
      const iso3 = String(this.formulario['codigoISO3'] || '').trim().toUpperCase();
      const nombre = String(this.formulario['nombre'] || '').trim().replace(/\s+/g, ' ');

      if (!/^[A-Z]{2}$/.test(iso2)) {
        return 'El código ISO2 debe tener exactamente 2 letras. Ejemplo: CL.';
      }

      if (!/^[A-Z]{3}$/.test(iso3)) {
        return 'El código ISO3 debe tener exactamente 3 letras. Ejemplo: CHL. No uses CHIL.';
      }

      if (nombre.length < 2 || nombre.length > 100) {
        return 'El nombre del país debe tener entre 2 y 100 caracteres.';
      }

      const idActual = this.modoEdicion && this.registroEditando && this.moduloActual
        ? this.valorCrudo(this.registroEditando, this.moduloActual.pk)
        : null;

      const duplicadoISO2 = this.registros.some((registro) =>
        String(this.valorCrudo(registro, 'paisId')) !== String(idActual) &&
        String(this.valorCrudo(registro, 'codigoISO2') || '').trim().toUpperCase() === iso2
      );

      if (duplicadoISO2) {
        return `Ya existe un país con el código ISO2 ${iso2}.`;
      }

      const duplicadoISO3 = this.registros.some((registro) =>
        String(this.valorCrudo(registro, 'paisId')) !== String(idActual) &&
        String(this.valorCrudo(registro, 'codigoISO3') || '').trim().toUpperCase() === iso3
      );

      if (duplicadoISO3) {
        return `Ya existe un país con el código ISO3 ${iso3}.`;
      }

      const duplicadoNombre = this.registros.some((registro) =>
        String(this.valorCrudo(registro, 'paisId')) !== String(idActual) &&
        String(this.valorCrudo(registro, 'nombre') || '').trim().toLowerCase() === nombre.toLowerCase()
      );

      if (duplicadoNombre) {
        return `Ya existe un país con el nombre ${nombre}.`;
      }

      this.formulario['codigoISO2'] = iso2;
      this.formulario['codigoISO3'] = iso3;
      this.formulario['nombre'] = nombre;
    }

    if (this.moduloActual.id === 'rutas') {
      if (String(this.formulario['aeropuertoOrigenId']) === String(this.formulario['aeropuertoDestinoId'])) {
        return 'El aeropuerto de origen y destino no pueden ser iguales.';
      }
    }

    return '';
  }

  private valorCrudo(registro: RegistroAdmin, campo: string): any {
    if (!registro) return undefined;

    if (registro[campo] !== undefined) {
      return registro[campo];
    }

    const pascal = campo.charAt(0).toUpperCase() + campo.slice(1);

    if (registro[pascal] !== undefined) {
      return registro[pascal];
    }

    if (campo === 'eTicket' && registro['ETicket'] !== undefined) {
      return registro['ETicket'];
    }

    if (campo === 'codigoISO2' && registro['CodigoISO2'] !== undefined) {
      return registro['CodigoISO2'];
    }

    if (campo === 'codigoISO3' && registro['CodigoISO3'] !== undefined) {
      return registro['CodigoISO3'];
    }

    if (campo === 'codigoIATA' && registro['CodigoIATA'] !== undefined) {
      return registro['CodigoIATA'];
    }

    if (campo === 'codigoICAO' && registro['CodigoICAO'] !== undefined) {
      return registro['CodigoICAO'];
    }

    return undefined;
  }

  private obtenerMensajeError(e: any): string {
    if (e?.status === 0) {
      return 'No se pudo conectar con el backend. Verifica que la API esté levantada en http://localhost:5123.';
    }

    if (e?.error?.mensaje) return e.error.mensaje;
    if (e?.error?.message) return e.error.message;
    if (e?.error?.title) return e.error.title;

    if (typeof e?.error === 'string') {
      const texto = e.error.trim();

      if (
        texto.includes('DeveloperExceptionPage') ||
        texto.includes('Microsoft.EntityFrameworkCore') ||
        texto.includes('System.') ||
        texto.includes('DbUpdateException') ||
        texto.includes('SqlException') ||
        texto.length > 500
      ) {
        return 'El backend devolvió un error interno. Revisa la consola de la API para ver el detalle técnico.';
      }

      return texto;
    }

    if (e?.message) return e.message;

    return 'Ocurrió un error al comunicarse con el backend.';
  }

  private formatearFechaLegible(valor: any): string {
    if (!valor) return '-';

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return String(valor);
    }

    return fecha.toLocaleString();
  }

  private formatearDateTimeLocal(valor: any): string {
    if (!valor) return this.ahoraLocal();

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return String(valor).slice(0, 16);
    }

    const offset = fecha.getTimezoneOffset();
    const local = new Date(fecha.getTime() - offset * 60000);

    return local.toISOString().slice(0, 16);
  }

  private formatearDate(valor: any): string {
    if (!valor) return this.hoy();

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return String(valor).slice(0, 10);
    }

    return fecha.toISOString().slice(0, 10);
  }

  ahoraLocal(): string {
    const fecha = new Date();
    const offset = fecha.getTimezoneOffset();
    const local = new Date(fecha.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  opcionesPaises(): OpcionSelect[] {
    return this.opcionesDesde('Paises', 'paisId', ['codigoISO2', 'nombre']);
  }

  opcionesCiudades(): OpcionSelect[] {
    return this.opcionesDesde('Ciudades', 'ciudadId', ['nombre', 'paisId']);
  }

  opcionesAeropuertos(): OpcionSelect[] {
    return this.opcionesDesde('Aeropuertos', 'aeropuertoId', ['codigoIATA', 'nombre']);
  }

  opcionesAviones(): OpcionSelect[] {
    return this.opcionesDesde('Aviones', 'avionId', ['matricula', 'modelo']);
  }

  opcionesRutas(): OpcionSelect[] {
    return this.opcionesDesde('Rutas', 'rutaId', ['rutaId', 'aeropuertoOrigenId', 'aeropuertoDestinoId']);
  }

  opcionesVuelos(): OpcionSelect[] {
    return this.opcionesDesde('Vuelos', 'vueloId', ['numeroVuelo', 'vueloId']);
  }

  opcionesUsuarios(): OpcionSelect[] {
    return this.opcionesDesde('UsuariosApp', 'usuarioAppId', ['userName', 'nombreCompleto']);
  }

  opcionesRoles(): OpcionSelect[] {
    return this.opcionesDesde('Roles', 'rolId', ['nombre']);
  }

  private opcionesDesde(catalogo: string, campoValor: string, camposTexto: string[]): OpcionSelect[] {
    const registros = this.catalogos[catalogo] || [];

    return registros.map((registro) => {
      const valor = this.valorCrudo(registro, campoValor);

      const texto = camposTexto
        .map((campo) => this.valorCrudo(registro, campo))
        .filter((x) => x !== undefined && x !== null && x !== '')
        .join(' - ');

      return {
        valor,
        texto: texto || String(valor)
      };
    });
  }
}









