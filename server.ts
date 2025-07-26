// server.ts

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createDeck, shuffleDeck } from './server/gameLogic';
import { Player, GameState, Suit } from './src/types/belote';

// --- Configuration initiale ---
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
let biddingPasses = 0; // Compteur de passes consécutives

function updateAndBroadcastGameState() {
  io.emit('gameStateUpdate', gameState);
}

// Fonction pour démarrer ou redémarrer une manche
function startNewHand() {
  console.log('Début d\'une nouvelle manche.');
  biddingPasses = 0;
  const deck = shuffleDeck(createDeck());
  
  // Réinitialise les mains des joueurs
  for (const p of gameState.players) {
    p.hand = [];
  }
  
  // Distribution de 5 cartes à chaque joueur
  for (let i = 0; i < 5; i++) {
    for (const p of gameState.players) {
      p.hand.push(deck.pop()!);
    }
  }

  const biddingCard = deck.pop()!;
  
  // Mise à jour de l'état du jeu pour la phase de prise
  gameState.phase = 'bidding';
  gameState.biddingCard = biddingCard;
  gameState.deck = deck;
  gameState.trumpSuit = undefined; // S'assurer que l'atout est réinitialisé
  gameState.currentPlayerTurn = gameState.players[0].id;
  updateAndBroadcastGameState();
}

io.on('connection', (socket) => {
  console.log(`Un joueur s'est connecté : ${socket.id}`);

  socket.on('joinGame', (playerName: string) => {
    if (gameState.players.length >= 4) return; // Empêche plus de 4 joueurs

    const newPlayer: Player = { id: socket.id, name: playerName, hand: [] };
    gameState.players.push(newPlayer);
    updateAndBroadcastGameState();

    if (gameState.players.length === 4) {
      startNewHand();
    }
  });
  
socket.on('playerBid', (choice: 'take' | 'pass' | Suit) => {
    if (socket.id !== gameState.currentPlayerTurn) return;

    const currentPlayerIndex = gameState.players.findIndex(p => p.id === socket.id);
    const taker = gameState.players[currentPlayerIndex];

    const isTakeAction = choice !== 'pass';

    if (isTakeAction) {
        // ### LOGIQUE DE PRISE UNIFIÉE ET CORRIGÉE ###

        // 1. On détermine l'atout. Soit la couleur de la carte (1er tour), soit la couleur choisie (2ème tour).
        const trump = choice === 'take' ? gameState.biddingCard!.suit : choice as Suit;
        console.log(`${taker.name} a pris à ${trump}`);
        gameState.trumpSuit = trump;

        // 2. Le preneur reçoit TOUJOURS la carte retournée du premier tour.
        taker.hand.push(gameState.biddingCard!);
        
        // 3. La distribution finale est maintenant la même dans tous les cas.
        // Le preneur a 6 cartes (5+1) et a besoin de 2 cartes.
        // Les autres ont 5 cartes et ont besoin de 3 cartes.
        for (const p of gameState.players) {
            const cardsToDeal = (p.id === taker.id) ? 2 : 3;
            for (let i = 0; i < cardsToDeal; i++) {
                if (gameState.deck.length > 0) p.hand.push(gameState.deck.pop()!);
            }
        }
        
        // 4. On passe à la phase de jeu (inchangé).
        gameState.phase = 'playing';
        gameState.currentPlayerTurn = gameState.players[0].id;
        delete gameState.biddingCard;
        updateAndBroadcastGameState();

    } else { // Le joueur passe (logique inchangée)
      console.log(`${taker.name} a passé.`);
      biddingPasses++;
      const nextPlayerIndex = (currentPlayerIndex + 1) % 4;
      gameState.currentPlayerTurn = gameState.players[nextPlayerIndex].id;

      if (biddingPasses === 4 && gameState.phase === 'bidding') {
        gameState.phase = 'bidding_round_2';
      } 
      else if (biddingPasses === 8 && gameState.phase === 'bidding_round_2') {
        startNewHand();
        return;
      }
      
      updateAndBroadcastGameState();
    }
});

  socket.on('disconnect', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (player) {
      console.log(`${player.name} s'est déconnecté.`);
      // Réinitialise le jeu si un joueur part
      gameState = {
        phase: 'waiting',
        players: [],
        deck: [],
      };
      biddingPasses = 0;
      console.log("Un joueur a quitté, la partie est réinitialisée.");
      updateAndBroadcastGameState();
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Le serveur de jeu écoute sur le port ${PORT}`);
});