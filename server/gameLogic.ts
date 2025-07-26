// server/gameLogic.ts

import { Suit, Rank, Card } from '../src/types/belote';

// Listes exhaustives de nos types pour pouvoir itérer dessus
const suits: Suit[] = ['Pique', 'Coeur', 'Carreau', 'Trefle'];
const ranks: Rank[] = ['7', '8', '9', '10', 'Valet', 'Dame', 'Roi', 'As'];

/**
 * Crée un paquet de 32 cartes de belote, bien ordonné.
 * @returns Un tableau de 32 objets Card.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Mélange un tableau de cartes en utilisant l'algorithme de Fisher-Yates.
 * @param deck Le paquet de cartes à mélanger.
 * @returns Le paquet de cartes mélangé.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  // On travaille sur une copie pour ne pas modifier l'original
  const shuffledDeck = [...deck];
  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]]; // Inversion des cartes
  }
  return shuffledDeck;
}