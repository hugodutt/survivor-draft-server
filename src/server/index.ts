import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './managers/RoomManager';
import { Player, Room } from './types';
import { nanoid } from 'nanoid';

const app = express();
const httpServer = createServer(app);

// Configuração do CORS usando o pacote cors
app.use(cors({
  origin: 'https://survivor-draft-eight.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 86400
}));

// Middleware para logging
app.use((req, res, next) => {
  console.log('Request received:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: req.headers
  });
  next();
});

const io = new Server(httpServer, {
  cors: {
    origin: 'https://survivor-draft-eight.vercel.app',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  }
});

app.use(express.json());

const roomManager = new RoomManager();

// Rotas HTTP
app.get('/api/scenarios', (req: Request, res: Response) => {
  const scenarios = roomManager.getAvailableScenarios();
  res.json(scenarios);
});

app.post('/api/rooms', async (req: Request, res: Response) => {
  try {
    const { playerName, scenarioId, maxPlayers } = req.body;
    console.log('Creating room with data:', { playerName, scenarioId, maxPlayers });
    
    if (!playerName || !scenarioId || !maxPlayers) {
      console.error('Missing required fields:', { playerName, scenarioId, maxPlayers });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Adiciona prefixo temp- para identificar IDs temporários
    const tempId = `temp-${nanoid()}`;
    console.log(`Creating room with host ${playerName} (ID: ${tempId})`);
    
    const room = await roomManager.createRoom(tempId, playerName, scenarioId, maxPlayers);
    console.log('Room created successfully:', room);
    console.log('Current rooms:', Array.from(roomManager.getRooms().keys()));
    res.json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    const message = error instanceof Error ? error.message : 'Failed to create room';
    res.status(500).json({ error: message });
  }
});

app.post('/api/rooms/:code/join', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { playerName } = req.body;
    console.log('Join room request:', { code, playerName });
    console.log('Available rooms:', Array.from(roomManager.getRooms().keys()));
    
    // Adiciona prefixo temp- para identificar IDs temporários
    const tempId = `temp-${nanoid()}`;
    console.log(`Player ${playerName} attempting to join room ${code} with temp ID ${tempId}`);
    
    const room = await roomManager.joinRoom(code, tempId, playerName);
    console.log('Player joined room successfully:', room);
    console.log('Updated rooms:', Array.from(roomManager.getRooms().keys()));
    res.json(room);
  } catch (error) {
    console.error('Error joining room:', error);
    const message = error instanceof Error ? error.message : 'Room not found or full';
    res.status(404).json({ error: message });
  }
});

