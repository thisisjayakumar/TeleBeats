import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

type Room = {
  id: string;
  hostId: string;
  guests: Set<string>;
};

const rooms = new Map<string, Room>();

io.on('connection', (socket: Socket) => {
  console.log(`[+] Client connected: ${socket.id}`);

  // 1. Time Synchronization Handshake
  socket.on('sync:ping', (clientTime: number, callback: (serverTime: number, clientTime: number) => void) => {
    // Send back the server's precise timestamp along with the original client time
    // This allows the client to calculate the exact round-trip network latency
    callback(Date.now(), clientTime);
  });

  // 2. Session Management
  socket.on('session:create', (callback: (roomId: string) => void) => {
    // Generate a simple 5-digit alpha-numeric room code
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    rooms.set(roomId, {
      id: roomId,
      hostId: socket.id,
      guests: new Set(),
    });

    socket.join(roomId);
    console.log(`[Host] ${socket.id} created room: ${roomId}`);
    callback(roomId);
  });

  socket.on('session:join', (roomId: string, callback: (success: boolean, message?: string) => void) => {
    const room = rooms.get(roomId);
    if (!room) {
      return callback(false, 'Session not found');
    }

    room.guests.add(socket.id);
    socket.join(roomId);
    
    // Notify the host that a new guest has joined
    io.to(room.hostId).emit('session:guest_joined', socket.id);
    console.log(`[Guest] ${socket.id} joined room: ${roomId}`);
    
    callback(true);
  });

  // 3. Player State Broadcasting
  socket.on('player:broadcast', (roomId: string, payload: any) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      // Only the host can broadcast player commands to the room
      // Broadcast to everyone in the room EXCEPT the sender
      socket.to(roomId).emit('player:execute', payload);
    }
  });

  // 4. Buffer Status (Handshake)
  socket.on('player:status', (roomId: string, payload: any) => {
    const room = rooms.get(roomId);
    if (room) {
      // Guests report their buffer status back to the host
      io.to(room.hostId).emit('player:guest_status', { guestId: socket.id, ...payload });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[-] Client disconnected: ${socket.id}`);
    
    // Cleanup rooms
    for (const [roomId, room] of rooms.entries()) {
      if (room.hostId === socket.id) {
        // Destroy room if host disconnects
        io.to(roomId).emit('session:ended', 'Host disconnected');
        rooms.delete(roomId);
      } else if (room.guests.has(socket.id)) {
        room.guests.delete(socket.id);
        io.to(room.hostId).emit('session:guest_left', socket.id);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`📻 TeleBeats Signaling Server`);
  console.log(`🚀 Running strictly on port ${PORT}`);
  console.log(`=========================================`);
});
