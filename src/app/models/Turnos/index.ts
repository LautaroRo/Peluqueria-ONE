import mongoose from "mongoose";

const TurnoSchema = new mongoose.Schema({
    Nombre_Cliente: {
        type: String,
        required: true,
        trim: true
    },

    Telefono_Cliente: {
        type: Number,
        required: true
    },

    // 🔄 MODIFICADO: Agrupamos Dia, Hora y Estado acá adentro
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

}, {
    timestamps: true,
    collection: "turnos"
});

const Turnos =
    mongoose.models.Turno ||
    mongoose.model("Turno", TurnoSchema, "turnos");

export default Turnos;