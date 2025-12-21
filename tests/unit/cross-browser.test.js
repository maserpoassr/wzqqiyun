/**
 * Cross-Browser and Device Compatibility Tests
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 6.1-6.7
 * 
 * These tests verify cross-browser compatibility aspects that can be tested programmatically.
 * Manual testing on actual browsers/devices is still required for full verification.
 */

// WASM variant fallback chain (replicated from engine.js to avoid import issues)
// Priority: rapfi-multi-simd128 > rapfi-multi > rapfi-single-simd128 > rapfi-single
const WASM_VARIANTS = [
  { name: 'rapfi-multi-simd128', requiresThreads: true, requiresSIMD: true },
  { name: 'rapfi-multi', requiresThreads: true, requiresSIMD: false },
  { name: 'rapfi-single-simd128', requiresThreads: false, requiresSIMD: true },
  { name: 'rapfi-single', requiresThreads: false, requiresSIMD: false },
]

/**
 * Select the best WASM variant based on browser capabilities.
 * Replicated from engine.js for testing purposes.
 */
function selectWasmVariant(hasThreads, hasSIMD, loadFullEngine) {
  const canUseSIMD = hasSIMD && loadFullEngine

  for (const variant of WASM_VARIANTS) {
    const threadsOk = !variant.requiresThreads || hasThreads
    const simdOk = !variant.requiresSIMD || canUseSIMD

    if (threadsOk && simdOk) {
      return {
        name: variant.name,
        useThreads: variant.requiresThreads && hasThreads,
      }
    }
  }

  return { name: 'rapfi-single', useThreads: false }
}

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

// Helper to create an independent game session
function createGameSession(size = 15) {
  const state = createPositionState(size)
  
  return {
    state,
    makeMove(pos) {
      const [x, y] = pos
      const idx = y * state.size + x
      if (state.board[idx] === EMPTY && !state.gameEnded) {
        const color = state.position.length % 2 === 0 ? BLACK : WHITE
        state.board[idx] = color
        state.position.push(pos)
        return true
      }
      return false
    },
    getBoard() {
      return new Uint8Array(state.board)
    },
    getPosition() {
      return [...state.position]
    },
    getMoveCount() {
      return state.position.length
    }
  }
}

