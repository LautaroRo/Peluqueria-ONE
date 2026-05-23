import mongoose from "mongoose";

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
    }

}, {
    // El createdAt de acá te guarda automáticamente cuándo se creó el registro en el historial (la fecha de cierre)
    timestamps: true,
    collection: "historial"
});

const Historial =
    mongoose.models.Historial ||
    mongoose.model("Historial", HistorialSchema, "historial");

export default Historial;