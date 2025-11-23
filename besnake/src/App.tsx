import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

const GRID_SIZE = 20
const CELL_SIZE = 20
const INITIAL_SNAKE_1 = [{ x: 5, y: 10 }]
const INITIAL_SNAKE_2 = [{ x: 15, y: 10 }]
const INITIAL_DIRECTION_1 = { x: 0, y: 0 }
const INITIAL_DIRECTION_2 = { x: 0, y: 0 }
const GAME_SPEED = 150

type Position = { x: number; y: number }
type MoveLog = [number, string | null, string | null] // [tick, player1input, player2input]

// Convert direction to letter
const directionToLetter = (dir: Position): string | null => {
  if (dir.x === -1 && dir.y === 0) return 'L'
  if (dir.x === 1 && dir.y === 0) return 'R'
  if (dir.x === 0 && dir.y === -1) return 'U'
  if (dir.x === 0 && dir.y === 1) return 'D'
  return null
}

// Convert letter to direction
const letterToDirection = (letter: string | null): Position => {
  switch (letter) {
    case 'L': return { x: -1, y: 0 }
    case 'R': return { x: 1, y: 0 }
    case 'U': return { x: 0, y: -1 }
    case 'D': return { x: 0, y: 1 }
    default: return { x: 0, y: 0 }
  }
}

