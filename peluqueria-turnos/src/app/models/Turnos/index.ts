import mongoose from "mongoose";

const TurnoSchema = new mongoose.Schema({
    Nombre_Cliente: String,
    Telefono_Cliente: Number,
    // Borramos o comentamos la línea del DNI para que no lo valide
    // Dni: Number, 
    Turno: {
        Dia: String,
        Hora: String
    },
    Estado: {
        type: String,
        default: "Pending"
    },
}, { timestamps: true });

export default mongoose.models.Turnos || mongoose.model("Turnos", TurnoSchema);