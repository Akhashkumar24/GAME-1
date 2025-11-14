import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Wifi, WifiOff, Copy, Check, Trophy, Users, Shuffle } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001';

function DogCard({ dog, isRevealed, onStatSelect, canSelect, selectedStat, isOpponent, winner }) {
  const stats = [
    { key: 'Size', value: dog?.Size },
    { key: 'Rarity', value: dog?.Rarity },
    { key: 'Good Temper', value: dog?.['Good Temper'] },
    { key: 'Cuteness', value: dog?.Cuteness },
    { key: 'Top Trumps Rating', value: dog?.['Top Trumps Rating'] }
  ];

  const imageName = dog?.Individual?.toLowerCase().replace(/ /g, '-');

  return (
    <div className={`relative w-64 h-96 rounded-xl shadow-2xl transition-all duration-300 ${
      winner === 'win' ? 'ring-4 ring-green-400 scale-105' : 
      winner === 'lose' ? 'ring-4 ring-red-400 opacity-50' : ''
    }`}>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-600 to-amber-800 rounded-xl p-1">
        <div className="bg-white rounded-lg h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2">
            <h3 className="font-bold text-center text-lg truncate">{dog?.Individual || '???'}</h3>
            <p className="text-xs text-center opacity-90">{dog?.Country || '???'}</p>
          </div>

          {/* Image */}
          <div className="relative h-40 bg-gradient-to-b from-sky-100 to-green-100 flex items-center justify-center overflow-hidden">
            {isRevealed || !isOpponent ? (
              <div className="text-6xl">🐕</div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                <div className="text-white text-4xl font-bold">?</div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 p-2 space-y-1">
            {stats.map((stat) => (
              <button
                key={stat.key}
                onClick={() => canSelect && onStatSelect(stat.key)}
                disabled={!canSelect}
                className={`w-full flex justify-between items-center px-3 py-1.5 rounded transition-all ${
                  selectedStat === stat.key
                    ? 'bg-yellow-400 text-black font-bold scale-105 shadow-lg'
                    : canSelect
                    ? 'bg-gray-100 hover:bg-yellow-100 hover:scale-102 cursor-pointer'
                    : 'bg-gray-50'
                } ${!isRevealed && isOpponent && !selectedStat ? 'blur-sm' : ''}`}
              >
                <span className="text-sm font-semibold">{stat.key}</span>
                <span className="text-lg font-bold text-red-700">{stat.value || '?'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopTrumpsGame() {
  const [screen, setScreen] = useState('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [socket, setSocket] = useState(null);
  
  // Game state
  const [myDeck, setMyDeck] = useState([]);
  const [opponentDeckCount, setOpponentDeckCount] = useState(0);
  const [myCard, setMyCard] = useState(null);
  const [opponentCard, setOpponentCard] = useState(null);
  const [opponentName, setOpponentName] = useState('Opponent');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [selectedStat, setSelectedStat] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [cardsRevealed, setCardsRevealed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('roomCreated', (data) => {
      console.log('Room created:', data);
      setCurrentRoom(data);
      setScreen('lobby');
    });

    newSocket.on('roomJoined', (data) => {
      console.log('Room joined:', data);
      setCurrentRoom(data);
      setScreen('lobby');
    });

    newSocket.on('playerJoined', (data) => {
      console.log('Player joined:', data);
      setCurrentRoom(data);
    });

    newSocket.on('gameStarted', (data) => {
      console.log('Game started:', data);
      setMyDeck(data.myDeck);
      setOpponentDeckCount(data.opponentDeck.length);
      setMyCard(data.myDeck[0]);
      setOpponentCard(null);
      setOpponentName(data.opponentName);
      setIsMyTurn(data.isMyTurn);
      setScreen('game');
    });

    newSocket.on('cardRevealed', (data) => {
      console.log('Card revealed:', data);
      setOpponentCard(data.opponentCard);
      setSelectedStat(data.selectedStat);
      setCardsRevealed(true);
    });

    newSocket.on('roundResult', (data) => {
      console.log('Round result:', data);
      setRoundResult(data.result);
      setMyDeck(Array(data.myDeckCount).fill(null));
      setOpponentDeckCount(data.opponentDeckCount);
    });

    newSocket.on('gameOver', (data) => {
      console.log('Game over:', data);
      setGameOver(true);
      setWinner(data.winner ? 'You' : 'Opponent');
    });

    newSocket.on('nextRound', (data) => {
      console.log('Next round:', data);
      setMyCard(data.myCard);
      setOpponentCard(null);
      setIsMyTurn(data.isMyTurn);
      setSelectedStat(null);
      setCardsRevealed(false);
      setRoundResult(null);
    });

    newSocket.on('playerLeft', () => {
      alert('Opponent left the game');
      resetGame();
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      alert(error.message);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const createRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    socket.emit('createRoom', { playerName: playerName.trim() });
  };

  const joinRoom = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      alert('Please enter room code');
      return;
    }
    socket.emit('joinRoom', { playerName: playerName.trim(), roomCode: roomCode.toUpperCase() });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(currentRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = () => {
    socket.emit('startGame');
  };

  const selectStat = (stat) => {
    if (!isMyTurn || selectedStat) return;
    socket.emit('selectStat', { stat });
  };

  const resetGame = () => {
    setScreen('menu');
    setMyDeck([]);
    setOpponentDeckCount(0);
    setMyCard(null);
    setOpponentCard(null);
    setIsMyTurn(false);
    setSelectedStat(null);
    setRoundResult(null);
    setCardsRevealed(false);
    setGameOver(false);
    setWinner(null);
    setCurrentRoom(null);
    setRoomCode('');
  };

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🐕</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Dog Top Trumps</h1>
            <p className="text-gray-600">Multiplayer Card Battle</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createRoom()}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={createRoom}
              disabled={!connected}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Users size={24} />
              Create Room
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none text-center text-lg font-bold tracking-wider"
              placeholder="ROOM CODE"
              maxLength={6}
            />

            <button
              onClick={joinRoom}
              disabled={!connected}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-lg font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
            >
              Join Room
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm">
            {connected ? (
              <>
                <Wifi size={16} className="text-green-500" />
                <span className="text-green-600 font-semibold">Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-red-500" />
                <span className="text-red-600 font-semibold">Connecting...</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Game Lobby</h2>
            
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Room Code</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold text-blue-600 tracking-widest">{currentRoom?.code}</span>
                <button
                  onClick={copyRoomCode}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} className="text-gray-600" />}
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="font-semibold text-gray-700">Players</h3>
              {currentRoom?.players.map((player, idx) => (
                <div key={idx} className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{player.name}</span>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              ))}
              {currentRoom?.players.length === 1 && (
                <div className="bg-gray-50 rounded-lg p-3 text-gray-400 text-center">
                  Waiting for opponent...
                </div>
              )}
            </div>

            {currentRoom?.players.length === 2 && (
              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-lg font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2"
              >
                <Shuffle size={24} />
                Start Game
              </button>
            )}

            <button
              onClick={resetGame}
              className="mt-4 text-gray-600 hover:text-gray-800 text-sm font-semibold"
            >
              Leave Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'game') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{myDeck.length}</div>
                  <div className="text-xs text-gray-600">Your Cards</div>
                </div>
                <div className="h-12 w-px bg-gray-300"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{opponentDeckCount}</div>
                  <div className="text-xs text-gray-600">{opponentName}'s Cards</div>
                </div>
              </div>
              
              {!gameOver && (
                <div className={`px-6 py-2 rounded-full font-bold ${
                  isMyTurn ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {isMyTurn ? '🟢 Your Turn' : '⏳ Opponent\'s Turn'}
                </div>
              )}

              <button
                onClick={resetGame}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Exit Game
              </button>
            </div>
          </div>

          {/* Game Over */}
          {gameOver && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md text-center">
                <Trophy size={80} className="mx-auto mb-4 text-yellow-500" />
                <h2 className="text-4xl font-bold mb-4">
                  {winner === 'You' ? '🎉 You Win!' : '😢 You Lose!'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {winner === 'You' 
                    ? 'Congratulations! You collected all the cards!' 
                    : 'Better luck next time!'}
                </p>
                <button
                  onClick={resetGame}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          )}

          {/* Round Result */}
          {roundResult && !gameOver && (
            <div className="text-center mb-6">
              <div className={`inline-block px-8 py-4 rounded-xl font-bold text-2xl ${
                roundResult === 'win' ? 'bg-green-500 text-white' :
                roundResult === 'lose' ? 'bg-red-500 text-white' :
                'bg-yellow-500 text-white'
              }`}>
                {roundResult === 'win' ? '🎉 You Win This Round!' :
                 roundResult === 'lose' ? '😔 You Lose This Round!' :
                 '🤝 Draw!'}
              </div>
            </div>
          )}

          {/* Cards */}
          <div className="flex justify-center items-start gap-8">
            {/* Your Card */}
            <div className="text-center">
              <h3 className="text-white font-bold text-xl mb-4">Your Card</h3>
              {myCard && (
                <DogCard
                  dog={myCard}
                  isRevealed={true}
                  onStatSelect={selectStat}
                  canSelect={isMyTurn && !selectedStat && !gameOver}
                  selectedStat={selectedStat}
                  isOpponent={false}
                  winner={roundResult === 'win' ? 'win' : roundResult === 'lose' ? 'lose' : null}
                />
              )}
            </div>

            {/* VS */}
            <div className="flex items-center justify-center pt-16">
              <div className="text-6xl font-bold text-white opacity-50">VS</div>
            </div>

            {/* Opponent Card */}
            <div className="text-center">
              <h3 className="text-white font-bold text-xl mb-4">{opponentName}'s Card</h3>
              <DogCard
                dog={opponentCard || {}}
                isRevealed={cardsRevealed}
                onStatSelect={() => {}}
                canSelect={false}
                selectedStat={selectedStat}
                isOpponent={true}
                winner={roundResult === 'lose' ? 'win' : roundResult === 'win' ? 'lose' : null}
              />
            </div>
          </div>

          {/* Instructions */}
          {isMyTurn && !selectedStat && !gameOver && (
            <div className="text-center mt-8">
              <p className="text-white text-lg font-semibold bg-black bg-opacity-30 inline-block px-6 py-3 rounded-lg">
                👆 Select a stat from your card to challenge your opponent!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}