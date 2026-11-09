import {defineConfig} from 'vite';export default defineConfig({base:'./',build:{target:'es2022',chunkSizeWarningLimit:800},server:{proxy:{'/ws':{target:'ws://127.0.0.1:8080',ws:true}}}});
