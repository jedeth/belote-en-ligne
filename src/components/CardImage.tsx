// src/components/CardImage.tsx
import React from 'react';
import { type Card } from '../types/belote.ts';
import { cardImageMap } from '../assets/cards/index.ts';

interface CardImageProps {
  card: Card;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const CardImage: React.FC<CardImageProps> = ({ card, onClick, style }) => {
  // Create the key for the map, e.g., "Valet_Pique"
  const cardKey = `${card.rank}_${card.suit}`;
  const imageSrc = cardImageMap[cardKey];

  const baseStyle: React.CSSProperties = {
    width: '80px',
    height: '115px',
    borderRadius: '5px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    cursor: onClick ? 'pointer' : 'default',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    ...style,
  };

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={`${card.rank} de ${card.suit}`}
        onClick={onClick}
        style={baseStyle}
      />
    );
  }

  // Fallback for missing images
  return (
    <div
      onClick={onClick}
      style={{
        ...baseStyle,
        border: '1px solid black',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 'bold',
      }}
    >
      {card.rank}
      <br />
      de
      <br />
      {card.suit}
    </div>
  );
};

export default CardImage;
