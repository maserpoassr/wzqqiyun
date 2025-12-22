<template>
  <div class="game-scene">
    <div v-if="showOrientationHint" class="orientation-overlay" @click="showOrientationHint = false">
      <i class="fa fa-mobile fa-rotate-90"></i>
      <span>为了最佳对弈体验，请旋转手机</span>
    </div>

    <div class="game-hud">
      <div class="hud-pill">
         <div class="turn-indicator" :class="{ active: playerToMove === 'BLACK' }">
           <span class="dot black"></span> 黑方
         </div>
         <div class="turn-divider">VS</div>
         <div class="turn-indicator" :class="{ active: playerToMove === 'WHITE' }">
           <span class="dot white"></span> 白方
         </div>
      </div>

      <div class="hud-status" :class="{ 'ai-thinking': thinking, 'engine-loading': !ready }">
        <template v-if="!ready">
          <span class="loading-pulse"></span>
          <span>AI 加载中 {{ Math.floor(loadingProgress * 100) }}%</span>
        </template>
        <template v-else-if="!gameStarted">
          <span class="ready-text">准备中</span>
          <span class="hint-text">选择棋子后点击开始</span>
        </template>
        <template v-else-if="gameEnded">
          <span class="result-text">{{ gameResultText }}</span>
        </template>
        <template v-else-if="thinking">
          <span class="thinking-pulse"></span>
          AI 思考中 <span class="depth-badge" v-if="outputs.pv[0]">D:{{ outputs.pv[0].depth }}</span>
        </template>
        <template v-else>
          <span>第 {{ position.length + 1 }} 手</span>
          <span class="your-turn-tag" v-if="playerToMove === playerColor">你的回合</span>
        </template>
      </div>
    </div>
    
    <div class="board-stage">
      <div class="board-container">
        <Board ref="board" :is-ai-turn="isAITurn" :preview-pv="null" @clicked="clicked"></Board>
      </div>
    </div>

    <div class="control-dock">
      <div class="dock-wrapper">
        <button class="dock-btn" @click="endGame" :disabled="!gameStarted && position.length === 0">
          <div class="icon-circle"><i class="fa fa-stop"></i></div>
          <span>结束</span>
        </button>

        <button class="dock-btn primary" :disabled="gameStarted" @click="switchPlayerColor">
          <div class="icon-circle gold">
            <span class="stone-icon" :class="playerColor === 'BLACK' ? 'is-black' : 'is-white'"></span>
          </div>
          <span>{{ playerColor === 'BLACK' ? '执黑' : '执白' }}</span>
        </button>

        <button class="dock-btn start" :disabled="gameStarted || !ready" @click="startGame">
          <div class="icon-circle green"><i class="fa fa-play"></i></div>
          <span>开始</span>
        </button>

        <button class="dock-btn" @click="showGameRules = true">
          <div class="icon-circle"><i class="fa fa-question"></i></div>
          <span>规则</span>
        </button>
      </div>
    </div>

    <GameEndPopup 
      :visible="showGameEndPopup" 
      :game-result="gameResult"
      :player-color="playerColor"
      @new-game="onPopupNewGame"
      @continue="onPopupContinue"
      @switch-and-new-game="onPopupSwitchAndNewGame"
    />
    <GameRules :visible="showGameRules" @close="showGameRules = false" />
    
    <div v-transfer-dom>
      <x-dialog v-model="showLoading" hide-on-blur>
        <div class="loading-content">
          <div class="loading-text">{{ $t('game.engineLoading') }}</div>
          <div class="loading-bar">
            <div class="loading-progress" :style="{ width: (loadingProgress * 100) + '%' }"></div>
          </div>
          <div class="loading-percent">{{ Math.floor(loadingProgress * 100) }}%</div>
        </div>
      </x-dialog>
    </div>
  </div>
</template>

<script>
import { TransferDom, XDialog } from 'vux'
import Board from '@/components/Board.vue'
import GameEndPopup from '@/components/GameEndPopup.vue'
import GameRules from '@/components/GameRules.vue'
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'
import { RENJU } from '@/store/modules/settings'

