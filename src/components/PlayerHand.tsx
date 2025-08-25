// src/components/PlayerHand.tsx
import React from 'react';
import { type Player, type Card } from '../types/belote';
import CardImage from './CardImage';
import PlayerVideo from './PlayerVideo'; // Import PlayerVideo

interface PlayerHandProps {
  player: Player;
  isMe: boolean;
  stream?: MediaStream | null; // Add stream prop
  onCardClick?: (card: Card) => void;
  isMyTurn?: boolean;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ player, isMe, stream, onCardClick, isMyTurn }) => {
  const cardStyle = isMe ? {
    cursor: isMyTurn ? 'pointer' : 'not-allowed',
    outline: isMyTurn ? '3px solid lightgreen' : 'none',
    transform: isMyTurn ? 'translateY(-10px)' : 'none',
    transition: 'all 0.2s ease-in-out',
  } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      {stream ? (
        <PlayerVideo stream={stream} isMuted={isMe} />
      ) : (
        // Placeholder for video
        <div style={{ width: '160px', height: '120px', backgroundColor: '#2c2c2c', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', border: '2px solid rgba(255, 255, 255, 0.2)'}}>
          <span>Caméra inactive</span>
        </div>
      )}
      <h4>{player.name}</h4>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap', minHeight: '120px', alignItems: 'center' }}>
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
