const express = require('express');
const multer  = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Carpeta donde se guardarán los videos
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Guardar con el nombre original
  }
});

const upload = multer({ storage: storage });

const app = express();
const PORT = 3000;

// Middleware para servir archivos estáticos (opcional)
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ruta para subir videos
app.post('/upload', upload.single('video'), async (req, res) => {
  const videoUrl = `/uploads/${req.file.filename}`;
  // Guarda en MongoDB
  await Archivo.create({
    nombre: req.file.originalname,
    ruta: videoUrl
  });
  res.send(`
    <h2>¡Video subido correctamente!</h2>
    <ul>
      <li><a href="${videoUrl}" download>Descargar archivo</a></li>
      <li><a href="${videoUrl}" target="_blank">Visualizar en el navegador</a></li>
    </ul>
    <a href="/">Subir otro video</a>
  `);
});

// Ruta para formulario de subida (opcional)
app.get('/', (req, res) => {
  res.send(`
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="video" accept="video/*" required />
      <button type="submit">Subir video</button>
    </form>
    <br>
    <a href="/explorer/">Ver archivos y carpetas subidos</a>
  `);
});

// Ruta para listar todos los videos subidos como enlaces de descarga
app.get('/videos', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) {
      return res.send('No se pudieron leer los videos');
    }
    const videoList = files
      .map(file => `
        <li>
          <a href="/uploads/${file}" download>Descargar</a> |
          <a href="/uploads/${file}" target="_blank">Visualizar</a> - ${file}
        </li>
      `).join('');
    res.send(`
      <h2>Videos subidos</h2>
      <ul>${videoList}</ul>
      <a href="/">Subir otro video</a>
    `);
  });
});

// Explorador raíz
app.get('/explorer/', (req, res) => {
  const relPath = '';
  const absPath = path.join(__dirname, 'uploads', relPath);

  fs.readdir(absPath, { withFileTypes: true }, (err, items) => {
    if (err) {
      return res.status(404).send('No se pudo leer la carpeta');
    }
    let list = '';
    items.forEach(item => {
      if (item.isDirectory()) {
        list += `<li><a href="/explorer/${item.name}">${item.name}/</a></li>`;
      } else {
        const fileUrl = `/uploads/${item.name}`;
        list += `<li>
          <a href="${fileUrl}" download>Descargar</a> |
          <a href="${fileUrl}" target="_blank">Visualizar</a> - ${item.name}
        </li>`;
      }
    });
    res.send(`
      <h2>Explorador de archivos</h2>
      <ul>${list}</ul>
      <a href="/">Subir otro video</a>
    `);
  });
});

// Explorador para subcarpetas (expresión regular para evitar error de path-to-regexp)
app.get(/^\/explorer\/(.+)/, (req, res) => {
  const relPath = req.params[0] || '';
  const absPath = path.join(__dirname, 'uploads', relPath);

  fs.readdir(absPath, { withFileTypes: true }, (err, items) => {
    if (err) {
      return res.status(404).send('No se pudo leer la carpeta');
    }
    let list = '';
    // Enlace para volver atrás
    if (relPath) {
      const parent = relPath.split('/').slice(0, -1).join('/');
      list += `<li><a href="/explorer/${parent}">.. (subir)</a></li>`;
    }
    items.forEach(item => {
      if (item.isDirectory()) {
        list += `<li><a href="/explorer/${relPath ? relPath + '/' : ''}${item.name}">${item.name}/</a></li>`;
      } else {
        const fileUrl = `/uploads/${relPath ? relPath + '/' : ''}${item.name}`;
        list += `<li>
          <a href="${fileUrl}" download>Descargar</a> |
          <a href="${fileUrl}" target="_blank">Visualizar</a> - ${item.name}
        </li>`;
      }
    });
    res.send(`
      <h2>Explorador de archivos</h2>
      <ul>${list}</ul>
      <a href="/">Subir otro video</a>
    `);
  });
});

// Asegura que la carpeta uploads existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const ArchivoSchema = new mongoose.Schema({
  nombre: String,
  ruta: String,
  fecha: { type: Date, default: Date.now }
});

const Archivo = mongoose.model('Archivo', ArchivoSchema);

mongoose.connect('mongodb://root:password@dbmodle:27017/archivos?authSource=admin')
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});