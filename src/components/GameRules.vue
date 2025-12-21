<template>
  <transition name="fade-scale">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="modal-card">
        <div class="modal-header">
          <h2>游戏规则</h2>
          <button class="close-btn" @click="close">
            <i class="fa fa-times" aria-hidden="true"></i>
          </button>
        </div>
        
        <div class="modal-content">
          <p class="rules-description">五子棋是一种两人对弈的策略棋类游戏，先将五颗棋子连成一线者获胜。</p>
          
          <ul class="rules-list">
            <li>
              <div class="rule-icon">
                <span class="dot black"></span>
                <span class="dot white"></span>
              </div>
              <span>选择执黑或执白，黑棋先行。点击"开始"按钮开始对局。</span>
            </li>
            <li>
              <div class="rule-icon">
                <i class="fa fa-hand-pointer-o" aria-hidden="true"></i>
              </div>
              <span>轮到你时，点击棋盘空位落子。AI 会自动应对。</span>
            </li>
            <li>
              <div class="rule-icon">
                <i class="fa fa-trophy" aria-hidden="true"></i>
              </div>
              <span>先将五颗同色棋子连成横、竖或斜线即可获胜。</span>
            </li>
            <li>
              <div class="rule-icon">
                <i class="fa fa-refresh" aria-hidden="true"></i>
              </div>
              <span>点击"结束"可随时终止对局，重新选择棋子颜色。</span>
            </li>
          </ul>
          
          <div class="rules-tip">
            <i class="fa fa-lightbulb-o" aria-hidden="true"></i>
            <span>小提示：开局占据棋盘中心位置，更容易形成攻势！</span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-primary" @click="close">
            <i class="fa fa-check" aria-hidden="true"></i>
            <span>知道了</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'GameRules',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    close() {
      this.$emit('close')
    }
  }
}
</script>

<style lang="less" scoped>
@gold: #d4af37;

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
  padding: 20px;
}

.modal-card {
  background: rgba(30, 30, 30, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: @gold;
    letter-spacing: 1px;
  }
}

.close-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #888;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  
  i {
    font-size: 14px;
  }
}

.modal-content {
  padding: 24px;
}

.rules-description {
  color: #aaa;
  font-size: 14px;
  margin: 0 0 20px;
  text-align: center;
  line-height: 1.5;
}

.rules-list {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  
  li {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 13px;
    color: #ccc;
    line-height: 1.5;
    
    &:last-child {
      border-bottom: none;
    }
  }
}

.rule-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: @gold;
  font-size: 14px;
  gap: 2px;
  
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    
    &.black {
      background: #333;
      border: 1px solid #555;
    }
    
    &.white {
      background: #f0f0f0;
      border: 1px solid #ccc;
    }
  }
}

.rules-tip {
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 12px;
  color: @gold;
  display: flex;
  align-items: center;
  gap: 10px;
  
  i {
    font-size: 16px;
    opacity: 0.8;
  }
  
  span {
    flex: 1;
    line-height: 1.4;
  }
}

.modal-footer {
  padding: 16px 24px 24px;
  display: flex;
  justify-content: center;
}

.btn-primary {
  background: linear-gradient(135deg, @gold 0%, #b48e24 100%);
  border: none;
  padding: 12px 32px;
  border-radius: 10px;
  color: #1a1a1a;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.1s, box-shadow 0.2s;
  box-shadow: 0 5px 15px rgba(212, 175, 55, 0.3);
  
  &:hover {
    box-shadow: 0 8px 20px rgba(212, 175, 55, 0.4);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  i {
    font-size: 12px;
  }
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
@media (max-width: 480px) {
  .modal-overlay {
    padding: 16px;
  }
  
  .modal-header {
    padding: 16px 20px;
    
    h2 {
      font-size: 16px;
    }
  }
  
  .modal-content {
    padding: 20px;
  }
  
  .rules-description {
    font-size: 13px;
  }
  
  .rules-list li {
    font-size: 12px;
    padding: 10px 0;
  }
  
  .rules-tip {
    font-size: 11px;
    padding: 10px 14px;
  }
  
  .btn-primary {
    padding: 10px 28px;
    font-size: 14px;
  }
}

/* Small phones */
@media (max-width: 375px) {
  .modal-overlay {
    padding: 12px;
  }
  
  .modal-card {
    border-radius: 16px;
  }
  
  .modal-header {
    padding: 14px 16px;
    
    h2 {
      font-size: 15px;
    }
  }
  
  .close-btn {
    width: 28px;
    height: 28px;
    
    i {
      font-size: 12px;
    }
  }
  
  .modal-content {
    padding: 16px;
  }
  
  .rules-description {
    font-size: 12px;
    margin-bottom: 16px;
  }
  
  .rules-list li {
    font-size: 11px;
    padding: 8px 0;
    gap: 10px;
  }
  
  .rule-icon {
    width: 20px;
    height: 20px;
    font-size: 12px;
    
    .dot {
      width: 8px;
      height: 8px;
    }
  }
  
  .rules-tip {
    font-size: 10px;
    padding: 8px 12px;
    gap: 8px;
    
    i {
      font-size: 14px;
    }
  }
  
  .modal-footer {
    padding: 12px 16px 20px;
  }
  
  .btn-primary {
    padding: 10px 24px;
    font-size: 13px;
  }
}

/* Landscape mode */
@media screen and (max-width: 896px) and (orientation: landscape) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-card {
    max-width: 350px;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-header {
    padding: 12px 16px;
    
    h2 {
      font-size: 14px;
    }
  }
  
  .modal-content {
    padding: 12px 16px;
  }
  
  .rules-description {
    font-size: 11px;
    margin-bottom: 12px;
  }
  
  .rules-list li {
    font-size: 11px;
    padding: 6px 0;
  }
  
  .rules-tip {
    font-size: 10px;
    padding: 8px 10px;
  }
  
  .modal-footer {
    padding: 10px 16px 14px;
  }
  
  .btn-primary {
    padding: 8px 20px;
    font-size: 12px;
  }
}

/* Tablets */
@media screen and (min-width: 481px) and (max-width: 1024px) {
  .modal-card {
    max-width: 450px;
  }
  
  .modal-header {
    padding: 22px 28px;
    
    h2 {
      font-size: 20px;
    }
  }
  
  .modal-content {
    padding: 28px;
  }
  
  .rules-description {
    font-size: 15px;
  }
  
  .rules-list li {
    font-size: 14px;
    padding: 14px 0;
  }
  
  .rules-tip {
    font-size: 13px;
    padding: 14px 18px;
  }
  
  .btn-primary {
    padding: 14px 36px;
    font-size: 16px;
  }
}
</style>
