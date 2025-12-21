/**
 * Unit Tests for Board State Management (src/store/modules/position.js)
 * Requirements: 1.1, 1.2, 1.7, 5.5, 5.6
 */

import positionModule from '@/store/modules/position'

// Constants from position.js
const EMPTY = 0
const BLACK = 1
const WHITE = 2

// Helper to create a fresh state
function createState(size = 15) {
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

// Helper to convert position to index
function toIndex(p, size) {
  if (p[0] < 0 || p[1] < 0 || p[0] >= size || p[1] >= size) return -1
  return p[1] * size + p[0]
}

describe('Position Store Module - Board State Management', () => {
  describe('makeMove() - Piece Placement', () => {
    /**
     * Test: makeMove() places correct piece color
     * Requirements: 1.1 - WHEN a player clicks an empty board cell, THE System SHALL place a black piece at that position
     */
    test('places black piece on first move', () => {
      const state = createState()
      const pos = [7, 7]
      
      // Simulate move mutation
      positionModule.mutations.move(state, pos)
      
      expect(state.board[toIndex(pos, state.size)]).toBe(BLACK)
      expect(state.position).toHaveLength(1)
      expect(state.position[0]).toEqual(pos)
    })

    test('places white piece on second move', () => {
      const state = createState()
      
      // First move (black)
      positionModule.mutations.move(state, [7, 7])
      // Second move (white)
      positionModule.mutations.move(state, [8, 8])
      
      expect(state.board[toIndex([7, 7], state.size)]).toBe(BLACK)
      expect(state.board[toIndex([8, 8], state.size)]).toBe(WHITE)
      expect(state.position).toHaveLength(2)
    })

    test('alternates piece colors correctly', () => {
      const state = createState()
      const moves = [[7, 7], [8, 8], [6, 6], [9, 9], [5, 5]]
      
      moves.forEach(pos => {
        positionModule.mutations.move(state, pos)
      })
      
      // Odd indices (0, 2, 4) should be BLACK
      expect(state.board[toIndex([7, 7], state.size)]).toBe(BLACK)
      expect(state.board[toIndex([6, 6], state.size)]).toBe(BLACK)
      expect(state.board[toIndex([5, 5], state.size)]).toBe(BLACK)
      
      // Even indices (1, 3) should be WHITE
      expect(state.board[toIndex([8, 8], state.size)]).toBe(WHITE)
      expect(state.board[toIndex([9, 9], state.size)]).toBe(WHITE)
    })
  })

  describe('checkWin() - Win Detection', () => {
    /**
     * Test: checkWin() detects horizontal winning line
     * Requirements: 1.2, 5.5 - WHEN five pieces form a line (horizontal), THE System SHALL detect the win condition
     */
    test('detects horizontal win for black', () => {
      const state = createState()
      
      // Create horizontal line: black at (3,7), (4,7), (5,7), (6,7), (7,7)
      // Interleave with white moves
      const moves = [
        [3, 7], [0, 0],  // Black, White
        [4, 7], [0, 1],  // Black, White
        [5, 7], [0, 2],  // Black, White
        [6, 7], [0, 3],  // Black, White
        [7, 7],          // Black wins
      ]
      
      moves.forEach(pos => {
        positionModule.mutations.move(state, pos)
      })
      
      positionModule.mutations.checkWin(state, false)
      
      expect(state.winline).toHaveLength(2)
      expect(state.gameEnded).toBe(true)
      expect(state.gameResult).toBe('BLACK_WIN')
    })

    /**
     * Test: checkWin() detects vertical winning line
     * Requirements: 1.2, 5.5 - WHEN five pieces form a line (vertical), THE System SHALL detect the win condition
     */
    test('detects vertical win for white', () => {
      const state = createState()
      
      // Create vertical line for white: (7,3), (7,4), (7,5), (7,6), (7,7)
      // Black moves first, then white
      const moves = [
        [0, 0], [7, 3],  // Black, White
        [0, 1], [7, 4],  // Black, White
        [0, 2], [7, 5],  // Black, White
        [0, 3], [7, 6],  // Black, White
        [0, 4], [7, 7],  // Black, White wins
      ]
      
      moves.forEach(pos => {
        positionModule.mutations.move(state, pos)
      })
      
      positionModule.mutations.checkWin(state, false)
      
      expect(state.winline).toHaveLength(2)
      expect(state.gameEnded).toBe(true)
      expect(state.gameResult).toBe('WHITE_WIN')
    })

    /**
     * Test: checkWin() detects diagonal winning line (top-left to bottom-right)
     * Requirements: 1.2, 5.5 - WHEN five pieces form a line (diagonal), THE System SHALL detect the win condition
     */
    test('detects diagonal win (\\)', () => {
      const state = createState()
      
      // Create diagonal line for black: (3,3), (4,4), (5,5), (6,6), (7,7)
      const moves = [
        [3, 3], [0, 0],
        [4, 4], [0, 1],
        [5, 5], [0, 2],
        [6, 6], [0, 3],
        [7, 7],
      ]
      
      moves.forEach(pos => {
        positionModule.mutations.move(state, pos)
      })
      
      positionModule.mutations.checkWin(state, false)
      
      expect(state.winline).toHaveLength(2)
      expect(state.gameEnded).toBe(true)
      expect(state.gameResult).toBe('BLACK_WIN')
    })

    /**
     * Test: checkWin() detects diagonal winning line (top-right to bottom-left)
     * Requirements: 1.2, 5.5
     */
    test('detects diagonal win (/)', () => {
      const state = createState()
      
      // Create diagonal line for black: (7,3), (6,4), (5,5), (4,6), (3,7)
      const moves = [
        [7, 3], [0, 0],
        [6, 4], [0, 1],
        [5, 5], [0, 2],
        [4, 6], [0, 3],
        [3, 7],
      ]
      
      moves.forEach(pos => {
        positionModule.mutations.move(state, pos)
      })
      
      positionModule.mutations.checkWin(state, false)
      
      expect(state.winline).toHaveLength(2)
      expect(state.gameEnded).toBe(true)
      expect(state.gameResult).toBe('BLACK_WIN')
    })

    /**
     * Test: checkWin() does not detect win with only 4 in a row
     */
    test('does not detect win with only 4 pieces in a row', () => {
      const state = createState()
      
      // Create only 4 in a row
      const moves = [
        [3, 7], [0, 0],
        [4, 7], [0, 1],
        [5, 7], [0, 2],
        [6, 7], [0, 3],
      ]
      
      moves.forEach(pos => {
        positionModule.mutations.move(state, pos)
      })
      
      positionModule.mutations.checkWin(state, false)
      
      expect(state.winline).toHaveLength(0)
      expect(state.gameEnded).toBe(false)
      expect(state.gameResult).toBeNull()
    })
  })

  describe('Draw Detection', () => {
    /**
     * Test: checkWin() detects draw condition
     * Requirements: 1.2, 5.6 - WHEN the board is completely filled with no winner, THE System SHALL detect a draw condition
     */
    test('detects draw when board is full with no winner', () => {
      const size = 3 // Use small board for easier testing
      const state = createState(size)
      
      // Fill the board without creating a winning line
      // This is a simplified test - in real 15x15 board, draw is rare
      // Pattern that doesn't create 5-in-a-row (for 3x3, no 5-in-a-row possible)
      const moves = [
        [0, 0], [1, 0], [2, 0],
        [0, 1], [1, 1], [2, 1],
        [0, 2], [1, 2], [2, 2],
      ]
      
      moves.forEach(pos => {
        positionModule.mutations.move(state, pos)
      })
      
      positionModule.mutations.checkWin(state, false)
      
      expect(state.gameEnded).toBe(true)
      expect(state.gameResult).toBe('DRAW')
    })
  })

  describe('gameEnded State', () => {
    /**
     * Test: gameEnded state is set correctly after win
     * Requirements: 5.5
     */
    test('gameEnded is true after win detection', () => {
      const state = createState()
      
      // Create winning line
      const moves = [
        [3, 7], [0, 0],
        [4, 7], [0, 1],
        [5, 7], [0, 2],
        [6, 7], [0, 3],
        [7, 7],
      ]
      
      moves.forEach(pos => {
        positionModule.mutations.move(state, pos)
      })
      
      positionModule.mutations.checkWin(state, false)
      
      expect(state.gameEnded).toBe(true)
    })

    /**
     * Test: setGameEnded mutation works correctly
     */
    test('setGameEnded mutation sets state correctly', () => {
      const state = createState()
      
      positionModule.mutations.setGameEnded(state, 'BLACK_WIN')
      
      expect(state.gameEnded).toBe(true)
      expect(state.gameResult).toBe('BLACK_WIN')
    })
  })

  describe('resetGame()', () => {
    /**
     * Test: resetGame clears board and game state
     * Requirements: 5.1, 5.2, 5.3
     */
    test('resets board to empty state', () => {
      const state = createState()
      
      // Make some moves
      positionModule.mutations.move(state, [7, 7])
      positionModule.mutations.move(state, [8, 8])
      positionModule.mutations.setGameEnded(state, 'BLACK_WIN')
      
      // Reset
      positionModule.mutations.resetGame(state, 15)
      
      expect(state.position).toHaveLength(0)
      expect(state.lastPosition).toHaveLength(0)
      expect(state.winline).toHaveLength(0)
      expect(state.gameEnded).toBe(false)
      expect(state.gameResult).toBeNull()
      expect(state.board.every(cell => cell === EMPTY)).toBe(true)
    })
  })

  describe('Getters', () => {
    test('isEmpty returns true for empty cell', () => {
      const state = createState()
      const isEmpty = positionModule.getters.isEmpty(state)
      
      expect(isEmpty([7, 7])).toBe(true)
    })

    test('isEmpty returns false for occupied cell', () => {
      const state = createState()
      positionModule.mutations.move(state, [7, 7])
      const isEmpty = positionModule.getters.isEmpty(state)
      
      expect(isEmpty([7, 7])).toBe(false)
    })

    test('playerToMove returns BLACK on even moves', () => {
      const state = createState()
      const playerToMove = positionModule.getters.playerToMove(state)
      
      expect(playerToMove).toBe('BLACK')
    })

    test('playerToMove returns WHITE on odd moves', () => {
      const state = createState()
      positionModule.mutations.move(state, [7, 7])
      const playerToMove = positionModule.getters.playerToMove(state)
      
      expect(playerToMove).toBe('WHITE')
    })

    test('isInBoard returns true for valid positions', () => {
      const state = createState()
      const isInBoard = positionModule.getters.isInBoard(state)
      
      expect(isInBoard([0, 0])).toBe(true)
      expect(isInBoard([14, 14])).toBe(true)
      expect(isInBoard([7, 7])).toBe(true)
    })

    test('isInBoard returns false for invalid positions', () => {
      const state = createState()
      const isInBoard = positionModule.getters.isInBoard(state)
      
      expect(isInBoard([-1, 0])).toBe(false)
      expect(isInBoard([0, -1])).toBe(false)
      expect(isInBoard([15, 0])).toBe(false)
      expect(isInBoard([0, 15])).toBe(false)
    })
  })
})
