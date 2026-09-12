const { pool } = require('./db.js');

pool.query('SELECT 1')
  .then(() => console.log('✅ DATABASE CONNECTED'))
  .catch(err => console.error('❌ DATABASE CONNECTION ERROR:', err));

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Оновлені агресивні ціни
const boardData = [
  { id: 0, type: 'start', name: 'Start' },
  { id: 1, type: 'property', name: 'Marvel', group: 'media', price: 120, rent: 12 },
  { id: 2, type: 'property', name: 'Pixar', group: 'media', price: 120, rent: 12 },
  { id: 3, type: 'chance', name: 'Task' },
  { id: 4, type: 'tax', name: 'GiveUser', price: 200 }, 
  { id: 5, type: 'property', name: 'Audi', group: 'auto', price: 1000, rent: 50 },
  { id: 6, type: 'property', name: 'Sprite', group: 'drinks', price: 250, rent: 25 },
  { id: 7, type: 'property', name: 'Fanta', group: 'drinks', price: 220, rent: 22 }, 
  { id: 8, type: 'property', name: 'Minecraft', group: 'games', price: 500, rent: 30 },
  { id: 9, type: 'property', name: 'CocaCola', group: 'drinks', price: 190, rent: 19 },
  { id: 10, type: 'casino', name: 'Casino'},
  { id: 11, type: 'property', name: 'Starbucks', group: 'coffee', price: 420, rent: 42 },
  { id: 12, type: 'chance', name: 'Task' },
  { id: 13, type: 'property', name: 'Blue Bottle', group: 'coffee', price: 340, rent: 34 },
  { id: 14, type: 'property', name: 'Lavazza', group: 'coffee', price: 380, rent: 38 },
  { id: 15, type: 'property', name: 'BMW', group: 'auto', price: 1000, rent: 50 },
  { id: 16, type: 'property', name: 'McDonalds', group: 'fastfood', price: 260, rent: 26 },
  { id: 17, type: 'property', name: 'KFS', group: 'fastfood', price: 220, rent: 22 },
  { id: 18, type: 'chance', name: 'Task' },
  { id: 19, type: 'property', name: 'Pizza Hut', group: 'fastfood', price: 200, rent: 20 },
  { id: 20, type: 'jail', name: 'Free Parking' },
  { id: 21, type: 'property', name: 'Telegram', group: 'messenger', price: 420, rent: 42 },
  { id: 22, type: 'property', name: 'WhatsApp', group: 'messenger', price: 380, rent: 38 },
  { id: 23, type: 'property', name: 'Instagram', group: 'messenger', price: 400, rent: 40 },
  { id: 24, type: 'chance', name: 'Task' },
  { id: 25, type: 'property', name: 'Lamborghini', group: 'auto', price: 1000, rent: 50 },
  { id: 26, type: 'tax', name: 'Give to bank', price: 260},
  { id: 27, type: 'property', name: 'Apple', group: 'device', price: 600, rent: 40 },
  { id: 28, type: 'chance', name: 'Task' },
  { id: 29, type: 'property', name: 'PlayStation', group: 'device', price: 580, rent: 38 },
  { id: 30, type: 'go_jail', name: 'Go Jail' },
  { id: 31, type: 'property', name: 'Yakuza', group: 'mafia', price: 300, rent: 30 },
  { id: 32, type: 'property', name: 'Assassins Creed', group: 'games', price: 500, rent: 30 },
  { id: 33, type: 'property', name: 'Cosa Nostra', group: 'mafia', price: 320, rent: 32 },
  { id: 34, type: 'property', name: 'Triads', group: 'mafia', price: 350, rent: 35 },
  { id: 35, type: 'property', name: 'Mersedes-Benz', group: 'auto', price: 1000, rent: 50 },
  { id: 36, type: 'property', name: 'Gucci', group: 'cloths', price: 350, rent: 35 },
  { id: 37, type: 'chance', name: 'Task' },
  { id: 38, type: 'property', name: 'Nike', group: 'cloths', price: 400, rent: 40 },
  { id: 39, type: 'property', name: 'Adidas', group: 'cloths', price: 400, rent: 40 }
];

app.get('/', (req, res) => res.send('SERVER OK'));

app.post('/room/:chatId/join', async (req, res) => {
  const { chatId } = req.params;
  const { id, name } = req.body;
  const tgId = String(id);

  const roomRes = await pool.query(`SELECT id, status FROM rooms WHERE chat_id=$1 AND active=true`, [chatId]);
  if (!roomRes.rows.length) return res.status(404).json({ error: 'Room not found or inactive' });

  const room = roomRes.rows[0];
  if(room.status !== 'waiting') return res.status(403).json({ error: 'Game already started' });

  const countRes = await pool.query(`SELECT COUNT(*) FROM players WHERE room_id=$1 AND active=true`, [room.id]);
  if(+countRes.rows[0].count >= 6) return res.status(403).json({ error: 'Room is full' });

  await pool.query(
    `INSERT INTO players (room_id, tg_id, name, pos, money, color, active) VALUES ($1, $2, $3, 0, 1500, $4, true)
    ON CONFLICT (room_id, tg_id) DO UPDATE SET name = EXCLUDED.name, active = true`,
    [room.id, tgId, name, randomColor()]
  );
  res.json({ ok: true });
});

