import './styles/main.css'
import { renderSidebar, bindSidebarNav } from './components/sidebar.js'
import { router } from './router.js'
import { getUsuarioLogado } from './services/auth.js'

router.register('login',            () => import('./pages/login.js'))
router.register('leitos',           () => import('./pages/painel-leitos.js'))
router.register('prontuario',       () => import('./pages/prontuario.js'))
router.register('alta',             () => import('./pages/alta.js'))
router.register('lista-alta',       () => import('./pages/lista-alta.js'))
router.register('internar',         () => import('./pages/internar.js'))
router.register('pacientes',        () => import('./pages/pacientes.js'))
router.register('relatorios',       () => import('./pages/relatorios.js'))
router.register('gerenciar-leitos', () => import('./pages/gerenciar-leitos.js'))
router.register('usuarios',         () => import('./pages/usuarios.js'))
router.register('mensagens',        () => import('./pages/mensagens.js'))
router.register('config',           () => import('./pages/configuracoes.js'))

async function montarApp() {
  const app = document.getElementById('app')

  // Verifica se há sessão ativa
  const usuario = await getUsuarioLogado()

  if (!usuario) {
    // Sem sessão — mostra tela de login
    app.className = 'flex h-screen'
    const container = document.createElement('div')
    container.className = 'flex h-screen w-full'
    app.appendChild(container)
    router.setContainer(container)
    router.navigate('login')
    return
  }

  // Salva usuário na sessão
  sessionStorage.setItem('sigmapep_usuario', JSON.stringify(usuario))

  // Com sessão — monta app completo
  app.className = 'flex h-screen bg-gray-100 overflow-hidden'
  app.innerHTML = `
    ${renderSidebar('leitos')}
    <main id="page-container" class="flex-1 flex flex-col min-w-0 overflow-hidden"></main>
  `
  router.setContainer(document.getElementById('page-container'))
  bindSidebarNav(router)
  router.navigate('leitos')
}

// Listener para quando o router navega para login — reconstrói sem sidebar
const originalNavigate = router.navigate.bind(router)
router.navigate = async function(name, params = {}) {
  if (name === 'login') {
    const app = document.getElementById('app')
    app.className = 'flex h-screen'
    app.innerHTML = '<div id="login-container" class="flex h-screen w-full"></div>'
    router.setContainer(document.getElementById('login-container'))
  } else if (name !== 'login' && !document.getElementById('page-container')) {
    // Reconstrói app com sidebar se não existir
    const app = document.getElementById('app')
    const usuario = JSON.parse(sessionStorage.getItem('sigmapep_usuario') || 'null')
    app.className = 'flex h-screen bg-gray-100 overflow-hidden'
    app.innerHTML = `
      ${renderSidebar(name)}
      <main id="page-container" class="flex-1 flex flex-col min-w-0 overflow-hidden"></main>
    `
    router.setContainer(document.getElementById('page-container'))
    bindSidebarNav(router)
  }
  return originalNavigate(name, params)
}

montarApp()
