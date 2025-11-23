import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

const GRID_SIZE = 20
const CELL_SIZE = 30
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

type GooglyEyesProps = {
  direction: Position
  player: 1 | 2
}

function GooglyEyes({ direction, player }: GooglyEyesProps) {
  const [eyeOffset1, setEyeOffset1] = useState({ x: 0, y: 0 })
  const [eyeOffset2, setEyeOffset2] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    // Animate eyes looking around independently
    const interval1 = setInterval(() => {
      const angle = Math.random() * Math.PI * 2
      const distance = 1.5 + Math.random() * 1.5
      setEyeOffset1({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      })
    }, 800 + Math.random() * 1200)
    
    const interval2 = setInterval(() => {
      const angle = Math.random() * Math.PI * 2
      const distance = 1.5 + Math.random() * 1.5
      setEyeOffset2({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      })
    }, 800 + Math.random() * 1200)
    
    return () => {
      clearInterval(interval1)
      clearInterval(interval2)
    }
  }, [])
  
  // Base eye position based on direction - eyes at top front of head
  const getEyePosition = (isLeft: boolean, eyeOffset: { x: number; y: number }) => {
    // Default positions (when moving right) - more spaced apart
    let baseX = isLeft ? 28 : 72
    let baseY = 25
    
    // Adjust based on direction
    if (direction.x > 0) { // Right
      baseX = isLeft ? 28 : 72
      baseY = 25
    } else if (direction.x < 0) { // Left
      baseX = isLeft ? 72 : 28
      baseY = 25
    } else if (direction.y > 0) { // Down
      baseX = isLeft ? 28 : 72
      baseY = 30
    } else if (direction.y < 0) { // Up
      baseX = isLeft ? 28 : 72
      baseY = 20
    }
    
    return {
      left: `${baseX + eyeOffset.x}%`,
      top: `${baseY + eyeOffset.y}%`
    }
  }
  
  return (
    <div className="googly-eyes-container">
      <div 
        className="googly-eye"
        style={{
          ...getEyePosition(true, eyeOffset1)
        } as React.CSSProperties}
      >
        <div className="googly-pupil" />
      </div>
      <div 
        className="googly-eye"
        style={{
          ...getEyePosition(false, eyeOffset2)
        } as React.CSSProperties}
      >
        <div className="googly-pupil" />
      </div>
    </div>
  )
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

const MAX_MOVE_SLOTS = 200

