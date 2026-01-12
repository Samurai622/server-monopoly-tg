const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const rooms = {}; // { chatId: { players: [], currentTurn: 0 } }

// тест
app.get('/', (req, res) => {
  res.send('SERVER OK');
});

// 👉 приєднатись до кімнати
app.post('/room/:chatId/join', (req, res) => {
  const { chatId } = req.params;
  const { id, name } = req.body;

  if (!rooms[chatId]) {
    rooms[chatId] = {
      players: [],
      currentTurn: 0,
      active: true
    };
  }

  const room = rooms[chatId];

  if (!room.players.find(p => p.id === id)) {
    room.players.push({
      id,
      name,
      pos: 0,
      money: 1500,
      color: randomColor(),
      active: true
    });
  }

  res.json(room);
});

// 👉 отримати стан кімнати
app.get('/room/:chatId', (req, res) => {
  const room = rooms[req.params.chatId];
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

function randomColor() {
  const colors = ['red','blue','green','yellow','purple','cyan'];
  return colors[Math.floor(Math.random() * colors.length)];
}

app.listen(3000, () => {
  console.log('✅ SERVER RUNNING');
});

app.post('/room/:chatId/move', (req, res) => {
  const { chatId } = req.params;
  const { playerId, steps } = req.body;

  const room = rooms[chatId];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1)
    return res.status(404).json({ error: 'Player not found' });

  if (playerIndex !== room.currentTurn)
    return res.status(403).json({ error: 'Not your turn' });

  const player = room.players[playerIndex];

  for (let i = 0; i < steps; i++) {
    player.pos = (player.pos + 1) % 40;
  }

  room.currentTurn = (room.currentTurn + 1) % room.players.length;
  res.json(room);
});


app.post('/room/:chatId/reset', (reg, res) => {
    rooms[reg.params.chatId] = {
        players: [],
        currentTurn: 0,
        active: true
    };
    res.json({ ok: true });
});

app.post('/room/:chatId/stop', (req, res) => {
  if(!rooms[req.params.chatId]) return res.status(404).json({error: "Room not found" });

  rooms[req.params.chatId].active = false;
  rooms[req.params.chatId].players = [];
  rooms[req.params.chatId].currentTurn = 0;

  res.json({ok: true });
})

app.post('/room/:chatId/surrender', (req, res) => {
  const { chatId } = req.params;
  const { playerId } = req.body;

  const room = rooms[chatId];
  if(!room) return res.status(404).json({error: 'Room not found'});

  const player = room.players.find(p => p.id === playerId);
  if(!player) return res.status(404).json({error: 'Player not found' });

  player.active = false;
  player.color = 'gray';

  if(room.players[room.currentTurn].id === playerId) {
    let next = (room.currentTurn + 1) % room.players.length;
    while (!room.players[next].active) {
      next = (next + 1) & room.players.length;
    }
    room.currentTurn = next;
  }

  res.json(room);
})