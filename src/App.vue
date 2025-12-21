<template>
  <div id="app">
    <view-box ref="viewBox" body-padding-top="0" body-padding-bottom="0">
      <div v-if="showHeader" class="glass-header">
        <div class="brand">棋<span class="accent">韵</span></div>
      </div>
      
      <keep-alive>
        <router-view class="router-view"></router-view>
      </keep-alive>
    </view-box>
  </div>
</template>

<script>
import { ViewBox } from 'vux'
import { mapState, mapMutations, mapActions } from 'vuex'
import { register } from 'register-service-worker'

function canShowInstallPrompt() {
  const installData = JSON.parse(localStorage.getItem('pwaInstallPromptData'));
  if (!installData)
    return true;

  const { lastShown, count } = installData;
  const today = new Date().toDateString();

  if (count >= 5) {
    return false;
  }

  if (lastShown === today) {
    return false;
  }

  return true;
}

function updateInstallPromptData() {
  const today = new Date().toDateString();
  const installData = JSON.parse(localStorage.getItem('pwaInstallPromptData')) || { lastShown: null, count: 0 };

  if (installData.lastShown !== today) {
    installData.lastShown = today;
    installData.count += 1;
    localStorage.setItem('pwaInstallPromptData', JSON.stringify(installData));
  }
}

export default {
  components: {
    ViewBox,
  },
  data: function () {
    return {
      showHeader: true,
    }
  },
  computed: {
    ...mapState('settings', ['language', 'configIndex']),
  },
  methods: {
    ...mapMutations('settings', ['setValue']),
    ...mapActions('ai', ['initEngine']),
    ...mapActions('settings', ['readCookies']),
    ...mapActions(['getBrowserCapabilities']),
  },
  watch: {
    language(newValue) {
      this.$i18n.locale = newValue
    },
  },
  created() {
    this.getBrowserCapabilities()
    this.readCookies()
    if (!this.language) {
      this.setValue({ key: 'language', value: this.$i18n.locale })
    } else {
      this.$i18n.locale = this.language
    }
  },
  mounted() {
    const _this = this
    
    // 移除启动屏幕
    this.$nextTick(() => {
      const loader = document.getElementById('loading-screen')
      if (loader) {
        setTimeout(() => {
          loader.style.opacity = '0'
          setTimeout(() => loader.remove(), 500)
        }, 300)
      }
    })
    
    // 加入 i18n 版本的 $vux.alert, $vux.confirm
    this.$vux.alert.show_i18n = function (options) {
      options.buttonText = _this.$t('common.ok')
      _this.$vux.alert.show(options)
    }
    this.$vux.confirm.show_i18n = function (options) {
      options.confirmText = _this.$t('common.confirm')
      options.cancelText = _this.$t('common.cancel')
      _this.$vux.confirm.show(options)
    }
    this.$vux.confirm.prompt_i18n = function (value, options) {
      options.confirmText = _this.$t('common.confirm')
      options.cancelText = _this.$t('common.cancel')
      _this.$vux.confirm.prompt(value, options)
    }

    window.onresize = function () {
      _this.$store.commit('setScreenSize', {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      })
    }

    const loadEngine = (loadFullEngine) => {
      _this.initEngine(loadFullEngine).catch((err) => {
        _this.$vux.alert.show_i18n({
          title: _this.$t('game.engineLoadingError'),
          content: err.toString(),
        })
      })
    }

    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      register(`${process.env.BASE_URL}service-worker.js`, {
        ready() {
          console.log(
            'App is being served from cache by a service worker.\n' +
            'For more details, visit https://goo.gl/AFskqB'
          )
          loadEngine(true)
        },
        updated() {
          _this.$vux.confirm.show_i18n({
            title: _this.$t('update.title'),
            content: _this.$t('update.msg'),
            onConfirm() {
              location.reload()
            },
            onCancel() { }
          })
        },
        error(error) {
          console.error('Error during service worker registration:', error)
        }
      })

      window.addEventListener('beforeinstallprompt', (e) => {
        // 阻止默认的安装提示，不显示任何弹窗
        e.preventDefault();
      });
    } else {
      if (this.configIndex == 0)
        this.setValue({ key: 'configIndex', value: 1 })
      loadEngine(false)
    }
  },
}
</script>

<style lang="less">
@import '~vux/src/styles/index.less';