// Socket.IO
io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', async (roomCode: string, playerName: string) => {
    try {
      console.log(`Player ${playerName} attempting to join room ${roomCode} with socket ID ${socket.id}`);
      
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        console.error(`Room ${roomCode} not found`);
        throw new Error('Room not found');
      }

      console.log('Room players before update:', room.players);

      // Verifica se o jogador já existe na sala (por nome ou ID temporário)
      const existingPlayer = room.players.find(p => 
        p.name === playerName || 
        (p.id.startsWith('temp-') && p.name === playerName)
      );
      
      if (existingPlayer) {
        console.log(`Updating existing player ${playerName} from ID ${existingPlayer.id} to ${socket.id}`);
        // Atualiza o ID do socket do jogador existente
        existingPlayer.id = socket.id;
        
        // Se o jogador era o host, atualiza o hostId
        if (room.hostId === existingPlayer.id) {
          console.log(`Updating host ID from ${room.hostId} to ${socket.id}`);
          room.hostId = socket.id;
        }
        
        room.updatedAt = new Date();
        
        // Inscreve o socket na sala
        socket.join(roomCode);
        
        // Notifica todos os jogadores da sala sobre a atualização
        io.to(roomCode).emit('room-updated', room);
        console.log('Room players after update:', room.players);
      } else {
        console.log(`Adding new player ${playerName} to room`);
        // Se o jogador não existe, adiciona ele à sala
        const updatedRoom = await roomManager.joinRoom(roomCode, socket.id, playerName);
        
        // Inscreve o socket na sala
        socket.join(roomCode);
        
        // Notifica todos os jogadores da sala sobre a atualização
        io.to(roomCode).emit('room-updated', updatedRoom);
        console.log('Room players after adding new player:', updatedRoom.players);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Failed to join room' 
      });
    }
  });

  socket.on('player-ready', async (roomCode: string) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room) throw new Error('Room not found');

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.isReady = !player.isReady; // Toggle ready status
        room.updatedAt = new Date();
        io.to(roomCode).emit('room-updated', room);
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to update ready status' });
    }
  });

  socket.on('start-game', async (roomCode: string) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room) throw new Error('Room not found');

      const player = room.players.find(p => p.id === socket.id);
      if (!player || !player.isHost) {
        throw new Error('Only the host can start the game');
      }

      if (!room.players.every(p => p.isReady)) {
        throw new Error('All players must be ready to start');
      }

      // Iniciar o draft
      const updatedRoom = await roomManager.startDraft(roomCode);
      
      // Notificar todos os jogadores sobre o início do draft
      io.to(roomCode).emit('draft-started', {
        room: updatedRoom,
        message: `Draft started! ${updatedRoom.players[0].name}'s turn.`
      });
    } catch (error) {
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to start game' });
    }
  });

  socket.on('select-item', async (roomCode: string, itemId: string) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        throw new Error('Room not found');
      }

      let updatedRoom: Room;
      let message = '';

      if (room.status === 'drafting') {
        updatedRoom = await roomManager.selectItemInDraft(roomCode, socket.id, itemId);
        
        if (updatedRoom.status === 'situations') {
          message = 'Draft completed! Starting situations phase...';
        } else {
          const nextPlayer = updatedRoom.players.find(p => p.id === updatedRoom.currentPlayerTurn);
          message = `${nextPlayer?.name}'s turn to draft.`;
        }
      } else if (room.status === 'situations') {
        updatedRoom = await roomManager.selectItemForSituation(roomCode, socket.id, itemId);
        
        if (updatedRoom.status === 'voting') {
          message = 'All players have chosen! Time to vote for the best solution!';
        } else if (updatedRoom.status === 'finished') {
          message = 'Game Over! Thanks for playing!';
        } else {
          const allPlayersChose = updatedRoom.players.every(p => p.currentItemChoice);
          if (allPlayersChose) {
            message = 'Moving to next situation...';
          } else {
            message = 'Waiting for other players to choose...';
          }
        }
      } else {
        throw new Error('Invalid room status for item selection');
      }

      if (!updatedRoom || !Array.isArray(updatedRoom.players)) {
        throw new Error('Invalid room data after selecting item');
      }

      io.to(roomCode).emit('room-updated', updatedRoom);
      if (message) {
        io.to(roomCode).emit('message', message);
      }
    } catch (error) {
      console.error('Error selecting item:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to select item' });
    }
  });

  socket.on('vote', async (roomCode: string, votedPlayerId: string) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        throw new Error('Room not found');
      }

      const updatedRoom = await roomManager.voteForPlayer(roomCode, socket.id, votedPlayerId);
      let message = '';

      if (updatedRoom.status === 'situations') {
        message = 'Voting completed! Moving to next situation...';
      } else if (updatedRoom.status === 'finished') {
        // Encontra o jogador com mais votos
        const winner = [...updatedRoom.players].sort((a, b) => 
          (b.votesReceived || 0) - (a.votesReceived || 0)
        )[0];
        message = `Game Over! ${winner.name} had the best solution for this situation!`;
      } else {
        const remainingVotes = updatedRoom.players.length - Object.keys(updatedRoom.votes || {}).length;
        message = `Vote registered! Waiting for ${remainingVotes} more players to vote...`;
      }

      io.to(roomCode).emit('room-updated', updatedRoom);
      io.to(roomCode).emit('message', message);
    } catch (error) {
      console.error('Error voting:', error);
      socket.emit('error', { message: error instanceof Error ? error.message : 'Failed to vote' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    roomManager.handleDisconnect(socket.id);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 