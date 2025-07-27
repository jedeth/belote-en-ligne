// src/App.tsx

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Suit, Card } from './types/belote.ts';

const SERVER_URL = `http://${window.location.hostname}:3000`;
const socket: Socket = io(SERVER_URL);
const SUITS: Suit[] = ['Pique', 'Coeur', 'Carreau', 'Trefle'];

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    socket.on('gameStateUpdate', (newState: GameState) => {
      setGameState(newState);
    });
    return () => { socket.off('gameStateUpdate'); };
  }, []);

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) socket.emit('joinGame', playerName);
  };

  const handleBid = (choice: 'take' | 'pass' | Suit) => {
    socket.emit('playerBid', choice);
  };
  
  const handlePlayCard = (card: Card) => {
    if (gameState?.currentPlayerTurn === socket.id) {
      socket.emit('playCard', card);
    }
  };

  const handleNextHand = () => {
    socket.emit('nextHand');
  };

  const me = gameState?.players.find(p => p.id === socket.id);

  if (!me) {
    const isGameFull = (gameState?.players?.length ?? 0) === 4;
    return (
      <div>
        <h1>Rejoindre la partie de Belote</h1>
        <form onSubmit={handleJoinGame}>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Entrez votre nom"
            disabled={isGameFull}
          />
          <button type="submit" disabled={isGameFull}>Rejoindre</button>
          {isGameFull && <p>La partie est pleine.</p>}
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1>Partie de Belote - Phase: {gameState?.phase}</h1>
      <h2>Bonjour, {me.name} !</h2>

      {gameState?.teams.map(team => (
        <div key={team.name} style={{float: 'right', marginLeft: '20px', border: '1px solid grey', padding: '5px'}}>
          <strong>{team.name}</strong>: {team.score} points
        </div>
      ))}

      {gameState && (gameState.phase !== 'waiting' && gameState.phase !== 'end') && (
        <div style={{ margin: '20px 0', padding: '10px', border: '2px solid blue', clear: 'both' }}>
          <h3>Infos de la partie</h3>
          {gameState.phase === 'bidding' && <p>Carte retournée: {gameState.biddingCard?.rank} de {gameState.biddingCard?.suit}</p>}
          {gameState.phase === 'playing' && <p>Atout: <strong>{gameState.trumpSuit}</strong></p>}
          <p>Au tour de: <strong>{gameState.players.find(p => p.id === gameState.currentPlayerTurn)?.name}</strong></p>
        </div>
      )}

      {gameState?.phase === 'bidding' && (
        <div style={{ margin: '20px 0', padding: '10px', border: '2px solid red' }}>
          <h3>Phase de prise (1er Tour)</h3>
          {gameState.currentPlayerTurn === socket.id && (
            <div>
              <button onClick={() => handleBid('take')}>Prendre</button>
              <button onClick={() => handleBid('pass')}>Passer</button>
            </div>
          )}
        </div>
      )}

      {gameState?.phase === 'bidding_round_2' && (
        <div style={{ margin: '20px 0', padding: '10px', border: '2px solid orange' }}>
          <h3>Phase de prise (2ème Tour)</h3>
          {gameState.currentPlayerTurn === socket.id && (
            <div>
              <p>Choisissez une couleur :</p>
              {SUITS
                .filter(suit => suit !== gameState.biddingCard?.suit)
                .map(suit => (<button key={suit} onClick={() => handleBid(suit)}>{suit}</button>))}
              <button onClick={() => handleBid('pass')}>Passer</button>
            </div>
          )}
        </div>
      )}

      {gameState?.phase === 'playing' && (
         <div style={{ margin: '20px 0', padding: '10px', border: '2px solid green', minHeight: '120px' }}>
          <h3>Tapis de Jeu (Pli en cours)</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {gameState.currentTrick.map(({playerId, card}, index) => (
              <div key={index} style={{textAlign: 'center'}}>
                <div style={{ border: '1px solid black', padding: '10px', width: '80px' }}>
                  {card.rank} de {card.suit}
                </div>
                <span>{gameState.players.find(p => p.id === playerId)?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {gameState?.phase === 'end' && (
        <div style={{ margin: '20px 0', padding: '10px', border: '2px solid purple' }}>
          <h3>Fin de la manche</h3>
          {gameState.teams.map(team => (
            <div key={team.name}>
              <h4>{team.name} (Score Total: {team.score})</h4>
              <p>Cartes ramassées : {team.collectedCards.map(c => `${c.rank} ${c.suit}`).join(', ')}</p>
            </div>
          ))}
          {gameState.players[0].id === socket.id && (
            <button onClick={handleNextHand}>Manche suivante</button>
          )}
        </div>
      )}

      <h3>Votre main ({me.hand.length} cartes) :</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {me.hand.map((card, index) => {
          const isMyTurn = gameState?.currentPlayerTurn === socket.id;
          return (
            <div 
              key={index} 
              onClick={() => handlePlayCard(card)}
              style={{ 
                border: '1px solid black', 
                padding: '10px',
                cursor: isMyTurn ? 'pointer' : 'not-allowed',
                backgroundColor: isMyTurn ? '#90ee90' : 'white'
              }}
            >
              {card.rank} de {card.suit}
            </div>
          )
        })}
      </div>
    </div>
  );
}

export default App;