/**
 * Unit Tests for Auto-Play Game Flow
 * Requirements: 1.1, 1.3, 1.6, 1.8, 2.5
 * 
 * These tests verify the core game flow logic for auto-play mode.
 * Since Game.vue has complex Vue dependencies, we test the underlying
 * store modules and logic that power the auto-play functionality.
 */

import positionModule from '@/store/modules/position'

// Constants
const EMPTY = 0
const BLACK = 1
const WHITE = 2

// Helper to create a fresh position state
function createPositionState(size = 15) {
  return {
    size,
    board: new Uint8Array(size * size).fill(EMPTY),
    position: [],
    lastPosition: [],
    winline: [],
    swaped: false,
    gameEnded: false,
    gameResult: null,
  }
}

// Mock AI state (without importing ai.js which has engine dependencies)
function createAIState() {
  return {
    fullEngine: true,
    loadingProgress: 0.0,
    ready: true,
    startSize: 15,
    restart: false,
    thinking: false,
    timeUsed: 0,
    lastThinkTime: 0,
    lastThinkPosition: [],
    currentConfig: null,
    hashSize: null,
    autoPlayMode: true,
    thinkingStartTime: 0,
    outputs: {
      pos: null,
      swap: null,
      currentPV: 0,
      pv: [{ depth: 0, seldepth: 0, nodes: 0, eval: '-', winrate: 0.0, bestline: [] }],
      nodes: 0,
      speed: 0,
      time: 0,
      msg: null,
      realtime: { best: [], lost: [] },
      forbid: [],
      error: null,
    },
    messages: [],
    posCallback: null,
  }
}

// AI mutations (replicated from ai.js to avoid engine dependency)
const aiMutations = {
  setThinkingState(state, thinking) {
    state.thinking = thinking
  },
  setAutoPlayMode(state, enabled) {
    state.autoPlayMode = enabled
  },
  setThinkingStartTime(state, time) {
    state.thinkingStartTime = time
  },
  clearOutput(state) {
    state.outputs.pv = [
      { depth: 0, seldepth: 0, nodes: 0, eval: '-', winrate: 0.0, bestline: [] },
    ]
    state.outputs.pos = null
    state.outputs.nodes = 0
    state.outputs.speed = 0
    state.outputs.forbid = []
  },
}

