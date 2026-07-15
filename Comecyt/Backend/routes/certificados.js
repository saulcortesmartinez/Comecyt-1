import express from "express";
import path from "path";
import fs from "fs";
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';

const router = express.Router();

// ✅ Ruta que funciona en Mac, Windows y Linux
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CERTS_DIR = path.join(__dirname, '../Certificados');

// Crear carpeta si no existe
if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
    console.log(`📁 Carpeta creada: ${CERTS_DIR}`);
}

// ✅ Generar certificado - POST - ACTUALIZADO PARA DESBLOQUEO
router.post("/generar", async (req, res) => {
    const { alumno_id, modulo_id, nombre, apellido, correo } = req.body;

    if (!nombre || !apellido) {
        return res.status(400).json({ error: "Falta nombre o apellido" });
    }

    try {
        const nombreCompleto = `${nombre} ${apellido}`.trim();
        // FIX: Nombre único con ID para que no se borre y para que Inicio.jsx pueda listar por alumno
        const nombreSafe = nombreCompleto.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚ ]/g, "").replace(/\s+/g, "_");
        const idSafe = alumno_id || Date.now();
        const nombreArchivo = `Certificado_AGORA_${nombreSafe}_${idSafe}.pdf`;
        const rutaCompleta = path.join(CERTS_DIR, nombreArchivo);

        console.log(`📍 Guardando en: ${rutaCompleta}`);

        // Ya no borramos el viejo, así si lo genera 2 veces no da error 404

        // Crear PDF con PDFKit
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margin: 50
        });

        const stream = fs.createWriteStream(rutaCompleta);
        doc.pipe(stream);

        // Fondo
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f9fafb');
        
        // Borde
        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).strokeColor('#16a34a').lineWidth(3).stroke();

        // ✅ COORDENADAS EXACTAS en lugar de align center
        doc.fillColor('#000').fontSize(40).text('CERTIFICADO COMECYT', 50, 100, {
            width: 740,
            align: 'center'
        });

        doc.fontSize(20).fillColor('#333').text('Se otorga el presente a:', 50, 200, {
            width: 740,
            align: 'center'
        });

        doc.fontSize(35).fillColor('#166534').text(nombreCompleto, 50, 260, {
            width: 740,
            align: 'center'
        });

        doc.fontSize(16).fillColor('#000').text('Por haber completado satisfactoriamente el curso', 50, 330, {
            width: 740,
            align: 'center'
        });

        doc.fontSize(18).fillColor('#000').text('"Redes Sociales para Emprendedores"', 50, 360, {
            width: 740,
            align: 'center'
        });

        doc.fontSize(12).fillColor('#666').text(`ID Alumno: ${alumno_id || 'N/A'} | Correo: ${correo || 'N/A'}`, 50, 410, {
            width: 740,
            align: 'center'
        });

        doc.fontSize(14).fillColor('#000').text(`Fecha: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 435, {
            width: 740,
            align: 'center'
        });

        doc.end();

        // Esperar a que termine
        await new Promise((resolve, reject) => {
            stream.on('finish', () => {
                console.log(`✅ PDF generado correctamente`);
                resolve();
            });
            stream.on('error', (err) => {
                console.error("❌ Error en stream:", err);
                reject(err);
            });
        });

        // Verificar que el archivo tenga contenido
        const stats = fs.statSync(rutaCompleta);
        console.log(`📦 Tamaño del archivo: ${stats.size} bytes`);

        res.json({
            success: true,
            archivo: `/certificados/${nombreArchivo}`,
            nombreArchivo: nombreArchivo,
            url: `/certificados/${nombreArchivo}`,
            mensaje: "Certificado generado correctamente"
        });

    } catch (error) {
        console.error("❌ Error generando certificado:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Listar certificados de un alumno - GET - MANTIENE TU LÓGICA ORIGINAL
router.get("/alumno/:alumno_id", (req, res) => {
    try {
        const { alumno_id } = req.params;
        const archivos = fs.readdirSync(CERTS_DIR)
            .filter(file => file.endsWith('.pdf') && file.includes(alumno_id))
            .map(file => ({
                nombre: file,
                url: `/certificados/${file}`
            }));

        // Fallback: si no encuentra por ID, devuelve todos (como tenías antes)
        const listaFinal = archivos.length > 0 ? archivos : fs.readdirSync(CERTS_DIR)
            .filter(file => file.endsWith('.pdf'))
            .map(file => ({
                nombre: file,
                url: `/certificados/${file}`
            }));

        res.json({ certificados: listaFinal });
    } catch (error) {
        console.error("Error listando:", error);
        res.status(500).json({ error: "No se pudieron listar los certificados" });
    }
});

// ✅ Descargar certificado específico - GET - MANTIENE TU LÓGICA ORIGINAL
router.get("/descargar/:nombre", (req, res) => {
    const { nombre } = req.params;
    const ruta = path.join(CERTS_DIR, nombre);

    if (fs.existsSync(ruta)) {
        res.download(ruta);
    } else {
        res.status(404).json({ error: "Certificado no encontrado" });
    }
});

export default router;
