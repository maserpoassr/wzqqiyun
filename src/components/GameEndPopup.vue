<template>
  <transition name="fade-scale">
    <div v-if="visible" class="modal-overlay" @click.self="onContinue">
      <div class="modal-card">
        <div class="result-icon-wrapper">
          <div class="glow-bg"></div>
          <div class="icon-emoji">{{ resultIcon }}</div>
        </div>
        
        <h2 class="modal-title">{{ resultTitle }}</h2>
        <p class="modal-desc">{{ resultMessage }}</p>

        <div class="modal-actions">
          <button class="btn-primary" @click="onNewGame">
            <span>再来一局</span>
          </button>
          <button class="btn-secondary" @click="onSwitchAndNewGame">
            <span class="stone-icon" :class="playerColor === 'BLACK' ? 'is-white' : 'is-black'"></span>
            <span>换{{ playerColor === 'BLACK' ? '白' : '黑' }}棋</span>
          </button>
          <button class="btn-text" @click="onContinue">
            查看棋盘
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'GameEndPopup',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    gameResult: {
      type: String,
      default: null,
      validator: (value) => ['BLACK_WIN', 'WHITE_WIN', 'DRAW', null].includes(value),
    },
    playerColor: {
      type: String,
      default: 'BLACK',
    },
  },
  computed: {
    // 判断是否玩家获胜
    isPlayerWin() {
      if (this.gameResult === 'BLACK_WIN' && this.playerColor === 'BLACK') return true
      if (this.gameResult === 'WHITE_WIN' && this.playerColor === 'WHITE') return true
      return false
    },
    // 判断是否AI获胜
    isAIWin() {
      if (this.gameResult === 'BLACK_WIN' && this.playerColor === 'WHITE') return true
      if (this.gameResult === 'WHITE_WIN' && this.playerColor === 'BLACK') return true
      return false
    },
    resultIcon() {
      if (this.gameResult === 'DRAW') return '🤝'
      if (this.isPlayerWin) return '🎉'
      if (this.isAIWin) return '🤖'
      return ''
    },
    resultTitle() {
      if (this.gameResult === 'DRAW') return '平局'
      if (this.isPlayerWin) return '你赢了！'
      if (this.isAIWin) return 'AI 获胜'
      return ''
    },
    resultMessage() {
      if (this.gameResult === 'DRAW') return '棋逢对手，势均力敌！'
      if (this.isPlayerWin) return '恭喜！你战胜了 AI！'
      if (this.isAIWin) return '别灰心，再来一局！'
      return ''
    },
  },
  methods: {
    onNewGame() {
      this.$emit('new-game')
    },
    onContinue() {
      this.$emit('continue')
    },
    onSwitchAndNewGame() {
      this.$emit('switch-and-new-game')
    },
  },
}
</script>

<style lang="less" scoped>
.modal-overlay {
  position: fixed; 
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  z-index: 2000;
  display: flex; 
  align-items: center; 
  justify-content: center;
}

.modal-card {
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  padding: 40px 30px;
  border-radius: 24px;
  text-align: center;
  width: 80%;
  max-width: 320px;
}

.result-icon-wrapper {
  position: relative;
  width: 80px; 
  height: 80px; 
  margin: 0 auto 20px;
  display: flex; 
  align-items: center; 
  justify-content: center;
}
.glow-bg {
  position: absolute; 
  inset: 0; 
  background: #d4af37; 
  filter: blur(30px); 
  opacity: 0.2; 
  border-radius: 50%;
}
.icon-emoji { 
  font-size: 50px; 
  position: relative; 
  z-index: 2; 
  text-shadow: 0 5px 15px rgba(0,0,0,0.3); 
}

.modal-title {
  color: #fff; 
  font-size: 24px; 
  margin: 0 0 10px; 
  font-weight: 700; 
  letter-spacing: 1px;
}
.modal-desc {
  color: #999; 
  font-size: 14px; 
  margin: 0 0 30px; 
  line-height: 1.5;
}