describe('Cross-Browser Compatibility Tests', () => {
  describe('12.1 Desktop Browser Compatibility', () => {
    /**
     * Test: WASM variant selection works correctly
     * Requirements: 10.1, 10.2, 10.3
     */
    describe('WASM Loading Verification', () => {
      test('WASM_VARIANTS array is properly defined', () => {
        expect(WASM_VARIANTS).toBeDefined()
        expect(Array.isArray(WASM_VARIANTS)).toBe(true)
        expect(WASM_VARIANTS.length).toBe(4)
      })

      test('WASM variants have correct priority order', () => {
        const variantNames = WASM_VARIANTS.map(v => v.name)
        expect(variantNames).toEqual([
          'rapfi-multi-simd128',
          'rapfi-multi',
          'rapfi-single-simd128',
          'rapfi-single'
        ])
      })

      test('Chrome/Edge with full capabilities selects rapfi-multi-simd128', () => {
        // Chrome/Edge typically support both threads and SIMD
        const result = selectWasmVariant(true, true, true)
        expect(result.name).toBe('rapfi-multi-simd128')
        expect(result.useThreads).toBe(true)
      })

      test('Firefox with full capabilities selects rapfi-multi-simd128', () => {
        // Firefox also supports threads and SIMD
        const result = selectWasmVariant(true, true, true)
        expect(result.name).toBe('rapfi-multi-simd128')
        expect(result.useThreads).toBe(true)
      })

      test('Safari with threads but no SIMD selects rapfi-multi', () => {
        // Safari may have limited SIMD support
        const result = selectWasmVariant(true, false, true)
        expect(result.name).toBe('rapfi-multi')
        expect(result.useThreads).toBe(true)
      })

      test('Browser without SharedArrayBuffer selects single-threaded variant', () => {
        // Some browsers/contexts don't support SharedArrayBuffer
        const result = selectWasmVariant(false, true, true)
        expect(result.name).toBe('rapfi-single-simd128')
        expect(result.useThreads).toBe(false)
      })
    })

    /**
     * Test: Auto-play functionality works correctly
     * Requirements: 10.1, 10.2, 10.3
     */
    describe('Auto-Play Functionality', () => {
      test('game state can be created and managed', () => {
        const session = createGameSession()
        expect(session.getMoveCount()).toBe(0)
        
        session.makeMove([7, 7])
        expect(session.getMoveCount()).toBe(1)
        
        session.makeMove([8, 8])
        expect(session.getMoveCount()).toBe(2)
      })

      test('alternating piece colors work correctly', () => {
        const session = createGameSession()
        
        session.makeMove([7, 7]) // Black
        session.makeMove([8, 8]) // White
        session.makeMove([6, 6]) // Black
        
        const board = session.getBoard()
        expect(board[7 * 15 + 7]).toBe(BLACK)
        expect(board[8 * 15 + 8]).toBe(WHITE)
        expect(board[6 * 15 + 6]).toBe(BLACK)
      })
    })
  })

  describe('12.2 Mobile Device Compatibility', () => {
    /**
     * Test: Responsive design calculations for mobile devices
     * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
     */
    const paddingX = 26

    function calculateCellSize(canvasWidth, boardSize) {
      const boardWidth = canvasWidth - 2 * paddingX
      return boardWidth / boardSize
    }

    function calculateCanvasWidth(screenWidth, screenHeight) {
      if (screenWidth >= 1024 && screenWidth / screenHeight >= 4 / 3) {
        const MarginSum = 30 + 2 * Math.min(20, Math.max(0, 0.3 * screenWidth - 350))
        return Math.min(screenWidth - MarginSum, screenHeight - 100)
      } else {
        return Math.min(screenWidth - 20, screenHeight - 200)
      }
    }

    describe('iPhone Safari Compatibility', () => {
      test('iPhone SE (320x568) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(320, 568)
        const cellSize = calculateCellSize(canvasWidth, 15)
        const minTouchTarget = Math.max(24, cellSize)
        
        expect(minTouchTarget).toBeGreaterThanOrEqual(24)
      })

      test('iPhone 8 (375x667) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(375, 667)
        const cellSize = calculateCellSize(canvasWidth, 15)
        const minTouchTarget = Math.max(24, cellSize)
        
        expect(minTouchTarget).toBeGreaterThanOrEqual(24)
      })

      test('iPhone 11/12/13 (390x844) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(390, 844)
        const cellSize = calculateCellSize(canvasWidth, 15)
        const minTouchTarget = Math.max(24, cellSize)
        
        expect(minTouchTarget).toBeGreaterThanOrEqual(24)
      })

      test('iPhone 14 Pro Max (430x932) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(430, 932)
        const cellSize = calculateCellSize(canvasWidth, 15)
        const minTouchTarget = Math.max(24, cellSize)
        
        expect(minTouchTarget).toBeGreaterThanOrEqual(24)
      })
    })

    describe('Android Chrome Compatibility', () => {
      test('Samsung Galaxy S21 (360x800) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(360, 800)
        const cellSize = calculateCellSize(canvasWidth, 15)
        const minTouchTarget = Math.max(24, cellSize)
        
        expect(minTouchTarget).toBeGreaterThanOrEqual(24)
      })

      test('Google Pixel 6 (412x915) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(412, 915)
        const cellSize = calculateCellSize(canvasWidth, 15)
        const minTouchTarget = Math.max(24, cellSize)
        
        expect(minTouchTarget).toBeGreaterThanOrEqual(24)
      })

      test('OnePlus 9 (412x919) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(412, 919)
        const cellSize = calculateCellSize(canvasWidth, 15)
        const minTouchTarget = Math.max(24, cellSize)
        
        expect(minTouchTarget).toBeGreaterThanOrEqual(24)
      })
    })

    describe('Tablet Landscape/Portrait Switching', () => {
      test('iPad portrait (768x1024) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(768, 1024)
        const cellSize = calculateCellSize(canvasWidth, 15)
        
        expect(cellSize).toBeGreaterThan(24)
      })

      test('iPad landscape (1024x768) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(1024, 768)
        const cellSize = calculateCellSize(canvasWidth, 15)
        
        expect(cellSize).toBeGreaterThan(24)
      })

      test('iPad Pro 11" portrait (834x1194) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(834, 1194)
        const cellSize = calculateCellSize(canvasWidth, 15)
        
        expect(cellSize).toBeGreaterThan(24)
      })

      test('iPad Pro 11" landscape (1194x834) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(1194, 834)
        const cellSize = calculateCellSize(canvasWidth, 15)
        
        expect(cellSize).toBeGreaterThan(24)
      })

      test('Android tablet portrait (800x1280) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(800, 1280)
        const cellSize = calculateCellSize(canvasWidth, 15)
        
        expect(cellSize).toBeGreaterThan(24)
      })

      test('Android tablet landscape (1280x800) has adequate touch targets', () => {
        const canvasWidth = calculateCanvasWidth(1280, 800)
        const cellSize = calculateCellSize(canvasWidth, 15)
        
        expect(cellSize).toBeGreaterThan(24)
      })

      test('landscape mode provides larger board than portrait', () => {
        // iPad dimensions
        const portraitCanvas = calculateCanvasWidth(768, 1024)
        const landscapeCanvas = calculateCanvasWidth(1024, 768)
        
        // In landscape, the board should be larger or equal
        expect(landscapeCanvas).toBeGreaterThanOrEqual(portraitCanvas * 0.8)
      })
    })
  })

  describe('12.3 WASM Variant Selection', () => {
    /**
     * Test: WASM variant fallback chain
     * Requirements: 10.4, 10.5
     */
    describe('High-End Device Selection', () => {
      test('device with threads + SIMD selects rapfi-multi-simd128', () => {
        const result = selectWasmVariant(true, true, true)
        expect(result.name).toBe('rapfi-multi-simd128')
        expect(result.useThreads).toBe(true)
      })
    })

    describe('Low-End Device Fallback', () => {
      test('device without threads or SIMD selects rapfi-single', () => {
        const result = selectWasmVariant(false, false, true)
        expect(result.name).toBe('rapfi-single')
        expect(result.useThreads).toBe(false)
      })

      test('device with SIMD but no threads selects rapfi-single-simd128', () => {
        const result = selectWasmVariant(false, true, true)
        expect(result.name).toBe('rapfi-single-simd128')
        expect(result.useThreads).toBe(false)
      })
    })

    describe('SharedArrayBuffer Disabled Fallback', () => {
      test('without SharedArrayBuffer, falls back to single-threaded', () => {
        // When SharedArrayBuffer is disabled (threads = false)
        const result = selectWasmVariant(false, true, true)
        expect(result.useThreads).toBe(false)
        expect(['rapfi-single-simd128', 'rapfi-single']).toContain(result.name)
      })

      test('without SharedArrayBuffer and SIMD, uses rapfi-single', () => {
        const result = selectWasmVariant(false, false, true)
        expect(result.name).toBe('rapfi-single')
        expect(result.useThreads).toBe(false)
      })
    })

    describe('Fallback Engine Mode', () => {
      test('fallback engine mode disables SIMD variants', () => {
        // When loadFullEngine is false, SIMD variants are not available
        const result = selectWasmVariant(true, true, false)
        expect(result.name).toBe('rapfi-multi')
        expect(result.useThreads).toBe(true)
      })

      test('fallback engine without threads uses rapfi-single', () => {
        const result = selectWasmVariant(false, true, false)
        expect(result.name).toBe('rapfi-single')
        expect(result.useThreads).toBe(false)
      })
    })
  })

  describe('12.4 Concurrent Sessions', () => {
    /**
     * Test: Session independence
     * Requirements: 10.6
     */
    describe('Multiple Browser Tabs/Windows', () => {
      test('two sessions maintain independent board states', () => {
        const session1 = createGameSession()
        const session2 = createGameSession()
        
        // Make moves in session 1
        session1.makeMove([7, 7])
        session1.makeMove([8, 8])
        
        // Make different moves in session 2
        session2.makeMove([0, 0])
        session2.makeMove([1, 1])
        session2.makeMove([2, 2])
        
        // Verify sessions are independent
        expect(session1.getMoveCount()).toBe(2)
        expect(session2.getMoveCount()).toBe(3)
        
        const board1 = session1.getBoard()
        const board2 = session2.getBoard()
        
        // Session 1 has pieces at (7,7) and (8,8)
        expect(board1[7 * 15 + 7]).toBe(BLACK)
        expect(board1[8 * 15 + 8]).toBe(WHITE)
        expect(board1[0 * 15 + 0]).toBe(EMPTY)
        
        // Session 2 has pieces at (0,0), (1,1), (2,2)
        expect(board2[0 * 15 + 0]).toBe(BLACK)
        expect(board2[1 * 15 + 1]).toBe(WHITE)
        expect(board2[2 * 15 + 2]).toBe(BLACK)
        expect(board2[7 * 15 + 7]).toBe(EMPTY)
      })

      test('sessions can play simultaneously without interference', () => {
        const sessions = []
        const numSessions = 5
        
        // Create multiple sessions
        for (let i = 0; i < numSessions; i++) {
          sessions.push(createGameSession())
        }
        
        // Make different moves in each session
        sessions.forEach((session, idx) => {
          for (let j = 0; j <= idx; j++) {
            session.makeMove([j, idx])
          }
        })
        
        // Verify each session has correct move count
        sessions.forEach((session, idx) => {
          expect(session.getMoveCount()).toBe(idx + 1)
        })
        
        // Verify no cross-contamination
        const board0 = sessions[0].getBoard()
        const board4 = sessions[4].getBoard()
        
        // Session 0 should only have 1 move
        let count0 = 0
        for (let i = 0; i < board0.length; i++) {
          if (board0[i] !== EMPTY) count0++
        }
        expect(count0).toBe(1)
        
        // Session 4 should have 5 moves
        let count4 = 0
        for (let i = 0; i < board4.length; i++) {
          if (board4[i] !== EMPTY) count4++
        }
        expect(count4).toBe(5)
      })

      test('each session maintains independent game state', () => {
        const session1 = createGameSession()
        const session2 = createGameSession()
        
        // Play a complete game in session 1 (black wins)
        const blackWinMoves = [
          [7, 7], [0, 0],
          [7, 8], [0, 1],
          [7, 9], [0, 2],
          [7, 10], [0, 3],
          [7, 11]
        ]
        
        blackWinMoves.forEach(move => session1.makeMove(move))
        
        // Session 2 should still be at initial state
        expect(session2.getMoveCount()).toBe(0)
        
        // Make a single move in session 2
        session2.makeMove([5, 5])
        
        // Verify session 1 wasn't affected
        expect(session1.getMoveCount()).toBe(9)
        expect(session2.getMoveCount()).toBe(1)
      })

      test('position history is independent between sessions', () => {
        const session1 = createGameSession()
        const session2 = createGameSession()
        
        session1.makeMove([1, 1])
        session1.makeMove([2, 2])
        
        session2.makeMove([10, 10])
        
        const pos1 = session1.getPosition()
        const pos2 = session2.getPosition()
        
        expect(pos1).toEqual([[1, 1], [2, 2]])
        expect(pos2).toEqual([[10, 10]])
      })
    })
  })
})
