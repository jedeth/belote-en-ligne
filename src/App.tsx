// src/App.tsx

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Suit } from './types/belote';

const socket: Socket = io('http://localhost:3000');
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
  
  const me = gameState?.players.find(p => p.id === socket.id);
  
  // Si on n'a pas encore rejoint la partie
  if (!me) {
    // ### CORRECTION ICI ###
    // On vérifie que gameState et gameState.players existent avant de lire leur longueur
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

  // --- Rendu du composant principal (inchangé) ---
  return (
    <div>
      <h1>Partie de Belote - Phase: {gameState?.phase}</h1>
      <h2>Bonjour, {me.name} !</h2>

      {gameState?.phase === 'bidding' && (
        <div style={{ margin: '20px', padding: '10px', border: '2px solid red' }}>
          <h3>Phase de prise (1er Tour)</h3>
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

      {gameState?.phase === 'bidding_round_2' && (
        <div style={{ margin: '20px', padding: '10px', border: '2px solid orange' }}>
          <h3>Phase de prise (2ème Tour)</h3>
          <p>Au tour de: {gameState.players.find(p => p.id === gameState.currentPlayerTurn)?.name}</p>
          
          {gameState.currentPlayerTurn === socket.id && (
            <div>
              <p>Choisissez une couleur :</p>
              {SUITS
                // On ajoute ce filtre pour exclure la couleur du 1er tour
                .filter(suit => suit !== gameState.biddingCard?.suit)
                .map(suit => (
                  <button key={suit} onClick={() => handleBid(suit)}>
                    {suit}
                  </button>
                ))}
              <button onClick={() => handleBid('pass')}>Passer</button>
            </div>
          )}
        </div>
      )}

      {gameState?.phase === 'playing' && (
         <div style={{ margin: '20px', padding: '10px', border: '2px solid green' }}>
          <h3>Phase de Jeu</h3>
          <p>Atout: <strong>{gameState.trumpSuit}</strong></p>
          <p>C'est à <strong>{gameState.players.find(p => p.id === gameState.currentPlayerTurn)?.name}</strong> de jouer.</p>
        </div>
      )}

      <h3>Votre main ({me.hand.length} cartes) :</h3>
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