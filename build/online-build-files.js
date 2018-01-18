/*
 * 生成正式环境部署代码
 * 方案：拷贝测试环境部署代码，替换api路径。
 */
const fs = require('fs')
const path = require('path')
// 拷贝文件
function copy(src, dst) {
	console.log('start build online files...')
	// 判断需生成文件夹是否存在，不存在，创建此文件夹
	if(!fs.existsSync(dst)) { 
		fs.makdirSync(dst)
	}
	// readdirSync()返回一个包含‘指定目录下所有文件名称’的数组对象
	fs.readdirSync(src).forEach(function(filename) {
		var url = path.join(src, filename) //拼接要复制文件路径并返回路径
		var dest = path.join(dst, filename) //拼接复制后的文件路径并返回路径
		// 获取文件详细信息，判断不是目录文件夹的时候
		if (!fs.statSync(url).isDirectory()) {
			fs.readFile(url, 'utf-8', function (err, data) {
				if(err) {
					console.log('读取文件fail' + err)
				} else { // 读取成功
					data = data.replace(/http:\/\/testapi.g.com.cn/g, 'http://api.g.com.cn')
					data = data.replace(/http:\/\/testwap.g.com.cn/g, 'http://wap.g.com.cn')
		            data = data.replace(/https:\/\/testw.g.com.cn/g, 'https://w.g.com.cn')
		            data = data.replace(/https:\/\/testapi.g.com.cn/g, 'https://api.g.com.cn')
		            fs.writeFileSync(dest, data)
				}
			})
		}
	})
}

copy('./dist', './dist/online')