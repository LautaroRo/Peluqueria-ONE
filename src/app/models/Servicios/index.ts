import mongoose from "mongoose";

const ServicioSchema = new mongoose.Schema(
  {
    clave: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    nombre: { type: String, required: true, trim: true, maxlength: 60 },
    descripcion: { type: String, trim: true, maxlength: 200, default: "" },
    precio: { type: Number, min: 0, default: null },
    duracion: { type: Number, enum: [30, 60, 90], default: 30 },
    activo: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "servicios" },
);

const Servicios = mongoose.models.Servicio || mongoose.model("Servicio", ServicioSchema, "servicios");

export default Servicios;
