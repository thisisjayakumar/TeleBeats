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
  pingInterval: 10000,
  pingTimeout: 5000,
  perMessageDeflate: {
    threshold: 1024,
  },
});

type Room = {
  id: string;
  hostId: string;
  guests: Set<string>;
};

const rooms = new Map<string, Room>();

const clockOffsets = new Map<string, number>();
const NETWORK_DELAY_THRESHOLD_MS = 500;

io.on('connection', (socket: Socket) => {
  console.log(`[+] Client connected: ${socket.id}`);

  socket.on('sync:ping', (clientTime: number, callback: (serverTime: number, clientTime: number) => void) => {
    callback(Date.now(), clientTime);
  });

  socket.on('sync:cristian', (clientSendTime: number, callback: (serverTime: number, serverReceiveTime: number) => void) => {
    const serverReceiveTime = Date.now();
    callback(serverReceiveTime, clientSendTime);
  });

  socket.on('sync:calculate_offset', (clientSendTime: number, serverReceiveTime: number, callback: (offset: number, roundTripDelay: number) => void) => {
    const serverSendTime = Date.now();
    const clientReceiveTime = serverSendTime;
    
    const roundTripDelay = clientReceiveTime - clientSendTime;
    const oneWayDelay = roundTripDelay / 2;
    const offset = serverReceiveTime - oneWayDelay - clientSendTime;
    
    if (roundTripDelay < NETWORK_DELAY_THRESHOLD_MS) {
      const existingOffset = clockOffsets.get(socket.id) ?? 0;
      const smoothedOffset = (existingOffset * 0.7) + (offset * 0.3);
      clockOffsets.set(socket.id, smoothedOffset);
    }
    
    callback(offset, roundTripDelay);
  });

  socket.on('session:create', (callback: (roomId: string) => void) => {
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
    
    io.to(room.hostId).emit('session:guest_joined', socket.id);
    console.log(`[Guest] ${socket.id} joined room: ${roomId}`);
    
    callback(true);
  });

  socket.on('player:broadcast', (roomId: string, payload: any) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      socket.to(roomId).emit('player:execute', payload);
    }
  });

  socket.on('player:broadcast_buffered', (roomId: string, payload: { position: number; bufferedPosition: number; timestamp: number }) => {
    const room = rooms.get(roomId);
    if (room && room.hostId === socket.id) {
      const adjustedPayload = {
        ...payload,
        adjustedTimestamp: payload.timestamp + (clockOffsets.get(socket.id) ?? 0),
      };
      socket.to(roomId).emit('player:execute_buffered', adjustedPayload);
    }
  });

  socket.on('player:status', (roomId: string, payload: any) => {
    const room = rooms.get(roomId);
    if (room) {
      io.to(room.hostId).emit('player:guest_status', { guestId: socket.id, ...payload });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[-] Client disconnected: ${socket.id}`);
    clockOffsets.delete(socket.id);
    
    for (const [roomId, room] of rooms.entries()) {
      if (room.hostId === socket.id) {
        io.to(roomId).emit('session:ended', 'Host disconnected');
        rooms.delete(roomId);
      } else if (room.guests.has(socket.id)) {
        room.guests.delete(socket.id);
        io.to(room.hostId).emit('session:guest_left', socket.id);
      }
    }
  });
});

function broadcastToRoomOptimized(roomId: string, event: string, payload: any): void {
  const room = rooms.get(roomId);
  if (!room) return;

  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (sockets && sockets.size > 10) {
    console.log(`[Optimized broadcast] Room ${roomId} has ${sockets.size} clients, using optimized path`);
  }
  
  io.to(roomId).emit(event, payload);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`📻 TeleBeats Signaling Server`);
  console.log(`🚀 Running strictly on port ${PORT}`);
  console.log(`=========================================`);
});