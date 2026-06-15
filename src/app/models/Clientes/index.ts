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
}, {
    timestamps: true,
    collection: "clientes"
});

const Clientes =
    mongoose.models.Cliente ||
    mongoose.model("Cliente", ClienteSchema, "clientes");

export default Clientes;