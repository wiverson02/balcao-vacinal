import {defineConfig} from "vitest/config";
import react from "@vitejs/plugin-react";
import {VitePWA} from "vite-plugin-pwa";

export default defineConfig({
  plugins:[
    react(),
    VitePWA({
      // Atualiza sozinho: na próxima vez que o app abrir com internet, baixa a versão nova.
      registerType:"autoUpdate",
      includeAssets:["icons/apple-touch-icon.png"],
      manifest:{
        name:"Balcão Vacinal",
        short_name:"Balcão Vacinal",
        description:"Consulta rápida de vacinas por idade para o farmacêutico vacinador (SBIm e PNI).",
        lang:"pt-BR",
        start_url:"./",
        scope:"./",
        display:"standalone",
        orientation:"portrait",
        background_color:"#1000ba",
        theme_color:"#2942dc",
        icons:[
          {src:"icons/icon-192.png",sizes:"192x192",type:"image/png"},
          {src:"icons/icon-512.png",sizes:"512x512",type:"image/png"},
          {src:"icons/icon-maskable-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}
        ]
      },
      workbox:{
        // O app inteiro (JS, CSS, JSONs embutidos) fica em cache para abrir sem internet.
        globPatterns:["**/*.{js,css,html,png,svg,ico,webmanifest}"],
        navigateFallback:"index.html",
        navigateFallbackDenylist:[/^\/_vercel\//],
        cleanupOutdatedCaches:true,
        runtimeCaching:[
          // Fonte Outfit: guarda depois do primeiro acesso; sem ela o app usa a fonte do sistema.
          {urlPattern:/^https:\/\/fonts\.googleapis\.com\/.*/i,handler:"StaleWhileRevalidate",options:{cacheName:"google-fonts-css"}},
          {urlPattern:/^https:\/\/fonts\.gstatic\.com\/.*/i,handler:"CacheFirst",options:{cacheName:"google-fonts-files",expiration:{maxEntries:10,maxAgeSeconds:60*60*24*365},cacheableResponse:{statuses:[0,200]}}}
        ]
      }
    })
  ],
  base:"./",
  test:{environment:"jsdom"}
});
