// src/components/GameTable.tsx
import React from 'react';
import { type GameState, type Player, type Card } from '../types/belote';
import PlayerHand from './PlayerHand';
import CardImage from './CardImage';

interface GameTableProps {
  gameState: GameState;
  me: Player;
  onPlayCard: (card: Card) => void;
  localStream: MediaStream | null;
  remoteStreams: { [peerId: string]: MediaStream };
}

const GameTable: React.FC<GameTableProps> = ({ gameState, me, onPlayCard, localStream, remoteStreams }) => {
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
    gridTemplateColumns: '250px 1fr 250px', // Increased space for side players
    gridTemplateRows: 'auto 1fr auto', // Flexible rows
    gridGap: '20px',
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
    position: 'relative',
  };

  const centerStyle: React.CSSProperties = {
    gridArea: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  };

  const positionStyle = (area: string): React.CSSProperties => ({
    gridArea: area,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  });

  return (
    <div style={tableStyle}>
      <div style={positionStyle('top')}>
        <PlayerHand player={topPlayer} isMe={false} stream={remoteStreams[topPlayer.id]} />
      </div>
      <div style={positionStyle('left')}>
        <PlayerHand player={leftPlayer} isMe={false} stream={remoteStreams[leftPlayer.id]} />
      </div>
      <div style={positionStyle('right')}>
        <PlayerHand player={rightPlayer} isMe={false} stream={remoteStreams[rightPlayer.id]} />
      </div>
      <div style={positionStyle('bottom')}>
        <PlayerHand
          player={bottomPlayer}
          isMe={true}
          stream={localStream}
          onCardClick={onPlayCard}
          isMyTurn={isMyTurn}
        />
      </div>

      <div style={centerStyle}>
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
