// src/components/sidebar.js
import { signOut } from '../services/auth.js'
import { getNotificacoes, marcarTodasLidas, marcarLida, excluirNotificacao, escutarNotificacoes } from '../services/notificacoes.js'

export function renderSidebar(paginaAtiva = 'leitos') {
  const usuario = JSON.parse(localStorage.getItem('sigmapep_usuario') || 'null')
  const nome = usuario?.nome || 'Usuário'
  const perfil = usuario?.perfil || ''
  const crm = usuario?.crm || ''
  const iniciais = nome.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
  const subinfo = crm ? `CRM/PR ${crm} · ${perfil}` : perfil

  const itens = [
    { id: 'leitos',     icon: 'ti-layout-grid',    label: 'Painel de Leitos' },
    { id: 'pacientes',  icon: 'ti-users',           label: 'Pacientes' },
    { id: 'prescricoes',icon: 'ti-clipboard-list',  label: 'Prescrições' },
    { id: 'evolucoes',  icon: 'ti-activity',        label: 'Evoluções' },
    { id: 'exames',     icon: 'ti-microscope',      label: 'Exames' },
    { id: 'lista-alta', icon: 'ti-door-exit',       label: 'Alta Hospitalar' },
    { id: 'relatorios', icon: 'ti-chart-bar',       label: 'Relatórios' },
    { id: 'usuarios',   icon: 'ti-user-circle',     label: 'Usuários' },
    { id: 'mensagens',  icon: 'ti-message-circle',  label: 'Mensagens' },
    { id: 'config',     icon: 'ti-settings',        label: 'Configurações' },
  ]

  return `
    <aside class="w-[180px] min-w-[180px] bg-sidebar flex flex-col flex-shrink-0 h-screen sticky top-0 relative">
      <!-- Logo -->
      <div class="px-3 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div>
          <div class="text-white font-bold text-[15px] tracking-wide">SigmaPEP</div>
          <div class="text-white/50 text-[9px] tracking-widest uppercase mt-0.5">Prontuário Eletrônico</div>
        </div>
        <!-- Sininho notificações -->
        <button id="btn-notif" class="relative text-white/60 hover:text-white transition-colors p-1">
          <i class="ti ti-bell text-lg"></i>
          <span id="notif-badge" class="hidden absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none"></span>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-2 overflow-y-auto">
        ${itens.map(item => `
          <div class="nav-item ${item.id === paginaAtiva ? 'active' : ''}"
               data-page="${item.id}"
               id="nav-${item.id}">
            <i class="ti ${item.icon} text-base"></i>
            <span>${item.label}</span>
          </div>
        `).join('')}
      </nav>

      <!-- User -->
      <div class="px-3 py-3 border-t border-white/10 flex items-center gap-2">
        <div class="w-[30px] h-[30px] rounded-full bg-white/20 flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
          ${iniciais}
        </div>
        <div class="min-w-0">
          <div class="text-white text-[11.5px] font-medium truncate">${nome}</div>
          <div class="text-white/50 text-[10px] truncate">${subinfo}</div>
        </div>
      </div>
      <div class="px-3.5 pb-3">
        <button id="btn-sair" class="text-white/50 text-xs flex items-center gap-1.5 hover:text-white/80 transition-colors">
          <i class="ti ti-logout text-sm"></i> Sair
        </button>
      </div>

      <!-- Painel de notificações (dropdown) -->
      <div id="painel-notif" class="hidden absolute top-0 left-[184px] w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col max-h-[90vh]" style="top:0">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span class="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <i class="ti ti-bell text-primary-500"></i> Notificações
          </span>
          <div class="flex gap-2">
            <button id="btn-notif-ler-todas" class="text-[11px] text-primary-500 hover:underline">Marcar todas lidas</button>
            <button id="btn-notif-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x text-sm"></i></button>
          </div>
        </div>
        <div id="notif-lista" class="overflow-y-auto flex-1 divide-y divide-gray-50">
          <div class="flex justify-center py-6 text-gray-400 text-sm">
            <i class="ti ti-loader-2 animate-spin mr-2"></i> Carregando...
          </div>
        </div>
      </div>
    </aside>
  `
}

export function bindSidebarNav(router) {
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', () => router.navigate(el.dataset.page))
  })

  document.getElementById('btn-sair')?.addEventListener('click', async () => {
    await signOut()
    localStorage.removeItem('sigmapep_usuario')
    router.navigate('login')
  })

  // Inicializa notificações
  inicializarNotificacoes()
}

