import mongoose from "mongoose";
import { ServicioTurnoSchema } from "../Turnos";

const HistorialSchema = new mongoose.Schema({
    Nombre_Cliente: {
        type: String,
        required: true,
        trim: true
    },

    Telefono_Cliente: {
        type: Number,
        required: true
    },

    // Guardamos el Día y la Hora que tenía el turno originalmente
    Turno: {
        Dia: {
            type: String,
            required: true
        },
        Hora: {
            type: String,
            required: true
        }
    },

    // El estado final para saber si se atendió al cliente o se canceló
    Estado: {
        type: String,
        required: true,
        enum: ["Success", "Cancelled"]
    },

    Servicio: { type: ServicioTurnoSchema, default: undefined },
    Origen: { type: String, enum: ["web", "panel"], default: undefined },

}, {
    // El createdAt de acá te guarda automáticamente cuándo se creó el registro en el historial (la fecha de cierre)
    timestamps: true,
    collection: "historial"
});

// Las estadísticas leen por fecha y la ficha de cada cliente por teléfono
HistorialSchema.index({ "Turno.Dia": 1 });
HistorialSchema.index({ Telefono_Cliente: 1 });

const Historial =
    mongoose.models.Historial ||
    mongoose.model("Historial", HistorialSchema, "historial");

export default Historial;
