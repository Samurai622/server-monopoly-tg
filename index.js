const { pool } = require('./db.js');

pool.query('SELECT 1')
  .then(() => console.log('✅ DATABASE CONNECTED'))
  .catch(err => console.error('❌ DATABASE CONNECTION ERROR:', err));

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

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

  const countRes = await pool.query(`SELECT COUNT(*) FROM players WHERE room_id=$1`, [room.id]);
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
    `SELECT * FROM rooms WHERE chat_id=$1 AND active=true`,
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
  res.json({
    active: room.active,
    currentTurn: room.current_turn,
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
      `SELECT id, current_turn, status
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

    const playersRes = await client.query(
      `SELECT id, tg_id, pos
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
    const me = playersRes.rows.find(p => String(p.tg_id) === pid);
    if(!me) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Player not in game' });
    }

    const turnIndex = room.current_turn % playersRes.rows.length;
    const currentPlayer = playersRes.rows[turnIndex];


    if(!currentPlayer || String(currentPlayer.tg_id) !== pid) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your turn' });
    }

    const newPos = (Number(currentPlayer.pos) + st) % 40;

    await client.query(
      `UPDATE players SET pos=$1 WHERE id=$2`,
      [newPos, currentPlayer.id]
    );

    const nextTurn = (turnIndex + 1) % playersRes.rows.length;

    await client.query(
      `UPDATE rooms SET current_turn=$1 WHERE id=$2`,
      [nextTurn, room.id]
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