export default {
  name: 'game',
  directives: { TransferDom },
  components: { Board, GameEndPopup, GameRules, XDialog },
  data: function () {
    return {
      showLoading: false,
      showGameEndPopup: false,
      showOrientationHint: false,
      showGameRules: false,
      isPortrait: false,
      thinkingCanceled: false,
      playerColor: 'BLACK',
      gameStarted: false, // 游戏是否已开始
    }
  },
  computed: {
    ...mapState(['screenWidth', 'screenHeight']),
    ...mapState('settings', ['boardSize', 'rule']),
    ...mapState('ai', ['outputs', 'thinking', 'ready', 'loadingProgress']),
    ...mapState('position', ['position', 'lastPosition', 'winline', 'gameResult']),
    ...mapGetters('settings', ['gameRule']),
    ...mapGetters('position', ['isEmpty', 'playerToMove', 'moveLeftCount']),
    
    isAITurn() {
      return this.playerToMove !== this.playerColor
    },
    
    gameEnded() {
      return this.winline.length > 0 || this.moveLeftCount === 0
    },
    
    gameResultText() {
      if (this.gameResult === 'BLACK_WIN') return '黑方获胜'
      if (this.gameResult === 'WHITE_WIN') return '白方获胜'
      if (this.gameResult === 'DRAW') return '平局'
      return ''
    },
  },
  methods: {
    ...mapMutations('position', { newBoard: 'new' }),
    ...mapMutations('ai', ['clearUsedTime']),
    ...mapActions('position', ['makeMove']),
    ...mapActions('ai', ['think', 'thinkAutoPlay', 'stop', 'restart']),

    formatNodes(nodes) {
      if (nodes < 10000) return nodes.toString()
      if (nodes < 10000000) return Math.floor(nodes / 1000) + 'K'
      return Math.floor(nodes / 1000000) + 'M'
    },

    // 结束游戏，重置棋盘，进入准备状态
    endGame() {
      if (this.thinking) { this.stop() }
      this.newBoard(this.boardSize)
      this.restart()
      this.showGameEndPopup = false
      this.gameStarted = false
    },

    // 开始游戏
    startGame() {
      this.gameStarted = true
      // 如果玩家选择执白，AI 先下
      if (this.playerColor === 'WHITE') {
        this.$nextTick(() => { this.startAutoPlay() })
      }
    },

    // 重新开始（用于弹窗）
    newGame() {
      this.endGame()
      this.startGame()
    },

    switchPlayerColor() {
      this.playerColor = this.playerColor === 'BLACK' ? 'WHITE' : 'BLACK'
    },

    clicked(e) {
      let pos = [e.x, e.y]
      // 游戏未开始不能下棋
      if (!this.gameStarted) return
      // 游戏结束后不能下棋
      if (this.gameEnded) return
      // AI 思考中不能下棋
      if (this.thinking) return
      // 位置已有棋子
      if (!this.isEmpty(pos)) return
      // 不是玩家回合
      if (this.isAITurn) return

      // 检查禁手
      if (this.gameRule === RENJU && this.playerToMove === 'BLACK') {
        for (let forbidPos of this.outputs.forbid) {
          if (pos[0] === forbidPos[0] && pos[1] === forbidPos[1]) {
            return this.$vux.alert.show_i18n({ 
              title: this.$t('game.forbid.title'), 
              content: this.$t('game.forbid.msg') 
            })
          }
        }
      }

      // 下棋
      this.makeMove(pos)
      
      // 检查游戏是否结束
      if (this.gameEnded) {
        this.handleGameEnd()
        return
      }
      
      // AI 回合
      this.startAutoPlay()
    },

    startAutoPlay() {
      if (this.gameEnded) return
      if (!this.ready) {
        const checkReady = setInterval(() => {
          if (this.ready) {
            clearInterval(checkReady)
            this.startAutoPlay()
          }
        }, 500)
        return
      }

      this.thinkAutoPlay().then((pos) => {
        if (this.thinkingCanceled) {
          this.thinkingCanceled = false
          return
        }
        const aiPos = pos || (this.outputs.pv[0] && this.outputs.pv[0].bestline[0])
        if (!aiPos) return
        this.makeMove(aiPos)
        if (this.gameEnded) { this.handleGameEnd() }
      }).catch((error) => { console.error(error) })
    },

    handleGameEnd() { this.showGameEndPopup = true },
    onPopupNewGame() { this.showGameEndPopup = false; this.newGame() },
    onPopupContinue() { this.showGameEndPopup = false },
    onPopupSwitchAndNewGame() { 
      this.showGameEndPopup = false
      this.switchPlayerColor()
      this.newGame()
    },
    checkOrientation() {
      const isMobile = this.screenWidth <= 896
      this.isPortrait = this.screenHeight > this.screenWidth
      if (isMobile && this.isPortrait) {
        this.showOrientationHint = true
        setTimeout(() => { this.showOrientationHint = false }, 5000)
      } else {
        this.showOrientationHint = false
      }
    },
  },
  watch: {
    loadingProgress(progress) { if (progress === 1) this.showLoading = false },
  },
  mounted() {
    this.newBoard(this.boardSize)
    const hasSeenRules = localStorage.getItem('gomoku_rules_seen')
    if (!hasSeenRules) {
      this.showGameRules = true
      localStorage.setItem('gomoku_rules_seen', 'true')
    }
    this.checkOrientation()
    window.addEventListener('resize', this.checkOrientation)
    window.addEventListener('orientationchange', this.checkOrientation)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.checkOrientation)
    window.removeEventListener('orientationchange', this.checkOrientation)
  },
}
</script>