:root {
  --bg-dark: #121212;
  --bg-panel: rgba(30, 30, 30, 0.75);
  --gold-primary: #d4af37;
  --gold-gradient: linear-gradient(135deg, #d4af37 0%, #b48e24 100%);
  --text-main: #e8e8e8;
  --text-sub: #888;
  --glass-border: 1px solid rgba(255, 255, 255, 0.08);
}

html, body {
  height: 100%;
  width: 100%;
  margin: 0;
  overflow: hidden;
  background-color: var(--bg-dark);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-main);
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  /* 噪点背景图，提升质感 */
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E"), radial-gradient(circle at top center, #2a2a2a, #121212);
}

#app {
  height: 100%;
  background-color: transparent;
}

/* 自定义玻璃拟态 Header */
.glass-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  box-sizing: border-box;
  z-index: 100;
  /* 毛玻璃效果 */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(18, 18, 18, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .brand {
    font-size: 20px;
    letter-spacing: 6px;
    font-weight: 300;
    .accent { font-weight: 800; color: var(--gold-primary); }
  }

  .menu-trigger {
    color: var(--gold-primary);
    font-size: 20px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.3s;
    &:active { opacity: 0.4; }
  }
}

/* Mobile header adjustments */
@media screen and (max-width: 480px) {
  .glass-header {
    height: 50px;
    padding: 0 16px;
    
    .brand {
      font-size: 18px;
      letter-spacing: 4px;
    }
    
    .menu-trigger {
      font-size: 18px;
    }
  }
}

/* Small phones */
@media screen and (max-width: 375px) {
  .glass-header {
    height: 45px;
    padding: 0 12px;
    
    .brand {
      font-size: 16px;
      letter-spacing: 3px;
    }
    
    .menu-trigger {
      font-size: 16px;
    }
  }
}

/* Landscape mode */
@media screen and (max-width: 896px) and (orientation: landscape) {
  .glass-header {
    height: 40px;
    padding: 0 16px;
    
    .brand {
      font-size: 14px;
      letter-spacing: 3px;
    }
    
    .menu-trigger {
      font-size: 16px;
    }
  }
}

/* Tablets */
@media screen and (min-width: 481px) and (max-width: 1024px) {
  .glass-header {
    height: 55px;
    padding: 0 20px;
    
    .brand {
      font-size: 19px;
      letter-spacing: 5px;
    }
  }
}

/* 侧边栏样式优化 */
.drawer-content {
  padding: 24px;
  height: 100%;
  box-sizing: border-box;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
}
.drawer-header {
  color: var(--gold-primary);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 15px;
  margin-top: 40px;
  font-size: 16px;
  letter-spacing: 1px;
}
.drawer-scroll {
  flex: 1;
  overflow-y: auto;
  margin-top: 10px;
}
.log-item {
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 11px;
  color: #999;
  margin-bottom: 8px;
  border-left: 2px solid #333;
  padding-left: 10px;
  line-height: 1.5;
}
.log-index { color: var(--gold-primary); opacity: 0.5; margin-right: 5px; }

/* VUX Reset & Tweaks */
.weui-dialog {
  background: #252525 !important;
  color: #eee !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255,255,255,0.1);
}
.weui-dialog__hd .weui-dialog__title {
  color: #fff !important;
}
.weui-dialog__bd {
  color: #aaa !important;
}
.weui-dialog__ft {
  border-top: 1px solid rgba(255,255,255,0.1) !important;
}
.weui-dialog__btn { 
  color: var(--gold-primary) !important; 
}

/* Toast 深色主题 */
.weui-toast {
  background-color: rgba(42, 42, 42, 0.95) !important;
  color: var(--text-main);
}

/* 页面过渡动画 */
.vux-pop-out-enter-active,
.vux-pop-out-leave-active,
.vux-pop-in-enter-active,
.vux-pop-in-leave-active {
  will-change: transform;
  transition: all 400ms;
  height: 100%;
  position: absolute;
  backface-visibility: hidden;
}

.vux-pop-out-enter,
.vux-pop-in-leave-to {
  opacity: 0;
  transform: translate3d(-30%, 0, 0);
}

.vux-pop-out-leave-to,
.vux-pop-in-enter {
  opacity: 0;
  transform: translate3d(30%, 0, 0);
}
</style>
