import mongoose from "mongoose";

const ClienteSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },

    apellido: {
        type: String,
        required: true,
        trim: true
    },
    telefono: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    // Notas internas de Héctor (cómo se corta, preferencias): solo se ven en el panel
    notas: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
    },
}, {
    timestamps: true,
    collection: "clientes"
});

const Clientes =
    mongoose.models.Cliente ||
    mongoose.model("Cliente", ClienteSchema, "clientes");

export default Clientes;