<style lang="less" scoped>
/* 变量定义 */
@gold: #d4af37;
@panel-bg: rgba(30, 30, 30, 0.6);
@blur: blur(20px);
@border: 1px solid rgba(255, 255, 255, 0.08);

.game-scene {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding-top: 70px;
  box-sizing: border-box;
  background: transparent;
}

/* 1. HUD Area */
.game-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  margin-bottom: 20px;
  max-width: 600px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}

.hud-pill {
  background: @panel-bg;
  backdrop-filter: @blur;
  -webkit-backdrop-filter: @blur;
  border-radius: 20px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  border: @border;
  font-size: 12px;
  color: #aaa;
}
.turn-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  opacity: 0.3;
  transition: all 0.3s;
  &.active { opacity: 1; color: #fff; font-weight: bold; }
}
.turn-divider { margin: 0 8px; font-size: 10px; opacity: 0.2; }
.dot {
  width: 8px; height: 8px; border-radius: 50%;
  &.black { background: #000; border: 1px solid #444; }
  &.white { background: #fff; }
}

.hud-status {
  background: @panel-bg;
  backdrop-filter: @blur;
  -webkit-backdrop-filter: @blur;
  border-radius: 8px;
  padding: 6px 12px;
  border: @border;
  font-size: 13px;
  color: #ccc;
  display: flex;
  align-items: center;
  gap: 8px;

  &.ai-thinking {
    border-color: rgba(212, 175, 55, 0.4);
    color: @gold;
  }
}

.thinking-pulse {
  width: 8px; height: 8px; background: @gold; border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.loading-pulse {
  width: 8px; height: 8px; background: #4CAF50; border-radius: 50%;
  animation: pulse 1.5s infinite;
}

.engine-loading {
  border-color: rgba(76, 175, 80, 0.4);
  color: #4CAF50;
}
@keyframes pulse { 
  0% { opacity: 0.4; transform: scale(0.8); } 
  50% { opacity: 1; transform: scale(1.2); } 
  100% { opacity: 0.4; transform: scale(0.8); } 
}

.depth-badge { 
  font-size: 10px; 
  opacity: 0.7; 
  border: 1px solid @gold; 
  padding: 0 4px; 
  border-radius: 4px; 
}
.result-text { color: @gold; font-weight: bold; letter-spacing: 1px; }
.ready-text { color: #4CAF50; font-weight: bold; }
.hint-text { font-size: 10px; color: #666; }
.your-turn-tag { 
  color: #4CAF50; 
  font-size: 10px; 
  background: rgba(76, 175, 80, 0.1); 
  padding: 2px 5px; 
  border-radius: 4px; 
}

/* 2. Board Area */
.board-stage {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.board-container {
  box-shadow: 0 20px 50px rgba(0,0,0,0.6);
  border-radius: 4px;
  position: relative;
  z-index: 10;
}

/* 3. Control Dock */
.control-dock {
  padding-bottom: env(safe-area-inset-bottom, 20px);
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.dock-wrapper {
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  padding: 10px 20px;
  display: flex;
  gap: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.dock-btn {
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 0;
  width: 50px;
  
  span { font-size: 10px; color: #888; transition: color 0.3s; }
  
  &:hover span { color: #ccc; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

.icon-circle {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  display: flex; justify-content: center; align-items: center;
  font-size: 16px; color: #ccc;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border: 1px solid rgba(255,255,255,0.05);

  .dock-btn:active:not(:disabled) & { 
    transform: scale(0.9); 
    background: rgba(255,255,255,0.1); 
  }
  
  &.gold {
    background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(0,0,0,0));
    border-color: rgba(212, 175, 55, 0.3);
    color: @gold;
    box-shadow: 0 0 15px rgba(212, 175, 55, 0.1);
  }
  
  &.green {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(0,0,0,0));
    border-color: rgba(76, 175, 80, 0.4);
    color: #4CAF50;
    box-shadow: 0 0 15px rgba(76, 175, 80, 0.15);
  }
}

/* 棋子图标切换动画 */
.stone-icon {
  width: 16px; height: 16px; border-radius: 50%; display: block;
  transition: all 0.3s;
  &.is-black { 
    background: #111; 
    border: 1px solid #444; 
    box-shadow: inset 2px 2px 4px rgba(255,255,255,0.1); 
  }
  &.is-white { 
    background: #eee; 
    box-shadow: inset -2px -2px 4px rgba(0,0,0,0.2); 
  }
}

/* 方向提示 */
.orientation-overlay {
  position: fixed; top: 0; left: 0; right: 0;
  background: @gold; color: #000;
  padding: 10px; text-align: center;
  z-index: 9999; font-weight: bold; font-size: 12px;
  display: flex; justify-content: center; align-items: center; gap: 10px;
}

/* Loading Dialog */
.loading-content {
  padding: 30px;
  text-align: center;
}
.loading-text {
  color: #ccc;
  margin-bottom: 20px;
  font-size: 14px;
}
.loading-bar {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}
.loading-progress {
  height: 100%;
  background: @gold;
  transition: width 0.3s;
  box-shadow: 0 0 10px @gold;
}
.loading-percent {
  margin-top: 15px;
  color: @gold;
  font-size: 18px;
  font-weight: bold;
}

/* Mobile responsive */
@media screen and (max-width: 480px) {
  .game-scene {
    padding-top: 50px;
  }
  
  .game-hud {
    padding: 0 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .hud-pill {
    font-size: 10px;
    padding: 4px 8px;
  }
  
  .hud-status {
    font-size: 11px;
    padding: 4px 8px;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .hint-text {
    font-size: 9px;
  }
  
  .dock-wrapper {
    padding: 8px 12px;
    gap: 12px;
    border-radius: 20px;
  }
  
  .dock-btn {
    width: 42px;
    gap: 4px;
    span { font-size: 9px; }
  }
  
  .icon-circle {
    width: 34px;
    height: 34px;
    font-size: 13px;
  }
  
  .stone-icon {
    width: 14px;
    height: 14px;
  }
}

/* Small phones (iPhone SE, etc.) */
@media screen and (max-width: 375px) {
  .game-scene {
    padding-top: 45px;
  }
  
  .game-hud {
    padding: 0 8px;
    margin-bottom: 8px;
  }
  
  .hud-pill {
    font-size: 9px;
    padding: 3px 6px;
  }
  
  .turn-divider {
    margin: 0 4px;
  }
  
  .dot {
    width: 6px;
    height: 6px;
  }
  
  .hud-status {
    font-size: 10px;
    padding: 3px 6px;
  }
  
  .dock-wrapper {
    padding: 6px 10px;
    gap: 10px;
  }
  
  .dock-btn {
    width: 38px;
    span { font-size: 8px; }
  }
  
  .icon-circle {
    width: 30px;
    height: 30px;
    font-size: 12px;
  }
}

/* Landscape mode on phones */
@media screen and (max-width: 896px) and (orientation: landscape) {
  .game-scene {
    padding-top: 10px;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 15px;
  }
  
  .game-hud {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 0 10px;
    z-index: 100;
  }
  
  .board-stage {
    flex: none;
    max-height: calc(100vh - 20px);
    max-width: calc(100vh - 20px);
  }
  
  .control-dock {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 0;
  }
  
  .dock-wrapper {
    padding: 6px 12px;
    gap: 12px;
  }
  
  .dock-btn {
    width: 40px;
    span { font-size: 8px; }
  }
  
  .icon-circle {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
}

/* Tablets (iPad, etc.) */
@media screen and (min-width: 481px) and (max-width: 1024px) {
  .game-scene {
    padding-top: 60px;
  }
  
  .game-hud {
    max-width: 500px;
    margin-bottom: 15px;
  }
  
  .hud-pill {
    font-size: 13px;
    padding: 8px 14px;
  }
  
  .hud-status {
    font-size: 14px;
    padding: 8px 14px;
  }
  
  .dock-wrapper {
    padding: 12px 24px;
    gap: 24px;
  }
  
  .dock-btn {
    width: 55px;
    span { font-size: 11px; }
  }
  
  .icon-circle {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
  
  .stone-icon {
    width: 18px;
    height: 18px;
  }
}

/* Tablet landscape */
@media screen and (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) {
  .game-scene {
    padding-top: 50px;
  }
  
  .game-hud {
    max-width: 600px;
  }
  
  .board-stage {
    max-height: calc(100vh - 180px);
  }
}

/* Large tablets and small desktops */
@media screen and (min-width: 1025px) {
  .game-hud {
    max-width: 650px;
  }
  
  .hud-pill {
    font-size: 14px;
    padding: 8px 16px;
  }
  
  .hud-status {
    font-size: 15px;
    padding: 8px 16px;
  }
  
  .dock-wrapper {
    padding: 14px 28px;
    gap: 28px;
  }
  
  .dock-btn {
    width: 60px;
    span { font-size: 12px; }
  }
  
  .icon-circle {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
}
</style>
