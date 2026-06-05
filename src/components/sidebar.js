// src/components/sidebar.js
import { signOut } from '../services/auth.js'

export function renderSidebar(paginaAtiva = 'leitos') {
  const usuario = JSON.parse(sessionStorage.getItem('sigmapep_usuario') || 'null')
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
    { id: 'relatorios', icon: 'ti-chart-bar',       label: 'Relatórios'   },
    { id: 'usuarios',   icon: 'ti-user-circle',     label: 'Usuários' },
    { id: 'config',     icon: 'ti-settings',        label: 'Configurações' },
  ]

  return `
    <aside class="w-[180px] min-w-[180px] bg-sidebar flex flex-col flex-shrink-0 h-screen sticky top-0">
      <!-- Logo -->
      <div class="px-3 py-3.5 border-b border-white/10">
        <div class="text-white font-bold text-[15px] tracking-wide">SigmaPEP</div>
        <div class="text-white/50 text-[9px] tracking-widest uppercase mt-0.5">Prontuário Eletrônico</div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-2">
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
    </aside>
  `
}

export function bindSidebarNav(router) {
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      const page = el.dataset.page
      router.navigate(page)
    })
  })

  document.getElementById('btn-sair')?.addEventListener('click', async () => {
    await signOut()
    sessionStorage.removeItem('sigmapep_usuario')
    router.navigate('login')
  })
}

export function setNavAtivo(paginaId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'))
  document.getElementById(`nav-${paginaId}`)?.classList.add('active')
}