app.get('/room/:chatId/state', async (req, res) => {
  const { chatId } = req.params;
  const roomRes = await pool.query(`SELECT * FROM rooms WHERE chat_id=$1`, [chatId]);
  if(!roomRes.rows.length) return res.status(404).json({ error: 'GAME_NOT_FOUND' });
  const room = roomRes.rows[0];

  const playersRes = await pool.query(`SELECT tg_id::text AS id, name, pos, money, color, active FROM players WHERE room_id=$1 ORDER BY turn_order NULLS LAST, id`, [room.id]);
  const activeRes = await pool.query(`SELECT tg_id::text AS id, name FROM players WHERE room_id=$1 AND active=true ORDER BY turn_order NULLS LAST, id`, [room.id]);
  
  // Додаємо інформацію про куплені ділянки
  const propsRes = await pool.query(`SELECT cell_id, owner_id FROM properties WHERE room_id=$1`, [room.id]);

  let winnerName = null;
  if (room.status === 'stopped' && activeRes.rows.length === 1) winnerName = activeRes.rows[0].name;

  const activeCount = activeRes.rows.length;
  const turnIndex = activeCount ? room.current_turn % activeCount : 0;
  const currentTurnId = activeCount ? activeRes.rows[turnIndex]?.id : null;

  res.json({
    active: room.active, status: room.status, winnerName, currentTurn: room.current_turn,
    currentTurnId, turnState: room.turn_state, actionCellId: room.action_cell_id,
    players: playersRes.rows, properties: propsRes.rows
  });
});

function randomColor() {
  const colors = ['red','green','yellow','purple','orange','brown'];
  return colors[Math.floor(Math.random() * colors.length)];
}

