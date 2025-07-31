// src/logic/gameLogic.ts

import { Suit, Rank, Card, PlayedCard, Team } from '../types/belote.ts';

const suits: Suit[] = ['Pique', 'Coeur', 'Carreau', 'Trefle'];
const ranks: Rank[] = ['7', '8', '9', '10', 'Valet', 'Dame', 'Roi', 'As'];

const CARD_POINTS_NORMAL: { [key in Rank]: number } = { '7': 0, '8': 0, '9': 0, '10': 10, 'Valet': 2, 'Dame': 3, 'Roi': 4, 'As': 11 };
const CARD_POINTS_TRUMP: { [key in Rank]: number } = { '7': 0, '8': 0, '9': 14, '10': 10, 'Valet': 20, 'Dame': 3, 'Roi': 4, 'As': 11 };

const NORMAL_ORDER: { [key in Rank]: number } = { '7': 0, '8': 1, '9': 2, 'Valet': 3, 'Dame': 4, 'Roi': 5, '10': 6, 'As': 7 };
const TRUMP_ORDER: { [key in Rank]: number } = { '7': 0, '8': 1, 'Dame': 2, 'Roi': 3, '10': 4, 'As': 5, '9': 6, 'Valet': 7 };

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffledDeck = [...deck];
  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
  }
  return shuffledDeck;
}

export function determineTrickWinner(trick: PlayedCard[], trumpSuit: Suit): PlayedCard {
  const leadingSuit = trick[0].card.suit;
  let winningCard = trick[0];

  for (let i = 1; i < trick.length; i++) {
    const currentCard = trick[i];
    const winningIsTrump = winningCard.card.suit === trumpSuit;
    const currentIsTrump = currentCard.card.suit === trumpSuit;

    if (winningIsTrump && !currentIsTrump) continue;
    if (!winningIsTrump && currentIsTrump) {
      winningCard = currentCard;
      continue;
    }

    if (currentIsTrump) {
      if (TRUMP_ORDER[currentCard.card.rank] > TRUMP_ORDER[winningCard.card.rank]) {
        winningCard = currentCard;
      }
    } else {
      if (currentCard.card.suit === leadingSuit && NORMAL_ORDER[currentCard.card.rank] > NORMAL_ORDER[winningCard.card.rank]) {
        winningCard = currentCard;
      }
    }
  }
  return winningCard;
}

// ### MODIFICATION PRINCIPALE ICI ###
export function calculateRoundScores(
    teams: Team[], 
    takerTeamName: string, 
    dixDeDerWinnerTeamName: string, 
    trumpSuit: Suit,
    isCapot: boolean
): { [teamName: string]: number } {
  
  const takerTeam = teams.find(t => t.name === takerTeamName)!;
  const defendingTeam = teams.find(t => t.name !== takerTeamName)!;
  
  let finalTakerScore = 0;
  let finalDefenderScore = 0;

  if (isCapot) {
      console.log(`Capot réussi par l'équipe ${takerTeamName}`);
      finalTakerScore = 252;
  } else {
    let takerCardPoints = 0;
    for (const card of takerTeam.collectedCards) {
      takerCardPoints += card.suit === trumpSuit ? CARD_POINTS_TRUMP[card.rank] : CARD_POINTS_NORMAL[card.rank];
    }
    let defenderCardPoints = 0;
    for (const card of defendingTeam.collectedCards) {
      defenderCardPoints += card.suit === trumpSuit ? CARD_POINTS_TRUMP[card.rank] : CARD_POINTS_NORMAL[card.rank];
    }
    
    if (takerTeam.name === dixDeDerWinnerTeamName) takerCardPoints += 10;
    else defenderCardPoints += 10;

    if (takerCardPoints >= 82 && takerCardPoints > defenderCardPoints) {
      console.log(`Contrat réussi: ${takerCardPoints} à ${defenderCardPoints}`);
      finalTakerScore = takerCardPoints;
      finalDefenderScore = defenderCardPoints;
    } else {
      console.log(`Contrat chuté: ${takerCardPoints} à ${defenderCardPoints}`);
      finalTakerScore = 0;
      finalDefenderScore = 162;
    }
  }

  // On ajoute les points de la belote après le calcul du contrat
  if (takerTeam.hasDeclaredBelote) finalTakerScore += 20;
  if (defendingTeam.hasDeclaredBelote) finalDefenderScore += 20;
  
  // On retourne un objet avec les scores de la manche
  return {
      [takerTeam.name]: finalTakerScore,
      [defendingTeam.name]: finalDefenderScore,
  };
}