const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  publicPath: '/',
  productionSourceMap: false,
  
  chainWebpack: config => {
    // Remove default copy plugin rule for public folder
    config.plugins.delete('copy')
    
    // Add custom copy plugin that excludes .data files (v4 syntax)
    config.plugin('copy').use(CopyWebpackPlugin, [[
      {
        from: 'public',
        to: '',
        ignore: [
          '**/.DS_Store',
          '**/index.html',
          '**/*.data' // Exclude all .data files
        ]
      }
    ]])
  },

  configureWebpack: {
    // Add OpenSSL legacy provider for Node 17+
    optimization: {
      nodeEnv: process.env.NODE_ENV || 'production'
    },
    module: {
      rules: [
        {
          test: /\.md$/,
          use: [
            {
              loader: 'html-loader'
            },
            {
              loader: 'markdown-loader'
            }
          ]
        }
      ]
    }
  },

  pluginOptions: {
    i18n: {
      localeDir: 'locales',
      enableInSFC: false
    }
  },

  pwa: {
    name: 'Gomoku AI',
    themeColor: '#1a1a2e',
    msTileColor: '#1a1a2e',
    appleMobileWebCapableStatusBarStyle: 'black',
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true,
      // Exclude .data files from service worker cache
      exclude: [/\.data$/, /\.map$/, /^manifest.*\.js$/]
    }
  }
}
