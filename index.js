const { pool } = require('./db.js');

pool.query('SELECT 1')
  .then(() => console.log('✅ DATABASE CONNECTED'))
  .catch(err => console.error('❌ DATABASE CONNECTION ERROR:', err));

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Статичні дані поля (індекси від 0 до 39)
const boardData = [
  { id: 0, type: 'start', name: 'Start' },
  { id: 1, type: 'property', name: 'Marvel', group: 'brown', price: 60, rent: 2 },
  { id: 2, type: 'property', name: 'Pixar', group: 'brown', price: 60, rent: 4 },
  { id: 3, type: 'chance', name: 'Task' },
  { id: 4, type: 'tax', name: 'GiveUser', price: 200 }, 
  { id: 5, type: 'property', name: 'Audi', group: 'station', price: 200, rent: 25 },
  { id: 6, type: 'property', name: 'Sprite', group: 'light_blue', price: 100, rent: 6 },
  { id: 7, type: 'chance', name: 'Fanta' }, 
  { id: 8, type: 'property', name: 'Minecraft', group: 'light_blue', price: 100, rent: 6 },
  { id: 9, type: 'property', name: 'CocaCola', group: 'light_blue', price: 120, rent: 8 },
  { id: 10, type: 'jail', name: 'Jail' },
  { id: 11, type: 'property', name: 'Casino', group: 'pink', price: 140, rent: 10 },
  { id: 12, type: 'property', name: 'Starbucks', group: 'utility', price: 150, rent: 4 }, 
  { id: 13, type: 'property', name: 'Blue Bottle', group: 'pink', price: 140, rent: 10 },
  { id: 14, type: 'property', name: 'Lavazza', group: 'pink', price: 160, rent: 12 },
  { id: 15, type: 'property', name: 'BMW', group: 'station', price: 200, rent: 25 },
  { id: 16, type: 'property', name: 'McDonalds', group: 'orange', price: 180, rent: 14 },
  { id: 17, type: 'chance', name: 'Task' },
  { id: 18, type: 'property', name: 'KFS', group: 'orange', price: 180, rent: 14 },
  { id: 19, type: 'property', name: 'Pizza Hut', group: 'orange', price: 200, rent: 16 },
  { id: 20, type: 'jail', name: 'Free Parking' },
  { id: 21, type: 'property', name: 'Telegram', group: 'red', price: 220, rent: 18 },
  { id: 22, type: 'chance', name: 'Task' },
  { id: 23, type: 'property', name: 'WhatsApp', group: 'red', price: 220, rent: 18 },
  { id: 24, type: 'property', name: 'Instagram', group: 'red', price: 240, rent: 20 },
  { id: 25, type: 'property', name: 'Lamborghini', group: 'station', price: 200, rent: 25 },
  { id: 26, type: 'property', name: 'Apple', group: 'yellow', price: 260, rent: 22 },
  { id: 27, type: 'property', name: 'Give to bank', group: 'yellow', price: 260, rent: 22 },
  { id: 28, type: 'property', name: 'PlayStation', group: 'utility', price: 150, rent: 4 },
  { id: 29, type: 'property', name: 'Apple 2', group: 'yellow', price: 280, rent: 24 },
  { id: 30, type: 'go_jail', name: 'Go Jail' },
  { id: 31, type: 'property', name: 'Yakuza', group: 'green', price: 300, rent: 26 },
  { id: 32, type: 'property', name: 'Assassins Creed', group: 'green', price: 300, rent: 26 },
  { id: 33, type: 'chance', name: 'Task' },
  { id: 34, type: 'property', name: 'Cosa Nostra', group: 'green', price: 320, rent: 28 },
  { id: 35, type: 'property', name: 'Mersedes-Benz', group: 'station', price: 200, rent: 25 },
  { id: 36, type: 'chance', name: 'Task' },
  { id: 37, type: 'property', name: 'Gucci', group: 'dark_blue', price: 350, rent: 35 },
  { id: 38, type: 'tax', name: 'Tax', price: 100 },
  { id: 39, type: 'property', name: 'Nike', group: 'dark_blue', price: 400, rent: 50 },
];
// тест
app.get('/', (req, res) => {
  res.send('SERVER OK');
});

