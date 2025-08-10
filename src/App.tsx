// src/App.tsx

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { type GameState, type Suit, type Card, WINNING_SCORE } from './types/belote.ts';
import CardImage from './components/CardImage.tsx';

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

  const handleNewGame = () => {
    socket.emit('newGame');
  };
  
  const handleDeclareBelote = () => {
    socket.emit('declareBelote');
  };

  const me = gameState?.players.find(p => p.id === socket.id);

  // Si on n'est pas encore dans la partie, ou si on est marqué comme déconnecté
  if (!me) {
    const isGameFull = (gameState?.players?.length ?? 0) === 4;
    const isNameTaken = gameState?.players.some(p => p.name === playerName.trim() && p.isConnected);
    const canReconnect = gameState?.players.some(p => p.name === playerName.trim() && !p.isConnected);

    return (
      <div style={{ padding: '20px' }}>
        <h1>Rejoindre la partie de Belote</h1>
        <form onSubmit={handleJoinGame}>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Entrez votre nom"
          />
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
  const hasMyTeamDeclaredBelote = myTeam?.hasDeclaredBelote || false;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Partie de Belote - Phase: {gameState?.phase}</h1>
      <h2>Bonjour, {me.name} !</h2>

      {gameState?.teams.map(team => (
        <div key={team.name} style={{float: 'right', marginLeft: '20px', border: '1px solid grey', padding: '10px', minWidth: '150px', textAlign: 'center'}}>
          <strong>{team.name}</strong><br/>{team.score} points
          
          {/* LIGNES AJOUTÉES CI-DESSOUS */}
          <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', fontStyle: 'italic' }}>
            {team.players.map(p => p.name).join(' & ')}
          </p>

          {team.hasDeclaredBelote && <p style={{color: 'green', margin: '5px 0 0 0', fontWeight: 'bold'}}>Belote !</p>}
        </div>
      ))}

      <div style={{ margin: '20px 0', clear: 'both' }}>
          <h3>Joueurs :</h3>
          {gameState?.players.map(p => (
              <span key={p.name} style={{ marginRight: '15px', fontWeight: p.id === gameState.currentPlayerTurn ? 'bold' : 'normal', color: p.isConnected ? 'black' : 'grey' }}>
                  {p.name} {p.isConnected ? '✔️' : '❌'}
              </span>
          ))}
      </div>

      {gameState && (gameState.phase !== 'waiting' && gameState.phase !== 'end' && gameState.phase !== 'game_over') && (
        <div style={{ margin: '20px 0', padding: '10px', border: '2px solid blue' }}>
          <h3>Infos de la partie</h3>
          {gameState.phase === 'bidding' && gameState.biddingCard && (
            <div style={{ textAlign: 'center' }}>
              <p>Carte retournée :</p>
              <CardImage card={gameState.biddingCard} />
            </div>
          )}
          {gameState.phase === 'playing' && <p>Atout: <strong>{gameState.trumpSuit}</strong> | Preneur: <strong>{gameState.takerTeamName}</strong></p>}
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
         <div style={{ margin: '20px 0', padding: '10px', border: '2px solid green', minHeight: '150px' }}>
          <h3>Tapis de Jeu (Pli en cours)</h3>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'flex-start' }}>
            {gameState.currentTrick.map(({playerId, card}, index) => {
              const player = gameState.players.find(p => p.id === playerId);
              return (
              <div key={index} style={{textAlign: 'center'}}>
                <CardImage card={card} />
                <span>{player?.name} {!player?.isConnected && '(déconnecté)'}</span>
              </div>
            )})}
          </div>
        </div>
      )}

      {gameState?.phase === 'end' && (
        <div style={{ margin: '20px 0', padding: '10px', border: '2px solid purple' }}>
          <h3>Fin de la manche</h3>
          {gameState.teams.map(team => (
            <div key={team.name}>
              <h4>
                {team.name} (Score Total: {team.score})
                
                
                {team.name === gameState.takerTeamName && (
                  <>
                    {gameState.contractResult === 'succeeded' && <span style={{color: 'green', marginLeft: '10px'}}> (Contrat réussi)</span>}
                    {gameState.contractResult === 'failed' && <span style={{color: 'red', marginLeft: '10px'}}> (Contrat chuté)</span>}
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
        <div style={{ margin: '20px 0', padding: '10px', border: '2px solid black', backgroundColor: 'gold' }}>
          <h2>Partie Terminée !</h2>
          <h3>Vainqueur : {gameState.teams.find(t => t.score >= WINNING_SCORE)?.name}</h3>
          {gameState.teams.map(team => (
            <div key={team.name}>
              <h4>{team.name} - Score Final : {team.score}</h4>
            </div>
          ))}
          {gameState.players[0].id === socket.id && (
            <button onClick={handleNewGame}>Nouvelle Partie</button>
          )}
        </div>
      )}
      
      {me.hand.length > 0 && <h3>Votre main ({me.hand.length} cartes) :</h3>}

      {iHaveBelote && !hasMyTeamDeclaredBelote && gameState?.phase === 'playing' && (
        <div style={{ margin: '10px 0' }}>
          <button onClick={handleDeclareBelote} style={{backgroundColor: 'gold', padding: '10px', border: '2px solid black', cursor: 'pointer'}}>Annoncer BELOTE</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {me.hand.map((card, index) => {
          return (
            <CardImage 
              key={index} 
              card={card}
              onClick={() => handlePlayCard(card)}
              style={{ 
                cursor: isMyTurn ? 'pointer' : 'not-allowed',
                outline: isMyTurn ? '3px solid lightgreen' : 'none',
                transform: isMyTurn ? 'translateY(-10px)' : 'none',
                transition: 'all 0.2s ease-in-out',
              }}
            />
          )
        })}
      </div>
    </div>
  );
}

export default App;