.modal-actions {
  display: flex; 
  flex-direction: column; 
  gap: 15px;
}

.btn-primary {
  background: linear-gradient(135deg, #d4af37 0%, #b48e24 100%);
  border: none;
  padding: 14px;
  border-radius: 12px;
  color: #1a1a1a;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.1s;
  box-shadow: 0 5px 15px rgba(212, 175, 55, 0.3);
  
  &:active { transform: scale(0.98); }
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 12px;
  border-radius: 12px;
  color: #ccc;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover { 
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
  }
  &:active { transform: scale(0.98); }
}

.stone-icon {
  width: 16px; 
  height: 16px; 
  border-radius: 50%; 
  display: inline-block;
  
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

.btn-text {
  background: transparent; 
  border: none; 
  color: #777; 
  font-size: 14px; 
  cursor: pointer;
  padding: 10px;
  &:hover { color: #aaa; }
}

/* Animations */
.fade-scale-enter-active, 
.fade-scale-leave-active { 
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); 
}
.fade-scale-enter, 
.fade-scale-leave-to { 
  opacity: 0; 
  transform: scale(0.9); 
}

/* Mobile responsive */
@media screen and (max-width: 480px) {
  .modal-card {
    padding: 30px 20px;
    border-radius: 20px;
    width: 85%;
  }
  
  .result-icon-wrapper {
    width: 60px;
    height: 60px;
    margin-bottom: 15px;
  }
  
  .icon-emoji {
    font-size: 40px;
  }
  
  .modal-title {
    font-size: 20px;
  }
  
  .modal-desc {
    font-size: 13px;
    margin-bottom: 20px;
  }
  
  .modal-actions {
    gap: 12px;
  }
  
  .btn-primary {
    padding: 12px;
    font-size: 15px;
    border-radius: 10px;
  }
  
  .btn-secondary {
    padding: 10px;
    font-size: 13px;
  }
  
  .btn-text {
    font-size: 13px;
    padding: 8px;
  }
}

/* Small phones */
@media screen and (max-width: 375px) {
  .modal-card {
    padding: 25px 16px;
    width: 90%;
  }
  
  .result-icon-wrapper {
    width: 50px;
    height: 50px;
  }
  
  .icon-emoji {
    font-size: 35px;
  }
  
  .modal-title {
    font-size: 18px;
  }
  
  .modal-desc {
    font-size: 12px;
    margin-bottom: 16px;
  }
  
  .btn-primary {
    padding: 10px;
    font-size: 14px;
  }
  
  .btn-secondary {
    padding: 8px;
    font-size: 12px;
  }
}

/* Landscape mode */
@media screen and (max-width: 896px) and (orientation: landscape) {
  .modal-card {
    padding: 20px;
    max-width: 280px;
  }
  
  .result-icon-wrapper {
    width: 50px;
    height: 50px;
    margin-bottom: 10px;
  }
  
  .icon-emoji {
    font-size: 35px;
  }
  
  .modal-title {
    font-size: 18px;
    margin-bottom: 5px;
  }
  
  .modal-desc {
    font-size: 12px;
    margin-bottom: 15px;
  }
  
  .modal-actions {
    gap: 10px;
  }
  
  .btn-primary {
    padding: 10px;
    font-size: 14px;
  }
  
  .btn-secondary {
    padding: 8px;
    font-size: 12px;
  }
  
  .btn-text {
    padding: 6px;
    font-size: 12px;
  }
}

/* Tablets */
@media screen and (min-width: 481px) and (max-width: 1024px) {
  .modal-card {
    max-width: 360px;
    padding: 45px 35px;
  }
  
  .result-icon-wrapper {
    width: 90px;
    height: 90px;
  }
  
  .icon-emoji {
    font-size: 55px;
  }
  
  .modal-title {
    font-size: 26px;
  }
  
  .modal-desc {
    font-size: 15px;
  }
  
  .btn-primary {
    padding: 16px;
    font-size: 17px;
  }
  
  .btn-secondary {
    padding: 14px;
    font-size: 15px;
  }
}
</style>
