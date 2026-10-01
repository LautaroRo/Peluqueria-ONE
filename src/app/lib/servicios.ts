// Catálogo de servicios. Lo que se ve en la web sale de la base y se edita desde el panel;
// esta lista solo se usa para cargar la base la primera vez.

export type Servicio = {
  _id: string;
  clave: string;
  nombre: string;
  descripcion: string;
  precio: number | null; // null = no se muestra precio
  duracion: number; // minutos: 30, 60 o 90
  activo: boolean;
  orden: number;
};

// Lo que queda guardado en cada turno: una foto del servicio al momento de reservar,
// así un cambio de precio no altera los turnos ni las estadísticas viejas.
export type ServicioTurno = { Clave?: string; Nombre: string; Precio: number | null; Duracion: number };

export const DURACIONES = [30, 60, 90];

// Los precios arrancan vacíos a propósito: los carga Héctor desde el panel.
// Los inactivos quedan listos para prender si los ofrece.
export const SERVICIOS_BASE: Omit<Servicio, "_id">[] = [
  { clave: "corte", nombre: "Corte", descripcion: "Clásico o moderno, a tijera y máquina, con lavado y terminación.", precio: null, duracion: 30, activo: true, orden: 1 },
  { clave: "corte-barba", nombre: "Corte y barba", descripcion: "El corte completo más el perfilado y arreglo de la barba.", precio: null, duracion: 60, activo: true, orden: 2 },
  { clave: "barba", nombre: "Barba", descripcion: "Rebaje, perfilado y definición de contornos.", precio: null, duracion: 30, activo: true, orden: 3 },
  { clave: "corte-nino", nombre: "Corte niño", descripcion: "Para los más chicos, hasta 12 años.", precio: null, duracion: 30, activo: true, orden: 4 },
  { clave: "afeitado", nombre: "Afeitado clásico", descripcion: "A navaja, con toalla caliente.", precio: null, duracion: 30, activo: false, orden: 5 },
  { clave: "cejas", nombre: "Perfilado de cejas", descripcion: "Prolijidad en dos minutos, ideal para sumar al corte.", precio: null, duracion: 30, activo: false, orden: 6 },
];

// Turnos viejos, de antes de que existieran los servicios
export const SERVICIO_SIN_DATO: ServicioTurno = { Nombre: "Corte", Precio: null, Duracion: 30 };

const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
export const formatearPrecio = (n: number) => ars.format(n);

export const formatearDuracion = (min: number) =>
  min < 60 ? `${min} min` : min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`;
