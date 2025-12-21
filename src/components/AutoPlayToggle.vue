<template>
  <div class="auto-play-toggle">
    <label class="toggle-label">
      <input 
        type="checkbox" 
        :checked="autoPlayMode" 
        @change="toggleAutoPlay"
        class="toggle-checkbox"
      />
      <span class="toggle-switch"></span>
      <span class="toggle-text">{{ $t('game.autoPlay.label') }}</span>
    </label>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

export default {
  name: 'AutoPlayToggle',
  computed: {
    ...mapState('settings', ['autoPlayMode']),
  },
  methods: {
    ...mapMutations('settings', ['toggleAutoPlayMode']),
    toggleAutoPlay() {
      this.toggleAutoPlayMode()
      this.$emit('toggle', this.autoPlayMode)
    },
  },
}
</script>

<style lang="less" scoped>
.auto-play-toggle {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
}

.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  display: none;
}

.toggle-switch {
  position: relative;
  width: 40px;
  height: 22px;
  background-color: #ccc;
  border-radius: 11px;
  transition: background-color 0.3s ease;
  margin-right: 8px;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background-color: #fff;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-checkbox:checked + .toggle-switch {
  background-color: #229954;
}

.toggle-checkbox:checked + .toggle-switch::after {
  transform: translateX(18px);
}

.toggle-text {
  font-size: 14px;
  color: #333;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .toggle-text {
    font-size: 12px;
  }
  
  .toggle-switch {
    width: 36px;
    height: 20px;
  }
  
  .toggle-switch::after {
    width: 16px;
    height: 16px;
  }
  
  .toggle-checkbox:checked + .toggle-switch::after {
    transform: translateX(16px);
  }
}
</style>
