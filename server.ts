// server.ts

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { createDeck, shuffleDeck, determineTrickWinner, calculateRoundScores, createFixedHandForBeloteTest } from './src/logic/gameLogic.js';
import { type Player, type GameState, type Suit, type Card, type Team, type PlayedCard } from './src/types/belote.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const WINNING_SCORE = 1000;

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: "*", 
    methods: ['GET', 'POST'] 
  },
});

let gameState: GameState = {
  phase: 'waiting',
  players: [],
  teams: [],
  deck: [],
  currentTrick: [],
  scoreHistory: [],
  trickHistory: [],
};
let biddingPasses = 0;

function updateAndBroadcastGameState() {
  io.emit('gameStateUpdate', gameState);
}

function startNewHand() {
  console.log("Début d'une nouvelle manche.");
  biddingPasses = 0;
  
  let deck: Card[];

  // Si ce n'est pas la première manche, on ne mélange pas.
  if (gameState.scoreHistory.length > 0 && gameState.trickHistory.length === 8) {
    console.log("Distribution à partir de la manche précédente.");
    // 1. On rassemble les cartes des 8 plis dans l'ordre
    let nextDeck = gameState.trickHistory.flat();

    // 2. On simule la "coupe"
    const cutPoint = Math.floor(Math.random() * 24) + 4; 
    const cutDeck = [...nextDeck.slice(cutPoint), ...nextDeck.slice(0, cutPoint)];
    console.log(`Le paquet a été coupé à la carte n°${cutPoint}.`);
    
    deck = cutDeck;

  } else {
    // Comportement normal pour la TOUTE PREMIÈRE MANCHE
    console.log("Première manche : création et mélange du paquet.");
    deck = shuffleDeck(createDeck());
  }

  // On vide l'historique des plis pour la nouvelle manche
  gameState.trickHistory = [];
  
  // 3. On distribue les cartes
  for (const p of gameState.players) { p.hand = []; }
  for (let i = 0; i < 5; i++) {
    for (const p of gameState.players) { p.hand.push(deck.pop()!); }
  }
  gameState.biddingCard = deck.pop()!;
  gameState.deck = deck;

  if (gameState.teams.length === 0 && gameState.players.length === 4) {
    gameState.teams = [
      { name: 'Équipe A', players: [gameState.players[0], gameState.players[2]], score: 0, collectedCards: [], beloteState: 'none', beloteAnnounceMissed: false },
      { name: 'Équipe B', players: [gameState.players[1], gameState.players[3]], score: 0, collectedCards: [], beloteState: 'none', beloteAnnounceMissed: false }
    ];
  }

  for (const t of gameState.teams) {
    t.collectedCards = [];
    t.beloteState = 'none';
    t.beloteAnnounceMissed = false;
  }
  
  gameState.phase = 'bidding';
  gameState.trumpSuit = undefined;
  gameState.takerTeamName = undefined;
  gameState.beloteHolderId = undefined;
  gameState.currentPlayerTurn = gameState.players[0].id;
  gameState.currentTrick = [];
  gameState.roundPoints = undefined;
  gameState.contractResult = undefined;
  updateAndBroadcastGameState();
}

