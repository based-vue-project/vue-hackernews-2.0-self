import ItemList from './ItemList.vue'

const camelize = str => str.charAt(0).toUpperCase() + str.slice(1)

// This is a factory function for dynamically creating root-level list views,
// since they share most of the logic except for the type of items to display.
// They are essentially higher order components wrapping ItemList.vue.
// 导出的方法通过参数来重新包装component,
// preFetch则是保证ssr时component的data里数据已经完成异步获取。
// 如果没有preFetch而是通过vue的生命周期来异步设置则data不会有ssr效果
export default function createListView (type) {
  return {
    name: `${type}-stories-view`,

    asyncData ({ store }) {
      return store.dispatch('FETCH_LIST_DATA', { type })
    },

    title: camelize(type),

    render (h) {
      return h(ItemList, { props: { type }})
    }
  }
}
