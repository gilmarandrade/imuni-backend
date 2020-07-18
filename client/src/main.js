import Vue from 'vue'
import App from './App.vue'

import './config/msgs'
import './config/bootstrap'
import './config/axios'
import store from './config/store'
import router from './config/router'

import VueSocketIO from 'vue-socket.io';

import '@fortawesome/fontawesome-free/css/all.css'
import '@fortawesome/fontawesome-free/js/all.js'

const environment = require('../environment');
console.log(environment);

Vue.config.productionTip = false

Vue.use(new VueSocketIO({
    debug: true,
    connection: environment.socketUrl,
    vuex: {
        store,
        actionPrefix: 'SOCKET_',
        mutationPrefix: 'SOCKET_'
    },
    // options: { path: '/api/socket.io' } //Optional options
}))


new Vue({
    store,
    router,
    render: h => h(App),
}).$mount('#app')