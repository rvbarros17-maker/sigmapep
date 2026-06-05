import './styles/main.css'
import { renderSidebar, bindSidebarNav } from './components/sidebar.js'
import { router } from './router.js'

router.register('leitos',     () => import('./pages/painel-leitos.js'))
router.register('prontuario', () => import('./pages/prontuario.js'))
router.register('alta',       () => import('./pages/alta.js'))
router.register('lista-alta',  () => import('./pages/lista-alta.js'))
router.register('internar',   () => import('./pages/internar.js'))
router.register('pacientes',  () => import('./pages/pacientes.js'))
router.register('relatorios',   () => import('./pages/relatorios.js'))
router.register('gerenciar-leitos', () => import('./pages/gerenciar-leitos.js'))
router.register('config',           () => import('./pages/configuracoes.js'))

function montarApp() {
  const app = document.getElementById('app')
  app.className = 'flex h-screen bg-gray-100 overflow-hidden'
  app.innerHTML = `
    ${renderSidebar('leitos')}
    <main id="page-container" class="flex-1 flex flex-col min-w-0 overflow-hidden"></main>
  `
  router.setContainer(document.getElementById('page-container'))
  bindSidebarNav(router)
  router.navigate('leitos')
}

montarApp()
