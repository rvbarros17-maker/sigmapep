// src/pages/relatorios.js
import { supabase } from '../services/supabase.js'
import { setNavAtivo } from '../components/sidebar.js'
import { calcularIdade } from '../services/pacientes.js'

export async function init(container) {
  setNavAtivo('relatorios')
  container.innerHTML = `
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900">Relatórios</h1>
        <div class="flex gap-2">
          <button id="btn-atualizar" class="btn"><i class="ti ti-refresh text-sm"></i> Atualizar</button>
          <button id="btn-imprimir" class="btn btn-primary"><i class="ti ti-printer text-sm"></i> Imprimir</button>
        </div>
      </div>

      <!-- Seletor de relatório -->
      <div class="flex border-b border-gray-200 px-5 bg-white flex-shrink-0">
        <button class="pront-tab active" data-rel="censo"><i class="ti ti-layout-list text-sm"></i> Censo por Ala</button>
        <button class="pront-tab" data-rel="dietas"><i class="ti ti-soup text-sm"></i> Dietas — Copeira</button>
        <button class="pront-tab" data-rel="internados"><i class="ti ti-chart-bar text-sm"></i> Internados por Período</button>
        <button class="pront-tab" data-rel="altas"><i class="ti ti-door-exit text-sm"></i> Altas por Período</button>
      </div>

      <div id="rel-content" class="flex-1 overflow-y-auto px-5 py-4">
        <div class="flex justify-center py-10"><i class="ti ti-loader-2 text-2xl animate-spin text-primary-500"></i></div>
      </div>
    </div>
  `

  injetarEstilos()

  document.querySelectorAll('.pront-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pront-tab').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      carregarRelatorio(btn.dataset.rel)
    })
  })

  document.getElementById('btn-atualizar').addEventListener('click', () => {
    const ativo = document.querySelector('.pront-tab.active')?.dataset.rel || 'censo'
    carregarRelatorio(ativo)
  })

  document.getElementById('btn-imprimir').addEventListener('click', () => {
    const ativo = document.querySelector('.pront-tab.active')?.dataset.rel || 'censo'
    if (ativo === 'censo') imprimirCenso()
    else if (ativo === 'dietas') imprimirDietas()
    else if (ativo === 'internados') imprimirInternados()
    else if (ativo === 'altas') imprimirAltas()
  })

  await carregarRelatorio('censo')
}

async function carregarRelatorio(tipo) {
  const rc = document.getElementById('rel-content')
  rc.innerHTML = `<div class="flex justify-center py-10"><i class="ti ti-loader-2 text-2xl animate-spin text-primary-500"></i></div>`

  try {
    const { data, error } = await supabase
      .from('internacoes')
      .select('*, paciente:pacientes(*), leito:leitos(codigo, setor)')
      .eq('ativo', true)
      .order('data_internacao')

    if (error) throw error

    const internacoes = (data || []).map(i => ({
      ...i,
      dias_internado: i.data_internacao
        ? Math.floor((Date.now() - new Date(i.data_internacao)) / 86400000)
        : 0,
    }))

    _internacoes = internacoes

    if (tipo === 'censo') renderCenso(rc, internacoes)
    else if (tipo === 'dietas') renderDietas(rc, internacoes)
    else if (tipo === 'internados') await renderInternados(rc)
    else if (tipo === 'altas') await renderAltas(rc)

  } catch (err) {
    rc.innerHTML = `<div class="alert alert-red"><i class="ti ti-alert-circle"></i> Erro: ${err.message}</div>`
  }
}

