import Vue from 'vue';
import PortalVue from 'portal-vue';
import autofocus from 'vue-autofocus-directive';
import VueSwitch from '@vue/ui/src/components/VueSwitch.vue';
import infiniteScroll from 'vue-infinite-scroll';
import Jazzicon from 'vue-jazzicon';
import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import App from '@/App.vue';
import router from '@/router';
import store from '@/store';
import mixins from '@/mixins';
import i18n from '@/i18n';
import '@/auth';
import '@/style.scss';

Vue.use(infiniteScroll);
Vue.use(PortalVue);

const requireComponent = require.context('@/components', true, /[\w-]+\.vue$/);
requireComponent.keys().forEach(fileName => {
  const componentConfig = requireComponent(fileName);
  const componentName = upperFirst(
    camelCase(fileName.replace(/^\.\//, '').replace(/\.\w+$/, ''))
  );
  Vue.component(componentName, componentConfig.default || componentConfig);
});

Vue.component('jazzicon', Jazzicon);
Vue.component('VueSwitch', VueSwitch);
Vue.mixin(mixins);
Vue.directive('autofocus', autofocus);

Vue.config.productionTip = false;

new Vue({
  i18n,
  router,
  store,
  render: h => h(App)
}).$mount('#app');
