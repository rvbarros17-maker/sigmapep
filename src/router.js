// src/router.js
// Router simples para SPA sem hash
// Cada "page" é um módulo JS que exporta init(container, params)

const routes = {}
let currentPage = null
let appContainer = null

export const router = {
  register(name, loader) {
    routes[name] = loader
  },

  async navigate(name, params = {}) {
    if (!appContainer) return

    // Guarda contexto para navegação de volta
    router.current = { name, params }

    const loader = routes[name]
    if (!loader) {
      console.warn(`[Router] Página não encontrada: ${name}`)
      return
    }

    // Mostra loader
    appContainer.innerHTML = `
      <div class="flex items-center justify-center flex-1 h-full">
        <div class="flex flex-col items-center gap-3 text-gray-400">
          <i class="ti ti-loader-2 text-4xl animate-spin text-primary-500"></i>
          <span class="text-sm">Carregando...</span>
        </div>
      </div>
    `

    try {
      const module = await loader()
      currentPage = module
      await module.init(appContainer, params)
    } catch (err) {
      console.error('[Router] Erro ao carregar página:', err)
      appContainer.innerHTML = `
        <div class="flex items-center justify-center flex-1 h-full">
          <div class="flex flex-col items-center gap-3 text-red-400">
            <i class="ti ti-alert-circle text-4xl"></i>
            <span class="text-sm">Erro ao carregar: ${err.message}</span>
            <button class="btn" onclick="window.location.reload()">Recarregar</button>
          </div>
        </div>
      `
    }
  },

  setContainer(el) {
    appContainer = el
  },

  current: null,
}
