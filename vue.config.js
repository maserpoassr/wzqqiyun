module.exports = {
  publicPath: '/',
  productionSourceMap: false,
  
  chainWebpack: config => {
    // Completely exclude .data files from build output
    // These files will be loaded from R2 CDN instead
    config.module
      .rule('exclude-data-files')
      .test(/\.data$/)
      .type('javascript/auto')
      .use('null-loader')
      .loader('null-loader')
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
    },
    // Ignore .data files completely
    externals: {
      './build/rapfi.data': 'null',
      './build/fallback/rapfi.data': 'null'
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
