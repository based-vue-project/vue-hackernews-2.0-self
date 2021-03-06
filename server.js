/*
 * 1、创建bundleRenderer,读取vue-ssr-server-bundle.json；
 * 2、搭建一个express服务器
 * 3、组件缓存js的lru-cache；路由缓存route-cache
 * 4、node中使用gzip压缩中间件 compression
 */
const fs = require('fs')
const path = require('path')
const LRU = require('lru-cache')
const express = require('express')
const favicon = require('serve-favicon')
const compression = require('compression')
const microcache = require('route-cache')
const resolve = file => path.resolve(__dirname, file) // 获取当前模板文件所在目录的绝对路径
const { createBundleRenderer } = require('vue-server-renderer')

const isProd = process.env.NODE_ENV === 'production'
const useMicroCache = process.env.MICRO_CACHE !== 'false'
const serverInfo =
  `express/${require('express/package.json').version} ` +
  `vue-server-renderer/${require('vue-server-renderer/package.json').version}`

const app = express()
// dev、pro:把server-bundle.js设置到vue-server-renderer获得Renderer装换器对象
function createRenderer (bundle, options) {
  // 调用createBundleRenderer方法创建渲染器，并设置HTML模板，以后后续将服务端预取的数据填充至模板中
   return createBundleRenderer(bundle, Object.assign(options, {
    cache: LRU({ // 组件缓存
      max: 1000,
      maxAge: 1000 * 60 * 15 // 条目在15分钟后过期
    }),
    basedir: resolve('./dist'),  // 显式地声明 server bundle 的运行目录
    runInNewContext: false
  }))
}

let renderer
let readyPromise
const templatePath = resolve('./src/index.template.html') // 服务端渲染的HTML模板
if (isProd) { // 在生产中
  // 直接读取服务端渲染的HTML模板
  const template = fs.readFileSync(templatePath, 'utf-8')
  // webpack结合vue-ssr-webpack-plugin插件生成的server bundle
  const bundle = require('./dist/vue-ssr-server-bundle.json')
  // client manifests是可选项，允许渲染器自动插入preload/prefetch特性至后续渲染的HTML中，以改善客户端性能
  const clientManifest = require('./dist/vue-ssr-client-manifest.json')
  // vue-server-renderer使用模板创建服务端bundle渲染器,并构建服务器包[绑定server bundle]。
  renderer = createRenderer(bundle, {
    template,
    clientManifest
  })
} else { // 开发环境下
  // 使用dev-server来通过回调把生成在内存中的文件赋值
  // setup-dev-server：通过dev server的webpack-dev-middleware和webpack-hot-middleware实现客户端代码的热更新；通过webpack的watch功能实现服务端代码的热更新
  readyPromise = require('./build/setup-dev-server')(
    app,
    templatePath,
    (bundle, options) => {
      renderer = createRenderer(bundle, options)  // 基于热更新，回调生成最新的bundle渲染器
    }
  )
}
// Express 提供了内置的中间件 express.static 来设置静态文件如：图片， CSS, JavaScript 等。
const serve = (path, cache) => express.static(resolve(path), {
  maxAge: cache && isProd ? 1000 * 60 * 60 * 24 * 30 : 0
})

//依次装载一系列Express中间件，用来处理静态资源，数据压缩等
app.use(compression({ threshold: 0 })) // 压缩字节大于0的资源
app.use(favicon('./public/logo-48.png')) // node设置favicon的logo
// 通过 express.static 访问的文件都存放在一个“虚拟”目录下面，可以通过为静态资源目录指定一个挂载路径的方式来实现,“/public“前缀的地址来访问 public目录下面的文件了
app.use('/dist', serve('./dist', true))
app.use('/public', serve('./public', true))
app.use('/manifest.json', serve('./manifest.json', true))
app.use('/service-worker.js', serve('./dist/service-worker.js'))

// 在默认情况下要求。原始URL[req.originalUrl(Express)]用作缓存键，因此每个URL都被单独缓存。缓存1秒
app.use(microcache.cacheSeconds(1, req => useMicroCache && req.originalUrl))

function render (req, res) {
  const s = Date.now()  // 记录时间
  // res.set:设置HTTP头，传入object可以一次设置多个头[Express]
  res.setHeader("Content-Type", "text/html")
  res.setHeader("Server", serverInfo)

  const handleError = err => {
    if (err.url) {
      res.redirect(err.url) // res.redirect()：设置响应的Location HTTP头，并且设置状态码302[Express]
    } else if(err.code === 404) {
      res.status(404).send('404 | Page Not Found') // res.status()：设置HTTP状态码[Express]
    } else {
      // Render Error Page or Redirect
      res.status(500).send('500 | Internal Server Error')
      console.error(`error during render : ${req.url}`)
      console.error(err.stack)
    }
  }
  // 设置请求的url
  const context = {
    title: 'Vue HN 2.0', // default title
    url: req.url
  }
  // 为渲染器绑定的server bundle（即entry-server.js）设置参数：上下文对象context
  renderer.renderToString(context, (err, html) => {
    if (err) {
      return handleError(err)
    }
    res.send(html) // res.send()：传送HTTP响应[Express]
    if (!isProd) {
      console.log(`whole request: ${Date.now() - s}ms`)
    }
  })
}
// 设置路由所有请求通过ssr生成器
app.get('*', isProd ? render : (req, res) => {
  readyPromise.then(() => render(req, res))
})

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`server started at localhost:${port}`)
})
