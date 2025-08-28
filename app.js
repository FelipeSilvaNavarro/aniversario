const express = require('express');
const mysql = require('mysql2');
const cron = require('node-cron');
const twilio = require('twilio');
require('dotenv').config();
const axios = require('axios');

const app = express();
app.use(express.json());

// Conecta MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',  // vazia por padrão no Wamp
  database: 'aniversario'
});
db.connect(err => { if (err) console.error(err); else console.log('DB conectado!'); });

// Twilio setup
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Gerar msg IA
async function gerarMsgIA(descricao) {
  return `Msg gerada por IA: Feliz niver baseado em '${descricao}' 🎉`;
}

// Enviar whatsapp
async function enviarMsg(telefone, msg) {
  try {
    console.log(`Tentando enviar pra ${telefone} com msg: ${msg}`);
    const result = await client.messages.create({
      from: 'whatsapp:+14155238886',
      to: `whatsapp:${telefone}`,
      body: msg
    });
    console.log(`Enviado com SID: ${result.sid} pra ${telefone}: ${msg}`);
  } catch (err) {
    console.error('Erro no Twilio:', err.message);
  }
}


/* 
cron.schedule('* * * * *', () => {
  console.log('Cron rodando às:', new Date().toLocaleString());  // Log pra confirmar
  const hoje = new Date().toISOString().slice(5,10);  // MM-DD
  db.query('SELECT * FROM contatos', (err, contatos) => {
    if (err) return console.error('Erro no DB:', err);
    console.log('Contatos encontrados:', contatos);  // Mostra os contatos
    contatos.forEach(c => {
      const niver = c.data_niver.toISOString().slice(5,10);
      if (niver === hoje) {
        console.log(`Niver hoje: ${c.nome}, telefone: ${c.telefone}`);  // Debug
        db.query('SELECT msg_default FROM grupos_msgs WHERE grupo = ?', [c.grupo], (err, grupo) => {
          if (err) return console.error('Erro no grupo:', err);
          let msg = c.msg_custom || (grupo[0] ? grupo[0].msg_default : 'Feliz aniversário! 🎂');
          msg = msg.replace('[nome]', c.nome);
          console.log(`Enviando: ${msg} pra ${c.telefone}`);  // Debug antes de enviar
          enviarMsg(c.telefone, msg);
        });
      }
    });
  });
}); codigo antigo */ 

// Checar e enviar às 8h
cron.schedule('* * * * *', () => {
  console.log('Cron rodando às:', new Date().toLocaleString());
  const hoje = new Date().toLocaleDateString('en-CA');  // YYYY-MM-DD no fuso local
  db.query('SELECT * FROM contatos', (err, contatos) => {
    if (err) return console.error('Erro no DB:', err);
    console.log('Contatos encontrados:', contatos);
    contatos.forEach(c => {
      const niver = new Date(c.data_niver).toLocaleDateString('en-CA');
      if (niver === hoje) {
        console.log(`Niver hoje: ${c.nome}, telefone: ${c.telefone}`);
        db.query('SELECT msg_default FROM grupos_msgs WHERE grupo = ?', [c.grupo], (err, grupo) => {
          if (err) return console.error('Erro no grupo:', err);
          let msg = c.msg_custom || (grupo[0] ? grupo[0].msg_default : 'Feliz aniversário! 🎂');
          msg = msg.replace('[nome]', c.nome);
          console.log(`Enviando: ${msg} pra ${c.telefone}`);
          enviarMsg(c.telefone, msg);
        });
      } else {
        console.log(`Niver ${c.nome} nn é hoje: ${niver} vs ${hoje}`);
      }
    });
  });
});


// Rotas API
app.post('/add_contato', (req, res) => {
  const { nome, data_niver, grupo, msg_custom, telefone } = req.body; // pega do body
  db.query('INSERT INTO contatos (nome, data_niver, grupo, msg_custom, telefone) VALUES (?, ?, ?, ?, ?)', [nome, data_niver, grupo, msg_custom, telefone], err => {
    if (err) return res.status(500).json({ error: err });
    res.json({ status: 'ok' });
  });
});

app.post('/gerar_msg', async (req, res) => {
  const { descricao } = req.body;
  const msg = await gerarMsgIA(descricao);
  res.json({ msg });
});

app.get('/', (req, res) => {
  res.send('API de Aniversário rodando! Use POST /add_contato ou /gerar_msg.');
});
app.listen(3000, () => console.log('Server rodando na porta 3000'));

enviarMsg('+558287544353', 'Teste manual! 🎉');