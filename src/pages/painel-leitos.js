// src/pages/painel-leitos.js
import { getLeitosPorSetor, atualizarStatusLeito } from '../services/leitos.js'
import { setNavAtivo } from '../components/sidebar.js'
import { router } from '../router.js'

const STATUS_LABEL = {
  ocupado:    'Ocupado',
  disponivel: 'Disponível',
  limpeza:    'Em limpeza',
  manutencao: 'Em manutenção',
  reservado:  'Reservado',
}

const SETOR_ICON = {
  'UTI':            'ti-heart-rate-monitor',
  'Clínica Médica': 'ti-stethoscope',
  'Cirúrgico':      'ti-scalpel',
}

let todosLeitos = []
let filtroAtivo = 'todos'
let buscaAtiva  = ''

export async function init(container) {
  setNavAtivo('leitos')

  container.innerHTML = `
    <div class="flex flex-col h-full overflow-hidden">
      <!-- Top bar -->
      <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900">Painel de Leitos</h1>
        <div class="flex gap-2">
          <button id="btn-atualizar" class="btn"><i class="ti ti-refresh text-sm"></i> Atualizar</button>
          <button id="btn-internar" class="btn btn-primary"><i class="ti ti-plus text-sm"></i> Internar Paciente</button>
        </div>
      </div>

      <!-- Summary -->
      <div id="summary-bar" class="flex gap-2.5 px-5 pt-3.5 flex-shrink-0 flex-wrap"></div>

      <!-- Filters -->
      <div class="flex gap-2 px-5 pt-3 flex-shrink-0 flex-wrap items-center">
        <button class="filter-btn active" data-filtro="todos">Todos</button>
        <button class="filter-btn" data-filtro="ocupado">
          <span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>Ocupado
        </button>
        <button class="filter-btn" data-filtro="disponivel">
          <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>Disponível
        </button>
        <button class="filter-btn" data-filtro="reservado">
          <span class="inline-block w-2 h-2 rounded-full bg-violet-500 mr-1"></span>Reservado
        </button>
        <button class="filter-btn" data-filtro="limpeza">
          <span class="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1"></span>Em limpeza
        </button>
        <button class="filter-btn" data-filtro="manutencao">
          <span class="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1"></span>Em manutenção
        </button>
        <div class="ml-auto relative">
          <i class="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input id="busca-leito" type="text" placeholder="Buscar paciente ou leito..."
            class="field pl-8 w-48 text-xs">
        </div>
      </div>

      <!-- Content -->
      <div id="leitos-content" class="flex-1 overflow-y-auto px-5 py-3.5 flex flex-col gap-5">
        <div class="flex items-center justify-center py-10 text-gray-400">
          <i class="ti ti-loader-2 text-3xl animate-spin text-primary-500"></i>
        </div>
      </div>
    </div>
  `

  // Injeta estilos de filtro inline (Tailwind purge não pega dinâmico)
  injetarEstilosFiltro()

  // Eventos
  document.getElementById('btn-atualizar').addEventListener('click', carregarLeitos)
  document.getElementById('btn-internar').addEventListener('click', () => {
    // Pega primeiro leito disponível ou abre seleção
    const disponivel = todosLeitos.find(l => l.status === 'disponivel')
    if (!disponivel) { alert('Nenhum leito disponível no momento.'); return }
    router.navigate('internar', { leito_id: disponivel.id })
  })
  document.getElementById('busca-leito').addEventListener('input', e => {
    buscaAtiva = e.target.value.toLowerCase().trim()
    renderLeitos()
  })
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filtroAtivo = btn.dataset.filtro
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      renderLeitos()
    })
  })

  await carregarLeitos()
}

async function carregarLeitos() {
  try {
    const data = await getLeitosPorSetor()
    todosLeitos = data || []
    renderSummary()
    renderLeitos()
  } catch (err) {
    document.getElementById('leitos-content').innerHTML = `
      <div class="alert alert-red"><i class="ti ti-alert-circle text-base"></i>Erro ao carregar leitos: ${err.message}</div>
    `
  }
}

function renderSummary() {
  const counts = { ocupado:0, disponivel:0, limpeza:0, manutencao:0, reservado:0 }
  todosLeitos.forEach(l => counts[l.status] = (counts[l.status] || 0) + 1)
  const total = todosLeitos.length
  const taxa  = total ? Math.round((counts.ocupado / total) * 100) : 0

  const items = [
    { label:'Total',       val: total,            dot:'#d1d5db', cor:'#374151' },
    { label:'Ocupados',    val: counts.ocupado,   dot:'#ef4444', cor:'#b91c1c' },
    { label:'Disponíveis', val: counts.disponivel,dot:'#22c55e', cor:'#15803d' },
    { label:'Reservados',  val: counts.reservado, dot:'#8b5cf6', cor:'#6d28d9' },
    { label:'Em limpeza',  val: counts.limpeza,   dot:'#f59e0b', cor:'#b45309' },
    { label:'Manutenção',  val: counts.manutencao,dot:'#6b7280', cor:'#4b5563' },
    { label:'Ocupação',    val: `${taxa}%`,       dot:'#1a9e6a', cor:'#1a9e6a' },
  ]

  document.getElementById('summary-bar').innerHTML = items.map(it => `
    <div class="flex-1 min-w-[80px] bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
      <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${it.dot}"></div>
      <div>
        <div class="text-[11px] text-gray-500">${it.label}</div>
        <div class="text-xl font-bold leading-tight" style="color:${it.cor}">${it.val}</div>
      </div>
    </div>
  `).join('')
}

