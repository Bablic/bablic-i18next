```
import Vue from 'vue'
import App from './App.vue'
import i18next from 'i18next';
import VueI18Next from '@panter/vue-i18next';
import {BablicI18next, isInEditor, BablicPostProcessor} from "bablic-i18next";

Vue.use(VueI18Next);

Vue.config.productionTip = false;

const getCurrentLanguage = () => 
    // get language from according to app logic (URL / Cookie / Local Storage / Default)
    'es';

i18next
    .use(BablicI18next)
    .use(BablicPostProcessor)
    .init({
        saveMissing: true,
        lng: isInEditor() ? 'dev' : getCurrentLanguage(),
        load: "currentOnly",
        preload: false,
        postProcess: BablicPostProcessor.name,
        backend: {
            siteId: "602e5f38f33547000176d342",
            isDebug: false,
        }
    });

const i18n = new VueI18Next(i18next);

new Vue({
    render: h => h(App),
    i18n,
}).$mount('#app');
```
