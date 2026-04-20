const express = require('express');
const cors    = require('cors');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs   = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Carpeta temporal donde se guardan los MP3
const TEMP_DIR = 'C:\\yt-dlp\\temp';
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// Aquí guardamos el estado de cada conversión en memoria
const tareas = {};

// Lista de dominios permitidos
const DOMINIOS = ['youtube.com', 'youtu.be', 'vimeo.com'];

function urlValida(url) {
  try {
    const u = new URL(url);
    return DOMINIOS.some(d => u.hostname.includes(d));
  } catch {
    return false;
  }
}

// ── Ruta 1: recibir la URL y empezar la conversión ──
app.post('/api/convertir', (req, res) => {
  const { url } = req.body;

  if (!url || !urlValida(url)) {
    return res.status(400).json({ error: 'URL no válida' });
  }

  const taskId = uuidv4();
  const salida = path.join(TEMP_DIR, `${taskId}.%(ext)s`);

  tareas[taskId] = { estado: 'procesando' };

const cmd = `yt-dlp -x --audio-format mp3 -o "${salida}" "${url}" --no-playlist`;
  exec(cmd, (error) => {
    if (error) {
      console.error('Error:', error.message);
      tareas[taskId].estado = 'error';
    } else {
      tareas[taskId].estado  = 'completado';
      tareas[taskId].archivo = path.join(TEMP_DIR, `${taskId}.mp3`);
    }
  });

  // Respondemos inmediatamente sin esperar a que acabe la conversión
  res.status(202).json({ taskId });
});

// ── Ruta 2: consultar el estado de una tarea ──
app.get('/api/estado/:taskId', (req, res) => {
  const tarea = tareas[req.params.taskId];
  if (!tarea) return res.status(404).json({ error: 'No encontrado' });
  res.json({ estado: tarea.estado });
});

// ── Ruta 3: descargar el MP3 cuando esté listo ──
app.get('/download/:taskId', (req, res) => {
  const tarea = tareas[req.params.taskId];

  if (!tarea || tarea.estado !== 'completado') {
    return res.status(404).json({ error: 'Archivo no disponible aún' });
  }

  res.download(tarea.archivo, 'audio.mp3', (err) => {
    if (!err) {
      fs.unlink(tarea.archivo, () => {});
      delete tareas[req.params.taskId];
    }
  });
});

app.listen(3000, () => {
  console.log('✅ Servidor corriendo en http://localhost:3000');
});