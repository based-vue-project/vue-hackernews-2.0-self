/*
 * webpack构建：打包，client入口配置，环境变量，依赖插件，缓存外部项目依赖项
 */
const webpack = require('webpack')
const merge = require('webpack-merge')
const base = require('./webpack.base.config')
const SWPrecachePlugin = require('sw-precache-webpack-plugin') // 用来缓存外部项目依赖项，server-worker的支持
const VueSSRClientPlugin = require('vue-server-renderer/client-plugin')

const config = merge(base, {
  entry: {
    app: './src/entry-client.js' // 生成客户端构建清单client manifest
  },
  resolve: {
    alias: {
      'create-api': './create-api-client.js'  // 设置好api为client的js导入
    }
  },
  plugins: [
    // strip dev-only code in Vue source
    new webpack.DefinePlugin({ // 设置好环境变量
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.VUE_ENV': '"client"'
    }),
    // extract vendor chunks for better caching
    // 当多个 bundle 共享一些相同的依赖，CommonsChunkPlugin 有助于提取这些依赖到共享的 bundle 中，来避免重复打包。
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: function (module) {
        // a module is extracted into the vendor chunk if...
        return (
          // it's inside node_modules
          /node_modules/.test(module.context) &&
          // and not a CSS file (due to extract-text-webpack-plugin limitation)
          !/\.css$/.test(module.request)
        )
      }
    }),
    // extract webpack runtime & manifest to avoid vendor chunk hash changing
    // on every build.
    new webpack.optimize.CommonsChunkPlugin({
      name: 'manifest'
    }),
    // 在dist目录，生成vue-ssr-client-manifest.json。记录页面所有依赖文件列表，在生成最终HTML时方便注入相应的js链接和css链接
    new VueSSRClientPlugin() 
  ]
})

if (process.env.NODE_ENV === 'production') {
  config.plugins.push(
    // auto generate service worker
    new SWPrecachePlugin({
      cacheId: 'vue-hn',
      filename: 'service-worker.js',
      minify: true,
      dontCacheBustUrlsMatching: /./,
      staticFileGlobsIgnorePatterns: [/\.map$/, /\.json$/],
      runtimeCaching: [
        {
          urlPattern: '/',
          handler: 'networkFirst'
        },
        {
          urlPattern: /\/(top|new|show|ask|jobs)/,
          handler: 'networkFirst'
        },
        {
          urlPattern: '/item/:id',
          handler: 'networkFirst'
        },
        {
          urlPattern: '/user/:id',
          handler: 'networkFirst'
        }
      ]
    })
  )
}

module.exports = config