// ── CENSO POR ALA ─────────────────────────────────────────────
function renderCenso(container, internacoes) {
  const setores = [
    'Aguardando Leito - Medicação',
    'Aguardando Leito - Intermediário',
    'Aguardando Leito - Sala de Emergência',
    'Observação',
    'Observação - Isolamento',
  ]

  const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })
  const total = internacoes.length

  container.innerHTML = `
    <div id="print-area" class="flex flex-col gap-5">
      <!-- Cabeçalho imprimível -->
      <div class="print-header hidden-screen bg-white border border-gray-200 rounded-lg p-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-bold text-gray-900">SigmaPEP — Censo Diário de Internações</div>
            <div class="text-sm text-gray-500 mt-1">${agora}</div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-primary-500">${total}</div>
            <div class="text-xs text-gray-500">pacientes internados</div>
          </div>
        </div>
      </div>

      <!-- Resumo -->
      <div class="grid grid-cols-5 gap-3 no-print">
        ${setores.map(s => {
          const count = internacoes.filter(i => i.leito?.setor === s).length
          const label = s.replace('Aguardando Leito - ','').replace('Observação - ','')
          return `
            <div class="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <div class="text-xl font-bold text-gray-800">${count}</div>
              <div class="text-[11px] text-gray-500 mt-0.5">${label}</div>
            </div>`
        }).join('')}
      </div>

      <!-- Tabelas por setor -->
      ${setores.map(setor => {
        const pacs = internacoes.filter(i => i.leito?.setor === setor)
        const labelSetor = setor
        const ocupacao = pacs.length
        const totalLeitos = { 'Aguardando Leito - Medicação':10, 'Aguardando Leito - Intermediário':10, 'Aguardando Leito - Sala de Emergência':4, 'Observação':18, 'Observação - Isolamento':2 }[setor] || '—'

        return `
          <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div class="flex items-center gap-2">
                <i class="ti ti-building-hospital text-primary-500"></i>
                <span class="font-semibold text-gray-800">${labelSetor}</span>
                <span class="text-xs text-gray-400">${ocupacao} de ${totalLeitos} leitos ocupados</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div class="h-full rounded-full ${ocupacao/totalLeitos > 0.8 ? 'bg-red-500' : ocupacao/totalLeitos > 0.5 ? 'bg-amber-500' : 'bg-primary-500'}"
                    style="width:${Math.min(100, Math.round(ocupacao/totalLeitos*100))}%"></div>
                </div>
                <span class="text-xs font-medium text-gray-600">${Math.round(ocupacao/totalLeitos*100)}%</span>
              </div>
            </div>
            ${pacs.length === 0 ? `
              <div class="px-4 py-6 text-center text-gray-400 text-sm">Nenhum paciente neste setor.</div>
            ` : `
              <table class="data-table">
                <thead><tr>
                  <th>Leito</th>
                  <th>Paciente</th>
                  <th>Idade</th>
                  <th>Observação</th>
                  <th>Dias</th>
                  <th>Diagnóstico</th>
                  <th>Médico</th>
                  <th class="no-print">Ações</th>
                </tr></thead>
                <tbody>
                  ${pacs.map(i => `
                    <tr>
                      <td class="font-semibold text-gray-700">${i.leito?.codigo || '—'}</td>
                      <td class="font-medium text-gray-800">${i.paciente?.nome || '—'}</td>
                      <td class="text-gray-600">${calcularIdade(i.paciente?.data_nascimento)}</td>
                      <td class="text-[11px] text-gray-500">${i.data_internacao ? new Date(i.data_internacao).toLocaleDateString('pt-BR') : '—'}</td>
                      <td>
                        <span class="text-[11px] px-1.5 py-0.5 rounded font-medium ${i.dias_internado >= 7 ? 'bg-red-100 text-red-700' : i.dias_internado >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}">
                          ${i.dias_internado}d
                        </span>
                      </td>
                      <td class="text-gray-600 max-w-[180px] truncate text-[12px]">${i.diagnostico || '—'}</td>
                      <td class="text-gray-500 text-[11px]">${i.medico_responsavel || '—'}</td>
                      <td class="no-print">
                        ${setor.includes('Aguardando') ? `
                          <button class="btn-transferir text-[11px] px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                            data-id="${i.id}" data-nome="${i.paciente?.nome}" data-leito="${i.leito?.codigo}" data-setor="${setor}">
                            <i class="ti ti-arrows-transfer-up text-xs"></i> Transferir
                          </button>` : '—'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        `
      }).join('')}

      <!-- Rodapé -->
      <div class="text-center text-xs text-gray-400 py-2 no-print">
        Relatório gerado em ${agora} · SigmaPEP
      </div>
    </div>

    <!-- Modal transferência -->
    <div id="modal-transferir" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Transferência de Setor</h3>
          <button id="modal-tr-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x"></i></button>
        </div>
        <div class="p-4 flex flex-col gap-3">
          <div class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <div class="text-[11px] text-gray-400 mb-0.5">Paciente</div>
            <div class="font-semibold text-gray-800" id="tr-pac-nome">—</div>
            <div class="text-xs text-gray-500 mt-0.5">Leito atual: <span id="tr-leito-atual">—</span></div>
          </div>
          <div>
            <label class="field-label">Transferir para o setor *</label>
            <select id="tr-setor-destino" class="field text-[12.5px]">
              <option value="">Selecione o setor de destino</option>
              <option value="Aguardando Leito - Medicação">Aguardando Leito — Medicação</option>
              <option value="Aguardando Leito - Intermediário">Aguardando Leito — Intermediário</option>
              <option value="Aguardando Leito - Sala de Emergência">Aguardando Leito — Sala de Emergência</option>
              <option value="Observação">Observação</option>
              <option value="Observação - Isolamento">Observação — Isolamento</option>
            </select>
          </div>
          <div id="tr-leitos-disponiveis" class="hidden">
            <label class="field-label">Leito de destino *</label>
            <select id="tr-leito-destino" class="field text-[12.5px]">
              <option value="">Selecione o leito</option>
            </select>
          </div>
          <div>
            <label class="field-label">Motivo da transferência</label>
            <textarea id="tr-motivo" class="field text-[12.5px]" rows="2" placeholder="Ex: Melhora clínica, piora do quadro, necessidade de isolamento..."></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button id="modal-tr-cancelar" class="btn">Cancelar</button>
          <button id="modal-tr-confirmar" class="btn btn-primary"><i class="ti ti-arrows-transfer-up text-sm"></i> Confirmar Transferência</button>
        </div>
      </div>
    </div>
  `

  bindTransferencia(internacoes)
}

function bindTransferencia(internacoes) {
  let internacaoSelecionada = null

  const modal = document.getElementById('modal-transferir')
  const fechar = () => modal.classList.add('hidden')

  document.getElementById('modal-tr-fechar').addEventListener('click', fechar)
  document.getElementById('modal-tr-cancelar').addEventListener('click', fechar)

  document.querySelectorAll('.btn-transferir').forEach(btn => {
    btn.addEventListener('click', () => {
      internacaoSelecionada = internacoes.find(i => i.id === btn.dataset.id)
      document.getElementById('tr-pac-nome').textContent = btn.dataset.nome
      document.getElementById('tr-leito-atual').textContent = btn.dataset.leito + ' — ' + btn.dataset.setor
      // Remove setor atual das opções
      document.querySelectorAll('#tr-setor-destino option').forEach(opt => {
        opt.disabled = opt.value === btn.dataset.setor
      })
      document.getElementById('tr-setor-destino').value = ''
      document.getElementById('tr-motivo').value = ''
      modal.classList.remove('hidden')
    })
  })

  // Quando muda setor destino, carrega leitos disponíveis
  document.getElementById('tr-setor-destino').addEventListener('change', async e => {
    const setor = e.target.value
    const leitosDiv = document.getElementById('tr-leitos-disponiveis')
    const leitoSelect = document.getElementById('tr-leito-destino')
    if (!setor) { leitosDiv.classList.add('hidden'); return }

    leitosDiv.classList.remove('hidden')
    leitoSelect.innerHTML = '<option value="">Carregando...</option>'

    const { data: leitos } = await supabase
      .from('leitos').select('id, codigo')
      .eq('setor', setor).eq('status', 'disponivel').order('codigo')

    if (!leitos?.length) {
      leitoSelect.innerHTML = '<option value="">Nenhum leito disponível neste setor</option>'
    } else {
      leitoSelect.innerHTML = '<option value="">Selecione o leito</option>' +
        leitos.map(l => `<option value="${l.id}">${l.codigo}</option>`).join('')
    }
  })

  document.getElementById('modal-tr-confirmar').addEventListener('click', async () => {
    if (!internacaoSelecionada) return
    const setorDestino = document.getElementById('tr-setor-destino').value
    const leitoDestinoId = document.getElementById('tr-leito-destino')?.value
    if (!setorDestino) { alert('Selecione o setor de destino.'); return }
    if (!leitoDestinoId) { alert('Selecione o leito de destino.'); return }

    const btn = document.getElementById('modal-tr-confirmar')
    btn.disabled = true
    btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Transferindo...'

    try {
      const leitoAntigo = internacaoSelecionada.leito_id

      // Atualiza internação para novo leito
      const { error: e2 } = await supabase
        .from('internacoes')
        .update({ leito_id: leitoDestinoId, updated_at: new Date().toISOString() })
        .eq('id', internacaoSelecionada.id)
      if (e2) throw e2

      // Leito antigo → disponível, Leito novo → ocupado
      await supabase.from('leitos').update({ status: 'disponivel' }).eq('id', leitoAntigo)
      await supabase.from('leitos').update({ status: 'ocupado' }).eq('id', leitoDestinoId)

      fechar()
      await carregarRelatorio('censo')

    } catch (err) {
      alert('Erro: ' + err.message)
      btn.disabled = false
      btn.innerHTML = '<i class="ti ti-arrows-transfer-up text-sm"></i> Confirmar Transferência'
    }
  })
}

// ── DIETAS — COPEIRA ──────────────────────────────────────────
function renderDietas(container, internacoes) {
  const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })

  // Busca última prescrição de cada internação para pegar a dieta
  // Como dieta está na prescrição, mostramos o que temos na internação
  // Precisamos buscar separado
  buscarDietasERenderar(container, internacoes, agora)
}