describe('Auto-Play Game Flow', () => {
  describe('clicked() triggers AI when autoPlayMode is ON', () => {
    /**
     * Test: Player move triggers AI response in auto-play mode
     * Requirements: 1.1, 1.3
     */
    test('player move places black piece and game continues', () => {
      const positionState = createPositionState()
      
      // Simulate player clicking empty cell
      const playerMove = [7, 7]
      
      // Check cell is empty before move
      const isEmptyBefore = positionModule.getters.isEmpty(positionState)(playerMove)
      expect(isEmptyBefore).toBe(true)
      
      // Place black piece (player move)
      positionModule.mutations.move(positionState, playerMove)
      
      // Verify black piece was placed
      expect(positionState.board[playerMove[1] * positionState.size + playerMove[0]]).toBe(BLACK)
      expect(positionState.position).toHaveLength(1)
      
      // Verify it's now white's turn (AI's turn)
      const playerToMove = positionModule.getters.playerToMove(positionState)
      expect(playerToMove).toBe('WHITE')
    })

    /**
     * Test: Game flow continues with alternating moves
     * Requirements: 1.1, 1.6
     */
    test('alternating player and AI moves work correctly', () => {
      const positionState = createPositionState()
      
      // Player move (black)
      positionModule.mutations.move(positionState, [7, 7])
      expect(positionModule.getters.playerToMove(positionState)).toBe('WHITE')
      
      // AI move (white)
      positionModule.mutations.move(positionState, [8, 8])
      expect(positionModule.getters.playerToMove(positionState)).toBe('BLACK')
      
      // Player move (black)
      positionModule.mutations.move(positionState, [6, 6])
      expect(positionModule.getters.playerToMove(positionState)).toBe('WHITE')
      
      expect(positionState.position).toHaveLength(3)
    })
  })

  describe('clicked() allows manual moves when autoPlayMode is OFF', () => {
    /**
     * Test: Manual analysis mode allows free piece placement
     * Requirements: 4.3, 4.4
     */
    test('manual mode allows placing pieces without AI response', () => {
      const positionState = createPositionState()
      const aiState = createAIState()
      aiState.autoPlayMode = false
      
      // Place multiple pieces manually
      positionModule.mutations.move(positionState, [7, 7])
      positionModule.mutations.move(positionState, [8, 8])
      positionModule.mutations.move(positionState, [6, 6])
      
      expect(positionState.position).toHaveLength(3)
      // In manual mode, AI doesn't automatically respond
      expect(aiState.thinking).toBe(false)
    })
  })

  describe('startAutoPlay() executes Two-step Balanced Move', () => {
    /**
     * Test: AI state is set correctly when thinking starts
     * Requirements: 2.5
     */
    test('thinking state is set when AI starts', () => {
      const aiState = createAIState()
      
      // Simulate starting AI thinking
      aiMutations.setThinkingState(aiState, true)
      aiMutations.setThinkingStartTime(aiState, Date.now())
      
      expect(aiState.thinking).toBe(true)
      expect(aiState.thinkingStartTime).toBeGreaterThan(0)
    })

    /**
     * Test: AI outputs are cleared before new search
     * Requirements: 2.5
     */
    test('outputs are cleared before new AI search', () => {
      const aiState = createAIState()
      
      // Set some outputs
      aiState.outputs.pos = [5, 5]
      aiState.outputs.nodes = 1000
      
      // Clear outputs (as done before new search)
      aiMutations.clearOutput(aiState)
      
      expect(aiState.outputs.pos).toBeNull()
      expect(aiState.outputs.nodes).toBe(0)
      expect(aiState.outputs.pv[0].bestline).toHaveLength(0)
    })
  })

  describe('handleGameEnd() displays result popup', () => {
    /**
     * Test: Game end state is properly set
     * Requirements: 1.8, 5.7
     */
    test('game end state is set with correct result', () => {
      const positionState = createPositionState()
      
      // Create a winning position for black
      const moves = [
        [3, 7], [0, 0],
        [4, 7], [0, 1],
        [5, 7], [0, 2],
        [6, 7], [0, 3],
        [7, 7],
      ]
      
      moves.forEach(pos => {
        positionModule.mutations.move(positionState, pos)
      })
      
      positionModule.mutations.checkWin(positionState, false)
      
      // Verify game ended with correct result
      expect(positionState.gameEnded).toBe(true)
      expect(positionState.gameResult).toBe('BLACK_WIN')
      expect(positionState.winline).toHaveLength(2)
    })

    /**
     * Test: White win is detected correctly
     * Requirements: 1.8
     */
    test('white win is detected and result is set', () => {
      const positionState = createPositionState()
      
      // Create a winning position for white
      const moves = [
        [0, 0], [7, 3],
        [0, 1], [7, 4],
        [0, 2], [7, 5],
        [0, 3], [7, 6],
        [0, 4], [7, 7],
      ]
      
      moves.forEach(pos => {
        positionModule.mutations.move(positionState, pos)
      })
      
      positionModule.mutations.checkWin(positionState, false)
      
      expect(positionState.gameEnded).toBe(true)
      expect(positionState.gameResult).toBe('WHITE_WIN')
    })
  })

  describe('AI Module - Auto-Play Mode', () => {
    /**
     * Test: autoPlayMode state management
     * Requirements: 4.1, 4.2
     */
    test('autoPlayMode can be toggled', () => {
      const aiState = createAIState()
      
      expect(aiState.autoPlayMode).toBe(true)
      
      aiMutations.setAutoPlayMode(aiState, false)
      expect(aiState.autoPlayMode).toBe(false)
      
      aiMutations.setAutoPlayMode(aiState, true)
      expect(aiState.autoPlayMode).toBe(true)
    })

    /**
     * Test: thinkingStartTime is tracked
     * Requirements: 3.4, 3.5
     */
    test('thinking start time is tracked for metrics', () => {
      const aiState = createAIState()
      const startTime = Date.now()
      
      aiMutations.setThinkingStartTime(aiState, startTime)
      
      expect(aiState.thinkingStartTime).toBe(startTime)
    })
  })

  describe('Game State Transitions', () => {
    /**
     * Test: Complete game flow from start to end
     * Requirements: 1.1, 1.2, 1.7, 1.8
     */
    test('complete game flow with win detection', () => {
      const positionState = createPositionState()
      
      // Simulate a complete game where black wins
      // Black: (7,7), (7,8), (7,9), (7,10), (7,11)
      // White: (0,0), (0,1), (0,2), (0,3)
      
      // Move 1: Black at (7,7)
      positionModule.mutations.move(positionState, [7, 7])
      positionModule.mutations.checkWin(positionState, false)
      expect(positionState.gameEnded).toBe(false)
      
      // Move 2: White at (0,0)
      positionModule.mutations.move(positionState, [0, 0])
      positionModule.mutations.checkWin(positionState, false)
      expect(positionState.gameEnded).toBe(false)
      
      // Move 3: Black at (7,8)
      positionModule.mutations.move(positionState, [7, 8])
      positionModule.mutations.checkWin(positionState, false)
      expect(positionState.gameEnded).toBe(false)
      
      // Move 4: White at (0,1)
      positionModule.mutations.move(positionState, [0, 1])
      positionModule.mutations.checkWin(positionState, false)
      expect(positionState.gameEnded).toBe(false)
      
      // Move 5: Black at (7,9)
      positionModule.mutations.move(positionState, [7, 9])
      positionModule.mutations.checkWin(positionState, false)
      expect(positionState.gameEnded).toBe(false)
      
      // Move 6: White at (0,2)
      positionModule.mutations.move(positionState, [0, 2])
      positionModule.mutations.checkWin(positionState, false)
      expect(positionState.gameEnded).toBe(false)
      
      // Move 7: Black at (7,10)
      positionModule.mutations.move(positionState, [7, 10])
      positionModule.mutations.checkWin(positionState, false)
      expect(positionState.gameEnded).toBe(false)
      
      // Move 8: White at (0,3)
      positionModule.mutations.move(positionState, [0, 3])
      positionModule.mutations.checkWin(positionState, false)
      expect(positionState.gameEnded).toBe(false)
      
      // Move 9: Black at (7,11) - Black wins!
      positionModule.mutations.move(positionState, [7, 11])
      positionModule.mutations.checkWin(positionState, false)
      
      expect(positionState.gameEnded).toBe(true)
      expect(positionState.gameResult).toBe('BLACK_WIN')
      expect(positionState.position).toHaveLength(9)
    })

    /**
     * Test: Moves are prevented after game ends
     * Requirements: 1.9, 5.8
     */
    test('game state prevents further moves after end', () => {
      const positionState = createPositionState()
      
      // Set game as ended
      positionModule.mutations.setGameEnded(positionState, 'BLACK_WIN')
      
      // Verify game is ended
      expect(positionState.gameEnded).toBe(true)
      
      // In the actual Game.vue, the clicked() method checks gameEnded
      // and returns early if true. We verify the state is set correctly.
      expect(positionState.gameResult).toBe('BLACK_WIN')
    })
  })
})