function MoveVisualization({ 
  moves, 
  player, 
  gameOver, 
  modifiedMoves,
  onMoveClick,
  currentTick
}: { 
  moves: MoveLog[], 
  player: 1 | 2, 
  gameOver: boolean,
  modifiedMoves: Set<string>,
  onMoveClick: (tick: number, player: 1 | 2) => void,
  currentTick: number
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  
  // Create a map of moves by tick for quick lookup
  const movesByTick = new Map<number, MoveLog>()
  moves.forEach(move => {
    movesByTick.set(move[0], move)
  })
  
  const MOVES_PER_ROW = 5
  const numRows = Math.ceil(MAX_MOVE_SLOTS / MOVES_PER_ROW)
  
  // Scroll to keep current tick visible (center the row containing current tick)
  useEffect(() => {
    if (scrollContainerRef.current && !gameOver) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const rowIndex = Math.floor(currentTick / MOVES_PER_ROW)
          const currentRow = rowRefs.current.get(rowIndex)
          if (currentRow) {
            const container = scrollContainerRef.current
            const rowOffset = currentRow.offsetTop
            const rowHeight = currentRow.offsetHeight
            const containerHeight = container.clientHeight
            
            // Center the current tick row in the viewport
            const targetScroll = rowOffset - (containerHeight / 2) + (rowHeight / 2)
            container.scrollTop = targetScroll
          }
        }
      }, 0)
    }
  }, [currentTick, gameOver, moves])
  
  return (
    <div className="move-visualization">
      <div className="move-visualization-title">Moves</div>
      <div className="move-grid-scrollable" ref={scrollContainerRef}>
        <div className="move-grid">
          <div className="tick-column-header">Tick</div>
          {Array.from({ length: MOVES_PER_ROW }, (_, colIdx) => (
            <div key={`header-${colIdx}`} className="move-grid-spacer"></div>
          ))}
          {Array.from({ length: numRows }, (_, rowIdx) => {
            const startTick = rowIdx * MOVES_PER_ROW
            return (
              <>
                <div 
                  key={`tick-${rowIdx}`} 
                  className="tick-number"
                  ref={(el) => {
                    if (el) rowRefs.current.set(rowIdx, el)
                  }}
                >
                  {startTick}
                </div>
                {Array.from({ length: MOVES_PER_ROW }, (_, colIdx) => {
                  const tick = startTick + colIdx
                  if (tick >= MAX_MOVE_SLOTS) return null
                  const moveEntry = movesByTick.get(tick)
                  const move = moveEntry ? (player === 1 ? moveEntry[1] : moveEntry[2]) : null
                  const isActive = move !== null
                  const moveKey = `${tick}-${player}`
                  const isModified = modifiedMoves.has(moveKey)
                  
                  return (
                    <div 
                      key={`box-${tick}`}
                      className={`move-box ${isActive ? `move-${move?.toLowerCase()}` : 'move-empty'} ${isModified ? 'move-modified' : ''}`}
                      onClick={() => onMoveClick(tick, player)}
                      style={{ cursor: 'pointer' }}
                    >
                      {move || ''}
                    </div>
                  )
                })}
              </>
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
  // Scores are derived from snake lengths - no separate state needed
  const [tick, setTick] = useState(0)
  const [moveLog, setMoveLog] = useState<MoveLog[]>([])
  const [originalMoveLog, setOriginalMoveLog] = useState<MoveLog[]>([])
  const [modifiedMoves, setModifiedMoves] = useState<Set<string>>(new Set())
  const [editingMove, setEditingMove] = useState<{ tick: number, player: 1 | 2 } | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [explodingSnake1, setExplodingSnake1] = useState(false)
  const [explodingSnake2, setExplodingSnake2] = useState(false)
  const [showGameOverScreen, setShowGameOverScreen] = useState(false)

  // Use refs to access current state in callbacks
  const snake1Ref = useRef(snake1)
  const snake2Ref = useRef(snake2)
  const direction1Ref = useRef(direction1)
  const direction2Ref = useRef(direction2)
  const foodRef = useRef(food)
  const gameOverRef = useRef(gameOver)
  const tickRef = useRef(tick)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const boomAudioRef = useRef<HTMLAudioElement | null>(null)
  const munchAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    snake1Ref.current = snake1
    snake2Ref.current = snake2
    direction1Ref.current = direction1
    direction2Ref.current = direction2
    foodRef.current = food
    gameOverRef.current = gameOver
    tickRef.current = tick
  }, [snake1, snake2, direction1, direction2, food, gameOver, tick])

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/soundtrack.mp3')
    audioRef.current.loop = true
    audioRef.current.volume = 0.5
    
    boomAudioRef.current = new Audio('/boom.mp3')
    boomAudioRef.current.volume = 0.7
    
    munchAudioRef.current = new Audio('/munch.mp3')
    munchAudioRef.current.volume = 0.6
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (boomAudioRef.current) {
        boomAudioRef.current.pause()
        boomAudioRef.current = null
      }
      if (munchAudioRef.current) {
        munchAudioRef.current.pause()
        munchAudioRef.current = null
      }
    }
  }, [])

  // Play soundtrack when game starts
  useEffect(() => {
    if (gameStarted && !gameOver && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Error playing soundtrack:', err)
      })
    }
  }, [gameStarted, gameOver])

  // Stop soundtrack when end screen is shown
  useEffect(() => {
    if (showGameOverScreen && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [showGameOverScreen])

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
    // Always create new arrays to avoid reference sharing
    let newSnake1 = dir1.x === 0 && dir1.y === 0 
      ? [...state.snake1] 
      : [newHead1, ...state.snake1]
    let newSnake2 = dir2.x === 0 && dir2.y === 0
      ? [...state.snake2]
      : [newHead2, ...state.snake2]
    
    let p1AteFood = false
    let p2AteFood = false
    let newFood = state.food

    // Check food for player 1 (only if moving)
    if (dir1.x !== 0 || dir1.y !== 0) {
      if (newHead1.x === state.food.x && newHead1.y === state.food.y) {
        p1AteFood = true
      }
    }

    // Check food for player 2 (only if moving, and player 1 didn't eat it)
    if (!p1AteFood && (dir2.x !== 0 || dir2.y !== 0)) {
      if (newHead2.x === state.food.x && newHead2.y === state.food.y) {
        p2AteFood = true
      }
    }

    // Generate new food if eaten by either player
    if (p1AteFood || p2AteFood) {
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
    }

    // Each snake's tail removal is completely independent
    // Snake 1: remove tail if it moved AND didn't eat food
    if ((dir1.x !== 0 || dir1.y !== 0) && !p1AteFood) {
      newSnake1.pop()
    }
    
    // Snake 2: remove tail if it moved AND didn't eat food
    if ((dir2.x !== 0 || dir2.y !== 0) && !p2AteFood) {
      newSnake2.pop()
    }

    // Check win condition: first to length 10 wins
    if (newSnake1.length >= 10 && newSnake2.length >= 10) {
      // Both reached 10 at the same time - player 1 wins (first check)
      return {
        snake1: newSnake1,
        snake2: newSnake2,
        direction1: dir1,
        direction2: dir2,
        food: newFood,
        gameOver: true,
        winner: 1
      }
    } else if (newSnake1.length >= 10) {
      // Player 1 wins
      return {
        snake1: newSnake1,
        snake2: newSnake2,
        direction1: dir1,
        direction2: dir2,
        food: newFood,
        gameOver: true,
        winner: 1
      }
    } else if (newSnake2.length >= 10) {
      // Player 2 wins
      return {
        snake1: newSnake1,
        snake2: newSnake2,
        direction1: dir1,
        direction2: dir2,
        food: newFood,
        gameOver: true,
        winner: 2
      }
    }

    return {
      snake1: newSnake1,
      snake2: newSnake2,
      direction1: dir1,
      direction2: dir2,
      food: newFood,
      gameOver: state.gameOver,
      winner: state.winner
    }
  }, [checkWallCollision, checkSelfCollision, checkSnakeCollision, checkHeadToHeadCollision])


  const moveSnakes = useCallback(() => {
    if (gameOverRef.current) return

    const dir1 = direction1Ref.current
    const dir2 = direction2Ref.current
    const currentTick = tickRef.current

    // Skip if neither player has moved (game hasn't started)
    if (dir1.x === 0 && dir1.y === 0 && dir2.x === 0 && dir2.y === 0) {
      return
    }

    // Log moves for this tick
    const p1Move = directionToLetter(dir1)
    const p2Move = directionToLetter(dir2)
    
    // Apply the move immediately for live gameplay
    // Create new arrays to avoid reference sharing
    const currentState: GameState = {
      snake1: [...snake1Ref.current],
      snake2: [...snake2Ref.current],
      direction1: dir1,
      direction2: dir2,
      food: { ...foodRef.current },
      gameOver: false,
      winner: null
    }
    const newState = applyMove(currentState, p1Move, p2Move, currentTick)
    
    // Check if food was eaten (snake length increased or food position changed)
    const p1LengthIncreased = newState.snake1.length > currentState.snake1.length
    const p2LengthIncreased = newState.snake2.length > currentState.snake2.length
    const foodWasEaten = p1LengthIncreased || p2LengthIncreased || 
                        (newState.food.x !== currentState.food.x || newState.food.y !== currentState.food.y)
    
    if (foodWasEaten && munchAudioRef.current) {
      munchAudioRef.current.currentTime = 0
      munchAudioRef.current.play().catch(err => {
        console.error('Error playing munch sound:', err)
      })
    }
    
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
      
      // Update state - scores are derived from snake lengths
      setSnake1(newState.snake1)
      setSnake2(newState.snake2)
      setDirection1(newState.direction1)
      setDirection2(newState.direction2)
      setFood(newState.food)
      if (newState.gameOver) {
        setGameOver(true)
        setWinner(newState.winner)
        // Play boom sound when player dies
        if (boomAudioRef.current) {
          boomAudioRef.current.currentTime = 0
          boomAudioRef.current.play().catch(err => {
            console.error('Error playing boom sound:', err)
          })
        }
        // Trigger explosion animation for losing snake(s)
        if (newState.winner === 1) {
          setExplodingSnake2(true) // Player 2 loses
        } else if (newState.winner === 2) {
          setExplodingSnake1(true) // Player 1 loses
        } else {
          // Both died (tie) - explode both
          setExplodingSnake1(true)
          setExplodingSnake2(true)
        }
        // Show game over screen after explosion animation (2 seconds)
        setTimeout(() => {
          setShowGameOverScreen(true)
        }, 2000)
      }
      
      return newLog
    })
    setTick(prev => prev + 1)
  }, [applyMove])

  useEffect(() => {
    if (gameOver || !gameStarted) return

    const gameInterval = setInterval(moveSnakes, GAME_SPEED)
    return () => clearInterval(gameInterval)
  }, [moveSnakes, gameOver, gameStarted])

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameOver) return

    let moved = false

    // Player 1 controls (WASD)
    switch (e.key.toLowerCase()) {
      case 'w':
        if (direction1.y === 0) {
          setDirection1({ x: 0, y: -1 })
          moved = true
        }
        break
      case 's':
        if (direction1.y === 0) {
          setDirection1({ x: 0, y: 1 })
          moved = true
        }
        break
      case 'a':
        if (direction1.x === 0) {
          setDirection1({ x: -1, y: 0 })
          moved = true
        }
        break
      case 'd':
        if (direction1.x === 0) {
          setDirection1({ x: 1, y: 0 })
          moved = true
        }
        break
    }

    // Player 2 controls (Arrow keys)
    if (!moved) {
      switch (e.key) {
        case 'ArrowUp':
          if (direction2.y === 0) {
            setDirection2({ x: 0, y: -1 })
            moved = true
          }
          break
        case 'ArrowDown':
          if (direction2.y === 0) {
            setDirection2({ x: 0, y: 1 })
            moved = true
          }
          break
        case 'ArrowLeft':
          if (direction2.x === 0) {
            setDirection2({ x: -1, y: 0 })
            moved = true
          }
          break
        case 'ArrowRight':
          if (direction2.x === 0) {
            setDirection2({ x: 1, y: 0 })
            moved = true
          }
          break
      }
    }

    // Start the game and increment tick when first move is made
    if (moved && !gameStarted) {
      setGameStarted(true)
      setTick(0) // Start at tick 0
    }
  }, [direction1, direction2, gameOver, gameStarted])

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
    setTick(0)
    setMoveLog([])
    setOriginalMoveLog([])
    setModifiedMoves(new Set())
    setEditingMove(null)
    setGameStarted(false)
    setExplodingSnake1(false)
    setExplodingSnake2(false)
    setShowGameOverScreen(false)
    // Stop soundtrack
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
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
        ? (moveLog.find(([t]) => t === editingMove.tick)?.[1] ?? null)
        : (moveLog.find(([t]) => t === editingMove.tick)?.[2] ?? null))
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

      <div className="game-layout">
        {/* Left: Player 1 Moves */}
        <div className="move-panel">
          <div className="game-board-header">
            <div className="board-header-left">Player 1</div>
            <div className="board-header-right">Length: {snake1.length}</div>
          </div>
          <div className="game-hash-container">
            <div className="game-hash-label">Game Hash = {gameHash}</div>
            <MoveVisualization 
              moves={moveLog} 
              player={1} 
              gameOver={gameOver}
              modifiedMoves={modifiedMoves}
              onMoveClick={handleMoveClick}
              currentTick={tick}
            />
          </div>
        </div>

        {/* Center: Game Board */}
        <div className="game-center">
          <div className="game-board-title">First to 10 Wins</div>
          <div className={`game-board-wrapper ${showGameOverScreen ? 'game-over-blur' : ''}`}>
            <div className="game-board">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                const x = index % GRID_SIZE
                const y = Math.floor(index / GRID_SIZE)
                const isSnake1 = snake1.some(segment => segment.x === x && segment.y === y)
                const isSnake2 = snake2.some(segment => segment.x === x && segment.y === y)
                const head1Index = snake1.findIndex(segment => segment.x === x && segment.y === y)
                const head2Index = snake2.findIndex(segment => segment.x === x && segment.y === y)
                const isHead1 = head1Index === 0
                const isHead2 = head2Index === 0
                const isTail1 = head1Index === snake1.length - 1 && snake1.length > 1
                const isTail2 = head2Index === snake2.length - 1 && snake2.length > 1
                const isFood = food.x === x && food.y === y
                const isExploding1 = explodingSnake1 && isSnake1
                const isExploding2 = explodingSnake2 && isSnake2
                
                // Get direction for head/tail styling
                // For head: use movement direction (curve the front)
                // For tail: use direction from body to tail (curve the back)
                const head1Dir = isHead1 ? direction1 : null
                const head2Dir = isHead2 ? direction2 : null
                const tail1Dir = isTail1 && snake1.length > 1
                  ? { x: snake1[snake1.length - 1].x - snake1[snake1.length - 2].x, y: snake1[snake1.length - 1].y - snake1[snake1.length - 2].y }
                  : null
                const tail2Dir = isTail2 && snake2.length > 1
                  ? { x: snake2[snake2.length - 1].x - snake2[snake2.length - 2].x, y: snake2[snake2.length - 1].y - snake2[snake2.length - 2].y }
                  : null

                // Helper to get border radius based on direction
                const getHeadBorderRadius = (dir: Position | null) => {
                  if (!dir || (dir.x === 0 && dir.y === 0)) return undefined
                  if (dir.x > 0) return '0 50% 50% 0' // Moving right - curve right
                  if (dir.x < 0) return '50% 0 0 50%' // Moving left - curve left
                  if (dir.y > 0) return '0 0 50% 50%' // Moving down - curve bottom
                  if (dir.y < 0) return '50% 50% 0 0' // Moving up - curve top
                  return undefined
                }

                const getTailBorderRadius = (dir: Position | null) => {
                  if (!dir || (dir.x === 0 && dir.y === 0)) return undefined
                  // Curve the end of the tail (the side pointing away from body), keep connection square
                  if (dir.x > 0) return '0 50% 50% 0' // Tail pointing right - curve right (end)
                  if (dir.x < 0) return '50% 0 0 50%' // Tail pointing left - curve left (end)
                  if (dir.y > 0) return '0 0 50% 50%' // Tail pointing down - curve bottom (end)
                  if (dir.y < 0) return '50% 50% 0 0' // Tail pointing up - curve top (end)
                  return undefined
                }

                // Generate random particle directions for explosion
                const particleAngle1 = isExploding1 || isExploding2 ? Math.random() * Math.PI * 2 : 0
                const particleAngle2 = isExploding1 || isExploding2 ? Math.random() * Math.PI * 2 : 0
                const particleDistance = 30 + Math.random() * 20
                
                return (
                <div
                  key={index}
                  className={`cell ${isHead1 ? 'head1' : ''} ${isHead2 ? 'head2' : ''} ${isSnake1 ? 'snake1' : ''} ${isSnake2 ? 'snake2' : ''} ${isTail1 ? 'tail1' : ''} ${isTail2 ? 'tail2' : ''} ${isFood ? 'food' : ''} ${isExploding1 ? 'exploding' : ''} ${isExploding2 ? 'exploding' : ''}`}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    ...(isHead1 && head1Dir ? { borderRadius: getHeadBorderRadius(head1Dir) } : {}),
                    ...(isHead2 && head2Dir ? { borderRadius: getHeadBorderRadius(head2Dir) } : {}),
                    ...(isTail1 && tail1Dir ? { borderRadius: getTailBorderRadius(tail1Dir) } : {}),
                    ...(isTail2 && tail2Dir ? { borderRadius: getTailBorderRadius(tail2Dir) } : {}),
                    ...(isExploding1 || isExploding2 ? {
                      '--particle-x-1': `${Math.cos(particleAngle1) * particleDistance}px`,
                      '--particle-y-1': `${Math.sin(particleAngle1) * particleDistance}px`,
                      '--particle-x-2': `${Math.cos(particleAngle2) * particleDistance}px`,
                      '--particle-y-2': `${Math.sin(particleAngle2) * particleDistance}px`
                    } : {})
                  } as React.CSSProperties}
                >
                  {isHead1 && (
                    <GooglyEyes direction={direction1} player={1} />
                  )}
                  {isHead2 && (
                    <GooglyEyes direction={direction2} player={2} />
                  )}
                </div>
                )
              })}
            </div>
            {gameOver && showGameOverScreen && (
              <div className="game-over-overlay-board">
                <div className="game-over-content">
                  {winner === null ? (
                    <h2>It's a Tie!</h2>
                  ) : (
                    <h2>Player {winner} Wins!</h2>
                  )}
                  <button onClick={resetGame}>Play Again</button>
                </div>
              </div>
            )}
          </div>

          <div className="instructions">
            <p><strong>Player 1:</strong> WASD keys | <strong>Player 2:</strong> Arrow keys</p>
            <p>Press a key to start moving! Last snake standing wins!</p>
          </div>
        </div>

        {/* Right: Player 2 Moves */}
        <div className="move-panel">
          <div className="game-board-header">
            <div className="board-header-left">Player 2</div>
            <div className="board-header-right">Length: {snake2.length}</div>
          </div>
          <div className="game-hash-container">
            <div className="game-hash-label">Game Hash = {gameHash}</div>
            <MoveVisualization 
              moves={moveLog} 
              player={2} 
              gameOver={gameOver}
              modifiedMoves={modifiedMoves}
              onMoveClick={handleMoveClick}
              currentTick={tick}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
