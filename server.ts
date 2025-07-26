// server.ts

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createDeck, shuffleDeck, determineTrickWinner, calculateScores } from './server/gameLogic.ts';
import { Player, GameState, Suit, Card, Team } from './src/types/belote.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
});
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'dist')));

let gameState: GameState = {
  phase: 'waiting',
  players: [],
  teams: [],
  deck: [],
  currentTrick: [],
};
let biddingPasses = 0;

function updateAndBroadcastGameState() {
  io.emit('gameStateUpdate', gameState);
}

function startNewHand() {
  console.log("Début d'une nouvelle manche.");
  biddingPasses = 0;
  const deck = shuffleDeck(createDeck());
  
  if (!gameState.teams || gameState.teams.length === 0) {
    gameState.teams = [
      { name: 'Équipe A', players: [gameState.players[0], gameState.players[2]], score: 0, collectedCards: [] },
      { name: 'Équipe B', players: [gameState.players[1], gameState.players[3]], score: 0, collectedCards: [] }
    ];
  }

  for (const p of gameState.players) { p.hand = []; }
  for (const t of gameState.teams) { t.collectedCards = []; }
  
  for (let i = 0; i < 5; i++) {
    for (const p of gameState.players) { p.hand.push(deck.pop()!); }
  }

  const biddingCard = deck.pop()!;
  
  gameState.phase = 'bidding';
  gameState.biddingCard = biddingCard;
  gameState.deck = deck;
  gameState.trumpSuit = undefined;
  gameState.takerId = undefined;
  gameState.currentPlayerTurn = gameState.players[0].id;
  gameState.currentTrick = [];
  updateAndBroadcastGameState();
}

io.on('connection', (socket) => {
  console.log(`Un joueur s'est connecté : ${socket.id}`);

  socket.on('joinGame', (playerName: string) => {
    if (gameState.players.length >= 4) return;
    const newPlayer: Player = { id: socket.id, name: playerName, hand: [] };
    gameState.players.push(newPlayer);
    updateAndBroadcastGameState();
    if (gameState.players.length === 4) startNewHand();
  });
  
  socket.on('playerBid', (choice: 'take' | 'pass' | Suit) => {
    if (socket.id !== gameState.currentPlayerTurn) return;
    const taker = gameState.players.find(p => p.id === socket.id)!;
    const isTakeAction = choice !== 'pass';

    if (isTakeAction) {
      gameState.takerId = taker.id;
      gameState.trumpSuit = choice === 'take' ? gameState.biddingCard!.suit : choice as Suit;
      taker.hand.push(gameState.biddingCard!);
      
      for (const p of gameState.players) {
        const cardsToDeal = (p.id === taker.id) ? 2 : 3;
        for (let i = 0; i < cardsToDeal; i++) {
          if (gameState.deck.length > 0) p.hand.push(gameState.deck.pop()!);
        }
      }
      
      gameState.phase = 'playing';
      gameState.currentPlayerTurn = gameState.players[0].id;
      delete gameState.biddingCard;
      updateAndBroadcastGameState();
    } else {
      biddingPasses++;
      const currentPlayerIndex = gameState.players.findIndex(p => p.id === socket.id);
      const nextPlayerIndex = (currentPlayerIndex + 1) % 4;
      gameState.currentPlayerTurn = gameState.players[nextPlayerIndex].id;

      if (biddingPasses === 4 && gameState.phase === 'bidding') {
        gameState.phase = 'bidding_round_2';
      } else if (biddingPasses === 8 && gameState.phase === 'bidding_round_2') {
        startNewHand();
        return;
      }
      updateAndBroadcastGameState();
    }
  });

  socket.on('playCard', (cardToPlay: Card) => {
    if (gameState.phase !== 'playing' || socket.id !== gameState.currentPlayerTurn) return;
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player) return;

    const cardIndex = player.hand.findIndex(c => c.rank === cardToPlay.rank && c.suit === cardToPlay.suit);
    if (cardIndex === -1) return;

    player.hand.splice(cardIndex, 1);
    gameState.currentTrick.push({ playerId: socket.id, card: cardToPlay });
    
    if (gameState.currentTrick.length < 4) {
      const currentPlayerIndex = gameState.players.findIndex(p => p.id === socket.id);
      const nextPlayerIndex = (currentPlayerIndex + 1) % 4;
      gameState.currentPlayerTurn = gameState.players[nextPlayerIndex].id;
      updateAndBroadcastGameState();
    } else {
      updateAndBroadcastGameState();
      
      const winnerInfo = determineTrickWinner(gameState.currentTrick, gameState.trumpSuit!);
      const winningTeam = gameState.teams.find(t => t.players.some(p => p.id === winnerInfo.playerId))!;
      winningTeam.collectedCards.push(...gameState.currentTrick.map(pc => pc.card));
      const winnerPlayer = gameState.players.find(p => p.id === winnerInfo.playerId)!;
      
      setTimeout(() => {
        const isHandOver = winnerPlayer.hand.length === 0;
        if (isHandOver) {
          console.log("Manche terminée !");
          const takerTeam = gameState.teams.find(t => t.players.some(p => p.id === gameState.takerId))!;
          calculateScores(gameState.teams, takerTeam.name, winningTeam.name, gameState.trumpSuit!);
          gameState.phase = 'end';
        } else {
          gameState.currentTrick = [];
          gameState.currentPlayerTurn = winnerInfo.playerId;
        }
        updateAndBroadcastGameState();
      }, 2500);
    }
  });
  
  socket.on('nextHand', () => {
    if (gameState.phase === 'end' && gameState.players[0]?.id === socket.id) {
      startNewHand();
    }
  });

  socket.on('disconnect', () => {
    // ...
  });
});

httpServer.listen(PORT, () => {
  console.log(`Le serveur de jeu écoute sur le port ${PORT}`);
});