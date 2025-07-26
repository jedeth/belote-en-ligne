// src/App.tsx

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Player } from './types/belote';

const socket: Socket = io('http://localhost:3000');

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    // Le serveur nous envoie l'état complet du jeu
    socket.on('gameStateUpdate', (newState: GameState) => {
      setGameState(newState);
    });

    return () => {
      socket.off('gameStateUpdate');
    };
  }, []);

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      socket.emit('joinGame', playerName);
    }
  };

  const handleBid = (choice: 'take' | 'pass') => {
    socket.emit('playerBid', choice);
  };
  
  // Trouve les infos du joueur actuel à partir du gameState
  const me = gameState?.players.find(p => p.id === socket.id);
  
  // Si on n'a pas encore rejoint la partie
  if (!me) {
    return (
      <div>
        <h1>Rejoindre la partie de Belote</h1>
        <form onSubmit={handleJoinGame}>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Entrez votre nom"
            disabled={gameState?.players.length === 4}
          />
          <button type="submit" disabled={gameState?.players.length === 4}>Rejoindre</button>
          {gameState?.players.length === 4 && <p>La partie est pleine.</p>}
        </form>
      </div>
    );
  }

  // Affiche l'état du jeu
  return (
    <div>
      <h1>Partie de Belote - Phase: {gameState?.phase}</h1>
      <h2>Bonjour, {me.name} !</h2>

      {gameState?.phase === 'bidding' && (
        <div style={{ margin: '20px', padding: '10px', border: '2px solid red' }}>
          <h3>Phase de prise</h3>
          <p>Carte retournée: {gameState.biddingCard?.rank} de {gameState.biddingCard?.suit}</p>
          <p>Au tour de: {gameState.players.find(p => p.id === gameState.currentPlayerTurn)?.name}</p>
          
          {gameState.currentPlayerTurn === socket.id && (
            <div>
              <button onClick={() => handleBid('take')}>Prendre</button>
              <button onClick={() => handleBid('pass')}>Passer</button>
            </div>
          )}
        </div>
      )}

      <h3>Votre main :</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {me.hand.map((card, index) => (
          <div key={index} style={{ border: '1px solid black', padding: '10px' }}>
            {card.rank} de {card.suit}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;