// Simple hash function
const hashMoves = (moves: MoveLog[]): string => {
  const str = moves.map(([tick, p1, p2]) => `${tick}:${p1 || '-'}:${p2 || '-'}`).join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

type MoveSelectorProps = {
  currentMove: string | null
  onSelect: (move: string | null) => void
  onClose: () => void
}

function MoveSelector({ currentMove, onSelect, onClose }: MoveSelectorProps) {
  const moves: (string | null)[] = ['U', 'L', 'D', 'R', null]
  
  return (
    <div className="move-selector-overlay" onClick={onClose}>
      <div className="move-selector" onClick={(e) => e.stopPropagation()}>
        <div className="move-selector-title">Select Move</div>
        <div className="move-selector-buttons">
          <div className="move-selector-buttons-row">
            <button
              className={`move-selector-btn ${'U' === currentMove ? 'selected' : ''}`}
              onClick={() => {
                onSelect('U')
                onClose()
              }}
            >
              U
            </button>
          </div>
          <div className="move-selector-buttons-row">
            <button
              className={`move-selector-btn ${'L' === currentMove ? 'selected' : ''}`}
              onClick={() => {
                onSelect('L')
                onClose()
              }}
            >
              L
            </button>
            <button
              className={`move-selector-btn ${null === currentMove ? 'selected' : ''}`}
              onClick={() => {
                onSelect(null)
                onClose()
              }}
            >
              —
            </button>
            <button
              className={`move-selector-btn ${'R' === currentMove ? 'selected' : ''}`}
              onClick={() => {
                onSelect('R')
                onClose()
              }}
            >
              R
            </button>
          </div>
          <div className="move-selector-buttons-row">
            <button
              className={`move-selector-btn ${'D' === currentMove ? 'selected' : ''}`}
              onClick={() => {
                onSelect('D')
                onClose()
              }}
            >
              D
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MoveVisualization({ 
  moves, 
  player, 
  gameOver, 
  modifiedMoves,
  onMoveClick 
}: { 
  moves: MoveLog[], 
  player: 1 | 2, 
  gameOver: boolean,
  modifiedMoves: Set<string>,
  onMoveClick: (tick: number, player: 1 | 2) => void
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new moves are added (only during active game)
  useEffect(() => {
    if (!gameOver && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [moves, gameOver])
  
  return (
    <div className="move-visualization">
      <h3>Player {player} Moves</h3>
      <div className="move-grid-scrollable" ref={scrollContainerRef}>
        <div className="move-grid">
          {moves.map(([tick, p1Move, p2Move], idx) => {
            const move = player === 1 ? p1Move : p2Move
            const isActive = move !== null
            const moveKey = `${tick}-${player}`
            const isModified = modifiedMoves.has(moveKey)
            
            return (
              <div key={idx} className="move-tick">
                <div className="tick-label">Tick {tick}</div>
                <div 
                  className={`move-box ${isActive ? `move-${move?.toLowerCase()}` : 'move-empty'} ${isModified ? 'move-modified' : ''}`}
                  onClick={() => onMoveClick(tick, player)}
                  style={{ cursor: 'pointer' }}
                >
                  {move || ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type GameState = {
  snake1: Position[]
  snake2: Position[]
  direction1: Position
  direction2: Position
  food: Position
  score1: number
  score2: number
  gameOver: boolean
  winner: 1 | 2 | null
}

function App() {
  const [snake1, setSnake1] = useState<Position[]>(INITIAL_SNAKE_1)
  const [snake2, setSnake2] = useState<Position[]>(INITIAL_SNAKE_2)
  const [direction1, setDirection1] = useState<Position>(INITIAL_DIRECTION_1)
  const [direction2, setDirection2] = useState<Position>(INITIAL_DIRECTION_2)
  const [food, setFood] = useState<Position>({ x: 10, y: 10 })
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<1 | 2 | null>(null)
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)
  const [tick, setTick] = useState(0)
  const [moveLog, setMoveLog] = useState<MoveLog[]>([])
  const [originalMoveLog, setOriginalMoveLog] = useState<MoveLog[]>([])
  const [modifiedMoves, setModifiedMoves] = useState<Set<string>>(new Set())
  const [editingMove, setEditingMove] = useState<{ tick: number, player: 1 | 2 } | null>(null)

  // Use refs to access current state in callbacks
  const snake1Ref = useRef(snake1)
  const snake2Ref = useRef(snake2)
  const direction1Ref = useRef(direction1)
  const direction2Ref = useRef(direction2)
  const foodRef = useRef(food)
  const gameOverRef = useRef(gameOver)
  const tickRef = useRef(tick)

  useEffect(() => {
    snake1Ref.current = snake1
    snake2Ref.current = snake2
    direction1Ref.current = direction1
    direction2Ref.current = direction2
    foodRef.current = food
    gameOverRef.current = gameOver
    tickRef.current = tick
  }, [snake1, snake2, direction1, direction2, food, gameOver, tick])

  const generateFood = useCallback((): Position => {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      }
    } while (
      snake1Ref.current.some(seg => seg.x === newFood.x && seg.y === newFood.y) ||
      snake2Ref.current.some(seg => seg.x === newFood.x && seg.y === newFood.y)
    )
    return newFood
  }, [])

  const checkWallCollision = useCallback((head: Position): boolean => {
    return head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE
  }, [])

  const checkSelfCollision = useCallback((head: Position, body: Position[]): boolean => {
    return body.some(segment => segment.x === head.x && segment.y === head.y)
  }, [])

  const checkSnakeCollision = useCallback((head: Position, otherSnake: Position[]): boolean => {
    return otherSnake.some(segment => segment.x === head.x && segment.y === head.y)
  }, [])

  const checkHeadToHeadCollision = useCallback((head1: Position, head2: Position): boolean => {
    return head1.x === head2.x && head1.y === head2.y
  }, [])

  // Replayable game logic - applies a single move and returns new state
  const applyMove = useCallback((
    state: GameState,
    p1Move: string | null,
    p2Move: string | null,
    currentTick: number
  ): GameState => {
    const dir1 = letterToDirection(p1Move)
    const dir2 = letterToDirection(p2Move)

    const head1 = state.snake1[0]
    const head2 = state.snake2[0]
    
    // Only move if direction is not zero (snake has started)
    const newHead1 = dir1.x === 0 && dir1.y === 0 
      ? head1 
      : {
          x: head1.x + dir1.x,
          y: head1.y + dir1.y
        }
    const newHead2 = dir2.x === 0 && dir2.y === 0
      ? head2
      : {
          x: head2.x + dir2.x,
          y: head2.y + dir2.y
        }
    
    // Skip everything if neither snake has started
    if (dir1.x === 0 && dir1.y === 0 && dir2.x === 0 && dir2.y === 0) {
      return state
    }

    // Check head-to-head collision (both die) - only if both are moving
    if ((dir1.x !== 0 || dir1.y !== 0) && (dir2.x !== 0 || dir2.y !== 0)) {
      if (checkHeadToHeadCollision(newHead1, newHead2)) {
        return {
          ...state,
          gameOver: true,
          winner: null
        }
      }
    }

    // Check if player 1 dies (only if moving)
    const p1Dead = (dir1.x !== 0 || dir1.y !== 0) && (
      checkWallCollision(newHead1) ||
      checkSelfCollision(newHead1, state.snake1) ||
      checkSnakeCollision(newHead1, state.snake2)
    )

    // Check if player 2 dies (only if moving)
    const p2Dead = (dir2.x !== 0 || dir2.y !== 0) && (
      checkWallCollision(newHead2) ||
      checkSelfCollision(newHead2, state.snake2) ||
      checkSnakeCollision(newHead2, state.snake1)
    )

    // Determine winner
    if (p1Dead && p2Dead) {
      return {
        ...state,
        gameOver: true,
        winner: null
      }
    } else if (p1Dead) {
      return {
        ...state,
        gameOver: true,
        winner: 2
      }
    } else if (p2Dead) {
      return {
        ...state,
        gameOver: true,
        winner: 1
      }
    }

    // Both alive - move snakes
    let newSnake1 = dir1.x === 0 && dir1.y === 0 
      ? state.snake1 
      : [newHead1, ...state.snake1]
    let newSnake2 = dir2.x === 0 && dir2.y === 0
      ? state.snake2
      : [newHead2, ...state.snake2]
    
    let foodEaten = false
    let newScore1 = state.score1
    let newScore2 = state.score2
    let newFood = state.food

    // Check food for player 1 (only if moving)
    if (dir1.x !== 0 || dir1.y !== 0) {
      if (newHead1.x === state.food.x && newHead1.y === state.food.y) {
        newScore1 = state.score1 + 1
        foodEaten = true
      }
    }

    // Check food for player 2 (only if moving, and player 1 didn't eat it)
    if (!foodEaten && (dir2.x !== 0 || dir2.y !== 0)) {
      if (newHead2.x === state.food.x && newHead2.y === state.food.y) {
        newScore2 = state.score2 + 1
        foodEaten = true
      }
    }

    // Generate new food if eaten
    if (foodEaten) {
      // Generate food that doesn't overlap with snakes
      let newFoodPos: Position
      do {
        newFoodPos = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE)
        }
      } while (
        newSnake1.some(seg => seg.x === newFoodPos.x && seg.y === newFoodPos.y) ||
        newSnake2.some(seg => seg.x === newFoodPos.x && seg.y === newFoodPos.y)
      )
      newFood = newFoodPos
    } else {
      // No food eaten - remove tails only if snake moved
      if (dir1.x !== 0 || dir1.y !== 0) {
        newSnake1.pop()
      }
      if (dir2.x !== 0 || dir2.y !== 0) {
        newSnake2.pop()
      }
    }

    return {
      snake1: newSnake1,
      snake2: newSnake2,
      direction1: dir1,
      direction2: dir2,
      food: newFood,
      score1: newScore1,
      score2: newScore2,
      gameOver: state.gameOver,
      winner: state.winner
    }
  }, [checkWallCollision, checkSelfCollision, checkSnakeCollision, checkHeadToHeadCollision])


  const moveSnakes = useCallback(() => {
    if (gameOverRef.current) return

    const dir1 = direction1Ref.current
    const dir2 = direction2Ref.current
    const currentTick = tickRef.current

    // Log moves for this tick
    const p1Move = directionToLetter(dir1)
    const p2Move = directionToLetter(dir2)
    
    setMoveLog(prev => {
      const newLog = [...prev, [currentTick, p1Move, p2Move]]
      // Also update original move log if this is a new move (not a replay)
      setOriginalMoveLog(prevOriginal => {
        // Only add if this tick doesn't exist in original (i.e., it's a new move, not a replay)
        if (!prevOriginal.find(([t]) => t === currentTick)) {
          return [...prevOriginal, [currentTick, p1Move, p2Move]]
        }
        return prevOriginal
      })
      // Apply the move immediately for live gameplay
      const currentState: GameState = {
        snake1: snake1Ref.current,
        snake2: snake2Ref.current,
        direction1: dir1,
        direction2: dir2,
        food: foodRef.current,
        score1: 0, // We'll update scores separately
        score2: 0,
        gameOver: false,
        winner: null
      }
      const newState = applyMove(currentState, p1Move, p2Move, currentTick)
      
      // Update state
      setSnake1(newState.snake1)
      setSnake2(newState.snake2)
      setDirection1(newState.direction1)
      setDirection2(newState.direction2)
      setFood(newState.food)
      setScore1(prevScore => {
        if (newState.score1 > prevScore) return newState.score1
        return prevScore
      })
      setScore2(prevScore => {
        if (newState.score2 > prevScore) return newState.score2
        return prevScore
      })
      if (newState.gameOver) {
        setGameOver(true)
        setWinner(newState.winner)
      }
      
      return newLog
    })
    setTick(prev => prev + 1)
  }, [applyMove])

  useEffect(() => {
    if (gameOver) return

    const gameInterval = setInterval(moveSnakes, GAME_SPEED)
    return () => clearInterval(gameInterval)
  }, [moveSnakes, gameOver])

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameOver) return

    // Player 1 controls (WASD)
    switch (e.key.toLowerCase()) {
      case 'w':
        if (direction1.y === 0) setDirection1({ x: 0, y: -1 })
        return
      case 's':
        if (direction1.y === 0) setDirection1({ x: 0, y: 1 })
        return
      case 'a':
        if (direction1.x === 0) setDirection1({ x: -1, y: 0 })
        return
      case 'd':
        if (direction1.x === 0) setDirection1({ x: 1, y: 0 })
        return
    }

    // Player 2 controls (Arrow keys)
    switch (e.key) {
      case 'ArrowUp':
        if (direction2.y === 0) setDirection2({ x: 0, y: -1 })
        break
      case 'ArrowDown':
        if (direction2.y === 0) setDirection2({ x: 0, y: 1 })
        break
      case 'ArrowLeft':
        if (direction2.x === 0) setDirection2({ x: -1, y: 0 })
        break
      case 'ArrowRight':
        if (direction2.x === 0) setDirection2({ x: 1, y: 0 })
        break
    }
  }, [direction1, direction2, gameOver])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  const resetGame = () => {
    setSnake1(INITIAL_SNAKE_1)
    setSnake2(INITIAL_SNAKE_2)
    setDirection1(INITIAL_DIRECTION_1)
    setDirection2(INITIAL_DIRECTION_2)
    setFood({ x: 10, y: 10 })
    setGameOver(false)
    setWinner(null)
    setScore1(0)
    setScore2(0)
    setTick(0)
    setMoveLog([])
    setOriginalMoveLog([])
    setModifiedMoves(new Set())
    setEditingMove(null)
  }

  const handleMoveClick = useCallback((tick: number, player: 1 | 2) => {
    setEditingMove({ tick, player })
  }, [])

  const handleMoveSelect = useCallback((move: string | null) => {
    if (!editingMove) return

    const { tick, player } = editingMove
    setMoveLog(prev => {
      // Find original move from originalMoveLog
      const originalMove = originalMoveLog.find(([t]) => t === tick)
      const originalPlayerMove = originalMove 
        ? (player === 1 ? originalMove[1] : originalMove[2])
        : null
      
      // Check if move is actually different from original
      const moveKey = `${tick}-${player}`
      setModifiedMoves(prevModified => {
        const newSet = new Set(prevModified)
        if (move !== originalPlayerMove) {
          newSet.add(moveKey)
        } else {
          newSet.delete(moveKey)
        }
        return newSet
      })

      const newLog = prev.map(([t, p1, p2]) => {
        if (t === tick) {
          const newP1 = player === 1 ? move : p1
          const newP2 = player === 2 ? move : p2
          return [t, newP1, newP2]
        }
        return [t, p1, p2]
      })
      
      // Just update the move log, don't replay the game
      return newLog
    })
    setEditingMove(null)
  }, [editingMove, originalMoveLog])

  const gameHash = hashMoves(moveLog)

  const currentEditingMove = editingMove 
    ? (editingMove.player === 1 
        ? moveLog.find(([t]) => t === editingMove.tick)?.[1] 
        : moveLog.find(([t]) => t === editingMove.tick)?.[2])
    : null

  return (
    <div className="game-container">
      {editingMove && (
        <MoveSelector
          currentMove={currentEditingMove}
          onSelect={handleMoveSelect}
          onClose={() => setEditingMove(null)}
        />
      )}
      <div className="game-header">
        <h1>Two Player Snake</h1>
        <div className="scores">
          <div className="score player1">Player 1 (WASD): {score1}</div>
          <div className="score player2">Player 2 (Arrows): {score2}</div>
        </div>
      </div>

      <div className="game-layout">
        {/* Left: Player 1 Moves */}
        <div className="move-panel">
          <div className="game-hash-container">
            <div className="game-hash-label">Game Hash = {gameHash}</div>
            <MoveVisualization 
              moves={moveLog} 
              player={1} 
              gameOver={gameOver}
              modifiedMoves={modifiedMoves}
              onMoveClick={handleMoveClick}
            />
          </div>
        </div>

        {/* Center: Game Board */}
        <div className="game-center">
          <div className="game-board">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
              const x = index % GRID_SIZE
              const y = Math.floor(index / GRID_SIZE)
              const isSnake1 = snake1.some(segment => segment.x === x && segment.y === y)
              const isSnake2 = snake2.some(segment => segment.x === x && segment.y === y)
              const isHead1 = snake1[0]?.x === x && snake1[0]?.y === y
              const isHead2 = snake2[0]?.x === x && snake2[0]?.y === y
              const isFood = food.x === x && food.y === y

              return (
                <div
                  key={index}
                  className={`cell ${isHead1 ? 'head1' : ''} ${isHead2 ? 'head2' : ''} ${isSnake1 ? 'snake1' : ''} ${isSnake2 ? 'snake2' : ''} ${isFood ? 'food' : ''}`}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE
                  }}
                />
              )
            })}
          </div>

          {gameOver && (
            <div className="game-over">
              {winner === null ? (
                <>
                  <h2>It's a Tie!</h2>
                  <p>Both players crashed</p>
                </>
              ) : (
                <>
                  <h2>Player {winner} Wins!</h2>
                  <p>Last snake standing</p>
                </>
              )}
              <button onClick={resetGame}>Play Again</button>
            </div>
          )}

          <div className="instructions">
            <p><strong>Player 1:</strong> WASD keys | <strong>Player 2:</strong> Arrow keys</p>
            <p>Press a key to start moving! Last snake standing wins!</p>
          </div>
        </div>

        {/* Right: Player 2 Moves */}
        <div className="move-panel">
          <div className="game-hash-container">
            <div className="game-hash-label">Game Hash = {gameHash}</div>
            <MoveVisualization 
              moves={moveLog} 
              player={2} 
              gameOver={gameOver}
              modifiedMoves={modifiedMoves}
              onMoveClick={handleMoveClick}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
