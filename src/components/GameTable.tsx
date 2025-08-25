// src/components/GameTable.tsx
import React from 'react';
import { type GameState, type Player, type Card } from '../types/belote';
import PlayerHand from './PlayerHand';
import CardImage from './CardImage';

interface GameTableProps {
  gameState: GameState;
  me: Player;
  onPlayCard: (card: Card) => void;
}

const GameTable: React.FC<GameTableProps> = ({ gameState, me, onPlayCard }) => {
  const { players, currentPlayerTurn } = gameState;

  const myIndex = players.findIndex(p => p.id === me.id);

  if (myIndex === -1) {
    return <div>Erreur : joueur actuel non trouvé dans la liste des joueurs.</div>;
  }

  // Organise les joueurs: 'moi' en bas, partenaire en haut, etc.
  const bottomPlayer = players[myIndex];
  const rightPlayer = players[(myIndex + 1) % 4];
  const topPlayer = players[(myIndex + 2) % 4];
  const leftPlayer = players[(myIndex + 3) % 4];

  const isMyTurn = currentPlayerTurn === me.id;

  const tableStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 200px',
    gridTemplateRows: '1fr 2fr 1fr',
    gridTemplateAreas: `
      ". top ."
      "left center right"
      ". bottom ."
    `,
    height: '100vh',
    width: '100vw',
    boxSizing: 'border-box',
    padding: '20px',
    backgroundColor: '#004d00', // Vert tapis de jeu
    color: 'white',
    position: 'relative', // Pour positionner d'autres éléments par-dessus si besoin
  };

  const centerStyle: React.CSSProperties = {
    gridArea: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50%', // Pour un look de table ronde
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  };

  const positionStyle = (area: string): React.CSSProperties => ({
    gridArea: area,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  });

  return (
    <div style={tableStyle}>
      <div style={positionStyle('top')}>
        <PlayerHand player={topPlayer} isMe={false} />
      </div>
      <div style={positionStyle('left')}>
        {/* Pour les joueurs sur le côté, on pourrait vouloir une vue verticale */}
        <PlayerHand player={leftPlayer} isMe={false} />
      </div>
      <div style={positionStyle('right')}>
        <PlayerHand player={rightPlayer} isMe={false} />
      </div>
      <div style={positionStyle('bottom')}>
        <PlayerHand
          player={bottomPlayer}
          isMe={true}
          onCardClick={onPlayCard}
          isMyTurn={isMyTurn}
        />
      </div>

      <div style={centerStyle}>
        {/* Le pli en cours */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', minHeight: '140px' }}>
          {gameState.currentTrick.map(({ playerId, card }, index) => {
            const player = gameState.players.find(p => p.id === playerId);
            return (
              <div key={index} style={{ textAlign: 'center' }}>
                <CardImage card={card} />
                <span style={{ fontSize: '0.8em', marginTop: '5px' }}>{player?.name}</span>
              </div>
            );
          })}
        </div>

        {/* La carte de prise */}
        {gameState.phase === 'bidding' && gameState.biddingCard && (
          <div style={{ textAlign: 'center', position: 'absolute' }}>
            <p>Preise</p>
            <CardImage card={gameState.biddingCard} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTable;