// 👉 приєднатись до кімнати
app.post('/room/:chatId/join', async (req, res) => {
  const { chatId } = req.params;
  const { id, name } = req.body;
  const tgId = String(id);

  const roomRes = await pool.query(
    `SELECT id, status FROM rooms WHERE chat_id=$1 AND active=true`,
    [chatId]
  );
 
  if (!roomRes.rows.length) {
    return res.status(404).json({ error: 'Room not found or inactive' });
  }

  const room = roomRes.rows[0];
  if(room.status !== 'waiting') return res.status(403).json({ error: 'Game already started' });

  const countRes = await pool.query(`SELECT COUNT(*) FROM players WHERE room_id=$1 AND active=true`, [room.id]);
  if(+countRes.rows[0].count >= 6) return res.status(403).json({ error: 'Room is full' });

  await pool.query(
    `INSERT INTO players (room_id, tg_id, name, pos, money, color, active)
    VALUES ($1, $2, $3, 0, 1500, $4, true)
    ON CONFLICT (room_id, tg_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      active = true`,
    [room.id, tgId, name, randomColor()]
  );

  res.json({ ok: true });
});

// 👉 отримати стан кімнати
app.get('/room/:chatId/state', async (req, res) => {
  const { chatId } = req.params;

  const roomRes = await pool.query(
    `SELECT * FROM rooms WHERE chat_id=$1`,
    [chatId]
  );
  
  if(!roomRes.rows.length) {
    return res.status(404).json({ error: 'GAME_NOT_FOUND' });
  }

  const room = roomRes.rows[0];

  const playersRes = await pool.query(
    `SELECT
      tg_id::text AS id,
      name,
      pos,
      money,
      color,
      active
    FROM players
    WHERE room_id=$1
    ORDER BY turn_order NULLS LAST, id`,
    [room.id]
  );
  
  const activeRes = await pool.query(
    `SELECT tg_id::text AS id, name
    FROM players
    WHERE room_id=$1 AND active=true
    ORDER BY turn_order NULLS LAST, id`,
    [room.id]
  );

  let winnerName = null;
  if (room.status === 'stopped' && activeRes.rows.length === 1) {
    winnerName = activeRes.rows[0].name;
  }

  const activeCount = activeRes.rows.length;
  const turnIndex = activeCount ? room.current_turn % activeCount : 0;
  const currentTurnId = activeCount ? activeRes.rows[turnIndex]?.id : null;

  res.json({
    active: room.active,
    status: room.status,
    winnerName,
    currentTurn: room.current_turn,
    currentTurnId,
    turnState: room.turn_state,      
    actionCellId: room.action_cell_id,
    players: playersRes.rows
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

  if(!Number.isFinite(st) || st < 2 || st > 12) {
    return res.status(400).json({ error: 'Bad request data' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const roomRes = await client.query(
      `SELECT id, current_turn, status, turn_state
      FROM rooms 
      WHERE chat_id=$1 AND active=true
      FOR UPDATE`,
      [chatId]
    );

    if (!roomRes.rows.length){
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomRes.rows[0];
    if(room.status !== 'playing') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Game not in progress' });
    }

    // Перевіряємо, чи можна зараз кидати кубик
    if(room.turn_state !== 'waiting_roll') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You have already rolled the dice or must take an action' });
    }

    const playersRes = await client.query(
      `SELECT id, tg_id, pos, money
       FROM players
       WHERE room_id=$1 AND active=true
       ORDER BY turn_order NULLS LAST, id
       FOR UPDATE`,
      [room.id]
    );
    
    if(playersRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No active players' });
    }

    const turnIndex = room.current_turn % playersRes.rows.length;
    const currentPlayer = playersRes.rows[turnIndex];

    if(!currentPlayer || String(currentPlayer.tg_id) !== pid) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your turn' });
    }

    const oldPos = Number(currentPlayer.pos);
    const newPos = (oldPos + st) % 40;
    
    // БОНУС ЗА ПРОХОДЖЕННЯ СТАРТУ
    let bonus = 0;
    if (oldPos + st >= 40) {
      if (newPos === 0) {
        bonus = 2000; // Став рівно на Старт
      } else {
        bonus = 1000; // Просто пройшов Старт
      }
    }
    const newMoney = Number(currentPlayer.money) + bonus;

    // ВИЗНАЧАЄМО НАСТУПНИЙ СТАН ХОДУ
    const cellInfo = boardData[newPos];
    let nextState = 'can_end'; // За замовчуванням можна завершувати хід

    if (cellInfo.type === 'property') {
      // Перевіряємо, чия це клітинка
      const propRes = await client.query(
        `SELECT owner_id FROM properties WHERE room_id=$1 AND cell_id=$2`, 
        [room.id, newPos]
      );
      
      if (propRes.rows.length === 0 || propRes.rows[0].owner_id === null) {
        nextState = 'must_buy'; // Нічия -> треба купити або аукціон
      } else if (propRes.rows[0].owner_id !== currentPlayer.id) {
        nextState = 'must_pay'; // Чужа -> треба платити оренду
      }
    } else if (cellInfo.type === 'tax') {
      nextState = 'must_pay'; // Податок -> треба платити
    }

    await client.query(
      `UPDATE players SET pos=$1, money=$2 WHERE id=$3`,
      [newPos, newMoney, currentPlayer.id]
    );

    await client.query(
      `UPDATE rooms SET turn_state=$1, action_cell_id=$2 WHERE id=$3`,
      [nextState, newPos, room.id]
    );
    
    await client.query('COMMIT');
    res.json({ ok: true, bonus });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
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

    const roomRes = await client.query(
      `SELECT id, current_turn, status, turn_state
      FROM rooms WHERE chat_id=$1 AND active=true FOR UPDATE`,
      [chatId]
    );

    if (!roomRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Room not found' });
    }
    const room = roomRes.rows[0];

    // Завершити хід можна тільки зі стану can_end
    if (room.turn_state !== 'can_end') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You must complete cell actions first' });
    }

    const playersRes = await client.query(
      `SELECT id, tg_id FROM players WHERE room_id=$1 AND active=true ORDER BY turn_order NULLS LAST, id`,
      [room.id]
    );

    const turnIndex = room.current_turn % playersRes.rows.length;
    const currentPlayer = playersRes.rows[turnIndex];

    if(!currentPlayer || String(currentPlayer.tg_id) !== pid) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your turn' });
    }

    // Передаємо хід наступному і скидаємо стан на waiting_roll
    const nextTurn = (turnIndex + 1) % playersRes.rows.length;
    await client.query(
      `UPDATE rooms SET current_turn=$1, turn_state='waiting_roll', action_cell_id=NULL WHERE id=$2`,
      [nextTurn, room.id]
    );

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }
});