io.on('connection', (socket) => {
  
  socket.on('joinGame', (playerName: string) => {
    const disconnectedPlayer = gameState.players.find((p: Player) => p.name === playerName && !p.isConnected);

    if (disconnectedPlayer) {
      console.log(`Le joueur ${playerName} se reconnecte.`);
      const oldSocketId = disconnectedPlayer.id;
      disconnectedPlayer.isConnected = true;
      disconnectedPlayer.id = socket.id;
      
      if (gameState.currentPlayerTurn === oldSocketId) {
        gameState.currentPlayerTurn = socket.id;
      }
      updateAndBroadcastGameState();
    } else if (gameState.players.length < 4 && !gameState.players.some((p: Player) => p.name === playerName)) {
      console.log(`Le joueur ${playerName} (${socket.id}) a rejoint la partie.`);
      const newPlayer: Player = { id: socket.id, name: playerName, hand: [], isConnected: true };
      gameState.players.push(newPlayer);
      if (gameState.players.length === 4) {
        startNewHand();
      } else {
        updateAndBroadcastGameState();
      }
    }
  });
  
  socket.on('playerBid', (choice: 'take' | 'pass' | Suit) => {
    if (socket.id !== gameState.currentPlayerTurn) return;
    const taker = gameState.players.find((p: Player) => p.id === socket.id)!;
    const isTakeAction = choice !== 'pass';

    if (isTakeAction) {
      const takerTeam = gameState.teams.find((t: Team) => t.players.some((p: Player) => p.id === taker.id))!;
      gameState.takerTeamName = takerTeam.name;
      gameState.trumpSuit = choice === 'take' ? gameState.biddingCard!.suit : choice as Suit;
      taker.hand.push(gameState.biddingCard!);
      
      for (const p of gameState.players) {
        const cardsToDeal = (p.id === taker.id) ? 2 : 3;
        for (let i = 0; i < cardsToDeal; i++) {
          if (gameState.deck.length > 0) p.hand.push(gameState.deck.pop()!);
        }
      }

      const trump = gameState.trumpSuit;
      for (const p of gameState.players) {
        const hasKing = p.hand.some((c: Card) => c.rank === 'Roi' && c.suit === trump);
        const hasQueen = p.hand.some((c: Card) => c.rank === 'Dame' && c.suit === trump);
        if (hasKing && hasQueen) {
          gameState.beloteHolderId = p.id;
          console.log(`Le joueur ${p.name} a la belote.`);
          break;
        }
      }
      
      gameState.phase = 'playing';
      gameState.currentPlayerTurn = gameState.players[0].id;
      delete gameState.biddingCard;
      updateAndBroadcastGameState();
    } else {
      biddingPasses++;
      const currentPlayerIndex = gameState.players.findIndex((p: Player) => p.id === socket.id);
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

  socket.on('declareBelote', () => {
    if (socket.id !== gameState.beloteHolderId) return;

    const playerTeam = gameState.teams.find((t: Team) => t.players.some((p: Player) => p.id === socket.id));
    if (!playerTeam || playerTeam.beloteState === 'rebelote') return;

    const nextBeloteState = playerTeam.beloteState === 'none' ? 'belote' : 'rebelote';

    gameState.teams = gameState.teams.map((team: Team) => {
      if (team.name === playerTeam.name) {
        console.log(`L'équipe ${team.name} a annoncé : ${nextBeloteState}.`);
        return { ...team, beloteState: nextBeloteState };
      }
      return team;
    });

    updateAndBroadcastGameState();
  });

  socket.on('playCard', (cardToPlay: Card) => {
    if (gameState.phase !== 'playing' || socket.id !== gameState.currentPlayerTurn) return;
    const player = gameState.players.find((p: Player) => p.id === socket.id);
    if (!player) return;

    const cardIndex = player.hand.findIndex((c: Card) => c.rank === cardToPlay.rank && c.suit === cardToPlay.suit);
    if (cardIndex === -1) return;
    
    player.hand.splice(cardIndex, 1);
    gameState.currentTrick.push({ playerId: socket.id, card: cardToPlay });
    
    if (gameState.currentTrick.length < 4) {
      const currentPlayerIndex = gameState.players.findIndex((p: Player) => p.id === socket.id);
      const nextPlayerIndex = (currentPlayerIndex + 1) % 4;
      gameState.currentPlayerTurn = gameState.players[nextPlayerIndex].id;
      updateAndBroadcastGameState();
    } else {
      updateAndBroadcastGameState();
      
      const winnerInfo = determineTrickWinner(gameState.currentTrick, gameState.trumpSuit!);
      const winningTeam = gameState.teams.find((t: Team) => t.players.some((p: Player) => p.id === winnerInfo.playerId))!;
      winningTeam.collectedCards.push(...gameState.currentTrick.map((pc: PlayedCard) => pc.card));
      const winnerPlayer = gameState.players.find((p: Player) => p.id === winnerInfo.playerId)!;
      
      gameState.trickHistory.push(gameState.currentTrick.map(pc => pc.card));
      console.log(`Pli n°${gameState.trickHistory.length} enregistré.`);
      
      const beloteHolderTeam = gameState.teams.find(t => t.players.some(p => p.id === gameState.beloteHolderId));
      if (beloteHolderTeam && beloteHolderTeam.beloteState === 'none') {
        const beloteCardPlayedInTrick = gameState.currentTrick.find(pc => 
            pc.playerId === gameState.beloteHolderId &&
            (pc.card.rank === 'Roi' || pc.card.rank === 'Dame') &&
            pc.card.suit === gameState.trumpSuit
        );
        if (beloteCardPlayedInTrick) {
          beloteHolderTeam.beloteAnnounceMissed = true;
          console.log(`L'équipe ${beloteHolderTeam.name} a manqué l'opportunité d'annoncer la belote.`);
        }
      }

      setTimeout(() => {
        const isHandOver = winnerPlayer.hand.length === 0;
        if (isHandOver) {
          console.log("Manche terminée !");
          const defendingTeam = gameState.teams.find((t: Team) => t.name !== gameState.takerTeamName)!;
          const isCapot = defendingTeam.collectedCards.length === 0;

          const roundOutcome = calculateRoundScores(gameState.teams, gameState.takerTeamName!, winningTeam.name, gameState.trumpSuit!, isCapot);

          gameState.roundPoints = roundOutcome.scores;
          gameState.contractResult = roundOutcome.result;

          for (const team of gameState.teams) {
            team.score += roundOutcome.scores[team.name] || 0;
          }

          gameState.scoreHistory.push({
            round: gameState.scoreHistory.length + 1,
            scores: roundOutcome.scores,
            takerTeamName: gameState.takerTeamName!,
            result: roundOutcome.result,
          });
          
          const gameWinner = gameState.teams.find((t: Team) => t.score >= WINNING_SCORE);
          if (gameWinner) {
            gameState.phase = 'game_over';
            console.log(`Partie terminée ! Vainqueur : ${gameWinner.name}`);
          } else {
            const rotatedPlayers = [...gameState.players];
            const dealer = rotatedPlayers.shift()!;
            rotatedPlayers.push(dealer);
            gameState.players = rotatedPlayers;
            
            gameState.phase = 'end';
          }
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

  socket.on('newGame', () => {
    console.log("Nouvelle partie demandée.");
    gameState = { 
      phase: 'waiting', 
      players: [], 
      teams: [], 
      deck: [], 
      currentTrick: [],
      scoreHistory: [],
      trickHistory: []
    };
    biddingPasses = 0;
    io.emit('gameStateUpdate', gameState);
  });

  socket.on('disconnect', () => {
    const player = gameState.players.find((p: Player) => p.id === socket.id);
    if (player) {
      console.log(`Le joueur ${player.name} s'est déconnecté.`);
      player.isConnected = false;
      updateAndBroadcastGameState();
      
      const allDisconnected = gameState.players.every((p: Player) => !p.isConnected);
      if (gameState.players.length === 4 && allDisconnected) {
          console.log("Tous les joueurs sont déconnectés. Réinitialisation de la partie.");
          gameState = { phase: 'waiting', players: [], teams: [], deck: [], currentTrick: [], scoreHistory: [], trickHistory: [] };
          biddingPasses = 0;
      }
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Le serveur de jeu écoute sur le port ${PORT}`);
});