/*
 * 独立出vue-loader的配置以便根据环境改变
 */
var px2rem = require('postcsss-px2rem')
module.exports = {
  extractCSS: process.env.NODE_ENV === 'production',
  preserveWhitespace: false, // 去掉元素间空格，减小文件体积
  postcss: [
  	// 使用vue-cli构建的开发环境，autoprefixer没有处理import 和 require 的css文件
    require('autoprefixer')({
      browsers: ['last 3 versions']
    }),
    px2rem({remUnit: 100})
  ]
}
