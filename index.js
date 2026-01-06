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
      currentTurn: 0
    };
  }

  const room = rooms[chatId];

  if (!room.players.find(p => p.id === id)) {
    room.players.push({
      id,
      name,
      pos: 0,
      money: 1500,
      color: randomColor()
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
  console.log('✅ SERVER RUNNING http://localhost:3000');
});

app.post('/room/:chatId/move', (req, res) => {
    const { chatId } = req.params;
    const { playerId, pos, money, currentTurn } = req.body;

    const room = rooms[chatId];
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const player = room.players.find(p => p.id === playerId);
    if(!player) return res.status(404).json({ error: 'Player not found' });

    player.pos = pos;
    player.money = money;
    room.currentTurn = currentTurn;

    res.json(room);
});
