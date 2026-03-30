module.exports = {
  publicPath: '/',
  productionSourceMap: false,
  
  chainWebpack: config => {
    // Exclude large .data files from build output for Cloudflare Pages
    // These files will be loaded from R2 CDN instead
    config.module
      .rule('exclude-large-data')
      .test(/\.data$/)
      .use('file-loader')
      .loader('file-loader')
      .options({
        name: 'build/[name].[ext]',
        // Don't emit the file, it will be loaded from CDN
        emitFile: false
      })
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
