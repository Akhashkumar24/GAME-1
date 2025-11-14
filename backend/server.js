import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Top Trumps server running!' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",  // Accept from any origin in production
    methods: ["GET", "POST"],
    credentials: true
  },
  // Important for deployment
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const rooms = new Map();

const dogData = [
  { Individual: "Cocker Spaniel", Size: 3, Rarity: 2, "Good Temper": 5, Cuteness: 21, "Top Trumps Rating": 49, Country: "UK" },
  { Individual: "Pug", Size: 1, Rarity: 2, "Good Temper": 4, Cuteness: 27, "Top Trumps Rating": 40, Country: "China" },
  { Individual: "Bulldog", Size: 3, Rarity: 4, "Good Temper": 4, Cuteness: 25, "Top Trumps Rating": 10, Country: "UK" },
  { Individual: "Boxer", Size: 4, Rarity: 5, "Good Temper": 5, Cuteness: 26, "Top Trumps Rating": 19, Country: "Germany" },
  { Individual: "German Shepherd", Size: 4, Rarity: 1, "Good Temper": 4, Cuteness: 15, "Top Trumps Rating": 51, Country: "Germany" },
  { Individual: "Dalmatian", Size: 4, Rarity: 6, "Good Temper": 3, Cuteness: 16, "Top Trumps Rating": 80, Country: "Croatia" },
  { Individual: "Beagle", Size: 2, Rarity: 2, "Good Temper": 3, Cuteness: 20, "Top Trumps Rating": 49, Country: "UK" },
  { Individual: "Chihuahua", Size: 1, Rarity: 4, "Good Temper": 2, Cuteness: 29, "Top Trumps Rating": 85, Country: "Mexico" },
  { Individual: "Staffordshire Bull Terrier", Size: 3, Rarity: 4, "Good Temper": 5, Cuteness: 14, "Top Trumps Rating": 60, Country: "UK" },
  { Individual: "Shih Tzu", Size: 2, Rarity: 7, "Good Temper": 5, Cuteness: 25, "Top Trumps Rating": 35, Country: "China" },
  { Individual: "Border Terrier", Size: 2, Rarity: 6, "Good Temper": 3, Cuteness: 10, "Top Trumps Rating": 40, Country: "UK" },
  { Individual: "Golden Retriever", Size: 4, Rarity: 2, "Good Temper": 5, Cuteness: 27, "Top Trumps Rating": 75, Country: "UK" },
  { Individual: "Pembroke Welsh Corgi", Size: 1, Rarity: 4, "Good Temper": 3, Cuteness: 18, "Top Trumps Rating": 65, Country: "UK" },
  { Individual: "Poodle", Size: 3, Rarity: 6, "Good Temper": 2, Cuteness: 27, "Top Trumps Rating": 60, Country: "France" },
  { Individual: "Daschund", Size: 2, Rarity: 5, "Good Temper": 2, Cuteness: 29, "Top Trumps Rating": 67, Country: "Germany" },
  { Individual: "Husky", Size: 4, Rarity: 6, "Good Temper": 5, Cuteness: 22, "Top Trumps Rating": 88, Country: "Russia" },
  { Individual: "Alaskan Malamute", Size: 5, Rarity: 7, "Good Temper": 2, Cuteness: 15, "Top Trumps Rating": 80, Country: "USA" },
  { Individual: "Dobermann Pinscher", Size: 4, Rarity: 4, "Good Temper": 3, Cuteness: 18, "Top Trumps Rating": 50, Country: "Germany" },
  { Individual: "Great Dane", Size: 6, Rarity: 8, "Good Temper": 3, Cuteness: 20, "Top Trumps Rating": 50, Country: "Germany" },
  { Individual: "Maltese", Size: 1, Rarity: 7, "Good Temper": 2, Cuteness: 22, "Top Trumps Rating": 66, Country: "Italy" },
  { Individual: "Basset Hound", Size: 3, Rarity: 4, "Good Temper": 3, Cuteness: 27, "Top Trumps Rating": 55, Country: "France" },
  { Individual: "Saint Bernard", Size: 6, Rarity: 8, "Good Temper": 4, Cuteness: 25, "Top Trumps Rating": 94, Country: "Switzerland" },
  { Individual: "Border Collie", Size: 3, Rarity: 8, "Good Temper": 5, Cuteness: 19, "Top Trumps Rating": 86, Country: "UK" },
  { Individual: "Greyhound", Size: 4, Rarity: 6, "Good Temper": 5, Cuteness: 27, "Top Trumps Rating": 25, Country: "UK" },
  { Individual: "Rough Collie", Size: 4, Rarity: 7, "Good Temper": 5, Cuteness: 27, "Top Trumps Rating": 45, Country: "UK" },
  { Individual: "Afghan Hound", Size: 4, Rarity: 9, "Good Temper": 3, Cuteness: 29, "Top Trumps Rating": 25, Country: "Afghanistan" },
  { Individual: "Stray Dog", Size: 3, Rarity: 5, "Good Temper": 2, Cuteness: 15, "Top Trumps Rating": 100, Country: "various" },
  { Individual: "Wolf", Size: 6, Rarity: 10, "Good Temper": 2, Cuteness: 27, "Top Trumps Rating": 99, Country: "various" },
  { Individual: "Scooby Doo", Size: 6, Rarity: 10, "Good Temper": 5, Cuteness: 25, "Top Trumps Rating": 85, Country: "tv" },
  { Individual: "Labrador Retriever", Size: 4, Rarity: 1, "Good Temper": 5, Cuteness: 28, "Top Trumps Rating": 90, Country: "Canada" }
];

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('createRoom', ({ playerName }) => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      players: [{
        id: socket.id,
        name: playerName,
        socketId: socket.id
      }],
      gameState: null
    };
    
    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.roomCode = roomCode;
    
    socket.emit('roomCreated', {
      code: roomCode,
      players: room.players
    });
    
    console.log(`Room ${roomCode} created by ${playerName}`);
  });

  socket.on('joinRoom', ({ playerName, roomCode }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.players.length >= 2) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    room.players.push({
      id: socket.id,
      name: playerName,
      socketId: socket.id
    });
    
    socket.join(roomCode);
    socket.roomCode = roomCode;
    
    socket.emit('roomJoined', {
      code: roomCode,
      players: room.players
    });
    
    io.to(roomCode).emit('playerJoined', {
      players: room.players
    });
    
    console.log(`${playerName} joined room ${roomCode}`);
  });

  socket.on('startGame', () => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room || room.players.length !== 2) {
      return;
    }
    
    // Shuffle and deal cards
    const shuffled = shuffleArray(dogData);
    const half = Math.floor(shuffled.length / 2);
    
    const gameState = {
      player1: {
        socketId: room.players[0].socketId,
        deck: shuffled.slice(0, half),
        name: room.players[0].name
      },
      player2: {
        socketId: room.players[1].socketId,
        deck: shuffled.slice(half),
        name: room.players[1].name
      },
      currentTurn: room.players[0].socketId,
      roundInProgress: false
    };
    
    room.gameState = gameState;
    
    // Send game start to both players
    io.to(gameState.player1.socketId).emit('gameStarted', {
      myDeck: gameState.player1.deck,
      opponentDeck: Array(gameState.player2.deck.length).fill(null),
      opponentName: gameState.player2.name,
      isMyTurn: true
    });
    
    io.to(gameState.player2.socketId).emit('gameStarted', {
      myDeck: gameState.player2.deck,
      opponentDeck: Array(gameState.player1.deck.length).fill(null),
      opponentName: gameState.player1.name,
      isMyTurn: false
    });
    
    console.log(`Game started in room ${roomCode}`);
  });

  socket.on('selectStat', ({ stat }) => {
    const roomCode = socket.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room || !room.gameState) return;
    
    const gameState = room.gameState;
    
    // Check if it's this player's turn
    if (gameState.currentTurn !== socket.id) return;
    if (gameState.roundInProgress) return;
    
    gameState.roundInProgress = true;
    
    const isPlayer1 = socket.id === gameState.player1.socketId;
    const currentPlayer = isPlayer1 ? gameState.player1 : gameState.player2;
    const opponent = isPlayer1 ? gameState.player2 : gameState.player1;
    
    const myCard = currentPlayer.deck[0];
    const oppCard = opponent.deck[0];
    
    // Broadcast card reveal to both players
    io.to(currentPlayer.socketId).emit('cardRevealed', {
      myCard,
      opponentCard: oppCard,
      selectedStat: stat
    });
    
    io.to(opponent.socketId).emit('cardRevealed', {
      myCard: oppCard,
      opponentCard: myCard,
      selectedStat: stat
    });
    
    // Compare stats
    const myValue = myCard[stat];
    const oppValue = oppCard[stat];
    
    let result;
    if (myValue > oppValue) {
      result = 'win';
      // Current player wins - takes both cards
      currentPlayer.deck = [...currentPlayer.deck.slice(1), myCard, oppCard];
      opponent.deck = opponent.deck.slice(1);
      // Winner keeps their turn
    } else if (myValue < oppValue) {
      result = 'lose';
      // Opponent wins - takes both cards
      opponent.deck = [...opponent.deck.slice(1), oppCard, myCard];
      currentPlayer.deck = currentPlayer.deck.slice(1);
      // Turn switches to opponent
      gameState.currentTurn = opponent.socketId;
    } else {
      result = 'draw';
      // Draw - cards go to back of respective decks
      currentPlayer.deck = [...currentPlayer.deck.slice(1), myCard];
      opponent.deck = [...opponent.deck.slice(1), oppCard];
      // Turn stays with current player
    }
    
    // Send round result
    setTimeout(() => {
      io.to(currentPlayer.socketId).emit('roundResult', {
        result,
        myCard,
        opponentCard: oppCard,
        myDeckCount: currentPlayer.deck.length,
        opponentDeckCount: opponent.deck.length
      });
      
      io.to(opponent.socketId).emit('roundResult', {
        result: result === 'win' ? 'lose' : result === 'lose' ? 'win' : 'draw',
        myCard: oppCard,
        opponentCard: myCard,
        myDeckCount: opponent.deck.length,
        opponentDeckCount: currentPlayer.deck.length
      });
      
      // Check for game over
      if (currentPlayer.deck.length === 0) {
        io.to(opponent.socketId).emit('gameOver', { winner: true });
        io.to(currentPlayer.socketId).emit('gameOver', { winner: false });
      } else if (opponent.deck.length === 0) {
        io.to(currentPlayer.socketId).emit('gameOver', { winner: true });
        io.to(opponent.socketId).emit('gameOver', { winner: false });
      } else {
        // Continue to next round
        setTimeout(() => {
          io.to(currentPlayer.socketId).emit('nextRound', {
            myCard: currentPlayer.deck[0],
            isMyTurn: gameState.currentTurn === currentPlayer.socketId
          });
          
          io.to(opponent.socketId).emit('nextRound', {
            myCard: opponent.deck[0],
            isMyTurn: gameState.currentTurn === opponent.socketId
          });
          
          gameState.roundInProgress = false;
        }, 2000);
      }
    }, 1000);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    const roomCode = socket.roomCode;
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        // Notify other players
        socket.to(roomCode).emit('playerLeft');
        
        // Clean up room if empty
        room.players = room.players.filter(p => p.socketId !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Top Trumps server running on port ${PORT}`);
});
