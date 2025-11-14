import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Wifi, WifiOff, Copy, Check, Trophy, Users, Shuffle, Zap, Sparkles } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001';

function DogCard({ dog, isRevealed, onStatSelect, canSelect, selectedStat, isOpponent, winner, isShuffling, isClashing, position }) {
  const stats = [
    { key: 'Size', value: dog?.Size, emoji: '📏' },
    { key: 'Rarity', value: dog?.Rarity, emoji: '💎' },
    { key: 'Good Temper', value: dog?.['Good Temper'], emoji: '😊' },
    { key: 'Cuteness', value: dog?.Cuteness, emoji: '💕' },
    { key: 'Top Trumps Rating', value: dog?.['Top Trumps Rating'], emoji: '⭐' }
  ];

  const getClashAnimation = () => {
    if (!isClashing) return '';
    if (position === 'left') return 'animate-clash-left';
    if (position === 'right') return 'animate-clash-right';
    return '';
  };

  const getWinnerAnimation = () => {
    if (winner === 'win') return 'animate-winner-pulse';
    if (winner === 'lose') return 'animate-loser-fade';
    return '';
  };

  return (
    <div className={`relative w-72 h-[28rem] transition-all duration-500 ${
      isShuffling ? 'animate-card-shuffle' : ''
    } ${getClashAnimation()} ${getWinnerAnimation()}`}>
      <div className={`absolute inset-0 rounded-2xl shadow-2xl transition-all duration-300 ${
        winner === 'win' ? 'ring-8 ring-amber-400 shadow-amber-400/50 scale-105' : 
        winner === 'lose' ? 'ring-4 ring-slate-400 opacity-40 scale-95' : 
        'shadow-slate-900/30'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-700 via-amber-600 to-amber-800 rounded-2xl p-1.5">
          <div className="bg-gradient-to-b from-amber-50 to-white rounded-xl h-full flex flex-col overflow-hidden relative">
            
            {/* Sparkle effect for winner */}
            {winner === 'win' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                <Sparkles className="absolute top-4 right-4 text-yellow-400 animate-spin-slow" size={24} />
                <Sparkles className="absolute bottom-4 left-4 text-yellow-400 animate-spin-slow" size={20} />
                <Sparkles className="absolute top-1/2 left-1/2 text-yellow-400 animate-ping" size={16} />
              </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 text-white px-4 py-3 shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
              <h3 className="font-bold text-center text-xl truncate relative z-10">
                {dog?.Individual || '???'}
              </h3>
              <p className="text-xs text-center opacity-90 relative z-10">
                🌍 {dog?.Country || '???'}
              </p>
            </div>

            {/* Image Area */}
            <div className="relative h-44 bg-gradient-to-br from-sky-100 via-blue-50 to-emerald-50 flex items-center justify-center overflow-hidden border-b-4 border-amber-700">
              {isRevealed || !isOpponent ? (
                <div className="relative">
                  <div className="text-8xl animate-bounce-gentle">🐕</div>
                  {winner === 'win' && (
                    <div className="absolute -top-2 -right-2 text-3xl animate-bounce">🏆</div>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 flex items-center justify-center">
                  <div className="text-white text-6xl font-bold animate-pulse-slow">?</div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex-1 p-3 space-y-2 bg-gradient-to-b from-white to-amber-50/30">
              {stats.map((stat) => (
                <button
                  key={stat.key}
                  onClick={() => canSelect && onStatSelect(stat.key)}
                  disabled={!canSelect}
                  className={`w-full flex justify-between items-center px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                    selectedStat === stat.key
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-bold scale-105 shadow-xl shadow-yellow-400/50 ring-2 ring-yellow-500'
                      : canSelect
                      ? 'bg-white hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 hover:scale-102 cursor-pointer shadow-sm hover:shadow-md border-2 border-amber-200'
                      : 'bg-white/50 border-2 border-amber-100'
                  } ${!isRevealed && isOpponent && !selectedStat ? 'blur-sm' : ''}`}
                >
                  <span className="text-sm font-bold flex items-center gap-2">
                    <span className="text-lg">{stat.emoji}</span>
                    {stat.key}
                  </span>
                  <span className={`text-xl font-bold ${
                    selectedStat === stat.key ? 'text-black' : 'text-red-700'
                  } ${canSelect ? 'group-hover:scale-110 transition-transform' : ''}`}>
                    {stat.value || '?'}
                  </span>
                </button>
              ))}
            </div>
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
  const [isShuffling, setIsShuffling] = useState(false);
  const [showFightButton, setShowFightButton] = useState(false);
  const [isClashing, setIsClashing] = useState(false);
  const [readyToFight, setReadyToFight] = useState(false);

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
      setIsShuffling(true);
      
      // Shuffle animation
      setTimeout(() => {
        setMyDeck(data.myDeck);
        setOpponentDeckCount(data.opponentDeck.length);
        setMyCard(data.myDeck[0]);
        setOpponentCard(null);
        setOpponentName(data.opponentName);
        setIsMyTurn(data.isMyTurn);
        setScreen('game');
        
        setTimeout(() => {
          setIsShuffling(false);
        }, 500);
      }, 2000);
    });

    newSocket.on('cardRevealed', (data) => {
      console.log('Card revealed:', data);
      setOpponentCard(data.opponentCard);
      setSelectedStat(data.selectedStat);
      setCardsRevealed(true);
      setShowFightButton(false);
      
      // Clash animation
      setTimeout(() => {
        setIsClashing(true);
        setTimeout(() => {
          setIsClashing(false);
        }, 800);
      }, 100);
    });

    newSocket.on('roundResult', (data) => {
      console.log('Round result:', data);
      setTimeout(() => {
        setRoundResult(data.result);
        setMyDeck(Array(data.myDeckCount).fill(null));
        setOpponentDeckCount(data.opponentDeckCount);
      }, 1000);
    });

    newSocket.on('gameOver', (data) => {
      console.log('Game over:', data);
      setTimeout(() => {
        setGameOver(true);
        setWinner(data.winner ? 'You' : 'Opponent');
      }, 2000);
    });

    newSocket.on('nextRound', (data) => {
      console.log('Next round:', data);
      setMyCard(data.myCard);
      setOpponentCard(null);
      setIsMyTurn(data.isMyTurn);
      setSelectedStat(null);
      setCardsRevealed(false);
      setRoundResult(null);
      setShowFightButton(false);
      setReadyToFight(false);
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
    if (!isMyTurn || gameOver) return;
    setSelectedStat(stat);
    setShowFightButton(true);
  };

  const handleFight = () => {
    if (!selectedStat) return;
    setShowFightButton(false);
    setReadyToFight(true);
    socket.emit('selectStat', { stat: selectedStat });
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
    setIsShuffling(false);
    setShowFightButton(false);
    setIsClashing(false);
    setReadyToFight(false);
  };

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 text-6xl opacity-20 animate-float">🐕</div>
          <div className="absolute top-40 right-32 text-5xl opacity-20 animate-float-delayed">🐾</div>
          <div className="absolute bottom-32 left-1/4 text-7xl opacity-20 animate-float">🦴</div>
          <div className="absolute bottom-20 right-20 text-6xl opacity-20 animate-float-delayed">🎮</div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-10 max-w-md w-full relative z-10 border-4 border-amber-200">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce-gentle">🐕</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-3">
              Dog Top Trumps
            </h1>
            <p className="text-gray-600 text-lg font-semibold">Multiplayer Card Battle</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createRoom()}
              className="w-full px-5 py-4 border-3 border-amber-300 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-200 focus:outline-none text-lg transition-all"
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-4 mb-6">
            <button
              onClick={createRoom}
              disabled={!connected}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              <Users size={24} />
              Create Room
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500 font-semibold">OR</span>
              </div>
            </div>

            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              className="w-full px-5 py-4 border-3 border-amber-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-200 focus:outline-none text-center text-xl font-bold tracking-widest transition-all"
              placeholder="ROOM CODE"
              maxLength={6}
            />

            <button
              onClick={joinRoom}
              disabled={!connected}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
            >
              Join Room
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm">
            {connected ? (
              <>
                <Wifi size={18} className="text-green-500 animate-pulse" />
                <span className="text-green-600 font-bold">Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={18} className="text-red-500" />
                <span className="text-red-600 font-bold">Connecting...</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-10 max-w-md w-full border-4 border-amber-200">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-spin-slow">🎮</div>
            <h2 className="text-4xl font-bold text-gray-800 mb-6">Game Lobby</h2>
            
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-6 mb-6 border-3 border-blue-300 shadow-lg">
              <p className="text-sm text-gray-600 mb-2 font-semibold">Room Code</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-bold text-blue-600 tracking-widest">{currentRoom?.code}</span>
                <button
                  onClick={copyRoomCode}
                  className="p-3 hover:bg-white/50 rounded-xl transition-all hover:scale-110 active:scale-95"
                >
                  {copied ? <Check size={24} className="text-green-600" /> : <Copy size={24} className="text-gray-600" />}
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="font-bold text-gray-700 text-lg">Players</h3>
              {currentRoom?.players.map((player, idx) => (
                <div key={idx} className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 flex items-center justify-between border-2 border-blue-200 shadow-md animate-slide-in">
                  <span className="font-bold text-gray-800 text-lg">{player.name}</span>
                  <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-400"></div>
                </div>
              ))}
              {currentRoom?.players.length === 1 && (
                <div className="bg-gray-100 rounded-xl p-4 text-gray-400 text-center border-2 border-dashed border-gray-300 animate-pulse-slow">
                  Waiting for opponent...
                </div>
              )}
            </div>

            {currentRoom?.players.length === 2 && (
              <button
                onClick={startGame}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-5 rounded-xl font-bold text-xl hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl animate-pulse-slow hover:scale-105 active:scale-95"
              >
                <Shuffle size={28} />
                Start Game
              </button>
            )}

            <button
              onClick={resetGame}
              className="mt-6 text-gray-600 hover:text-gray-800 text-sm font-bold transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 p-6 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          <div className="absolute top-10 left-10 text-9xl animate-float">🐾</div>
          <div className="absolute top-1/4 right-20 text-8xl animate-float-delayed">🦴</div>
          <div className="absolute bottom-20 left-1/4 text-7xl animate-float">🎯</div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-8 border-4 border-amber-300">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg min-w-[100px]">
                  <div className="text-3xl font-bold">{myDeck.length}</div>
                  <div className="text-xs font-semibold opacity-90">Your Cards</div>
                </div>
                <div className="h-16 w-1 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></div>
                <div className="text-center bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-4 shadow-lg min-w-[100px]">
                  <div className="text-3xl font-bold">{opponentDeckCount}</div>
                  <div className="text-xs font-semibold opacity-90">{opponentName}'s Cards</div>
                </div>
              </div>
              
              {!gameOver && (
                <div className={`px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all ${
                  isMyTurn 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white animate-pulse-slow shadow-green-400' 
                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                }`}>
                  {isMyTurn ? '🟢 Your Turn' : '⏳ Opponent\'s Turn'}
                </div>
              )}

              <button
                onClick={resetGame}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:scale-105 active:scale-95"
              >
                Exit Game
              </button>
            </div>
          </div>

          {/* Shuffling Screen */}
          {isShuffling && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-9xl mb-6 animate-spin-shuffle">🃏</div>
                <h2 className="text-5xl font-bold text-white mb-4 animate-pulse">Shuffling Cards...</h2>
                <div className="flex justify-center gap-3">
                  <div className="w-4 h-4 bg-white rounded-full animate-bounce"></div>
                  <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}

          {/* Game Over */}
          {gameOver && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-md">
              <div className="bg-white rounded-3xl p-12 max-w-md text-center shadow-2xl border-4 border-amber-300 animate-scale-in">
                <Trophy size={100} className="mx-auto mb-6 text-yellow-500 animate-trophy-bounce" />
                <h2 className="text-5xl font-bold mb-4">
                  {winner === 'You' ? (
                    <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                      🎉 You Win!
                    </span>
                  ) : (
                    <span className="text-gray-700">😢 You Lose!</span>
                  )}
                </h2>
                <p className="text-gray-600 mb-8 text-lg">
                  {winner === 'You' 
                    ? 'Congratulations! You collected all the cards!' 
                    : 'Better luck next time!'}
                </p>
                <button
                  onClick={resetGame}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold text-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          )}

          {/* Round Result */}
          {roundResult && !gameOver && (
            <div className="text-center mb-8 animate-slide-down">
              <div className={`inline-block px-10 py-5 rounded-2xl font-bold text-3xl shadow-2xl ${
                roundResult === 'win' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white animate-winner-shake' :
                roundResult === 'lose' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                'bg-gradient-to-r from-yellow-500 to-amber-500 text-white'
              }`}>
                {roundResult === 'win' ? '🎉 You Win This Round!' :
                 roundResult === 'lose' ? '😔 You Lose This Round!' :
                 '🤝 It\'s a Draw!'}
              </div>
            </div>
          )}

          {/* Fight Button */}
          {showFightButton && !cardsRevealed && (
            <div className="text-center mb-8 animate-scale-in">
              <button
                onClick={handleFight}
                className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 text-white px-16 py-6 rounded-2xl font-bold text-3xl shadow-2xl hover:shadow-red-500/50 transition-all hover:scale-110 active:scale-95 animate-pulse-glow flex items-center gap-4 mx-auto"
              >
                <Zap size={40} className="animate-bounce" />
                FIGHT!
                <Zap size={40} className="animate-bounce" style={{animationDelay: '0.1s'}} />
              </button>
            </div>
          )}

          {/* Cards */}
          <div className="flex justify-center items-start gap-12 flex-wrap">
            {/* Your Card */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl px-8 py-4 mb-6 inline-block shadow-xl border-4 border-blue-300">
                <h3 className="text-white font-bold text-3xl drop-shadow-lg">
                  Your Card
                </h3>
              </div>
              {myCard && (
                <DogCard
                  dog={myCard}
                  isRevealed={true}
                  onStatSelect={selectStat}
                  canSelect={isMyTurn && !gameOver && !readyToFight}
                  selectedStat={selectedStat}
                  isOpponent={false}
                  winner={roundResult === 'win' ? 'win' : roundResult === 'lose' ? 'lose' : null}
                  isShuffling={isShuffling}
                  isClashing={isClashing}
                  position="left"
                />
              )}
            </div>

            {/* VS Badge */}
            <div className="flex items-center justify-center pt-24">
              <div className="relative">
                <div className="text-8xl font-black text-white drop-shadow-2xl animate-pulse-slow">VS</div>
                {isClashing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={60} className="text-yellow-400 animate-ping" />
                  </div>
                )}
              </div>
            </div>

            {/* Opponent Card */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl px-8 py-4 mb-6 inline-block shadow-xl border-4 border-red-300">
                <h3 className="text-white font-bold text-3xl drop-shadow-lg">
                  {opponentName}'s Card
                </h3>
              </div>
              <DogCard
                dog={opponentCard || {}}
                isRevealed={cardsRevealed}
                onStatSelect={() => {}}
                canSelect={false}
                selectedStat={selectedStat}
                isOpponent={true}
                winner={roundResult === 'lose' ? 'win' : roundResult === 'win' ? 'lose' : null}
                isShuffling={isShuffling}
                isClashing={isClashing}
                position="right"
              />
            </div>
          </div>

          {/* Instructions */}
          {isMyTurn && !gameOver && !readyToFight && (
            <div className="text-center mt-10 animate-bounce-gentle">
              <p className="text-white text-2xl font-bold bg-black/50 backdrop-blur-sm inline-block px-8 py-4 rounded-2xl shadow-xl border-2 border-white/40">
                👆 {selectedStat ? 'Click FIGHT or choose another stat!' : 'Select a stat from your card to challenge!'}
              </p>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes card-shuffle {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-20px) rotate(-5deg); }
            50% { transform: translateY(0) rotate(5deg); }
            75% { transform: translateY(-20px) rotate(-5deg); }
          }

          @keyframes clash-left {
            0% { transform: translateX(0); }
            50% { transform: translateX(30px) scale(1.05); }
            100% { transform: translateX(0); }
          }

          @keyframes clash-right {
            0% { transform: translateX(0); }
            50% { transform: translateX(-30px) scale(1.05); }
            100% { transform: translateX(0); }
          }

          @keyframes winner-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }

          @keyframes loser-fade {
            0% { opacity: 1; }
            100% { opacity: 0.3; }
          }

          @keyframes bounce-gentle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }

          @keyframes float-delayed {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-25px) rotate(-5deg); }
          }

          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }

          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes spin-shuffle {
            0% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.2); }
            100% { transform: rotate(360deg) scale(1); }
          }

          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes slide-down {
            from {
              opacity: 0;
              transform: translateY(-30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes scale-in {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes winner-shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }

          @keyframes trophy-bounce {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-20px) rotate(-10deg); }
            50% { transform: translateY(0) rotate(0deg); }
            75% { transform: translateY(-10px) rotate(10deg); }
          }

          @keyframes pulse-glow {
            0%, 100% { 
              box-shadow: 0 0 20px rgba(239, 68, 68, 0.5),
                          0 0 40px rgba(249, 115, 22, 0.3),
                          0 0 60px rgba(234, 179, 8, 0.2);
            }
            50% { 
              box-shadow: 0 0 30px rgba(239, 68, 68, 0.8),
                          0 0 60px rgba(249, 115, 22, 0.6),
                          0 0 90px rgba(234, 179, 8, 0.4);
            }
          }

          .animate-card-shuffle {
            animation: card-shuffle 2s ease-in-out;
          }

          .animate-clash-left {
            animation: clash-left 0.8s ease-in-out;
          }

          .animate-clash-right {
            animation: clash-right 0.8s ease-in-out;
          }

          .animate-winner-pulse {
            animation: winner-pulse 0.5s ease-in-out 3;
          }

          .animate-loser-fade {
            animation: loser-fade 0.5s ease-in-out forwards;
          }

          .animate-bounce-gentle {
            animation: bounce-gentle 2s ease-in-out infinite;
          }

          .animate-float {
            animation: float 6s ease-in-out infinite;
          }

          .animate-float-delayed {
            animation: float-delayed 7s ease-in-out infinite;
          }

          .animate-shimmer {
            animation: shimmer 2s ease-in-out infinite;
          }

          .animate-pulse-slow {
            animation: pulse-slow 3s ease-in-out infinite;
          }

          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }

          .animate-spin-shuffle {
            animation: spin-shuffle 2s ease-in-out;
          }

          .animate-slide-in {
            animation: slide-in 0.5s ease-out;
          }

          .animate-slide-down {
            animation: slide-down 0.5s ease-out;
          }

          .animate-scale-in {
            animation: scale-in 0.3s ease-out;
          }

          .animate-winner-shake {
            animation: winner-shake 0.5s ease-in-out;
          }

          .animate-trophy-bounce {
            animation: trophy-bounce 1s ease-in-out infinite;
          }

          .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return null;
}
