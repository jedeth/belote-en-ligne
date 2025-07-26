// src/types/belote.ts

export type Suit = 'Pique' | 'Coeur' | 'Carreau' | 'Trefle';
export type Rank = '7' | '8' | '9' | '10' | 'Valet' | 'Dame' | 'Roi' | 'As';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
}

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface Team {
    name: 'Équipe A' | 'Équipe B';
    players: Player[];
    score: number;
    collectedCards: Card[];
}

export type GamePhase = 'waiting' | 'bidding' | 'bidding_round_2' | 'playing' | 'end';

export interface GameState {
  phase: GamePhase;
  players: Player[];
  teams: Team[];
  deck: Card[];
  biddingCard?: Card;
  currentPlayerTurn?: string;
  takerId?: string; // On garde l'ID du preneur
  trumpSuit?: Suit;
  currentTrick: PlayedCard[];
}