async function inicializarNotificacoes() {
  await atualizarBadge()

  // Escuta em tempo real
  escutarNotificacoes((nova) => {
    tocarSom()
    atualizarBadge()
    mostrarToast(nova)
  })

  // Abre/fecha painel
  document.getElementById('btn-notif')?.addEventListener('click', async (e) => {
    e.stopPropagation()
    const painel = document.getElementById('painel-notif')
    const aberto = !painel.classList.contains('hidden')
    if (aberto) {
      painel.classList.add('hidden')
    } else {
      painel.classList.remove('hidden')
      await renderNotificacoes()
    }
  })

  // Fecha ao clicar fora
  document.addEventListener('click', (e) => {
    const painel = document.getElementById('painel-notif')
    const btn = document.getElementById('btn-notif')
    if (painel && !painel.contains(e.target) && e.target !== btn) {
      painel.classList.add('hidden')
    }
  })

  document.getElementById('btn-notif-fechar')?.addEventListener('click', () => {
    document.getElementById('painel-notif').classList.add('hidden')
  })

  document.getElementById('btn-notif-ler-todas')?.addEventListener('click', async () => {
    await marcarTodasLidas()
    await atualizarBadge()
    await renderNotificacoes()
  })
}

async function atualizarBadge() {
  const notifs = await getNotificacoes()
  const naoLidas = notifs.filter(n => !n.lida).length
  const badge = document.getElementById('notif-badge')
  if (!badge) return
  if (naoLidas > 0) {
    badge.textContent = naoLidas > 9 ? '9+' : naoLidas
    badge.classList.remove('hidden')
  } else {
    badge.classList.add('hidden')
  }
}

async function renderNotificacoes() {
  const lista = document.getElementById('notif-lista')
  if (!lista) return

  const notifs = await getNotificacoes()

  if (!notifs.length) {
    lista.innerHTML = `<div class="text-center py-8 text-gray-400 text-sm"><i class="ti ti-bell-off text-2xl block mb-2"></i>Nenhuma notificação.</div>`
    return
  }

  const ICONS = { internacao: '🛏️', alta: '🚪', obito: '⚫', transferencia: '🔄' }

  lista.innerHTML = notifs.map(n => `
    <div class="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.lida ? 'bg-primary-50/40' : ''}" data-notif-id="${n.id}">
      <div class="text-xl flex-shrink-0 mt-0.5">${ICONS[n.tipo] || '🔔'}</div>
      <div class="flex-1 min-w-0">
        <div class="text-[12.5px] font-semibold text-gray-800 ${!n.lida ? '' : 'font-normal'}">${n.titulo}</div>
        <div class="text-[11px] text-gray-500 mt-0.5">${n.mensagem}</div>
        <div class="text-[10px] text-gray-400 mt-1">${new Date(n.created_at).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'})}</div>
      </div>
      <div class="flex flex-col gap-1 flex-shrink-0">
        ${!n.lida ? `<button class="btn-notif-lida text-[10px] text-primary-500 hover:underline" data-id="${n.id}">Lida</button>` : ''}
        <button class="btn-notif-del text-[10px] text-red-400 hover:text-red-600" data-id="${n.id}"><i class="ti ti-x text-xs"></i></button>
      </div>
    </div>
  `).join('')

  lista.querySelectorAll('.btn-notif-lida').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      await marcarLida(btn.dataset.id)
      await atualizarBadge()
      await renderNotificacoes()
    })
  })

  lista.querySelectorAll('.btn-notif-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      await excluirNotificacao(btn.dataset.id)
      await renderNotificacoes()
    })
  })
}

function mostrarToast(notif) {
  const toast = document.createElement('div')
  toast.className = 'fixed bottom-5 right-5 bg-white border border-gray-200 rounded-xl shadow-2xl px-4 py-3 flex gap-3 items-start z-[9999] max-w-xs animate-slide-up'
  toast.innerHTML = `
    <div class="text-xl">🛏️</div>
    <div>
      <div class="font-semibold text-gray-800 text-sm">${notif.titulo}</div>
      <div class="text-xs text-gray-500 mt-0.5">${notif.mensagem}</div>
    </div>
    <button class="text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0"><i class="ti ti-x text-sm"></i></button>
  `
  document.body.appendChild(toast)
  toast.querySelector('button').addEventListener('click', () => toast.remove())
  setTimeout(() => toast.remove(), 6000)
}

function tocarSom() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch(e) {}
}

export function setNavAtivo(paginaId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'))
  document.getElementById(`nav-${paginaId}`)?.classList.add('active')
}
