// src/App.tsx

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { type GameState, type Suit, type Card, WINNING_SCORE } from './types/belote.js';
import CardImage from './components/CardImage.tsx';
import GameTable from './components/GameTable.tsx';

const URL = import.meta.env.VITE_API_URL || `http://localhost:3000`;
const socket: Socket = io(URL);
const SUITS: Suit[] = ['Pique', 'Coeur', 'Carreau', 'Trefle'];

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerName, setPlayerName] = useState(localStorage.getItem('belotePlayerName') || '');

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connecté au serveur !');
      const storedName = localStorage.getItem('belotePlayerName');
      if (storedName) {
        socket.emit('joinGame', storedName);
      }
    });
    socket.on('gameStateUpdate', (newState: GameState) => {
      setGameState(newState);
    });
    return () => {
      socket.off('connect');
      socket.off('gameStateUpdate');
    };
  }, []);

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    const nameToJoin = playerName.trim();
    if (nameToJoin) {
      localStorage.setItem('belotePlayerName', nameToJoin);
      socket.emit('joinGame', nameToJoin);
    }
  };

  const handleBid = (choice: 'take' | 'pass' | Suit) => { socket.emit('playerBid', choice); };
  const handlePlayCard = (card: Card) => { if (gameState?.currentPlayerTurn === socket.id) { socket.emit('playCard', card); } };
  const handleNextHand = () => { socket.emit('nextHand'); };
  const handleNewGame = () => { socket.emit('newGame'); };
  const handleDeclareBelote = () => { socket.emit('declareBelote'); };

  const me = gameState?.players.find(p => p.id === socket.id);

  if (!me) {
    const isGameFull = (gameState?.players?.length ?? 0) === 4;
    const isNameTaken = gameState?.players.some(p => p.name === playerName.trim() && p.isConnected);
    const canReconnect = gameState?.players.some(p => p.name === playerName.trim() && !p.isConnected);
    return (
      <div style={{ padding: '20px' }}>
        <h1>Rejoindre la partie de Belote</h1>
        <form onSubmit={handleJoinGame}>
          <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Entrez votre nom" />
          <button type="submit" disabled={isNameTaken && !canReconnect}>
            {canReconnect ? 'Se Reconnecter' : 'Rejoindre'}
          </button>
          {isGameFull && !canReconnect && <p>La partie est pleine.</p>}
          {isNameTaken && !canReconnect && <p style={{color: 'red'}}>Ce nom est déjà pris par un joueur actif.</p>}
        </form>
      </div>
    );
  }

  const isMyTurn = gameState?.currentPlayerTurn === socket.id;
  const iHaveBelote = gameState?.beloteHolderId === socket.id;
  const myTeam = gameState?.teams.find(t => t.players.some(p => p.id === socket.id));
  
  let isBeloteDeclarationAllowed = false;
  if (iHaveBelote && gameState && gameState.phase === 'playing' && myTeam) {
    const beloteCardPlayedByMeThisTrick = gameState.currentTrick.find(playedCard => 
      playedCard.playerId === socket.id &&
      (playedCard.card.rank === 'Roi' || playedCard.card.rank === 'Dame') &&
      playedCard.card.suit === gameState.trumpSuit
    );
    if (beloteCardPlayedByMeThisTrick) {
      isBeloteDeclarationAllowed = true;
    }
  }

  const isGamePhase = gameState && me && ['bidding', 'bidding_round_2', 'playing'].includes(gameState.phase);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#004d00' }}>
      {isGamePhase && gameState && me ? (
        <GameTable gameState={gameState} me={me} onPlayCard={handlePlayCard} />
      ) : (
        // Fallback for non-game phases or if gameState/me is null
        <div style={{ padding: '20px', color: 'white' }}>
          <h1>Partie de Belote - Phase: {gameState?.phase}</h1>
          {me && <h2>Bonjour, {me.name} !</h2>}

          {gameState?.phase === 'end' && (
            <div style={{ margin: '20px 0', padding: '10px', border: '2px solid purple', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <h3>Fin de la manche</h3>
              {gameState.teams.map(team => (
                <div key={team.name}>
                  <h4>
                    {team.name} (Score Total: {team.score})
                    {team.name === gameState.takerTeamName && (
                      <>
                        {gameState.contractResult === 'succeeded' && <span style={{color: 'lightgreen', marginLeft: '10px'}}> (Contrat réussi)</span>}
                        {gameState.contractResult === 'failed' && <span style={{color: 'lightcoral', marginLeft: '10px'}}> (Contrat chuté)</span>}
                      </>
                    )}
                  </h4>
                  <p>Points de la manche: {gameState.roundPoints?.[team.name] ?? 0}</p>
                </div>
              ))}
              {gameState.players[0].id === socket.id && (
                <button onClick={handleNextHand}>Manche suivante</button>
              )}
            </div>
          )}

          {gameState?.phase === 'game_over' && (
            <div style={{ margin: '20px 0', padding: '10px', border: '2px solid black', backgroundColor: 'gold', color: 'black' }}>
              <h2>Partie Terminée !</h2>
              <h3>Vainqueur : {gameState.teams.find(t => t.score >= WINNING_SCORE)?.name}</h3>
              {gameState.teams.map(team => (
                <div key={team.name}>
                  <h4>{team.name} - Score Final : {team.score}</h4>
                </div>
              ))}
              {gameState.players[0].id === socket.id && (
                <button onClick={handleNewGame} style={{marginTop: '15px'}}>Nouvelle Partie</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Overlay UI Elements */}
      {isGamePhase && gameState && me && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>

          {/* Info Box (Top Left) */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: '10px', color: 'white', pointerEvents: 'auto' }}>
            <h3>Phase: {gameState.phase}</h3>
            <p>Au tour de: <strong>{gameState.players.find(p => p.id === gameState.currentPlayerTurn)?.name}</strong></p>
            {gameState.phase === 'playing' && <p>Atout: <strong>{gameState.trumpSuit}</strong> | Preneur: <strong>{gameState.takerTeamName}</strong></p>}
          </div>

          {/* Scores (Top Right) */}
          <div style={{ position: 'absolute', top: '20px', right: '20px', pointerEvents: 'auto' }}>
            {gameState.teams.map(team => (
              <div key={team.name} style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '8px', marginBottom: '10px', color: 'white', minWidth: '200px', textAlign: 'center' }}>
                <strong>{team.name}</strong><br/>{team.score} points
                <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', fontStyle: 'italic' }}>
                  {team.players.map(p => p.name).join(' & ')}
                </p>
                {team.beloteState === 'belote' && <p style={{color: 'gold', margin: '5px 0 0 0', fontWeight: 'bold'}}>Belote !</p>}
                {team.beloteState === 'rebelote' && <p style={{color: 'green', margin: '5px 0 0 0', fontWeight: 'bold'}}>Belote et Rebelote !</p>}
              </div>
            ))}
          </div>

          {/* Action Buttons (Centered, above player hand) */}
          <div style={{ position: 'absolute', bottom: '220px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', pointerEvents: 'auto' }}>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '10px' }}>
              {gameState.phase === 'bidding' && isMyTurn && ( <div><button onClick={() => handleBid('take')}>Prendre</button><button onClick={() => handleBid('pass')}>Passer</button></div> )}
              {gameState.phase === 'bidding_round_2' && isMyTurn && ( <div><p style={{color: 'white', textAlign: 'center', marginBottom: '5px'}}>Choisissez une couleur :</p>{SUITS.filter(suit => suit !== gameState.biddingCard?.suit).map(suit => (<button key={suit} onClick={() => handleBid(suit)}>{suit}</button>))}<button onClick={() => handleBid('pass')}>Passer</button></div> )}

              {iHaveBelote && gameState.phase === 'playing' && myTeam?.beloteState !== 'rebelote' && !myTeam?.beloteAnnounceMissed && (
                <div>
                  <button
                    onClick={handleDeclareBelote}
                    disabled={!isBeloteDeclarationAllowed}
                    style={{ backgroundColor: isBeloteDeclarationAllowed ? (myTeam?.beloteState === 'none' ? 'gold' : 'orange') : 'lightgrey' }}
                  >
                    {myTeam?.beloteState === 'none' ? 'Annoncer BELOTE' : 'Annoncer REBELOTE'}
                  </button>
                  {!isBeloteDeclarationAllowed && <small style={{marginLeft: '10px', color: 'white', display: 'block', width: '250px', textAlign: 'center', marginTop: '5px'}}>Annonce possible quand vous jouez le Roi ou la Dame d'atout.</small>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;