async function buscarDietasERenderar(container, internacoes, agora) {
  // Busca última prescrição de cada internação ativa
  const ids = internacoes.map(i => i.id)

  let dietasPorInternacao = {}

  if (ids.length > 0) {
    const { data: prescricoes } = await supabase
      .from('prescricoes')
      .select('internacao_id, dieta, created_at')
      .in('internacao_id', ids)
      .order('created_at', { ascending: false })

    // Pega só a última prescrição de cada internação
    ;(prescricoes || []).forEach(p => {
      if (!dietasPorInternacao[p.internacao_id]) {
        dietasPorInternacao[p.internacao_id] = p.dieta || null
      }
    })
    _dietasPorInternacao = dietasPorInternacao
  }

  const setores = [
    'Aguardando Leito - Medicação',
    'Aguardando Leito - Intermediário',
    'Aguardando Leito - Sala de Emergência',
    'Observação',
    'Observação - Isolamento',
  ]

  // Agrupa dietas únicas para resumo
  const todasDietas = internacoes.map(i => dietasPorInternacao[i.id] || 'Não prescrita')
  const resumoDietas = todasDietas.reduce((acc, d) => { acc[d] = (acc[d]||0)+1; return acc }, {})

  container.innerHTML = `
    <div id="print-area" class="flex flex-col gap-5">
      <!-- Cabeçalho -->
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-base font-bold text-gray-900 flex items-center gap-2">
              <i class="ti ti-soup text-primary-500"></i>
              Relatório de Dietas — Copeira
            </div>
            <div class="text-xs text-gray-500 mt-1">${agora}</div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-primary-500">${internacoes.length}</div>
            <div class="text-xs text-gray-500">pacientes</div>
          </div>
        </div>

        <!-- Resumo de dietas -->
        <div class="mt-4 pt-4 border-t border-gray-100">
          <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Resumo de dietas</div>
          <div class="flex flex-wrap gap-2">
            ${Object.entries(resumoDietas).map(([dieta, qtd]) => `
              <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                <span class="text-sm font-bold text-primary-500">${qtd}x</span>
                <span class="text-xs text-gray-700">${dieta}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Tabelas por setor -->
      ${setores.map(setor => {
        const pacs = internacoes.filter(i => i.leito?.setor === setor)
        if (!pacs.length) return ''
        return `
          <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <i class="ti ti-building-hospital text-primary-500"></i>
              <span class="font-semibold text-gray-800">${setor}</span>
              <span class="text-xs text-gray-400">${pacs.length} paciente${pacs.length!==1?'s':''}</span>
            </div>
            <table class="data-table">
              <thead><tr>
                <th>Leito</th>
                <th>Paciente</th>
                <th>Idade</th>
                <th>Dieta Prescrita</th>
                <th>Observações</th>
              </tr></thead>
              <tbody>
                ${pacs.map(i => {
                  const dieta = dietasPorInternacao[i.id]
                  return `
                    <tr>
                      <td class="font-semibold text-gray-700">${i.leito?.codigo||'—'}</td>
                      <td class="font-medium text-gray-800">${i.paciente?.nome||'—'}</td>
                      <td class="text-gray-600">${calcularIdade(i.paciente?.data_nascimento)}</td>
                      <td>
                        ${dieta
                          ? `<span class="text-[12px] font-medium text-gray-800">${dieta}</span>`
                          : `<span class="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Não prescrita</span>`
                        }
                      </td>
                      <td class="text-gray-500 text-[12px]">${i.observacoes||'—'}</td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        `
      }).join('')}

      <div class="text-center text-xs text-gray-400 py-2 no-print">
        Relatório gerado em ${agora} · SigmaPEP — Copeira
      </div>
    </div>
  `
}

// ── INTERNADOS POR PERÍODO ────────────────────────────────────
async function renderInternados(container) {
  const hoje = new Date()
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().split('T')[0]

  container.innerHTML = `
    <div class="flex flex-col gap-4">
      <div class="card">
        <div class="card-title flex items-center gap-2 mb-3"><i class="ti ti-filter text-primary-500"></i> Filtrar Período</div>
        <div class="flex gap-3 items-end">
          <div><label class="field-label">De</label><input id="int-de" type="date" class="field" value="${primeiroDia}"></div>
          <div><label class="field-label">Até</label><input id="int-ate" type="date" class="field" value="${ultimoDia}"></div>
          <button id="btn-buscar-int" class="btn btn-primary"><i class="ti ti-search text-sm"></i> Buscar</button>
        </div>
      </div>
      <div id="int-resultado"></div>
    </div>
  `

  const buscar = async () => {
    const de = document.getElementById('int-de').value
    const ate = document.getElementById('int-ate').value
    const res = document.getElementById('int-resultado')
    res.innerHTML = `<div class="flex justify-center py-6"><i class="ti ti-loader-2 animate-spin text-primary-500 text-2xl"></i></div>`

    const { data, error } = await supabase
      .from('internacoes')
      .select('*, paciente:pacientes(nome, codigo_sus, data_nascimento), leito:leitos(codigo, setor)')
      .gte('data_internacao', de + 'T00:00:00')
      .lte('data_internacao', ate + 'T23:59:59')
      .order('data_internacao', { ascending: false })

    if (error) { res.innerHTML = `<div class="alert alert-red">${error.message}</div>`; return }

    const internacoes = data || []
    _internadosPeriodo = internacoes

    // Agrupa por setor
    const porSetor = internacoes.reduce((acc, i) => {
      const s = i.leito?.setor || 'Sem setor'
      acc[s] = (acc[s]||0) + 1
      return acc
    }, {})

    res.innerHTML = `
      <div class="card mb-3">
        <div class="flex items-center justify-between mb-3">
          <div class="card-title mb-0 flex items-center gap-2"><i class="ti ti-users text-primary-500"></i> ${internacoes.length} internações no período</div>
          <button id="btn-print-int" class="btn text-sm"><i class="ti ti-printer text-sm"></i> Imprimir</button>
        </div>
        <div class="flex gap-3 flex-wrap mb-4">
          ${Object.entries(porSetor).map(([s,q]) => `
            <div class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
              <div class="text-xl font-bold text-primary-500">${q}</div>
              <div class="text-[11px] text-gray-500">${s.replace('Aguardando Leito - ','')}</div>
            </div>`).join('')}
        </div>
        <table class="data-table">
          <thead><tr><th>Data</th><th>Paciente</th><th>Idade</th><th>Leito</th><th>Setor</th><th>Diagnóstico</th></tr></thead>
          <tbody>
            ${internacoes.map(i => `<tr>
              <td class="text-xs">${i.data_internacao ? new Date(i.data_internacao).toLocaleDateString('pt-BR') : '—'}</td>
              <td class="font-medium">${i.paciente?.nome||'—'}</td>
              <td class="text-xs">${calcularIdadeImp(i.paciente?.data_nascimento)}</td>
              <td class="font-semibold">${i.leito?.codigo||'—'}</td>
              <td class="text-xs">${i.leito?.setor||'—'}</td>
              <td class="text-xs">${i.diagnostico||'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `
    document.getElementById('btn-print-int')?.addEventListener('click', imprimirInternados)
  }

  document.getElementById('btn-buscar-int').addEventListener('click', buscar)
  await buscar()
}

// ── ALTAS POR PERÍODO ─────────────────────────────────────────
async function renderAltas(container) {
  const hoje = new Date()
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().split('T')[0]

  container.innerHTML = `
    <div class="flex flex-col gap-4">
      <div class="card">
        <div class="card-title flex items-center gap-2 mb-3"><i class="ti ti-filter text-primary-500"></i> Filtrar Período</div>
        <div class="flex gap-3 items-end">
          <div><label class="field-label">De</label><input id="alt-de" type="date" class="field" value="${primeiroDia}"></div>
          <div><label class="field-label">Até</label><input id="alt-ate" type="date" class="field" value="${ultimoDia}"></div>
          <button id="btn-buscar-alt" class="btn btn-primary"><i class="ti ti-search text-sm"></i> Buscar</button>
        </div>
      </div>
      <div id="alt-resultado"></div>
    </div>
  `

  const TIPOS = ['Alta', 'Transferência', 'SAD', 'Óbito', 'Evasão']
  const CORES = { 'Alta':'bg-green-100 text-green-700', 'Transferência':'bg-blue-100 text-blue-700', 'SAD':'bg-purple-100 text-purple-700', 'Óbito':'bg-gray-200 text-gray-700', 'Evasão':'bg-red-100 text-red-700' }

  const buscar = async () => {
    const de = document.getElementById('alt-de').value
    const ate = document.getElementById('alt-ate').value
    const res = document.getElementById('alt-resultado')
    res.innerHTML = `<div class="flex justify-center py-6"><i class="ti ti-loader-2 animate-spin text-primary-500 text-2xl"></i></div>`

    const { data, error } = await supabase
      .from('desfechos')
      .select('*, internacao:internacoes(diagnostico, paciente:pacientes(nome, data_nascimento), leito:leitos(codigo, setor))')
      .gte('created_at', de + 'T00:00:00')
      .lte('created_at', ate + 'T23:59:59')
      .order('created_at', { ascending: false })

    if (error) { res.innerHTML = `<div class="alert alert-red">${error.message}</div>`; return }

    const desfechos = data || []
    _altasPeriodo = desfechos

    const porTipo = TIPOS.reduce((acc, t) => { acc[t] = desfechos.filter(d => d.tipo === t).length; return acc }, {})

    res.innerHTML = `
      <div class="card mb-3">
        <div class="flex items-center justify-between mb-3">
          <div class="card-title mb-0 flex items-center gap-2"><i class="ti ti-door-exit text-primary-500"></i> ${desfechos.length} desfechos no período</div>
          <button id="btn-print-alt" class="btn text-sm"><i class="ti ti-printer text-sm"></i> Imprimir</button>
        </div>
        <div class="flex gap-3 flex-wrap mb-4">
          ${TIPOS.map(t => `
            <div class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
              <div class="text-xl font-bold text-primary-500">${porTipo[t]}</div>
              <div class="text-[11px] text-gray-500">${t}</div>
            </div>`).join('')}
        </div>
        <table class="data-table">
          <thead><tr><th>Data</th><th>Paciente</th><th>Tipo</th><th>Leito</th><th>Diagnóstico</th><th>Observação</th></tr></thead>
          <tbody>
            ${desfechos.map(d => `<tr>
              <td class="text-xs">${new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
              <td class="font-medium">${d.internacao?.paciente?.nome||'—'}</td>
              <td><span class="text-[11px] px-2 py-0.5 rounded font-medium ${CORES[d.tipo]||''}">${d.tipo||'—'}</span></td>
              <td class="font-semibold">${d.internacao?.leito?.codigo||'—'}</td>
              <td class="text-xs">${d.internacao?.diagnostico||'—'}</td>
              <td class="text-xs">${d.observacoes||'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `
    document.getElementById('btn-print-alt')?.addEventListener('click', imprimirAltas)
  }

  document.getElementById('btn-buscar-alt').addEventListener('click', buscar)
  await buscar()
}

let _internadosPeriodo = []
let _altasPeriodo = []

function imprimirInternados() {
  const de = document.getElementById('int-de')?.value || ''
  const ate = document.getElementById('int-ate')?.value || ''
  const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const periodoFmt = (de ? new Date(de+'T12:00:00').toLocaleDateString('pt-BR') : '') + ' a ' + (ate ? new Date(ate+'T12:00:00').toLocaleDateString('pt-BR') : '')

  const linhas = _internadosPeriodo.map(i =>
    '<tr>' +
    '<td>' + (i.data_internacao ? new Date(i.data_internacao).toLocaleDateString('pt-BR') : '—') + '</td>' +
    '<td>' + escHtml(i.paciente?.nome||'—') + '</td>' +
    '<td>' + escHtml(calcularIdadeImp(i.paciente?.data_nascimento)) + '</td>' +
    '<td style="font-weight:bold">' + escHtml(i.leito?.codigo||'—') + '</td>' +
    '<td>' + escHtml(i.leito?.setor||'—') + '</td>' +
    '<td>' + escHtml(i.diagnostico||'—') + '</td>' +
    '</tr>'
  ).join('')

  const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Internados por Período</title>' +
    '<style>' + estilosImpressao() + '</style></head><body><div class="page">' +
    cabecalhoImpressao() +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 4px;">' +
    '<span style="font-size:10pt;font-weight:bold">Internações por Período</span>' +
    '<span style="font-size:8.5pt;color:#555">' + periodoFmt + ' · ' + _internadosPeriodo.length + ' internação(ões)</span>' +
    '</div>' +
    '<table><thead><tr><th>Data</th><th>Paciente</th><th>Idade</th><th>Leito</th><th>Setor</th><th>Diagnóstico</th></tr></thead>' +
    '<tbody>' + linhas + '</tbody></table>' +
    '<div class="rodape">SigmaPEP · UPA Zona Sul – Maringá/PR · ' + agora + '</div>' +
    '</div><script>window.onload=function(){window.print()}<\/script></body></html>'
  abrirJanela(html)
}

function imprimirAltas() {
  const de = document.getElementById('alt-de')?.value || ''
  const ate = document.getElementById('alt-ate')?.value || ''
  const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const periodoFmt = (de ? new Date(de+'T12:00:00').toLocaleDateString('pt-BR') : '') + ' a ' + (ate ? new Date(ate+'T12:00:00').toLocaleDateString('pt-BR') : '')

  const linhas = _altasPeriodo.map(d =>
    '<tr>' +
    '<td>' + new Date(d.created_at).toLocaleDateString('pt-BR') + '</td>' +
    '<td>' + escHtml(d.internacao?.paciente?.nome||'—') + '</td>' +
    '<td style="font-weight:bold">' + escHtml(d.tipo||'—') + '</td>' +
    '<td>' + escHtml(d.internacao?.leito?.codigo||'—') + '</td>' +
    '<td>' + escHtml(d.internacao?.diagnostico||'—') + '</td>' +
    '<td>' + escHtml(d.observacoes||'—') + '</td>' +
    '</tr>'
  ).join('')

  const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Altas por Período</title>' +
    '<style>' + estilosImpressao() + '</style></head><body><div class="page">' +
    cabecalhoImpressao() +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 4px;">' +
    '<span style="font-size:10pt;font-weight:bold">Desfechos por Período</span>' +
    '<span style="font-size:8.5pt;color:#555">' + periodoFmt + ' · ' + _altasPeriodo.length + ' desfecho(s)</span>' +
    '</div>' +
    '<table><thead><tr><th>Data</th><th>Paciente</th><th>Tipo</th><th>Leito</th><th>Diagnóstico</th><th>Observação</th></tr></thead>' +
    '<tbody>' + linhas + '</tbody></table>' +
    '<div class="rodape">SigmaPEP · UPA Zona Sul – Maringá/PR · ' + agora + '</div>' +
    '</div><script>window.onload=function(){window.print()}<\/script></body></html>'
  abrirJanela(html)
}

// Cache dos dados para impressão
let _internacoes = []
let _dietasPorInternacao = {}

function cabecalhoImpressao() {
  return (
    '<div style="text-align:center;padding:8px 0 6px;border-bottom:2px solid #000;">' +
    '<p style="font-weight:bold;font-size:11pt;line-height:1.5">Prefeitura do Município de Maringá</p>' +
    '<p style="font-size:10pt;line-height:1.5">Secretaria Municipal de Saúde</p>' +
    '<p style="font-size:10pt;line-height:1.5">Unidade de Pronto Atendimento Zona Sul</p>' +
    '</div>'
  )
}

function estilosImpressao() {
  return (
    '* { box-sizing:border-box; margin:0; padding:0; }' +
    'body { font-family:Arial,sans-serif; font-size:9pt; background:white; color:#000; }' +
    '@page { size:A4 portrait; margin:10mm 10mm; }' +
    '@media print { body { margin:0; } }' +
    '.page { width:100%; max-width:190mm; margin:0 auto; }' +
    '.secao-titulo { font-size:8pt; font-weight:bold; text-transform:uppercase; background:#f0f0f0; padding:4px 8px; border:1px solid #bbb; border-bottom:none; margin-top:10px; letter-spacing:0.3px; }' +
    'table { width:100%; border-collapse:collapse; }' +
    'th { border:1px solid #bbb; padding:4px 7px; background:#f5f5f5; font-size:8pt; text-align:left; font-weight:bold; }' +
    'td { border:1px solid #bbb; padding:4px 7px; font-size:8.5pt; vertical-align:top; }' +
    '.rodape { text-align:center; font-size:7pt; color:#aaa; margin-top:10px; border-top:1px solid #eee; padding-top:4px; }'
  )
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function abrirJanela(html) {
  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(html)
  win.document.close()
}

function imprimirCenso() {
  const setores = [
    'Aguardando Leito - Medicação',
    'Aguardando Leito - Intermediário',
    'Aguardando Leito - Sala de Emergência',
    'Observação',
    'Observação - Isolamento',
  ]

  const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const total = _internacoes.length

  const setoresHTML = setores.map(setor => {
    const pacs = _internacoes.filter(i => i.leito?.setor === setor)
    if (!pacs.length) return (
      '<div class="secao-titulo">Setor: ' + escHtml(setor) + '</div>' +
      '<table><tbody><tr><td colspan="7" style="text-align:center;color:#aaa;padding:8px">Nenhum paciente neste setor.</td></tr></tbody></table>'
    )
    const linhas = pacs.map(i => {
      const dataInt = i.data_internacao ? new Date(i.data_internacao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
      return (
        '<tr>' +
        '<td style="width:70px;font-weight:bold">' + escHtml(i.leito?.codigo||'—') + '</td>' +
        '<td style="width:80px">' + escHtml(i.paciente?.codigo_sus||'—') + '</td>' +
        '<td>' + escHtml(i.paciente?.nome||'—') + '</td>' +
        '<td style="width:40px;text-align:center">' + escHtml(calcularIdadeImp(i.paciente?.data_nascimento)) + '</td>' +
        '<td style="width:75px;text-align:center">' + dataInt + '</td>' +
        '<td>' + escHtml(i.diagnostico||'—') + '</td>' +
        '<td style="width:80px">' + escHtml(i.observacoes||'—') + '</td>' +
        '</tr>'
      )
    }).join('')

    return (
      '<div class="secao-titulo">Setor: ' + escHtml(setor) + ' — ' + pacs.length + ' paciente(s)</div>' +
      '<table>' +
      '<thead><tr><th>Leito</th><th>Cód SUS</th><th>Nome</th><th>Idade</th><th>D.I.</th><th>Diagnóstico</th><th>Obs</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody>' +
      '</table>'
    )
  }).join('')

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Censo</title>' +
    '<style>' + estilosImpressao() + '</style></head><body><div class="page">' +
    cabecalhoImpressao() +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 4px;">' +
    '<span style="font-size:10pt;font-weight:bold">Censo Diário de Internações</span>' +
    '<span style="font-size:8.5pt;color:#555">' + agora + ' · ' + total + ' paciente(s)</span>' +
    '</div>' +
    setoresHTML +
    '<div class="rodape">SigmaPEP · Prontuário Eletrônico · UPA Zona Sul – Maringá/PR · ' + agora + '</div>' +
    '</div><script>window.onload=function(){window.print()}<\/script></body></html>'

  abrirJanela(html)
}

function imprimirDietas() {
  const setores = [
    'Aguardando Leito - Medicação',
    'Aguardando Leito - Intermediário',
    'Aguardando Leito - Sala de Emergência',
    'Observação',
    'Observação - Isolamento',
  ]

  const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  // Resumo de dietas
  const todas = _internacoes.map(i => _dietasPorInternacao[i.id] || 'Não prescrita')
  const resumo = todas.reduce((acc, d) => { acc[d] = (acc[d]||0) + 1; return acc }, {})
  const resumoHTML = Object.entries(resumo).map(([d, q]) =>
    '<span style="border:1px solid #bbb;border-radius:4px;padding:2px 8px;font-size:8.5pt;margin-right:6px;margin-bottom:4px;display:inline-block"><b>' + q + 'x</b> ' + escHtml(d) + '</span>'
  ).join('')

  const setoresHTML = setores.map(setor => {
    const pacs = _internacoes.filter(i => i.leito?.setor === setor)
    if (!pacs.length) return ''
    const linhas = pacs.map(i => {
      const dieta = _dietasPorInternacao[i.id] || '—'
      return (
        '<tr>' +
        '<td style="width:70px;font-weight:bold">' + escHtml(i.leito?.codigo||'—') + '</td>' +
        '<td>' + escHtml(i.paciente?.nome||'—') + '</td>' +
        '<td style="width:45px;text-align:center">' + escHtml(calcularIdadeImp(i.paciente?.data_nascimento)) + '</td>' +
        '<td>' + escHtml(dieta) + '</td>' +
        '<td>' + escHtml(i.observacoes||'—') + '</td>' +
        '</tr>'
      )
    }).join('')

    return (
      '<div class="secao-titulo">Setor: ' + escHtml(setor) + ' — ' + pacs.length + ' paciente(s)</div>' +
      '<table>' +
      '<thead><tr><th>Leito</th><th>Paciente</th><th>Idade</th><th>Dieta Prescrita</th><th>Observações</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody>' +
      '</table>'
    )
  }).join('')

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Dietas</title>' +
    '<style>' + estilosImpressao() + '</style></head><body><div class="page">' +
    cabecalhoImpressao() +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 4px;">' +
    '<span style="font-size:10pt;font-weight:bold">Relatório de Dietas — Copeira</span>' +
    '<span style="font-size:8.5pt;color:#555">' + agora + ' · ' + _internacoes.length + ' paciente(s)</span>' +
    '</div>' +
    '<div style="border:1px solid #bbb;padding:6px 10px;margin-bottom:4px;background:#fafafa;">' +
    '<span style="font-size:7.5pt;color:#777;text-transform:uppercase;letter-spacing:0.3px;display:block;margin-bottom:4px">Resumo de Dietas</span>' +
    resumoHTML +
    '</div>' +
    setoresHTML +
    '<div class="rodape">SigmaPEP · Prontuário Eletrônico · UPA Zona Sul – Maringá/PR · ' + agora + '</div>' +
    '</div><script>window.onload=function(){window.print()}<\/script></body></html>'

  abrirJanela(html)
}

function calcularIdadeImp(data_nascimento) {
  if (!data_nascimento) return '—'
  const hoje = new Date()
  const nasc = new Date(data_nascimento + 'T12:00:00')
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade + 'a'
}

function injetarEstilos() {
  if (document.getElementById('rel-style')) return
  const s = document.createElement('style'); s.id = 'rel-style'
  s.textContent = `
    .pront-tab{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;font-size:13px;font-weight:500;color:#6b7280;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;background:none;border-top:none;border-left:none;border-right:none}
    .pront-tab:hover{color:#374151}
    .pront-tab.active{color:#1a9e6a;border-bottom-color:#1a9e6a}
    @media print {
      .sidebar, .no-print, nav { display: none !important; }
      #rel-content { padding: 0 !important; }
      .bg-white { background: white !important; }
      .border { border: 1px solid #e5e7eb !important; }
      body { font-size: 11px !important; }
      .data-table th, .data-table td { padding: 5px 8px !important; }
    }
  `
  document.head.appendChild(s)
}