function renderLeitos() {
  // Agrupa por setor filtrando
  const setores = {}
  todosLeitos.forEach(l => {
    const okF = filtroAtivo === 'todos' || l.status === filtroAtivo
    const nome = l.internacao?.[0]?.paciente?.nome || ''
    const okB = !buscaAtiva || l.codigo.toLowerCase().includes(buscaAtiva) || nome.toLowerCase().includes(buscaAtiva)
    if (okF && okB) {
      if (!setores[l.setor]) setores[l.setor] = []
      setores[l.setor].push(l)
    }
  })

  const content = document.getElementById('leitos-content')

  if (!Object.keys(setores).length) {
    content.innerHTML = `<div class="text-center text-gray-400 py-12 text-sm"><i class="ti ti-search text-3xl block mb-2"></i>Nenhum leito encontrado.</div>`
    return
  }

  content.innerHTML = Object.entries(setores).map(([setor, leitos]) => {
    const icon = SETOR_ICON[setor] || 'ti-building-hospital'
    const totalSetor = todosLeitos.filter(l => l.setor === setor).length
    return `
      <div>
        <div class="flex items-center gap-2 mb-2.5">
          <i class="ti ${icon} text-primary-500 text-base"></i>
          <span class="text-sm font-bold text-gray-700">${setor}</span>
          <span class="text-[11px] text-gray-400">${leitos.length} de ${totalSetor} leitos</span>
        </div>
        <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(175px, 1fr))">
          ${leitos.map(renderCard).join('')}
        </div>
      </div>
    `
  }).join('')

  // Bind de eventos dos cards
  document.querySelectorAll('[data-leito-ver]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const leitoId = btn.dataset.leitoVer
      const internacao = todosLeitos.find(l => l.id == leitoId)?.internacao?.[0]
      router.navigate('prontuario', { leito_id: leitoId, internacao_id: internacao?.id })
    })
  })

  document.querySelectorAll('[data-leito-alta]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const leitoId = btn.dataset.leitoAlta
      const leito = todosLeitos.find(l => l.id == leitoId)
      const internacao = leito?.internacao?.[0]
      router.navigate('alta', { leito, internacao })
    })
  })

  document.querySelectorAll('[data-leito-internar]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      router.navigate('internar', { leito_id: btn.dataset.leitoInternar })
    })
  })
}

function renderCard(l) {
  const internacao = l.internacao?.[0]
  const paciente   = internacao?.paciente
  const badge      = `<span class="badge badge-${l.status}">${STATUS_LABEL[l.status]}</span>`

  let body = ''
  if (l.status === 'ocupado' || l.status === 'reservado') {
    if (paciente?.nome)        body += `<div class="text-[12.5px] font-semibold text-gray-900 mt-1.5 truncate">${paciente.nome}</div>`
    if (internacao?.dias_internado != null) body += `<div class="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1"><i class="ti ti-clock text-xs"></i>${internacao.dias_internado} dias internado</div>`
    if (internacao?.diagnostico) body += `<div class="text-[11px] text-gray-600 mt-1 line-clamp-2">${internacao.diagnostico}</div>`
    if (internacao?.observacoes) body += `<div class="text-[11px] text-amber-600 mt-1 italic truncate"><i class="ti ti-alert-circle text-xs align-[-1px]"></i> ${internacao.observacoes}</div>`
  } else {
    body += `<div class="text-xs text-gray-400 mt-2">${l.status === 'disponivel' ? 'Leito disponível' : l.status === 'limpeza' ? 'Aguardando limpeza' : 'Em manutenção'}</div>`
  }

  let actions = ''
  if (l.status === 'ocupado') {
    actions = `
      <div class="flex gap-1 mt-2 pt-2 border-t border-gray-100">
        <button data-leito-ver="${l.id}" class="flex-1 text-[11px] py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center gap-1 transition-colors">
          <i class="ti ti-file-text text-xs"></i> Ver
        </button>
        <button data-leito-alta="${l.id}" class="flex-1 text-[11px] py-1 rounded border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 flex items-center justify-center gap-1 transition-colors">
          <i class="ti ti-door-exit text-xs"></i> Alta
        </button>
      </div>`
  } else if (l.status === 'disponivel') {
    actions = `
      <div class="flex gap-1 mt-2 pt-2 border-t border-gray-100">
        <button data-leito-internar="${l.id}" class="flex-1 text-[11px] py-1 rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 flex items-center justify-center gap-1 transition-colors">
          <i class="ti ti-plus text-xs"></i> Internar
        </button>
      </div>`
  }

  return `
    <div class="leito-card ${l.status}">
      <div class="flex items-center justify-between text-[13px] font-bold text-gray-800 mb-0.5">
        ${l.codigo} ${badge}
      </div>
      ${body}
      ${actions}
    </div>
  `
}

function injetarEstilosFiltro() {
  if (document.getElementById('filter-btn-style')) return
  const style = document.createElement('style')
  style.id = 'filter-btn-style'
  style.textContent = `
    .filter-btn { padding: 5px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; border: 1px solid #d0d5db; background: #fff; color: #374151; font-weight: 500; transition: all .15s; display:inline-flex;align-items:center; }
    .filter-btn:hover { border-color: #1a9e6a; color: #1a9e6a; }
    .filter-btn.active { background: #1a9e6a; border-color: #1a9e6a; color: #fff; }
  `
  document.head.appendChild(style)
}
