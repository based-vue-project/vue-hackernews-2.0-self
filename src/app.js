/*
 * client和server的共同入口，整合router,filters,vuex,一般返回vue实例的工厂函数。
 * 不能像SPA那样直接创建vue实例，因为直接创建vue实例在服务端会被所有请求复用，从而造成状态污染。
 */
import Vue from 'vue'
import App from './App.vue'
import { createStore } from './store'
import { createRouter } from './router'
// 把router和vuex联系起来，将一个路由模块包含到存储中，该模块包含当前路由的状态
import { sync } from 'vuex-router-sync'  // 路由同步工具
import titleMixin from './util/title'
import * as filters from './util/filters'

// mixin for handling title
Vue.mixin(titleMixin)

// register global utility filters.
Object.keys(filters).forEach(key => {
  Vue.filter(key, filters[key])
})

// Expose a factory function that creates a fresh set of store, router,
// app instances on each call (which is called for each SSR request)
export function createApp () {
  // create store and router instances
  const store = createStore()
  const router = createRouter()

  // sync the router with the vuex store.
  // this registers `store.state.route`
  sync(store, router)

  // create the app instance.
  // here we inject the router, store and ssr context to all child components,
  // making them available everywhere as `this.$router` and `this.$store`.
  const app = new Vue({
    router,
    store,
    render: h => h(App)  // 同...App;把App.vue的所有对象属性设置到新的根vue上
  })

  // expose the app, the router and the store.
  // note we are not mounting the app here, since bootstrapping will be
  // different depending on whether we are in a browser or on the server.
  // 导出app,router,store给ssr使用
  return { app, router, store }
}
