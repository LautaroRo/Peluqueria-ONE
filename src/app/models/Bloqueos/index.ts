import mongoose from "mongoose";

// Días u horarios en que no se atiende (vacaciones, feriados, un trámite).
// Sin horas = el día entero.
const BloqueoSchema = new mongoose.Schema(
  {
    Dia: { type: String, required: true }, // "YYYY-MM-DD"
    Horas: { type: [String], default: [] },
    Motivo: { type: String, trim: true, maxlength: 80, default: "" },
  },
  { timestamps: true, collection: "bloqueos" },
);

BloqueoSchema.index({ Dia: 1 });

const Bloqueos = mongoose.models.Bloqueo || mongoose.model("Bloqueo", BloqueoSchema, "bloqueos");

export default Bloqueos;
