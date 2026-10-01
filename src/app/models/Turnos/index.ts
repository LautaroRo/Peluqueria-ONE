import mongoose from "mongoose";

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
  },
  {
    timestamps: true,
    collection: "turnos",
  },
);

// Un solo turno por horario: la base rechaza la segunda reserva aunque lleguen dos a la vez
TurnoSchema.index({ "Turno.Dia": 1, "Turno.Hora": 1 }, { unique: true });
// Búsqueda rápida del turno de un cliente
TurnoSchema.index({ Telefono_Cliente: 1 });

const Turnos = mongoose.models.Turno || mongoose.model("Turno", TurnoSchema, "turnos");

export default Turnos;
