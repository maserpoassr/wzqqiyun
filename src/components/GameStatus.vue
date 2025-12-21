<template>
  <div class="game-status" :class="{ 'game-ended': gameEnded }">
    <div class="status-content">
      <!-- Turn indicator (Requirements: 5.4) -->
      <div class="turn-indicator">
        <div class="turn-icon" :class="turnIconClass">
          <i v-if="thinking" class="fa fa-cog fa-spin" aria-hidden="true"></i>
          <span v-else class="stone" :class="stoneClass"></span>
        </div>
        <span class="turn-text">{{ turnText }}</span>
      </div>
      
      <!-- Move count (Requirements: 5.4) -->
      <div class="move-count">
        <i class="fa fa-hashtag" aria-hidden="true"></i>
        <span>{{ $t('game.status.moveCount', { count: moveCount }) }}</span>
      </div>
      
      <!-- Game result when ended (Requirements: 5.4) -->
      <div v-if="gameEnded" class="game-result-badge" :class="resultClass">
        <i :class="resultIcon" aria-hidden="true"></i>
        <span>{{ resultText }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'GameStatus',
  computed: {
    ...mapState('ai', ['thinking']),
    ...mapState('position', ['position', 'winline', 'gameResult']),
    ...mapState('settings', ['autoPlayMode']),
    ...mapGetters('position', ['playerToMove', 'moveLeftCount']),
    
    moveCount() {
      return this.position.length
    },
    
    gameEnded() {
      return this.winline.length > 0 || this.moveLeftCount === 0
    },
    
    turnText() {
      if (this.gameEnded) {
        return this.resultText
      }
      if (this.thinking) {
        return this.$t('game.status.aiThinking')
      }
      return this.playerToMove === 'BLACK' 
        ? this.$t('game.status.blackTurn')
        : this.$t('game.status.whiteTurn')
    },
    
    turnIconClass() {
      if (this.thinking) return 'thinking'
      return this.playerToMove === 'BLACK' ? 'black-turn' : 'white-turn'
    },
    
    stoneClass() {
      return this.playerToMove === 'BLACK' ? 'black-stone' : 'white-stone'
    },
    
    resultText() {
      if (!this.gameResult) {
        if (this.moveLeftCount === 0) {
          return this.$t('game.result.draw')
        }
        return ''
      }
      switch (this.gameResult) {
        case 'BLACK_WIN':
          return this.$t('game.result.blackWin')
        case 'WHITE_WIN':
          return this.$t('game.result.whiteWin')
        case 'DRAW':
          return this.$t('game.result.draw')
        default:
          return ''
      }
    },
    
    resultClass() {
      if (!this.gameResult) {
        if (this.moveLeftCount === 0) return 'draw'
        return ''
      }
      switch (this.gameResult) {
        case 'BLACK_WIN':
          return 'black-win'
        case 'WHITE_WIN':
          return 'white-win'
        case 'DRAW':
          return 'draw'
        default:
          return ''
      }
    },
    
    resultIcon() {
      if (!this.gameResult) {
        if (this.moveLeftCount === 0) return 'fa fa-handshake-o'
        return ''
      }
      switch (this.gameResult) {
        case 'BLACK_WIN':
        case 'WHITE_WIN':
          return 'fa fa-trophy'
        case 'DRAW':
          return 'fa fa-handshake-o'
        default:
          return ''
      }
    }
  }
}
</script>

<style lang="less" scoped>
.game-status {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 12px 16px;
  margin: 10px auto;
  max-width: 400px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  
  &.game-ended {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
  }
}

.status-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

/* Turn indicator */
.turn-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.turn-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.thinking {
    background: linear-gradient(135deg, #229954 0%, #1E8449 100%);
    color: white;
    
    i {
      font-size: 14px;
    }
  }
  
  &.black-turn {
    background: #333;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  &.white-turn {
    background: #fff;
    border: 2px solid #333;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  }
}

.stone {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  
  &.black-stone {
    background: radial-gradient(circle at 30% 30%, #555, #000);
  }
  
  &.white-stone {
    background: radial-gradient(circle at 30% 30%, #fff, #ddd);
    border: 1px solid #ccc;
  }
}

.turn-text {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* Move count */
.move-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  background: rgba(255, 255, 255, 0.7);
  padding: 6px 12px;
  border-radius: 16px;
  
  i {
    font-size: 11px;
    color: #888;
  }
}

/* Game result badge */
.game-result-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  
  &.black-win {
    background: linear-gradient(135deg, #333 0%, #555 100%);
    color: white;
  }
  
  &.white-win {
    background: linear-gradient(135deg, #229954 0%, #1E8449 100%);
    color: white;
  }
  
  &.draw {
    background: linear-gradient(135deg, #F39C12 0%, #D68910 100%);
    color: white;
  }
  
  i {
    font-size: 12px;
  }
}

/* Mobile responsive */
@media (max-width: 480px) {
  .game-status {
    padding: 10px 14px;
    margin: 8px auto;
  }
  
  .status-content {
    gap: 8px;
  }
  
  .turn-icon {
    width: 24px;
    height: 24px;
  }
  
  .stone {
    width: 14px;
    height: 14px;
  }
  
  .turn-text {
    font-size: 13px;
  }
  
  .move-count {
    font-size: 12px;
    padding: 5px 10px;
  }
  
  .game-result-badge {
    font-size: 12px;
    padding: 5px 10px;
  }
}

/* Tablet */
@media (min-width: 481px) and (max-width: 1023px) {
  .game-status {
    max-width: 450px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .game-status {
    max-width: 500px;
  }
}
</style>
