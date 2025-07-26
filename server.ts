// server.ts

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createDeck, shuffleDeck } from './server/gameLogic';
import { Player, GameState } from './src/types/belote';

// --- Configuration initiale (inchangée) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
});
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'dist')));
// -----------------------------------------

// --- État du jeu sur le serveur ---
let gameState: GameState = {
  phase: 'waiting',
  players: [],
  deck: [],
};

function updateAndBroadcastGameState() {
  io.emit('gameStateUpdate', gameState);
}

io.on('connection', (socket) => {
  console.log(`Un joueur s'est connecté : ${socket.id}`);

  socket.on('joinGame', (playerName: string) => {
    if (gameState.players.length >= 4) return; // Empêche plus de 4 joueurs

    const newPlayer: Player = { id: socket.id, name: playerName, hand: [] };
    gameState.players.push(newPlayer);
    console.log(`${playerName} a rejoint. Joueurs: ${gameState.players.length}`);
    updateAndBroadcastGameState();

    if (gameState.players.length === 4) {
      console.log('4 joueurs, la partie commence.');
      const deck = shuffleDeck(createDeck());
      
      // Distribution de 5 cartes
      for (let i = 0; i < 5; i++) {
        for (const p of gameState.players) {
          p.hand.push(deck.pop()!);
        }
      }

      // On retourne une carte pour la prise
      const biddingCard = deck.pop()!;
      
      // Mise à jour de l'état du jeu pour la phase de prise
      gameState.phase = 'bidding';
      gameState.biddingCard = biddingCard;
      gameState.deck = deck;
      // Le premier joueur à parler est celui à la droite du donneur (ici, le premier de la liste)
      gameState.currentPlayerTurn = gameState.players[0].id;

      updateAndBroadcastGameState();
    }
  });
  
  // Un joueur fait une annonce (prend ou passe)
  socket.on('playerBid', (choice: 'take' | 'pass') => {
    if (socket.id !== gameState.currentPlayerTurn || gameState.phase !== 'bidding') {
      return; // Action non autorisée
    }
    
    if (choice === 'take') {
      // Logique si le joueur prend (à développer)
      console.log(`${socket.id} a pris la carte ${gameState.biddingCard?.rank} de ${gameState.biddingCard?.suit}`);
      // On passera à la phase de jeu ici
      
    } else { // Le joueur passe
      console.log(`${socket.id} a passé.`);
      const currentPlayerIndex = gameState.players.findIndex(p => p.id === socket.id);
      const nextPlayerIndex = (currentPlayerIndex + 1) % 4;
      gameState.currentPlayerTurn = gameState.players[nextPlayerIndex].id;
      updateAndBroadcastGameState();
    }
  });

  socket.on('disconnect', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      console.log(`${player.name} s'est déconnecté.`);
      gameState.players = gameState.players.filter(p => p.id !== socket.id);
      // Gérer la réinitialisation du jeu...
      updateAndBroadcastGameState();
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Le serveur de jeu écoute sur le port ${PORT}`);
});