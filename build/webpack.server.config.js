/*
 * webpack构建：打包server入口配置，依赖插件，生成vue-ssr-bundle.json
 * vue-ssr-bundle.json 用来创建服务端的renderer。renderer会为每个请求渲染出一个静态页面。
 */
const webpack = require('webpack')
const merge = require('webpack-merge')
const base = require('./webpack.base.config')
const nodeExternals = require('webpack-node-externals')
const VueSSRServerPlugin = require('vue-server-renderer/server-plugin')

module.exports = merge(base, {
  target: 'node', // 生成后的运行环境为node
  devtool: '#source-map', // 关闭map
  entry: './src/entry-server.js', // 替换到server-entry.js
  output: {
    filename: 'server-bundle.js',  // 设置输出文件名与模块导出为commonjs2
    libraryTarget: 'commonjs2'
  },
  resolve: { // api设置到server的api上
    alias: {
      'create-api': './create-api-server.js'
    }
  },
  // https://webpack.js.org/configuration/externals/#externals
  // https://github.com/liady/webpack-node-externals
  // 外置化应用程序依赖模块，使服务器构建速度更快，并声称较小的bundle文件。
  externals: nodeExternals({
    // do not externalize CSS files in case we need to import it from a dep
    whitelist: /\.css$/
  }),
  plugins: [
    new webpack.DefinePlugin({ // 设置环境变量
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.VUE_ENV': '"server"'
    }),
    // 将服务器整个输出，构建为单个JSON文件的插件，文件默认名vue-ssr-server-bundle.json
    new VueSSRServerPlugin()
  ]
})