app.post('/room/:chatId/surrender', async (req, res) => {
  const { chatId } = req.params;
  const pid = String(req.body.playerId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const roomRes = await client.query(
      `SELECT id, current_turn, status
      FROM rooms
      WHERE chat_id=$1 AND active=true
      FOR UPDATE`,
      [chatId]
    );

    if(!roomRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Room not found' });
    }
    const room = roomRes.rows[0];
    if(room.status !== 'playing') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Game not in progress' });
    }

    const playersRes = await client.query (
      `SELECT id, tg_id
      FROM players
      WHERE room_id=$1 AND active=true
      ORDER BY turn_order NULLS LAST, id
      FOR UPDATE`,
      [room.id]
    );

    if(playersRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No active players' });
    }

    const idx = playersRes.rows.findIndex(p => String(p.tg_id) === pid);
    if(idx === -1) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Player not in game' });
    }

    const up = await client.query(
      `UPDATE players
      SET active=false, money=0
      WHERE room_id=$1 AND tg_id=$2 AND active=true
      RETURNING id`,
      [room.id, pid]
    );
    

    if(!up.rows.length) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Player not active' });
    }

    const leftRes = await client.query(
      `SELECT tg_id
      FROM players
      WHERE room_id=$1 AND active=true
      ORDER BY turn_order NULLS LAST, id`,
      [room.id]
    );

    if(leftRes.rows.length <= 1) {
      await client.query(
        `UPDATE rooms SET status='stopped', active=false WHERE id=$1`,
        [room.id]
      );
      await client.query('COMMIT');
      return res.json({ ok: true, gameEnded: true });
    }

    let turnIndex = room.current_turn % playersRes.rows.length;
    let newTurn = turnIndex;
    if(idx <turnIndex) newTurn = turnIndex - 1;
    if(idx === turnIndex) newTurn = turnIndex;

    newTurn = newTurn % leftRes.rows.length;

    await client.query(
      `UPDATE rooms SET current_turn=$1 WHERE id=$2`,
      [newTurn, room.id]
    );
    
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
