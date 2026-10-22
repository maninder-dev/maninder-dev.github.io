// Topic 128: Design: Real-Time Chat with WebSockets  (Full-Stack Handbook, Part 6)
// Run: npm run ex 128        (or: node 128-socketio-chat.js)
// What it shows: Socket.IO server with JWT handshake auth, rooms, persist-then-broadcast messages,
// a typing indicator, and two real clients in one process: Bob receives Alice's message.
// Reduced: the Redis adapter for multi-server fan-out is described but not wired up (single server).
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';

const SECRET = 'demo-secret';
const messages = []; // stands in for the Message table
const Message = { create: async (m) => { const row = { id: messages.length + 1, ...m, at: Date.now() }; messages.push(row); return row; } };

const httpServer = http.createServer();
const io = new Server(httpServer, { cors: { origin: 'https://app.example.com' } });
// io.adapter(createAdapter(pubClient, subClient));  // multi-server fan-out via Redis pub/sub

io.use((socket, next) => {                           // authenticate the handshake
  try { socket.user = jwt.verify(socket.handshake.auth.token, SECRET); next(); }
  catch { next(new Error('unauthorized')); }
});

io.on('connection', (socket) => {
  socket.on('join', (roomId, ack) => { socket.join(roomId); ack?.('joined'); });
  socket.on('message', async ({ roomId, text }) => {
    const msg = await Message.create({ roomId, userId: socket.user.sub, text }); // persist first
    io.to(roomId).emit('message', msg);              // everyone in the room, sender included
  });
  socket.on('typing', (roomId) => socket.to(roomId).emit('typing', socket.user.sub)); // everyone but sender
});

await new Promise((r) => httpServer.listen(0, r));
const url = `http://127.0.0.1:${httpServer.address().port}`;
const client = (sub) => connect(url, { auth: { token: sub && jwt.sign({ sub }, SECRET) }, transports: ['websocket'], reconnection: false });

// 1. A client with a bad token is rejected during the handshake
const intruder = client(null);
const [err] = await once(intruder, 'connect_error');
console.log('no token -> connect_error:', err.message);
assert.equal(err.message, 'unauthorized');
intruder.close();

// 2. Alice, Bob (same room) and Carol (other room) connect
const alice = client('alice'), bob = client('bob'), carol = client('carol');
await Promise.all([alice, bob, carol].map((c) => once(c, 'connect')));
await Promise.all([alice.emitWithAck('join', 'room-1'), bob.emitWithAck('join', 'room-1'), carol.emitWithAck('join', 'room-2')]);
console.log('alice, bob -> room-1; carol -> room-2');

const carolGot = [];
carol.on('message', (m) => carolGot.push(m));

// 3. Typing indicator goes to others, not back to the sender
let aliceSawOwnTyping = false;
alice.on('typing', () => (aliceSawOwnTyping = true));
const bobTyping = once(bob, 'typing');
alice.emit('typing', 'room-1');
assert.deepEqual(await bobTyping, ['alice']);
console.log('bob sees: alice is typing...');

// 4. Alice sends; Bob receives it (and Alice gets the echo with the saved id)
const bobGets = once(bob, 'message');
const aliceGets = once(alice, 'message');
alice.emit('message', { roomId: 'room-1', text: 'Hi Bob!' });
const [received] = await bobGets;
const [echo] = await aliceGets;
console.log('bob received:', received);
assert.equal(received.text, 'Hi Bob!');
assert.equal(received.userId, 'alice', 'sender identity comes from the verified token, not the payload');
assert.equal(received.id, 1, 'persisted before broadcast');
assert.deepEqual(echo, received);
assert.equal(messages.length, 1);

await new Promise((r) => setTimeout(r, 50));
assert.equal(carolGot.length, 0, 'other rooms do not get the message');
assert.equal(aliceSawOwnTyping, false);
console.log('carol (room-2) received nothing; alice did not get her own typing event');

[alice, bob, carol].forEach((c) => c.close());
io.close();
console.log('OK');
