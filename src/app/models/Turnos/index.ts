import mongoose from "mongoose";

// Foto del servicio al reservar (ver lib/servicios.ts). Los turnos viejos no la tienen.
export const ServicioTurnoSchema = new mongoose.Schema(
  {
    Clave: String,
    Nombre: { type: String, required: true },
    Precio: { type: Number, default: null },
    Duracion: { type: Number, default: 30 },
  },
  { _id: false },
);

const TurnoSchema = new mongoose.Schema(
  {
    Nombre_Cliente: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    Telefono_Cliente: {
      type: Number,
      required: true,
    },

    Turno: {
      Dia: { type: String, required: true }, // "YYYY-MM-DD"
      Hora: { type: String, required: true }, // "9:00", "10:30"
    },

    Servicio: { type: ServicioTurnoSchema, default: undefined },

    // Medias horas que ocupa el turno: ["10:00", "10:30"] para un servicio de una hora
    Bloques: { type: [String], default: undefined },

    // "web" = lo sacó el cliente; "panel" = lo cargó Héctor
    Origen: { type: String, enum: ["web", "panel"], default: "web" },
  },
  {
    timestamps: true,
    collection: "turnos",
  },
);

// Un solo turno por horario: la base rechaza la segunda reserva aunque lleguen dos a la vez
TurnoSchema.index({ "Turno.Dia": 1, "Turno.Hora": 1 }, { unique: true });
// Lo mismo para cada media hora que ocupa un servicio largo (índice sobre el array: no se pueden pisar)
TurnoSchema.index(
  { "Turno.Dia": 1, Bloques: 1 },
  { unique: true, name: "dia_bloques_unico", partialFilterExpression: { Bloques: { $exists: true } } },
);
// Búsqueda rápida del turno de un cliente
TurnoSchema.index({ Telefono_Cliente: 1 });

const Turnos = mongoose.models.Turno || mongoose.model("Turno", TurnoSchema, "turnos");

export default Turnos;
