// src/components/PlayerHand.tsx
import React from 'react';
import { type Player, type Card } from '../types/belote';
import CardImage from './CardImage';

interface PlayerHandProps {
  player: Player;
  isMe: boolean;
  onCardClick?: (card: Card) => void;
  isMyTurn?: boolean;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ player, isMe, onCardClick, isMyTurn }) => {
  const cardStyle = isMe ? {
    cursor: isMyTurn ? 'pointer' : 'not-allowed',
    outline: isMyTurn ? '3px solid lightgreen' : 'none',
    transform: isMyTurn ? 'translateY(-10px)' : 'none',
    transition: 'all 0.2s ease-in-out',
  } : {};

  return (
    <div style={{ textAlign: 'center', margin: '10px' }}>
      <h4>{player.name}</h4>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap', minHeight: '120px' }}>
        {isMe
          ? player.hand.map((card, index) => (
              <CardImage
                key={index}
                card={card}
                onClick={() => onCardClick && onCardClick(card)}
                style={cardStyle}
              />
            ))
          : Array.from({ length: player.hand.length }).map((_, index) => (
              <CardImage key={index} hidden />
            ))}
      </div>
    </div>
  );
};

export default PlayerHand;
