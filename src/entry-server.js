/*
 * export一个供服务端的renderer使用的函数
 * 在服务端获取数据，存储到vuex,再将state存储到context.
 */
import { createApp } from './app'

const isDev = process.env.NODE_ENV !== 'production'

// This exported function will be called by `bundleRenderer`.
// This is where we perform data-prefetching to determine the
// state of our application before actually rendering it.
// Since data fetching is async, this function is expected to
// return a Promise that resolves to the app instance.
export default context => {
   // 因为有可能会是异步路由钩子函数或组件，所以我们将返回一个 Promise，以便服务器能够等待所有的内容在渲染前，就已经准备就绪。
  return new Promise((resolve, reject) => {
    const s = isDev && Date.now()
    const { app, router, store } = createApp()

    const { url } = context
    const { fullPath } = router.resolve(url).route

    if (fullPath !== url) {
      return reject({ url: fullPath })
    }

    // 设置服务器端router的位置
    router.push(url)

    // wait until router has resolved possible async hooks
    // 等到router将可能的异步组件和钩子函数解析完
    router.onReady(() => {
      const matchedComponents = router.getMatchedComponents()  // 获取该路由的所有Component
      // no matched routes
      // 没有Component说明没有路由匹配，匹配不到的路由，执行reject函数，并返回404.
      if (!matchedComponents.length) {
        return reject({ code: 404 })
      }
      // Call fetchData hooks on components matched by the route.
      // A preFetch hook dispatches a store action and returns a Promise,
      // which is resolved when the action is complete and store state has been
      // updated.
      // 使用Promise.all把所有的Component有异步preFetch方法执行;使用asyncData方法，预拉取数据
      Promise.all(matchedComponents.map(({ asyncData }) => asyncData && asyncData({
        store,
        route: router.currentRoute
      }))).then(() => {
        isDev && console.log(`data pre-fetch: ${Date.now() - s}ms`)
        // After all preFetch hooks are resolved, our store is now
        // filled with the state needed to render the app.
        // Expose the state on the render context, and let the request handler
        // inline the state in the HTML response. This allows the client-side
        // store to pick-up the server-side state without having to duplicate
        // the initial data fetching on the client.
        context.state = store.state  // 把vuex的state设置到传入的context.initialState上
        resolve(app)  // Promise应该resolve应用程序实例，以便它可以渲染。
      }).catch(reject)
    }, reject)
  })
}