app.post('/room/:chatId/move', async (req, res) => {
  const { chatId } = req.params;
  const { playerId, steps } = req.body;
  const pid = String(playerId);
  const st = Number(steps);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roomRes = await client.query(`SELECT id, current_turn, status, turn_state FROM rooms WHERE chat_id=$1 AND active=true FOR UPDATE`, [chatId]);
    if (!roomRes.rows.length) throw new Error('Room not found');
    const room = roomRes.rows[0];

    if(room.status !== 'playing') throw new Error('Game not in progress');
    if(room.turn_state !== 'waiting_roll') throw new Error('Action required');

    const playersRes = await client.query(`SELECT id, tg_id, pos, money FROM players WHERE room_id=$1 AND active=true ORDER BY turn_order NULLS LAST, id FOR UPDATE`, [room.id]);
    const currentPlayer = playersRes.rows[room.current_turn % playersRes.rows.length];
    if(String(currentPlayer.tg_id) !== pid) throw new Error('Not your turn');

    const oldPos = Number(currentPlayer.pos);
    const newPos = (oldPos + st) % 40;
    
    let bonus = 0;
    if (oldPos + st >= 40) bonus = (newPos === 0) ? 2000 : 1000;
    const newMoney = Number(currentPlayer.money) + bonus;

    // ВМИКАЄМО ЛОГІКУ ПЕРЕВІРКИ ВЛАСНОСТІ!
    const cellInfo = boardData[newPos];
    let nextState = 'can_end'; 

    if (cellInfo.type === 'property') {
      const propRes = await client.query(`SELECT owner_id FROM properties WHERE room_id=$1 AND cell_id=$2`, [room.id, newPos]);
      if (propRes.rows.length === 0 || propRes.rows[0].owner_id === null) {
        nextState = 'must_buy'; 
      } else if (propRes.rows[0].owner_id !== currentPlayer.id) {
        nextState = 'must_pay'; 
      }
    } else if (cellInfo.type === 'tax') {
      nextState = 'must_pay';
    } else if (cellInfo.type === 'casino') {
      nextState = 'casino_action';
    }

    await client.query(`UPDATE players SET pos=$1, money=$2 WHERE id=$3`, [newPos, newMoney, currentPlayer.id]);
    await client.query(`UPDATE rooms SET turn_state=$1, action_cell_id=$2 WHERE id=$3`, [nextState, newPos, room.id]);
    
    await client.query('COMMIT');
    res.json({ ok: true, bonus });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

// 👉 КУПІВЛЯ НЕРУХОМОСТІ
app.post('/room/:chatId/buy', async (req, res) => {
  const { chatId } = req.params;
  const pid = String(req.body.playerId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roomRes = await client.query(`SELECT id, current_turn, turn_state, action_cell_id FROM rooms WHERE chat_id=$1 AND active=true FOR UPDATE`, [chatId]);
    if (!roomRes.rows.length) throw new Error('Room not found');
    const room = roomRes.rows[0];

    if (room.turn_state !== 'must_buy') throw new Error('Нічого купувати');

    const playersRes = await client.query(`SELECT id, tg_id, money FROM players WHERE room_id=$1 AND active=true ORDER BY turn_order NULLS LAST, id FOR UPDATE`, [room.id]);
    const currentPlayer = playersRes.rows[room.current_turn % playersRes.rows.length];
    if (String(currentPlayer.tg_id) !== pid) throw new Error('Не твій хід');

    const cellInfo = boardData[room.action_cell_id];
    if (currentPlayer.money < cellInfo.price) throw new Error('Недостатньо коштів');

    await client.query(`UPDATE players SET money = money - $1 WHERE id = $2`, [cellInfo.price, currentPlayer.id]);
    await client.query(`INSERT INTO properties (room_id, cell_id, owner_id) VALUES ($1, $2, $3)`, [room.id, room.action_cell_id, currentPlayer.id]);
    await client.query(`UPDATE rooms SET turn_state='can_end' WHERE id=$1`, [room.id]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

// 👉 ВІДМОВА ВІД КУПІВЛІ (Пропуск)
app.post('/room/:chatId/skip_buy', async (req, res) => {
  const { chatId } = req.params;
  const pid = String(req.body.playerId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roomRes = await client.query(`SELECT id, current_turn, turn_state FROM rooms WHERE chat_id=$1 AND active=true FOR UPDATE`, [chatId]);
    const room = roomRes.rows[0];

    if (room.turn_state === 'must_buy') {
      const playersRes = await client.query(`SELECT id, tg_id FROM players WHERE room_id=$1 AND active=true ORDER BY turn_order NULLS LAST, id`, [room.id]);
      const currentPlayer = playersRes.rows[room.current_turn % playersRes.rows.length];
      if (String(currentPlayer.tg_id) !== pid) throw new Error('Не твій хід');

      await client.query(`UPDATE rooms SET turn_state='can_end' WHERE id=$1`, [room.id]);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.post('/room/:chatId/end_turn', async (req, res) => {
  const { chatId } = req.params;
  const pid = String(req.body.playerId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roomRes = await client.query(`SELECT id, current_turn, turn_state FROM rooms WHERE chat_id=$1 AND active=true FOR UPDATE`, [chatId]);
    const room = roomRes.rows[0];
    if (room.turn_state !== 'can_end') throw new Error('Дія не завершена');

    const playersRes = await client.query(`SELECT id, tg_id FROM players WHERE room_id=$1 AND active=true ORDER BY turn_order NULLS LAST, id`, [room.id]);
    const turnIndex = room.current_turn % playersRes.rows.length;
    
    if(String(playersRes.rows[turnIndex].tg_id) !== pid) throw new Error('Не твій хід');

    const nextTurn = (turnIndex + 1) % playersRes.rows.length;
    await client.query(`UPDATE rooms SET current_turn=$1, turn_state='waiting_roll', action_cell_id=NULL WHERE id=$2`, [nextTurn, room.id]);

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.post('/room/:chatId/surrender', async (req, res) => {
  // Код здачі залишається без змін (я його зберіг, щоб не розтягувати текст)
  const { chatId } = req.params;
  const pid = String(req.body.playerId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roomRes = await client.query(`SELECT id, current_turn, status FROM rooms WHERE chat_id=$1 AND active=true FOR UPDATE`, [chatId]);
    if(!roomRes.rows.length) throw new Error('Room not found');
    const room = roomRes.rows[0];
    const playersRes = await client.query(`SELECT id, tg_id FROM players WHERE room_id=$1 AND active=true ORDER BY turn_order NULLS LAST, id FOR UPDATE`, [room.id]);
    
    const idx = playersRes.rows.findIndex(p => String(p.tg_id) === pid);
    if(idx === -1) throw new Error('Player not in game');

    await client.query(`UPDATE players SET active=false, money=0 WHERE room_id=$1 AND tg_id=$2 AND active=true`, [room.id, pid]);
    
    const leftRes = await client.query(`SELECT tg_id FROM players WHERE room_id=$1 AND active=true ORDER BY turn_order NULLS LAST, id`, [room.id]);
    if(leftRes.rows.length <= 1) {
      await client.query(`UPDATE rooms SET status='stopped', active=false WHERE id=$1`, [room.id]);
      await client.query('COMMIT');
      return res.json({ ok: true, gameEnded: true });
    }

    let turnIndex = room.current_turn % playersRes.rows.length;
    let newTurn = turnIndex;
    if(idx < turnIndex) newTurn = turnIndex - 1;
    newTurn = newTurn % leftRes.rows.length;

    await client.query(`UPDATE rooms SET current_turn=$1 WHERE id=$2`, [newTurn, room.id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));