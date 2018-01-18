/*
 * less文件编译配置，提取生成css文件
 */
const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const vueConfig = require('./vue-loader.config.js')

// 为了抽离css样式，防止样式打包在js中引起页面样式加载错乱的现象
var ExtractTextPlugin = require('extract-text-webpack-plugin')
var px2rem = require('postcss-px2rem')

var entries = {}

function readFileList (path, entries, key) {
	var files = fs.readdirSync(path)
	files.forEach(function (item, index) {
		var stat = fs.statSync(path + '/' + item) // 读取less文件夹下每项详情
		item = item.toLowerCase()
		if (stat.isDirectory() && item !== 'common') {
			// 递归读取文件
			entries[item + '-css'] = [] // entries.main-css = []等同
			readFileList(path + '/common', entries, item + '-css')
			readFileList(path + '/' + item, entries, item + '-css')
		} else if(item !== 'common') {
			entries[key].push(path + '/' + item) // entries.main-css = entries/main/main等同
		}
	})
}
// entries打包各类css文件：对应文件夹中文件+common中的两个文件
readFileList(path.resolve(__dirname, '../src/assets/less/'), entries)

module.exports = {
	entry: entries,
	output: {
		path: path.resolve(__dirname, '../dist/css'),
		publicPath: '/dist/css',
		filename: '[name].min.css'
	},
	plugin: [
		new webpack.LoaderOptionsPlugin({
			options: {
				postcss: vueConfig.postcss
			}
		}),
		new ExtractTextPlugin('[name].min.css')
	],
	modules: {
		loaders: [
			{
				test: /\.(css|less)$/,
				loader: ExtractTextPlugin.extract('css-loader?minimize!postcss-loader!less-loader')
			},
			{
				test: /\.(png)|(jpg)$/,
				loader:'url-loader?limit=0'
			}
		]
	}
}