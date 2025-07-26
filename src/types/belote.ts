// src/types/belote.ts

// Les couleurs possibles pour les cartes
export type Suit = 'Pique' | 'Coeur' | 'Carreau' | 'Trefle';

// Les valeurs possibles pour les cartes
export type Rank = '7' | '8' | '9' | '10' | 'Valet' | 'Dame' | 'Roi' | 'As';

// L'objet qui représente une carte unique
export interface Card {
  suit: Suit;
  rank: Rank;
}

// L'objet qui représente un joueur
export interface Player {
  id: string; // L'identifiant unique fourni par Socket.IO
  name: string;
  hand: Card[]; // La main du joueur est un tableau de cartes
}

// L'objet qui représente une équipe
export interface Team {
  name: 'Équipe A' | 'Équipe B';
  players: [Player, Player];
  score: number;
}

// Les phases possibles du jeu
export type GamePhase = 'waiting' | 'bidding' | 'playing' | 'end';

// L'objet qui représente l'intégralité de l'état du jeu
export interface GameState {
  phase: GamePhase;
  players: Player[];
  deck: Card[];
  biddingCard?: Card; // La carte retournée pour la prise
  currentPlayerTurn?: string; // L'ID du joueur dont c'est le tour
  trumpSuit?: Suit;
}
