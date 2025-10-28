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
  isConnected: boolean;
}

export interface Team {
  name: string;
  players: Player[];
  score: number;
  collectedCards: Card[];
  beloteState: 'none' | 'belote' | 'rebelote';
  beloteAnnounceMissed: boolean;
}

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface ScoreHistoryEntry {
  round: number;
  scores: { [teamName: string]: number };
  takerTeamName: string;
  result: 'succeeded' | 'failed';
}

export interface GameState {
  phase: 'waiting' | 'bidding' | 'bidding_round_2' | 'playing' | 'end' | 'game_over';
  players: Player[];
  teams: Team[];
  deck: Card[];
  biddingCard?: Card;
  currentPlayerTurn?: string;
  trumpSuit?: Suit;
  takerTeamName?: string;
  beloteHolderId?: string;
  currentTrick: PlayedCard[];
  roundPoints?: { [teamName: string]: number };
  contractResult?: 'succeeded' | 'failed';
  scoreHistory: ScoreHistoryEntry[];
  trickHistory: Card[][]; // <--- PROPRIÉTÉ AJOUTÉE
}

export const WINNING_SCORE = 1000;