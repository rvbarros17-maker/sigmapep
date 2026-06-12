// src/pages/prontuario.js
import { supabase } from '../services/supabase.js'
import { setNavAtivo } from '../components/sidebar.js'
import { router } from '../router.js'
import { calcularIdade } from '../services/pacientes.js'

let internacaoAtual = null
let tabAtiva = 'prescricao'

export async function init(container, params = {}) {
  setNavAtivo('prescricoes')
  container.innerHTML = `<div class="flex justify-center items-center flex-1 h-full"><i class="ti ti-loader-2 text-3xl animate-spin text-primary-500"></i></div>`
  try {
    const { data: internacao, error } = await supabase
      .from('internacoes')
      .select('*, paciente:pacientes(*), leito:leitos(codigo, setor)')
      .eq('id', params.internacao_id)
      .single()
    if (error) throw error
    internacaoAtual = {
      ...internacao,
      dias_internado: internacao.data_internacao
        ? Math.floor((Date.now() - new Date(internacao.data_internacao)) / 86400000)
        : 0,
    }
    renderProntuario(container, params.tab || 'prescricao')
  } catch (err) {
    container.innerHTML = `<div class="p-5"><div class="alert alert-red"><i class="ti ti-alert-circle"></i> Erro: ${err.message}</div></div>`
  }
}

function renderProntuario(container, tab) {
  tabAtiva = tab
  const p = internacaoAtual.paciente
  const l = internacaoAtual.leito

  container.innerHTML = `
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900">Prontuário do Paciente</h1>
        <div class="flex gap-2">
          <button id="btn-voltar" class="btn"><i class="ti ti-arrow-left text-sm"></i> Painel de Leitos</button>
          <button id="btn-imprimir-topo" class="btn"><i class="ti ti-printer text-sm"></i> Imprimir</button>
        </div>
      </div>
      <div class="flex items-center gap-1.5 px-5 pt-3 text-xs text-gray-400 flex-shrink-0">
        <span class="text-primary-500 cursor-pointer hover:underline" id="bread-inicio">Painel de Leitos</span>
        <i class="ti ti-chevron-right text-xs"></i>
        <span class="text-gray-600">${l?.codigo} · ${p?.nome}</span>
        <i class="ti ti-chevron-right text-xs"></i>
        <span id="bread-tab" class="text-gray-600">${tab === 'prescricao' ? 'Prescrição Médica' : tab === 'evolucao' ? 'Evolução Médica' : 'Exames'}</span>
      </div>
      <div class="flex border-b border-gray-200 px-5 bg-white flex-shrink-0 mt-2">
        <button class="pront-tab ${tab==='prescricao'?'active':''}" data-tab="prescricao"><i class="ti ti-clipboard-list text-sm"></i> Prescrição Médica</button>
        <button class="pront-tab ${tab==='evolucao'?'active':''}" data-tab="evolucao"><i class="ti ti-activity text-sm"></i> Evolução Médica</button>
        <button class="pront-tab ${tab==='exames'?'active':''}" data-tab="exames"><i class="ti ti-test-pipe text-sm"></i> Exames</button>
      </div>
      <div class="px-5 pt-3 flex-shrink-0">
        <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4">
          <div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><i class="ti ti-user text-xl"></i></div>
          <div class="flex flex-wrap gap-x-5 gap-y-1 flex-1">
            ${pf('Nome do paciente', p?.nome||'—')}
            ${pf('Código SUS', p?.codigo_sus||'—')}
            ${pf('Nascimento', p?.data_nascimento ? new Date(p.data_nascimento+'T12:00:00').toLocaleDateString('pt-BR')+' ('+calcularIdade(p.data_nascimento)+')' : '—')}
            ${pf('Internação', internacaoAtual.data_internacao ? new Date(internacaoAtual.data_internacao).toLocaleDateString('pt-BR') : '—')}
            ${pf('Dias internado', internacaoAtual.dias_internado+' dias')}
            ${pf('Leito', l?.codigo||'—')}
            ${pf('Data atual', new Date().toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}))}
          </div>
        </div>
      </div>
      <div id="tab-content" class="flex-1 overflow-y-auto px-5 py-3">
        <div class="flex justify-center py-8"><i class="ti ti-loader-2 text-2xl animate-spin text-primary-500"></i></div>
      </div>
    </div>
  `

  injetarEstilosTabs()
  document.getElementById('btn-voltar').addEventListener('click', () => router.navigate('leitos'))
  document.getElementById('btn-imprimir-topo').addEventListener('click', () => imprimirDocumento(tabAtiva))
  document.getElementById('bread-inicio').addEventListener('click', () => router.navigate('leitos'))
  document.querySelectorAll('.pront-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      tabAtiva = btn.dataset.tab
      document.querySelectorAll('.pront-tab').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      document.getElementById('bread-tab').textContent = tabAtiva === 'prescricao' ? 'Prescrição Médica' : tabAtiva === 'evolucao' ? 'Evolução Médica' : 'Exames'
      setNavAtivo(tabAtiva === 'prescricao' ? 'prescricoes' : 'evolucoes')
      carregarTab(tabAtiva)
    })
  })
  carregarTab(tab)
}

function carregarTab(tab) {
  if (tab === 'prescricao') carregarPrescricao()
  else if (tab === 'evolucao') carregarEvolucao()
  else carregarExames()
}

// ── PRESCRIÇÃO ────────────────────────────────────────────────
async function carregarPrescricao() {
  const tc = document.getElementById('tab-content')
  tc.innerHTML = `<div class="flex justify-center py-8"><i class="ti ti-loader-2 text-2xl animate-spin text-primary-500"></i></div>`

  const { data: presc } = await supabase
    .from('prescricoes')
    .select('*, medicamentos:prescricao_medicamentos(*), solicitacoes:prescricao_solicitacoes(*)')
    .eq('internacao_id', internacaoAtual.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const meds  = presc?.medicamentos || []
  const solic = presc?.solicitacoes || []

  tc.innerHTML = `
    <div class="flex flex-col gap-3 pb-4">
      <div class="card">
        <div class="card-title">Diagnóstico (resumo)</div>
        <textarea id="p-diagnostico" class="field text-[12.5px]" rows="2" placeholder="Diagnóstico principal...">${presc?.diagnostico || internacaoAtual.diagnostico || ''}</textarea>
      </div>
      <div class="card">
        <div class="card-title">Dieta</div>
        <input id="p-dieta" type="text" class="field text-[12.5px]" placeholder="Ex: Dieta branda VO, Jejum, Dieta livre" value="${presc?.dieta || ''}">
      </div>

      <!-- Medicamentos -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div class="card-title mb-0">Prescrição de Medicamentos</div>
          <button id="btn-add-med" class="text-primary-500 text-xs font-medium flex items-center gap-1 hover:text-primary-600">
            <i class="ti ti-plus text-sm"></i> Adicionar Medicamento
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th>Medicamento</th><th>Dose</th><th>Via</th><th>Frequência</th><th>Observação</th><th>Início</th><th>Dias</th><th class="text-center">Susp.</th><th>Ações</th>
            </tr></thead>
            <tbody id="meds-tbody">
              ${meds.length ? meds.map(m => rowMed(m)).join('') : `
                <tr id="row-vazio-med"><td colspan="8" class="text-center text-gray-400 py-4 text-xs">Nenhum medicamento prescrito.</td></tr>
              `}
            </tbody>
          </table>
        </div>
        <p class="text-[10.5px] text-gray-400 mt-2">D = Dia do tratamento (ex.: D2/7 = dia 2 de 7 dias)</p>
      </div>

      <!-- Outras Solicitações -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div class="card-title mb-0">Outras Solicitações</div>
          <button id="btn-add-solic" class="text-primary-500 text-xs font-medium flex items-center gap-1 hover:text-primary-600">
            <i class="ti ti-plus text-sm"></i> Adicionar
          </button>
        </div>
        <div id="lista-solic">
          ${solic.length ? solic.map(s => `
            <div class="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0" data-solic-id="${s.id}">
              <span class="text-[12.5px] text-gray-700">${s.descricao}</span>
              <button class="btn-del-solic text-red-400 hover:text-red-600"><i class="ti ti-trash text-xs"></i></button>
            </div>`).join('') : `<p class="text-xs text-gray-400">Nenhuma solicitação adicionada.</p>`}
        </div>
      </div>

      <!-- Médico -->
      <div class="card">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="field-label">Médico responsável *</label><input id="p-medico" type="text" class="field text-[12.5px]" placeholder="Nome do médico" value="${presc?.medico_responsavel || ''}"></div>
          <div><label class="field-label">CRM</label><input id="p-crm" type="text" class="field text-[12.5px]" placeholder="CRM/UF 00000"></div>
        </div>
      </div>

      <!-- Rodapé -->
      <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-end justify-between">
        <div>
          <p class="text-[11px] text-gray-400 mb-1">Médico responsável</p>
          <div id="sign-nome" class="text-[13px] font-bold text-gray-800">${presc?.medico_responsavel || '—'}</div>
        </div>
        <div class="flex gap-2">
          <button id="btn-copiar-presc" class="btn" title="Copiar prescrição para área de transferência"><i class="ti ti-copy text-sm"></i> Copiar</button>
          <button id="btn-imprimir-presc" class="btn"><i class="ti ti-printer text-sm"></i> Imprimir</button>
          <button id="btn-salvar-presc" class="btn btn-primary"><i class="ti ti-device-floppy text-sm"></i> Salvar Prescrição</button>
        </div>
      </div>
    </div>

    <!-- Modal medicamento -->
    <div id="modal-med" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Adicionar Medicamento</h3>
          <button id="modal-med-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x"></i></button>
        </div>
        <div class="p-4 grid grid-cols-2 gap-3">
          <div class="col-span-2"><label class="field-label">Medicamento *</label><input id="med-nome" type="text" class="field" placeholder="Nome do medicamento"></div>
          <div><label class="field-label">Dose *</label><input id="med-dose" type="text" class="field" placeholder="Ex: 1g, 500mg, 40mg"></div>
          <div><label class="field-label">Via *</label>
            <select id="med-via" class="field">
              <option value="">Selecione</option>
              <option>VO</option><option>IV</option><option>IM</option><option>SC</option><option>SL</option><option>Tópico</option><option>Inalatório</option>
            </select>
          </div>
          <div><label class="field-label">Frequência *</label><input id="med-freq" type="text" class="field" placeholder="Ex: 8/8h, 12/12h, 1x/dia"></div>
          <div><label class="field-label">Observação</label><input id="med-obs" type="text" class="field" placeholder="Ex: se febre, se dor, se necessário"></div>
          <div><label class="field-label">Data de início</label><input id="med-inicio" type="date" class="field"></div>
          <div><label class="field-label">Duração (dias)</label><input id="med-dias" type="number" class="field" placeholder="Ex: 7" min="1"></div>
        </div>
        <div class="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button id="modal-med-cancelar" class="btn">Cancelar</button>
          <button id="modal-med-salvar" class="btn btn-primary"><i class="ti ti-plus text-sm"></i> Adicionar</button>
        </div>
      </div>
    </div>

    <!-- Modal solicitação -->
    <div id="modal-solic" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Adicionar Solicitação</h3>
          <button id="modal-solic-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x"></i></button>
        </div>
        <div class="p-4">
          <label class="field-label">Descrição *</label>
          <input id="solic-desc" type="text" class="field" placeholder="Ex: Fisioterapia respiratória, Avaliação nutricional">
        </div>
        <div class="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button id="modal-solic-cancelar" class="btn">Cancelar</button>
          <button id="modal-solic-ok" class="btn btn-primary">Adicionar</button>
        </div>
      </div>
    </div>
  `

  document.getElementById('p-medico').addEventListener('input', e => { document.getElementById('sign-nome').textContent = e.target.value || '—' })

  // Modal medicamento
  const modalMed = document.getElementById('modal-med')
  document.getElementById('btn-add-med').addEventListener('click', () => {
    ;['med-nome','med-dose','med-via','med-freq','med-obs','med-inicio','med-dias'].forEach(id => { document.getElementById(id).value = '' })
    modalMed.classList.remove('hidden')
    setTimeout(() => document.getElementById('med-nome').focus(), 50)
  })
  document.getElementById('modal-med-fechar').addEventListener('click', () => modalMed.classList.add('hidden'))
  document.getElementById('modal-med-cancelar').addEventListener('click', () => modalMed.classList.add('hidden'))
  document.getElementById('modal-med-salvar').addEventListener('click', () => {
    const nome = document.getElementById('med-nome').value.trim()
    const dose = document.getElementById('med-dose').value.trim()
    const via  = document.getElementById('med-via').value
    const freq = document.getElementById('med-freq').value.trim()
    if (!nome || !dose || !via || !freq) { alert('Preencha os campos obrigatórios: Medicamento, Dose, Via e Frequência.'); return }
    const obs   = document.getElementById('med-obs').value.trim()
    const inicio = document.getElementById('med-inicio').value
    const dias   = document.getElementById('med-dias').value
    document.getElementById('row-vazio-med')?.remove()
    document.getElementById('meds-tbody').insertAdjacentHTML('beforeend',
      rowMed({ id:'med_'+Date.now(), medicamento:nome, dose, via, frequencia:freq, observacao:obs, data_inicio:inicio||null, dias:dias||null }))
    bindDelMed()
    modalMed.classList.add('hidden')
  })
  bindDelMed()

  // Modal solicitação
  const modalSolic = document.getElementById('modal-solic')
  document.getElementById('btn-add-solic').addEventListener('click', () => {
    document.getElementById('solic-desc').value = ''
    modalSolic.classList.remove('hidden')
    setTimeout(() => document.getElementById('solic-desc').focus(), 50)
  })
  document.getElementById('modal-solic-fechar').addEventListener('click', () => modalSolic.classList.add('hidden'))
  document.getElementById('modal-solic-cancelar').addEventListener('click', () => modalSolic.classList.add('hidden'))
  document.getElementById('modal-solic-ok').addEventListener('click', () => {
    const val = document.getElementById('solic-desc').value.trim()
    if (!val) return
    const id = 'solic_'+Date.now()
    const lista = document.getElementById('lista-solic')
    if (lista.querySelector('p')) lista.innerHTML = ''
    lista.insertAdjacentHTML('beforeend', `
      <div class="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0" data-solic-id="${id}">
        <span class="text-[12.5px] text-gray-700">${val}</span>
        <button class="btn-del-solic text-red-400 hover:text-red-600"><i class="ti ti-trash text-xs"></i></button>
      </div>`)
    bindDelSolic()
    modalSolic.classList.add('hidden')
  })
  bindDelSolic()

  document.getElementById('btn-copiar-presc').addEventListener('click', () => copiarPrescricao())
  document.getElementById('btn-imprimir-presc').addEventListener('click', () => imprimirDocumento('prescricao'))
  document.getElementById('btn-salvar-presc').addEventListener('click', salvarPrescricao)
}

function rowMed(m) {
  const inicio = m.data_inicio ? new Date(m.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
  const diasTrat = m.dias && m.data_inicio
    ? `D${Math.floor((Date.now()-new Date(m.data_inicio))/86400000)+1}/${m.dias}` : (m.dias || '—')
  const suspenso = m.suspenso || false
  return `
    <tr data-med-id="${m.id}" data-suspenso="${suspenso}" class="${suspenso ? 'opacity-40 line-through' : ''}">
      <td class="font-medium">${m.medicamento}</td>
      <td>${m.dose}</td>
      <td>${m.via}</td>
      <td>${m.frequencia}</td>
      <td class="text-[11px] text-amber-700 italic">${m.observacao||'—'}</td>
      <td class="text-[11px]">${inicio}</td>
      <td>${diasTrat}</td>
      <td class="text-center">
        <label class="flex items-center justify-center gap-1 cursor-pointer" title="Suspender medicação">
          <input type="checkbox" class="chk-suspender w-3.5 h-3.5 accent-amber-500" ${suspenso ? 'checked' : ''}>
          <span class="text-[10px] text-gray-400">Susp.</span>
        </label>
      </td>
      <td><button class="btn-del-med text-red-400 hover:text-red-600 p-1"><i class="ti ti-trash text-xs"></i></button></td>
    </tr>`
}
function bindDelMed() {
  document.querySelectorAll('.btn-del-med').forEach(b => {
    b.onclick = () => b.closest('tr').remove()
  })
  document.querySelectorAll('.chk-suspender').forEach(chk => {
    chk.onchange = () => {
      const tr = chk.closest('tr')
      if (chk.checked) {
        tr.classList.add('opacity-40', 'line-through')
        tr.dataset.suspenso = 'true'
      } else {
        tr.classList.remove('opacity-40', 'line-through')
        tr.dataset.suspenso = 'false'
      }
    }
  })
}
function bindDelSolic() { document.querySelectorAll('.btn-del-solic').forEach(b => { b.onclick = () => b.closest('[data-solic-id]').remove() }) }

async function salvarPrescricao() {
  const diagnostico = document.getElementById('p-diagnostico').value.trim()
  const dieta       = document.getElementById('p-dieta').value.trim()
  const medico      = document.getElementById('p-medico').value.trim()
  if (!medico) { alert('Informe o médico responsável.'); return }

  const medicamentos = []
  document.querySelectorAll('#meds-tbody tr[data-med-id]').forEach(tr => {
    // Pula medicamentos suspensos
    if (tr.dataset.suspenso === 'true' || tr.querySelector('.chk-suspender')?.checked) return
    const tds = tr.querySelectorAll('td')
    // Colunas: 0=med, 1=dose, 2=via, 3=freq, 4=obs, 5=inicio, 6=dias, 7=susp, 8=acoes
    const obsVal    = tds[4].textContent.replace(/[–—]/g,'').trim()
    const inicioRaw = tds[5].textContent.replace(/[–—]/g,'').trim()
    const diasVal   = tds[6].textContent.replace(/[–—]/g,'').trim().replace(/D\d+\//,'') // remove D1/ se vier formatado
    let data_inicio = null
    if (inicioRaw && inicioRaw !== '—') {
      const [d,m,a] = inicioRaw.split('/')
      if (d && m && a) data_inicio = `${a}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    }
    medicamentos.push({
      medicamento: tds[0].textContent.trim(),
      dose:        tds[1].textContent.trim(),
      via:         tds[2].textContent.trim(),
      frequencia:  tds[3].textContent.trim(),
      observacao:  obsVal || null,
      data_inicio: data_inicio || null,
      dias:        diasVal && !isNaN(diasVal) ? parseInt(diasVal) : null,
    })
  })
  const solicitacoes = []
  document.querySelectorAll('#lista-solic [data-solic-id]').forEach(el => solicitacoes.push(el.querySelector('span').textContent))

  const btn = document.getElementById('btn-salvar-presc')
  btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Salvando...'
  try {
    const { data: presc, error: e1 } = await supabase.from('prescricoes')
      .insert({ internacao_id:internacaoAtual.id, diagnostico, dieta, medico_responsavel:medico })
      .select().single()
    if (e1) throw e1

    if (medicamentos.length) {
      const { error: e2 } = await supabase.from('prescricao_medicamentos').insert(medicamentos.map(m=>({...m, prescricao_id:presc.id})))
      if (e2) throw e2
    }
    if (solicitacoes.length) {
      const { error: e3 } = await supabase.from('prescricao_solicitacoes').insert(solicitacoes.map(d=>({descricao:d, prescricao_id:presc.id})))
      if (e3) throw e3
    }

    // Atualiza diagnóstico da internação para sincronizar com evolução
    if (diagnostico) {
      await supabase.from('internacoes').update({ diagnostico }).eq('id', internacaoAtual.id)
      internacaoAtual.diagnostico = diagnostico
    }

    btn.innerHTML = '<i class="ti ti-check text-sm"></i> Salvo!'
    btn.classList.replace('btn-primary','bg-green-500'); btn.classList.add('border-green-500','text-white')
    setTimeout(() => {
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy text-sm"></i> Salvar Prescrição'
      btn.classList.replace('bg-green-500','btn-primary'); btn.classList.remove('border-green-500','text-white')
    }, 2000)
  } catch(err) {
    alert('Erro ao salvar: '+err.message)
    btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy text-sm"></i> Salvar Prescrição'
  }
}

// ── EVOLUÇÃO ──────────────────────────────────────────────────
async function carregarEvolucao() {
  const tc = document.getElementById('tab-content')
  tc.innerHTML = `<div class="flex justify-center py-8"><i class="ti ti-loader-2 text-2xl animate-spin text-primary-500"></i></div>`

  // Busca última evolução, histórico E última prescrição
  const [{ data: evol }, { data: presc }, { data: historico }] = await Promise.all([
    supabase.from('evolucoes').select('*, exames:evolucao_exames(*)').eq('internacao_id', internacaoAtual.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('prescricoes').select('diagnostico').eq('internacao_id', internacaoAtual.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('evolucoes').select('*, exames:evolucao_exames(*)').eq('internacao_id', internacaoAtual.id).order('created_at',{ascending:false}),
  ])

  const diagAtual = presc?.diagnostico || evol?.diagnostico || internacaoAtual.diagnostico || ''
  const examesRes = evol?.exames || []

  tc.innerHTML = `
    <div class="flex flex-col gap-3 pb-4">
      <!-- Diagnóstico sincronizado -->
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <div class="card-title mb-0">Diagnóstico (resumo)</div>
          <span class="text-[10.5px] text-primary-500 flex items-center gap-1"><i class="ti ti-refresh text-xs"></i> Sincronizado com a prescrição</span>
        </div>
        <textarea id="e-diagnostico" class="field text-[12.5px]" rows="2" placeholder="Diagnóstico principal...">${diagAtual}</textarea>
      </div>

      <!-- Dados Vitais -->
      <div class="card">
        <div class="card-title flex items-center gap-1.5"><i class="ti ti-heart-rate-monitor text-primary-500"></i> Dados Vitais</div>
        <div class="grid grid-cols-6 gap-3">
          <div>
            <label class="field-label">PA (mmHg)</label>
            <input id="v-pa" type="text" class="field text-[12.5px]" placeholder="120/80" value="${evol?.dados_vitais?.pa||''}">
          </div>
          <div>
            <label class="field-label">Pulso (bpm)</label>
            <input id="v-pulso" type="number" class="field text-[12.5px]" placeholder="72" value="${evol?.dados_vitais?.pulso||''}">
          </div>
          <div>
            <label class="field-label">SpO₂ (%)</label>
            <input id="v-spo2" type="number" class="field text-[12.5px]" placeholder="98" min="0" max="100" value="${evol?.dados_vitais?.spo2||''}">
          </div>
          <div>
            <label class="field-label">FR (irpm)</label>
            <input id="v-fr" type="number" class="field text-[12.5px]" placeholder="16" value="${evol?.dados_vitais?.fr||''}">
          </div>
          <div>
            <label class="field-label">Glicemia (mg/dL)</label>
            <input id="v-glicemia" type="number" class="field text-[12.5px]" placeholder="100" value="${evol?.dados_vitais?.glicemia||''}">
          </div>
          <div>
            <label class="field-label">Temp. (°C)</label>
            <input id="v-temp" type="text" class="field text-[12.5px]" placeholder="36,5" value="${evol?.dados_vitais?.temperatura||''}">
          </div>
        </div>
      </div>

      <div class="grid gap-3" style="grid-template-columns:1fr 300px">
        <!-- Evolução -->
        <div class="card flex flex-col">
          <div class="card-title">Evolução</div>
          <textarea id="e-texto" class="field text-[12.5px] flex-1" rows="10" style="resize:vertical" placeholder="Descreva a evolução clínica do paciente...">${evol?.texto||''}</textarea>
        </div>

        <!-- Resultados -->
        <div class="card flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <div class="card-title mb-0">Resultados de Exames</div>
            <button id="btn-add-res" class="text-primary-500 text-xs font-medium flex items-center gap-1 hover:text-primary-600"><i class="ti ti-plus text-sm"></i> Adicionar</button>
          </div>
          <div class="overflow-x-auto flex-1">
            <table class="data-table">
              <thead><tr><th>Exame</th><th>Resultado</th><th>Data</th><th></th></tr></thead>
              <tbody id="res-tbody">
                ${examesRes.length ? examesRes.map(e=>rowRes(e)).join('') : `
                  <tr id="row-vazio-res"><td colspan="4" class="text-center text-gray-400 py-4 text-xs">Nenhum resultado adicionado.</td></tr>`}
              </tbody>
            </table>
          </div>
          <div class="alert alert-blue mt-3 text-[11px] py-2">
            <i class="ti ti-info-circle text-sm flex-shrink-0"></i>
            Apenas exames com resultados serão impressos.
          </div>
        </div>
      </div>

      <!-- Médico -->
      <div class="card">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="field-label">Médico responsável *</label><input id="e-medico" type="text" class="field text-[12.5px]" placeholder="Nome do médico" value="${evol?.medico_responsavel||''}"></div>
          <div><label class="field-label">CRM</label><input id="e-crm" type="text" class="field text-[12.5px]" placeholder="CRM/UF 00000"></div>
        </div>
      </div>

      <!-- Rodapé -->
      <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-end justify-between">
        <div>
          <p class="text-[11px] text-gray-400 mb-1">Médico responsável</p>
          <div id="e-sign-nome" class="text-[13px] font-bold text-gray-800">${evol?.medico_responsavel||'—'}</div>
        </div>
        <div class="flex gap-2">
          <button id="btn-copiar-evol" class="btn" title="Copiar evolução para área de transferência"><i class="ti ti-copy text-sm"></i> Copiar</button>
          <button id="btn-imprimir-evol" class="btn"><i class="ti ti-printer text-sm"></i> Imprimir</button>
          <button id="btn-salvar-evol" class="btn btn-primary"><i class="ti ti-device-floppy text-sm"></i> Salvar Evolução</button>
        </div>
      </div>

      <!-- Histórico de Evoluções -->
      ${historico && historico.length > 1 ? `
      <div class="mt-2">
        <div class="flex items-center gap-2 mb-3">
          <i class="ti ti-history text-primary-500"></i>
          <span class="font-semibold text-gray-700 text-sm">Histórico de Evoluções</span>
          <span class="bg-primary-100 text-primary-600 text-[10px] font-bold px-2 py-0.5 rounded-full">${historico.length}</span>
        </div>
        <div class="flex flex-col gap-2">
          ${historico.map((h, idx) => {
            const dt = new Date(h.created_at)
            const dataFmt = dt.toLocaleDateString('pt-BR')
            const horaFmt = dt.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})
            const vitais = h.dados_vitais || {}
            const vitaisTexto = [
              vitais.pa ? `PA ${vitais.pa}` : '',
              vitais.pulso ? `Pulso ${vitais.pulso}bpm` : '',
              vitais.spo2 ? `SpO₂ ${vitais.spo2}%` : '',
              vitais.temperatura ? `Temp ${vitais.temperatura}°C` : '',
            ].filter(Boolean).join(' · ')
            const exames = h.exames || []
            return `
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <button class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <div class="flex items-center gap-3">
                  <div class="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[11px] font-bold flex-shrink-0">${historico.length - idx}</div>
                  <div>
                    <div class="text-[12.5px] font-semibold text-gray-800">${dataFmt} às ${horaFmt}</div>
                    <div class="text-[11px] text-gray-500">${h.medico_responsavel||'—'}${vitaisTexto ? ' · ' + vitaisTexto : ''}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button class="btn text-[11px] py-1 px-2 btn-visualizar-hist" data-hist-id="${h.id}"><i class="ti ti-eye text-xs"></i> Ver</button>
                  <button class="btn text-[11px] py-1 px-2 btn-imprimir-hist" data-hist-id="${h.id}"><i class="ti ti-printer text-xs"></i> Imprimir</button>
                  <i class="ti ti-chevron-down text-gray-400 text-sm"></i>
                </div>
              </button>
              <div class="hidden px-4 py-3 bg-white border-t border-gray-100">
                ${h.diagnostico ? `<div class="mb-2"><span class="text-[10px] text-gray-400 uppercase tracking-wide">Diagnóstico</span><p class="text-[12.5px] text-gray-700 mt-0.5">${h.diagnostico}</p></div>` : ''}
                <div class="mb-2"><span class="text-[10px] text-gray-400 uppercase tracking-wide">Evolução</span><p class="text-[12.5px] text-gray-700 mt-0.5 whitespace-pre-wrap">${h.texto||'—'}</p></div>
                ${exames.length ? `
                <div><span class="text-[10px] text-gray-400 uppercase tracking-wide">Exames</span>
                <table class="data-table mt-1"><thead><tr><th>Exame</th><th>Resultado</th><th>Data</th></tr></thead>
                <tbody>${exames.map(e=>`<tr><td>${e.exame}</td><td>${e.resultado}</td><td>${e.data_resultado ? new Date(e.data_resultado+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td></tr>`).join('')}</tbody>
                </table></div>` : ''}
              </div>
            </div>`
          }).join('')}
        </div>
      </div>` : ''}
    </div>

    <!-- Modal resultado -->
    <div id="modal-res" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Adicionar Resultado de Exame</h3>
          <button id="modal-res-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x"></i></button>
        </div>
        <div class="p-4 flex flex-col gap-3">
          <div><label class="field-label">Exame *</label><input id="res-exame" type="text" class="field" placeholder="Ex: Hemograma, PCR, Gasometria"></div>
          <div><label class="field-label">Resultado *</label><input id="res-resultado" type="text" class="field" placeholder="Ex: Hb 12,1 / Leuc 8.500 / Plaq 210.000"></div>
          <div><label class="field-label">Data do resultado</label><input id="res-data" type="date" class="field" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button id="modal-res-cancelar" class="btn">Cancelar</button>
          <button id="modal-res-ok" class="btn btn-primary">Adicionar</button>
        </div>
      </div>
    </div>
  `

  document.getElementById('e-medico').addEventListener('input', e => { document.getElementById('e-sign-nome').textContent = e.target.value||'—' })

  const modalRes = document.getElementById('modal-res')
  document.getElementById('btn-add-res').addEventListener('click', () => {
    ;['res-exame','res-resultado'].forEach(id => document.getElementById(id).value='')
    document.getElementById('res-data').value = new Date().toISOString().split('T')[0]
    modalRes.classList.remove('hidden')
    setTimeout(() => document.getElementById('res-exame').focus(), 50)
  })
  document.getElementById('modal-res-fechar').addEventListener('click', () => modalRes.classList.add('hidden'))
  document.getElementById('modal-res-cancelar').addEventListener('click', () => modalRes.classList.add('hidden'))
  document.getElementById('modal-res-ok').addEventListener('click', () => {
    const exame = document.getElementById('res-exame').value.trim()
    const resultado = document.getElementById('res-resultado').value.trim()
    const data = document.getElementById('res-data').value
    if (!exame || !resultado) { alert('Preencha exame e resultado.'); return }
    document.getElementById('row-vazio-res')?.remove()
    document.getElementById('res-tbody').insertAdjacentHTML('beforeend', rowRes({id:'res_'+Date.now(), exame, resultado, data_resultado:data}))
    bindDelRes()
    modalRes.classList.add('hidden')
  })
  bindDelRes()

  document.getElementById('btn-copiar-evol').addEventListener('click', () => copiarEvolucao())
  document.getElementById('btn-imprimir-evol').addEventListener('click', () => imprimirDocumento('evolucao'))
  document.getElementById('btn-salvar-evol').addEventListener('click', salvarEvolucao)

  // Botão visualizar histórico
  document.querySelectorAll('.btn-visualizar-hist').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const h = (historico || []).find(x => String(x.id) === String(btn.dataset.histId))
      if (!h) return
      visualizarEvolucao(h)
    })
  })

  // Botões imprimir do histórico — usar data attributes em vez de closure
  document.querySelectorAll('.btn-imprimir-hist').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const histId = btn.dataset.histId
      const h = (historico || []).find(x => String(x.id) === String(histId))
      if (!h) { alert('Evolução não encontrada.'); return }
      const dt = new Date(h.created_at)
      const hojeFmt = dt.toLocaleDateString('pt-BR')
      const agoraFmt = dt.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})
      const dataInt = internacaoAtual.data_internacao ? new Date(internacaoAtual.data_internacao+'T12:00:00').toLocaleDateString('pt-BR') : '—'
      imprimirEvolucaoObj(h, internacaoAtual.leito || {}, hojeFmt, agoraFmt, dataInt)
    })
  })
}

function rowRes(e) {
  const data = e.data_resultado ? new Date(e.data_resultado+'T12:00:00').toLocaleDateString('pt-BR') : '—'
  return `<tr data-res-id="${e.id}">
    <td class="font-medium">${e.exame}</td>
    <td class="text-[11px]">${e.resultado}</td>
    <td class="text-[11px] whitespace-nowrap">${data}</td>
    <td><button class="btn-del-res text-red-400 hover:text-red-600 p-1"><i class="ti ti-trash text-xs"></i></button></td>
  </tr>`
}
function bindDelRes() { document.querySelectorAll('.btn-del-res').forEach(b => { b.onclick = () => b.closest('tr').remove() }) }

async function salvarEvolucao() {
  const diagnostico = document.getElementById('e-diagnostico').value.trim()
  const texto       = document.getElementById('e-texto').value.trim()
  const medico      = document.getElementById('e-medico').value.trim()
  if (!medico) { alert('Informe o médico responsável.'); return }
  if (!texto)  { alert('Preencha o texto da evolução.'); return }

  const dados_vitais = {
    pa:          document.getElementById('v-pa').value.trim()||null,
    pulso:       document.getElementById('v-pulso').value||null,
    spo2:        document.getElementById('v-spo2').value||null,
    fr:          document.getElementById('v-fr').value||null,
    glicemia:    document.getElementById('v-glicemia').value||null,
    temperatura: document.getElementById('v-temp').value.trim()||null,
  }

  const resultados = []
  document.querySelectorAll('#res-tbody tr[data-res-id]').forEach(tr => {
    const tds = tr.querySelectorAll('td')
    resultados.push({ exame:tds[0].textContent, resultado:tds[1].textContent, data_resultado:document.getElementById('res-data')?.value||null })
  })

  const btn = document.getElementById('btn-salvar-evol')
  btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Salvando...'
  try {
    const { data: evol, error: e1 } = await supabase.from('evolucoes')
      .insert({ internacao_id:internacaoAtual.id, diagnostico, texto, medico_responsavel:medico, dados_vitais })
      .select().single()
    if (e1) throw e1

    if (resultados.length) {
      const { error: e2 } = await supabase.from('evolucao_exames').insert(resultados.map(r=>({...r, evolucao_id:evol.id})))
      if (e2) throw e2
    }

    btn.innerHTML = '<i class="ti ti-check text-sm"></i> Salvo!'
    btn.classList.replace('btn-primary','bg-green-500'); btn.classList.add('border-green-500','text-white')
    setTimeout(() => {
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy text-sm"></i> Salvar Evolução'
      btn.classList.replace('bg-green-500','btn-primary'); btn.classList.remove('border-green-500','text-white')
    }, 2000)
  } catch(err) {
    alert('Erro ao salvar: '+err.message)
    btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy text-sm"></i> Salvar Evolução'
  }
}

const pf = (l,v) => `<div class="flex flex-col gap-0"><span class="pf-label">${l}</span><span class="pf-val">${v}</span></div>`

function injetarEstilosTabs() {
  if (document.getElementById('pront-tab-style')) return
  const s = document.createElement('style'); s.id = 'pront-tab-style'
  s.textContent = `.pront-tab{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;font-size:13px;font-weight:500;color:#6b7280;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s;background:none;border-top:none;border-left:none;border-right:none}.pront-tab:hover{color:#374151}.pront-tab.active{color:#1a9e6a;border-bottom-color:#1a9e6a}`
  document.head.appendChild(s)
}


// ── IMPRESSÃO ─────────────────────────────────────────────────
function imprimirDocumento(tipo) {
  const p = internacaoAtual.paciente || {}
  const l = internacaoAtual.leito || {}
  const hoje = new Date().toLocaleDateString('pt-BR')
  const agora = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
  const dataInt = internacaoAtual.data_internacao
    ? new Date(internacaoAtual.data_internacao).toLocaleDateString('pt-BR') : '—'

  if (tipo === 'prescricao') imprimirPrescricao(p, l, hoje, dataInt)
  else imprimirEvolucao(p, l, hoje, agora, dataInt)
}

// ── EXAMES ────────────────────────────────────────────────────
async function carregarExames() {
  const tc = document.getElementById('tab-content')
  tc.innerHTML = `<div class="flex justify-center py-8"><i class="ti ti-loader-2 text-2xl animate-spin text-primary-500"></i></div>`

  // Busca todas as evoluções com exames
  const { data: evolucoes } = await supabase
    .from('evolucoes')
    .select('id, created_at, exames:evolucao_exames(*)')
    .eq('internacao_id', internacaoAtual.id)
    .order('created_at', { ascending: true })

  // Agrupa exames por data
  // Estrutura: { 'NomeExame': { '25/05': 'valor', '26/05': 'valor' } }
  const todasDatas = []
  const mapaExames = {} // { nomeExame: { data: valor } }

  ;(evolucoes || []).forEach(evol => {
    const dt = new Date(evol.created_at).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})
    if (!todasDatas.includes(dt)) todasDatas.push(dt)
    ;(evol.exames || []).forEach(e => {
      const nome = e.exame.trim().toUpperCase()
      if (!mapaExames[nome]) mapaExames[nome] = {}
      // Se já existe valor nessa data, concatena
      mapaExames[nome][dt] = mapaExames[nome][dt]
        ? mapaExames[nome][dt] + ' / ' + e.resultado
        : e.resultado
    })
  })

  const nomeExames = Object.keys(mapaExames).sort()

  // Monta HTML da tabela comparativa
  const tabelaHTML = nomeExames.length > 0 ? `
    <div class="overflow-x-auto">
      <table class="data-table w-full">
        <thead>
          <tr>
            <th class="text-left sticky left-0 bg-gray-50 z-10" style="min-width:130px">Exame</th>
            ${todasDatas.map(d => `<th class="text-center" style="min-width:90px">${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${nomeExames.map(nome => `
            <tr>
              <td class="font-semibold text-gray-700 sticky left-0 bg-white z-10">${nome}</td>
              ${todasDatas.map(d => `<td class="text-center text-[12.5px]">${mapaExames[nome][d] || '<span class="text-gray-300">—</span>'}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : `<div class="text-center text-gray-400 py-10 text-sm">Nenhum exame registrado ainda.</div>`

  tc.innerHTML = `
    <div class="flex flex-col gap-3 pb-4">

      <!-- Tabela comparativa -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <div class="card-title mb-0 flex items-center gap-2">
            <i class="ti ti-table text-primary-500"></i> Tabela Comparativa de Exames
          </div>
          <button id="btn-imprimir-exames" class="btn text-sm"><i class="ti ti-printer text-sm"></i> Imprimir</button>
        </div>
        ${tabelaHTML}
      </div>

      <!-- Lançar novo resultado -->
      <div class="card">
        <div class="card-title flex items-center gap-2 mb-3">
          <i class="ti ti-plus text-primary-500"></i> Lançar Resultado de Exame
        </div>
        <div class="grid grid-cols-4 gap-3 mb-3">
          <div><label class="field-label">Data do exame *</label><input id="ex-data" type="date" class="field" value="${new Date().toISOString().split('T')[0]}"></div>
          <div><label class="field-label">Exame *</label><input id="ex-nome" type="text" class="field" placeholder="Ex: HB, LEUC, PCR"></div>
          <div><label class="field-label">Resultado *</label><input id="ex-resultado" type="text" class="field" placeholder="Ex: 13,2"></div>
          <div class="flex items-end">
            <button id="btn-add-exame" class="btn btn-primary w-full"><i class="ti ti-plus text-sm"></i> Adicionar</button>
          </div>
        </div>

        <!-- Lote de exames pendentes -->
        <div id="exames-lote" class="flex flex-col gap-1 mb-3"></div>

        <div class="flex justify-between items-center">
          <span class="text-[11px] text-gray-400">Os exames serão salvos em uma nova evolução automaticamente.</span>
          <button id="btn-salvar-exames" class="btn btn-primary hidden"><i class="ti ti-device-floppy text-sm"></i> Salvar Exames</button>
        </div>
      </div>

    </div>
  `

  // Listeners
  const lote = [] // [{exame, resultado, data_resultado}]

  document.getElementById('btn-add-exame').addEventListener('click', () => {
    const data     = document.getElementById('ex-data').value
    const nome     = document.getElementById('ex-nome').value.trim().toUpperCase()
    const resultado = document.getElementById('ex-resultado').value.trim()
    if (!nome || !resultado) { alert('Preencha o nome e resultado do exame.'); return }

    lote.push({ exame: nome, resultado, data_resultado: data })
    document.getElementById('ex-nome').value = ''
    document.getElementById('ex-resultado').value = ''
    document.getElementById('ex-nome').focus()

    // Renderiza lote
    const loteEl = document.getElementById('exames-lote')
    loteEl.innerHTML = lote.map((e, i) => `
      <div class="flex items-center gap-2 bg-gray-50 rounded px-3 py-1.5 text-sm" data-lote-idx="${i}">
        <span class="font-semibold text-gray-700 w-32">${e.exame}</span>
        <span class="text-gray-600 flex-1">${e.resultado}</span>
        <span class="text-gray-400 text-xs">${e.data_resultado ? new Date(e.data_resultado+'T12:00:00').toLocaleDateString('pt-BR') : ''}</span>
        <button class="btn-del-lote text-red-400 hover:text-red-600 ml-2"><i class="ti ti-x text-xs"></i></button>
      </div>`).join('')

    document.querySelectorAll('.btn-del-lote').forEach((b, i) => {
      b.addEventListener('click', () => { lote.splice(i, 1); document.getElementById('btn-add-exame').click(); })
    })

    document.getElementById('btn-salvar-exames').classList.toggle('hidden', lote.length === 0)
  })

  document.getElementById('btn-salvar-exames').addEventListener('click', async () => {
    if (!lote.length) return
    const btn = document.getElementById('btn-salvar-exames')
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Salvando...'
    try {
      // Cria uma evolução vazia só para guardar os exames
      const { data: evol, error: e1 } = await supabase.from('evolucoes')
        .insert({ internacao_id: internacaoAtual.id, texto: '', diagnostico: internacaoAtual.diagnostico||'', medico_responsavel: 'Exames', dados_vitais: {} })
        .select().single()
      if (e1) throw e1

      const { error: e2 } = await supabase.from('evolucao_exames')
        .insert(lote.map(e => ({ ...e, evolucao_id: evol.id })))
      if (e2) throw e2

      carregarExames() // Recarrega a aba
    } catch(err) {
      alert('Erro ao salvar: ' + err.message)
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-device-floppy text-sm"></i> Salvar Exames'
    }
  })

  document.getElementById('btn-imprimir-exames').addEventListener('click', () => {
    imprimirExames(mapaExames, nomeExames, todasDatas)
  })
}

function imprimirExames(mapaExames, nomeExames, todasDatas) {
  const p = internacaoAtual.paciente || {}
  const l = internacaoAtual.leito || {}
  const hoje = new Date().toLocaleDateString('pt-BR')
  const dataInt = internacaoAtual.data_internacao ? new Date(internacaoAtual.data_internacao+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const thS = 'border:1px solid #bbb;padding:5px 8px;background:#f5f5f5;font-size:8.5pt;text-align:center;font-weight:bold;'
  const tdS = 'border:1px solid #bbb;padding:4px 8px;font-size:9pt;'
  const tdC = tdS + 'text-align:center;'

  const linhas = nomeExames.map(nome =>
    '<tr>' +
    '<td style="' + tdS + 'font-weight:600">' + escHtml(nome) + '</td>' +
    todasDatas.map(d => '<td style="' + tdC + '">' + escHtml(mapaExames[nome][d] || '—') + '</td>').join('') +
    '</tr>'
  ).join('')

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Exames</title>' +
    '<style>* { box-sizing:border-box; margin:0; padding:0; } body { font-family:Arial,sans-serif; font-size:10pt; background:white; color:#000; } @page { size:A4 portrait; margin:12mm; } @media print { body { margin:0; } } .page { max-width:186mm; margin:0 auto; } .rodape { text-align:center; font-size:7pt; color:#aaa; margin-top:8px; border-top:1px solid #eee; padding-top:4px; }</style>' +
    '</head><body><div class="page">' +

    '<div style="text-align:center;padding:8px 0 6px;border-bottom:2px solid #000;">' +
    '<p style="font-weight:bold;font-size:11pt;line-height:1.5">Prefeitura do Município de Maringá</p>' +
    '<p style="font-size:10pt;line-height:1.5">Secretaria Municipal de Saúde</p>' +
    '<p style="font-size:10pt;line-height:1.5">Unidade de Pronto Atendimento Zona Sul</p>' +
    '</div>' +

    '<div style="display:flex;border:1px solid #bbb;border-top:none;">' +
    '<div style="flex:3;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Nome do Paciente</div><div style="font-size:10pt;font-weight:bold">' + escHtml(p.nome||'—') + '</div></div>' +
    '<div style="flex:1.5;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Código SUS</div><div style="font-size:9pt;font-weight:bold">' + escHtml(p.codigo_sus||'—') + '</div></div>' +
    '<div style="flex:0.7;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Idade</div><div style="font-size:10pt;font-weight:bold">' + (p.data_nascimento ? calcularIdadePrint(p.data_nascimento) : '—') + '</div></div>' +
    '<div style="flex:1;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Internação</div><div style="font-size:9pt;font-weight:bold">' + dataInt + '</div></div>' +
    '<div style="flex:1;padding:5px 10px"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Leito / Setor</div><div style="font-size:9pt;font-weight:bold">' + escHtml(l.codigo||'—') + ' · ' + escHtml(l.setor||'—') + '</div></div>' +
    '</div>' +

    '<div style="text-align:center;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #bbb;border-top:none;padding:4px;background:#f5f5f5;margin-bottom:0;">Resultados de Exames</div>' +

    '<table style="width:100%;border-collapse:collapse;">' +
    '<thead><tr>' +
    '<th style="' + thS + 'text-align:left;min-width:120px">Exame</th>' +
    todasDatas.map(d => '<th style="' + thS + '">' + d + '</th>').join('') +
    '</tr></thead>' +
    '<tbody>' + linhas + '</tbody>' +
    '</table>' +

    '<div class="rodape">SigmaPEP · Prontuário Eletrônico · UPA Zona Sul – Maringá/PR · ' + hoje + '</div>' +
    '</div><script>window.onload=function(){window.print()}<\/script></body></html>'

  abrirJanelaImpressao(html)
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function copiarEvolucao() {
  const p = internacaoAtual.paciente || {}
  const diagnostico = document.getElementById('e-diagnostico')?.value || ''
  const texto = document.getElementById('e-texto')?.value || ''
  const medico = document.getElementById('e-medico')?.value || ''
  const crm = document.getElementById('e-crm')?.value || ''

  const vitais = {
    pa:    document.getElementById('v-pa')?.value || '',
    pulso: document.getElementById('v-pulso')?.value || '',
    spo2:  document.getElementById('v-spo2')?.value || '',
    fr:    document.getElementById('v-fr')?.value || '',
    gli:   document.getElementById('v-glicemia')?.value || '',
    temp:  document.getElementById('v-temp')?.value || '',
  }

  const vitaisTexto = [
    vitais.pa ? 'PA: ' + vitais.pa : '',
    vitais.pulso ? 'Pulso: ' + vitais.pulso + 'bpm' : '',
    vitais.spo2 ? 'SpO₂: ' + vitais.spo2 + '%' : '',
    vitais.fr ? 'FR: ' + vitais.fr : '',
    vitais.gli ? 'Glicemia: ' + vitais.gli : '',
    vitais.temp ? 'Temp: ' + vitais.temp + '°C' : '',
  ].filter(Boolean).join(' | ')

  const hoje = new Date().toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'})

  const t = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `📝 EVOLUÇÃO MÉDICA — ${hoje}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `Paciente: ${p.nome || '—'}`,
    `Leito: ${internacaoAtual.leito?.codigo || '—'} | ${internacaoAtual.leito?.setor || '—'}`,
    `HD: ${diagnostico}`,
    '',
    vitaisTexto ? `SSVV: ${vitaisTexto}` : '',
    '',
    texto,
    '',
    `Médico: ${medico}${crm ? ' — CRM/PR ' + crm : ''}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].filter(l => l !== undefined).join('\n')

  navigator.clipboard.writeText(t).then(() => {
    const btn = document.getElementById('btn-copiar-evol')
    const original = btn.innerHTML
    btn.innerHTML = '<i class="ti ti-check text-sm text-green-500"></i> Copiado!'
    setTimeout(() => { btn.innerHTML = original }, 2000)
  })
}

function copiarPrescricao() {
  const p = internacaoAtual.paciente || {}
  const diagnostico = document.getElementById('p-diagnostico')?.value || ''
  const dieta = document.getElementById('p-dieta')?.value || ''
  const medico = document.getElementById('p-medico')?.value || ''
  const crm = document.getElementById('p-crm')?.value || ''

  const itens = []
  if (dieta) itens.push('1. ' + dieta.toUpperCase())

  let num = 2
  document.querySelectorAll('#meds-tbody tr[data-med-id]').forEach(tr => {
    if (tr.dataset.suspenso === 'true' || tr.querySelector('.chk-suspender')?.checked) return
    const tds    = tr.querySelectorAll('td')
    const nome   = tds[0]?.textContent?.trim() || ''
    const dose   = tds[1]?.textContent?.trim() || ''
    const via    = tds[2]?.textContent?.trim() || ''
    const freq   = tds[3]?.textContent?.trim() || ''
    const obs    = (tds[4]?.textContent||'').replace(/[–—]/g,'').trim()
    const inicioTd = tds[5]?.textContent.replace(/[–—]/g,'').trim()
    const diasTd   = tds[6]?.textContent.replace(/D\d+\//,'').replace(/[–—]/g,'').trim()
    let diaLabel = ''
    if (diasTd && inicioTd && inicioTd !== '—') {
      const [d,m,a] = inicioTd.split('/')
      if (d && m && a) {
        const dataInicio = new Date(`${a}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`)
        const diaAtual = Math.floor((Date.now() - dataInicio) / 86400000) + 1
        diaLabel = ` D${diaAtual}/${diasTd}`
      }
    }
    const linha = `${num}. ${nome} ${dose} – ${via} ${freq}${obs ? ' ('+obs+')' : ''}${diaLabel}`
    itens.push(linha)
    num++
  })

  document.querySelectorAll('#lista-solic [data-solic-id] span').forEach(el => {
    itens.push(`${num}. ${el.textContent.trim()}`)
    num++
  })

  const hoje = new Date().toLocaleDateString('pt-BR')
  const texto = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `📋 PRESCRIÇÃO MÉDICA — ${hoje}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `Paciente: ${p.nome || '—'}`,
    `Leito: ${internacaoAtual.leito?.codigo || '—'} | ${internacaoAtual.leito?.setor || '—'}`,
    `HD: ${diagnostico}`,
    '',
    ...itens,
    '',
    `Médico: ${medico}${crm ? ' — CRM/PR ' + crm : ''}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n')

  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.getElementById('btn-copiar-presc')
    const original = btn.innerHTML
    btn.innerHTML = '<i class="ti ti-check text-sm text-green-500"></i> Copiado!'
    setTimeout(() => { btn.innerHTML = original }, 2000)
  })
}

function imprimirPrescricao(p, l, hoje, dataInt) {
  const diagnostico = document.getElementById('p-diagnostico')?.value || ''
  const dieta       = document.getElementById('p-dieta')?.value || ''
  const medico      = document.getElementById('p-medico')?.value || ''
  const crm         = document.getElementById('p-crm')?.value || ''

  // Monta itens numerados: 1=dieta, 2+=medicamentos, depois solicitações
  const itens = []
  if (dieta) itens.push(dieta.toUpperCase())

  document.querySelectorAll('#meds-tbody tr[data-med-id]').forEach(tr => {
    if (tr.dataset.suspenso === 'true' || tr.querySelector('.chk-suspender')?.checked) return
    const tds    = tr.querySelectorAll('td')
    // Colunas: 0=med,1=dose,2=via,3=freq,4=obs,5=inicio,6=dias,7=susp,8=acoes
    const nome   = tds[0]?.textContent?.trim() || ''
    const dose   = tds[1]?.textContent?.trim() || ''
    const via    = tds[2]?.textContent?.trim() || ''
    const freq   = tds[3]?.textContent?.trim() || ''
    const obs    = tds[4]?.textContent?.trim()
    const inicioTd = tds[5]?.textContent.replace(/[–—]/g,'').trim()
    const diasVal  = tds[6]?.textContent.replace(/D\d+\//,'').replace(/[–—]/g,'').trim()
    // Calcula Dx/y dinamicamente
    let diaLabel = ''
    if (diasVal && inicioTd && inicioTd !== '—') {
      const [d,m,a] = inicioTd.split('/')
      if (d && m && a) {
        const dataInicio = new Date(`${a}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`)
        const diaAtual = Math.floor((Date.now() - dataInicio) / 86400000) + 1
        diaLabel = `D${diaAtual}/${diasVal}`
      }
    } else if (diasVal && diasVal !== '—') {
      diaLabel = `D1/${diasVal}`
    }
    const partes = [nome, dose, '–', via, freq]
    if (obs && obs.replace(/[–—]/g,'').trim() !== '') partes.push('(' + obs + ')')
    if (diaLabel) partes.push(diaLabel)
    itens.push(partes.join(' '))
  })

  document.querySelectorAll('#lista-solic [data-solic-id] span').forEach(el => {
    itens.push(el.textContent.trim())
  })

  // Linhas preenchidas + 6 vazias
  const totalLinhas = itens.length + 6
  while (itens.length < totalLinhas) itens.push('')

  const b = 'border:1px solid #bbb;'

  const linhasHTML = itens.map(function(item, i) {
    const pad = item ? '4px 8px' : '12px 8px'
    return '<tr>' +
      '<td style="' + b + 'width:26px;text-align:center;padding:4px 3px;font-size:8.5pt;font-weight:bold;background:#f5f5f5">' + (i+1) + '</td>' +
      '<td style="' + b + 'padding:' + pad + ';font-size:9.5pt">' + escHtml(item) + '</td>' +
      '<td style="' + b + 'width:175px;"></td>' +
      '</tr>'
  }).join('')

  const css =
    '* { box-sizing:border-box; margin:0; padding:0; }' +
    'body { font-family:Arial,sans-serif; font-size:10pt; background:white; color:#000; }' +
    '@page { size:A4 portrait; margin:12mm 12mm; }' +
    '@media print { body { margin:0; } }' +
    '.page { width:100%; max-width:186mm; margin:0 auto; }' +

    // Cabeçalho simples centralizado
    '.cabecalho { text-align:center; padding:8px 0 6px; border-bottom:2px solid #000; margin-bottom:0; }' +
    '.cabecalho p { font-size:10pt; line-height:1.5; }' +
    '.cabecalho p:first-child { font-weight:bold; font-size:11pt; }' +

    // Blocos
    '.bloco { border:1px solid #bbb; border-top:none; padding:6px 10px; }' +
    '.bloco-titulo { font-size:7pt; text-transform:uppercase; color:#777; letter-spacing:0.4px; margin-bottom:2px; }' +
    '.bloco-valor { font-size:10pt; font-weight:bold; }' +
    '.bloco-valor-sm { font-size:9pt; font-weight:bold; }' +
    '.bloco-row { display:flex; border:1px solid #bbb; border-top:none; }' +
    '.bloco-col { flex:1; padding:5px 10px; }' +
    '.bloco-col:not(:last-child) { border-right:1px solid #ddd; }' +

    // Tabela prescrição
    '.presc-titulo { text-align:center; font-size:9pt; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #bbb; border-top:none; padding:4px; background:#f5f5f5; }' +

    // Assinatura
    '.assinatura { margin-top:80px; display:flex; justify-content:flex-end; }' +
    '.assin-box { text-align:center; width:200px; }' +
    '.assin-linha { border-top:1.5px solid #000; margin-bottom:4px; }' +
    '.assin-nome { font-size:10pt; font-weight:bold; }' +
    '.assin-crm { font-size:8.5pt; color:#444; }' +
    '.assin-data { font-size:8pt; color:#666; margin-top:3px; }' +
    '.rodape { text-align:center; font-size:7pt; color:#bbb; margin-top:10px; border-top:1px solid #eee; padding-top:4px; }'

  const idade = p.data_nascimento ? calcularIdadePrint(p.data_nascimento) : '—'
  const nascFormatado = p.data_nascimento ? new Date(p.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Prescrição Médica</title>' +
    '<style>' + css + '</style></head><body><div class="page">' +

    // ── CABEÇALHO ──
    '<div class="cabecalho">' +
    '<p>Prefeitura do Município de Maringá</p>' +
    '<p>Secretaria Municipal de Saúde</p>' +
    '<p>Unidade de Pronto Atendimento Zona Sul</p>' +
    '</div>' +

    // ── DADOS DO PACIENTE ──
    '<div class="bloco-row" style="border-top:1px solid #bbb;margin-top:0">' +
    '<div class="bloco-col" style="flex:3">' +
    '<div class="bloco-titulo">Nome do Paciente</div>' +
    '<div class="bloco-valor">' + escHtml(p.nome||'—') + '</div>' +
    '</div>' +
    '<div class="bloco-col" style="flex:1.5">' +
    '<div class="bloco-titulo">Código SUS</div>' +
    '<div class="bloco-valor-sm">' + escHtml(p.codigo_sus||'—') + '</div>' +
    '</div>' +
    '<div class="bloco-col" style="flex:1">' +
    '<div class="bloco-titulo">Nascimento</div>' +
    '<div class="bloco-valor-sm">' + nascFormatado + '</div>' +
    '</div>' +
    '<div class="bloco-col" style="flex:0.7">' +
    '<div class="bloco-titulo">Idade</div>' +
    '<div class="bloco-valor">' + idade + '</div>' +
    '</div>' +
    '</div>' +

    // ── LEITO E SETOR ──
    '<div class="bloco-row">' +
    '<div class="bloco-col" style="flex:1">' +
    '<div class="bloco-titulo">Leito</div>' +
    '<div class="bloco-valor">' + escHtml(l.codigo||'—') + '</div>' +
    '</div>' +
    '<div class="bloco-col" style="flex:2">' +
    '<div class="bloco-titulo">Setor</div>' +
    '<div class="bloco-valor-sm">' + escHtml(l.setor||'—') + '</div>' +
    '</div>' +
    '<div class="bloco-col" style="flex:1">' +
    '<div class="bloco-titulo">Data de Internação</div>' +
    '<div class="bloco-valor-sm">' + dataInt + '</div>' +
    '</div>' +
    '<div class="bloco-col" style="flex:1">' +
    '<div class="bloco-titulo">Data da Prescrição</div>' +
    '<div class="bloco-valor-sm">' + hoje + '</div>' +
    '</div>' +
    '</div>' +

    // ── DIAGNÓSTICO ──
    '<div class="bloco" style="border-top:1px solid #bbb;">' +
    '<div class="bloco-titulo">Diagnóstico</div>' +
    '<div style="font-size:10pt;margin-top:2px">' + escHtml(diagnostico||'—').replace(/\n/g,'<br>') + '</div>' +
    '</div>' +

    // ── TABELA PRESCRIÇÃO ──
    '<div class="presc-titulo">Prescrição Médica</div>' +
    '<table style="width:100%;border-collapse:collapse;">' +
    '<thead><tr>' +
    '<th style="border:1px solid #bbb;border-top:none;width:26px;padding:4px 3px;font-size:8.5pt;text-align:center;background:#f5f5f5">Nº</th>' +
    '<th style="border:1px solid #bbb;border-top:none;padding:4px 8px;font-size:8.5pt;text-align:left;background:#f5f5f5">Prescrição Médica</th>' +
    '<th style="border:1px solid #bbb;border-top:none;width:260px;padding:4px 8px;font-size:8.5pt;text-align:center;background:#f5f5f5">Horários</th>' +
    '</tr></thead>' +
    '<tbody>' + linhasHTML + '</tbody>' +
    '</table>' +

    // ── ASSINATURA ──
    '<div class="assinatura"><div class="assin-box">' +
    '<div class="assin-linha"></div>' +
    '<div class="assin-nome">' + escHtml(medico||'Médico Responsável') + '</div>' +
    (crm ? '<div class="assin-crm">CRM/PR ' + escHtml(crm) + '</div>' : '') +
    '<div class="assin-data">Maringá–PR, ' + hoje + '</div>' +
    '</div></div>' +

    '<div class="rodape">SigmaPEP · Prontuário Eletrônico · UPA Zona Sul – Maringá/PR</div>' +
    '</div><script>window.onload=function(){window.print()}<\/script></body></html>'

  abrirJanelaImpressao(html)
}



function visualizarEvolucao(h) {
  const dt = new Date(h.created_at)
  const dataFmt = dt.toLocaleDateString('pt-BR')
  const horaFmt = dt.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})
  const vitais = h.dados_vitais || {}
  const exames = h.exames || []

  const vitaisTexto = [
    vitais.pa ? `<span class="vital-badge">PA: <b>${vitais.pa}</b></span>` : '',
    vitais.pulso ? `<span class="vital-badge">Pulso: <b>${vitais.pulso}bpm</b></span>` : '',
    vitais.spo2 ? `<span class="vital-badge">SpO₂: <b>${vitais.spo2}%</b></span>` : '',
    vitais.fr ? `<span class="vital-badge">FR: <b>${vitais.fr}</b></span>` : '',
    vitais.glicemia ? `<span class="vital-badge">Glicemia: <b>${vitais.glicemia}</b></span>` : '',
    vitais.temperatura ? `<span class="vital-badge">Temp: <b>${vitais.temperatura}°C</b></span>` : '',
  ].filter(Boolean).join('')

  // Remove modal anterior se existir
  document.getElementById('modal-ver-evol')?.remove()

  const modal = document.createElement('div')
  modal.id = 'modal-ver-evol'
  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'
  modal.innerHTML = `
    <div class="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
      <div class="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <h3 class="font-semibold text-gray-900">Evolução — ${dataFmt} às ${horaFmt}</h3>
          <p class="text-xs text-gray-400 mt-0.5">${h.medico_responsavel || '—'}</p>
        </div>
        <div class="flex gap-2">
          <button id="modal-ver-imprimir" class="btn text-sm"><i class="ti ti-printer text-sm"></i> Imprimir</button>
          <button id="modal-ver-fechar" class="text-gray-400 hover:text-gray-600 ml-1"><i class="ti ti-x text-lg"></i></button>
        </div>
      </div>
      <div class="overflow-y-auto flex-1 p-4 flex flex-col gap-4">

        ${h.diagnostico ? `
        <div>
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Diagnóstico</p>
          <p class="text-sm text-gray-800">${h.diagnostico}</p>
        </div>` : ''}

        ${vitaisTexto ? `
        <div>
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Sinais Vitais</p>
          <div class="flex flex-wrap gap-2">${vitaisTexto}</div>
        </div>` : ''}

        <div>
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Evolução Clínica</p>
          <p class="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">${h.texto || '—'}</p>
        </div>

        ${exames.length ? `
        <div>
          <p class="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Resultados de Exames</p>
          <table class="data-table">
            <thead><tr><th>Exame</th><th>Resultado</th><th>Data</th></tr></thead>
            <tbody>
              ${exames.map(e => `<tr>
                <td class="font-medium">${e.exame}</td>
                <td>${e.resultado}</td>
                <td class="text-xs">${e.data_resultado ? new Date(e.data_resultado+'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}

      </div>
    </div>
    <style>
      .vital-badge { background:#f0f7ff; border:1px solid #c8dff0; border-radius:6px; padding:3px 10px; font-size:11px; color:#334; }
    </style>
  `

  document.body.appendChild(modal)
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove() })
  document.getElementById('modal-ver-fechar').addEventListener('click', () => modal.remove())
  document.getElementById('modal-ver-imprimir').addEventListener('click', () => {
    const dt2 = new Date(h.created_at)
    const dataInt = internacaoAtual.data_internacao ? new Date(internacaoAtual.data_internacao+'T12:00:00').toLocaleDateString('pt-BR') : '—'
    imprimirEvolucaoObj(h, internacaoAtual.leito || {}, dt2.toLocaleDateString('pt-BR'), dt2.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), dataInt)
  })
}

function imprimirEvolucaoObj(h, l, hoje, agora, dataInt) {
  // Monta campos a partir do objeto histórico
  const p = internacaoAtual.paciente || {}
  const vitais = h.dados_vitais || {}
  const exames = h.exames || []
  const medico = h.medico_responsavel || ''

  const vitaisLabels = [
    ['PA (mmHg)', vitais.pa],
    ['Pulso (bpm)', vitais.pulso],
    ['SpO₂ (%)', vitais.spo2],
    ['FR (irpm)', vitais.fr],
    ['Glicemia (mg/dL)', vitais.glicemia],
    ['Temp. (°C)', vitais.temperatura],
  ]

  const vitaisHTML = vitaisLabels.map(function(v) {
    return '<div class="vital-item">' +
      '<span class="vital-label">' + v[0] + '</span>' +
      '<span class="vital-val">' + (v[1]||'—') + '</span>' +
      '</div>'
  }).join('')

  const brd = 'border:1px solid #999;'
  const thEv = brd + 'padding:4px 8px;text-align:left;font-size:8.5pt;background:#f0f0f0;font-weight:bold;'

  const examesHTML = exames.length > 0
    ? '<table style="width:100%;border-collapse:collapse;font-size:9pt">' +
      '<thead><tr>' +
      '<th style="' + thEv + 'width:35%">Exame</th>' +
      '<th style="' + thEv + '">Resultado</th>' +
      '<th style="' + thEv + 'width:90px;">Data</th>' +
      '</tr></thead><tbody>' +
      exames.map(function(e) {
        return '<tr>' +
          '<td style="' + brd + 'padding:4px 8px;font-weight:600">' + escHtml(e.exame) + '</td>' +
          '<td style="' + brd + 'padding:4px 8px">' + escHtml(e.resultado) + '</td>' +
          '<td style="' + brd + 'padding:4px 8px;white-space:nowrap">' + (e.data_resultado ? new Date(e.data_resultado+'T12:00:00').toLocaleDateString('pt-BR') : '—') + '</td>' +
          '</tr>'
      }).join('') + '</tbody></table>'
    : '<p style="color:#aaa;font-size:8.5pt;padding:6px 0">Nenhum exame registrado.</p>'

  const secTit = 'font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;background:#f0f0f0;padding:3px 10px;border-bottom:1px solid #999;'
  const secBody = 'padding:8px 10px;font-size:10pt;line-height:1.6;min-height:22px;'
  const nascFormatado = p.data_nascimento ? new Date(p.data_nascimento+'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const css =
    '* { box-sizing:border-box; margin:0; padding:0; }' +
    'body { font-family:Arial,sans-serif; font-size:10pt; background:white; color:#000; }' +
    '@page { size:A4 portrait; margin:12mm 12mm; }' +
    '@media print { body { margin:0; } }' +
    '.page { width:100%; max-width:186mm; margin:0 auto; }' +
    '.secao { border:1px solid #999; border-top:none; }' +
    '.secao-tit { ' + secTit + ' }' +
    '.secao-body { ' + secBody + ' white-space:pre-wrap; }' +
    '.vitais-grid { display:flex; gap:5px; padding:7px 10px; }' +
    '.vital-item { flex:1; text-align:center; border:1px solid #ccc; border-radius:3px; padding:5px 3px; }' +
    '.vital-label { font-size:6.5pt; color:#666; text-transform:uppercase; display:block; margin-bottom:2px; }' +
    '.vital-val { font-size:12pt; font-weight:bold; display:block; }' +
    '.assinatura { margin-top:80px; display:flex; justify-content:flex-end; }' +
    '.assin-box { text-align:center; width:220px; }' +
    '.assin-linha { border-top:1.5px solid #000; margin-bottom:4px; }' +
    '.assin-nome { font-size:10pt; font-weight:bold; }' +
    '.assin-crm { font-size:8.5pt; color:#444; margin-top:1px; }' +
    '.assin-data { font-size:8pt; color:#666; margin-top:4px; }' +
    '.rodape { text-align:center; font-size:7pt; color:#aaa; margin-top:8px; border-top:1px solid #eee; padding-top:4px; }'

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Evolução Médica</title>' +
    '<style>' + css + '</style></head><body><div class="page">' +

    '<div style="text-align:center;padding:8px 0 6px;border-bottom:2px solid #000;">' +
    '<p style="font-weight:bold;font-size:11pt;line-height:1.5">Prefeitura do Município de Maringá</p>' +
    '<p style="font-size:10pt;line-height:1.5">Secretaria Municipal de Saúde</p>' +
    '<p style="font-size:10pt;line-height:1.5">Unidade de Pronto Atendimento Zona Sul</p>' +
    '</div>' +

    '<div style="display:flex;border:1px solid #bbb;border-top:none;">' +
    '<div style="flex:3;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Nome do Paciente</div><div style="font-size:10pt;font-weight:bold">' + escHtml(p.nome||'—') + '</div></div>' +
    '<div style="flex:1.5;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Código SUS</div><div style="font-size:9pt;font-weight:bold">' + escHtml(p.codigo_sus||'—') + '</div></div>' +
    '<div style="flex:1;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Nascimento</div><div style="font-size:9pt;font-weight:bold">' + nascFormatado + '</div></div>' +
    '<div style="flex:0.7;padding:5px 10px"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Idade</div><div style="font-size:10pt;font-weight:bold">' + (p.data_nascimento ? calcularIdadePrint(p.data_nascimento) : '—') + '</div></div>' +
    '</div>' +

    '<div style="display:flex;border:1px solid #bbb;border-top:none;">' +
    '<div style="flex:1;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Leito</div><div style="font-size:10pt;font-weight:bold">' + escHtml(l.codigo||'—') + '</div></div>' +
    '<div style="flex:2;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Setor</div><div style="font-size:9pt;font-weight:bold">' + escHtml(l.setor||'—') + '</div></div>' +
    '<div style="flex:1;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Data de Internação</div><div style="font-size:9pt;font-weight:bold">' + dataInt + '</div></div>' +
    '<div style="flex:1;padding:5px 10px"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Data / Hora da Evolução</div><div style="font-size:9pt;font-weight:bold">' + hoje + ' ' + agora + '</div></div>' +
    '</div>' +

    '<div style="border:1px solid #bbb;border-top:none;padding:5px 10px;">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Diagnóstico</div>' +
    '<div style="font-size:10pt">' + escHtml(h.diagnostico||'—').replace(/\n/g,'<br>') + '</div>' +
    '</div>' +

    '<div style="text-align:center;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #bbb;border-top:none;padding:4px;background:#f5f5f5;">Evolução Médica</div>' +

    '<div class="secao"><div class="secao-tit">Sinais Vitais</div><div class="vitais-grid">' + vitaisHTML + '</div></div>' +
    '<div class="secao"><div class="secao-tit">1. Evolução Clínica</div><div class="secao-body" style="min-height:130px">' + escHtml(h.texto||'').replace(/\n/g,'<br>') + '</div></div>' +
    '<div class="secao"><div class="secao-tit">Resultados de Exames</div><div style="padding:6px 10px">' + examesHTML + '</div></div>' +

    '<div class="assinatura"><div class="assin-box">' +
    '<div class="assin-linha"></div>' +
    '<div class="assin-nome">' + escHtml(medico||'Médico Responsável') + '</div>' +
    '<div class="assin-data">Maringá–PR, ' + hoje + ' às ' + agora + '</div>' +
    '</div></div>' +

    '<div class="rodape">SigmaPEP · Prontuário Eletrônico · UPA Zona Sul – Maringá/PR · ' + hoje + ' ' + agora + '</div>' +
    '</div><script>window.onload=function(){window.print()}<\/script></body></html>'

  abrirJanelaImpressao(html)
}

function imprimirEvolucao(p, l, hoje, agora, dataInt) {
  const diagnostico = document.getElementById('e-diagnostico')?.value || ''
  const texto       = document.getElementById('e-texto')?.value || ''
  const medico      = document.getElementById('e-medico')?.value || ''
  const crm         = document.getElementById('e-crm')?.value || ''

  const vitais = {
    pa:    document.getElementById('v-pa')?.value || '',
    pulso: document.getElementById('v-pulso')?.value || '',
    spo2:  document.getElementById('v-spo2')?.value || '',
    fr:    document.getElementById('v-fr')?.value || '',
    gli:   document.getElementById('v-glicemia')?.value || '',
    temp:  document.getElementById('v-temp')?.value || '',
  }

  const exames = []
  document.querySelectorAll('#res-tbody tr[data-res-id]').forEach(tr => {
    const tds = tr.querySelectorAll('td')
    exames.push({ exame: tds[0]?.textContent||'', resultado: tds[1]?.textContent||'', data: tds[2]?.textContent||'' })
  })

  const vitaisLabels = [
    ['PA (mmHg)', vitais.pa],
    ['Pulso (bpm)', vitais.pulso],
    ['SpO₂ (%)', vitais.spo2],
    ['FR (irpm)', vitais.fr],
    ['Glicemia (mg/dL)', vitais.gli],
    ['Temp. (°C)', vitais.temp],
  ]

  const vitaisHTML = vitaisLabels.map(function(v) {
    return '<div class="vital-item">' +
      '<span class="vital-label">' + v[0] + '</span>' +
      '<span class="vital-val">' + (v[1]||'—') + '</span>' +
      '</div>'
  }).join('')

  const brd = 'border:1px solid #999;'
  const thEv = brd + 'padding:4px 8px;text-align:left;font-size:8.5pt;background:#f0f0f0;font-weight:bold;'

  const examesHTML = exames.length > 0
    ? '<table style="width:100%;border-collapse:collapse;font-size:9pt">' +
      '<thead><tr>' +
      '<th style="' + thEv + 'width:35%">Exame</th>' +
      '<th style="' + thEv + '">Resultado</th>' +
      '<th style="' + thEv + 'width:90px;">Data</th>' +
      '</tr></thead><tbody>' +
      exames.map(function(e) {
        return '<tr>' +
          '<td style="' + brd + 'padding:4px 8px;font-weight:600">' + escHtml(e.exame) + '</td>' +
          '<td style="' + brd + 'padding:4px 8px">' + escHtml(e.resultado) + '</td>' +
          '<td style="' + brd + 'padding:4px 8px;white-space:nowrap">' + escHtml(e.data) + '</td>' +
          '</tr>'
      }).join('') +
      '</tbody></table>'
    : '<p style="color:#aaa;font-size:8.5pt;padding:6px 0">Nenhum exame registrado.</p>'

  const secTit = 'font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;background:#f0f0f0;padding:3px 10px;border-bottom:1px solid #999;'
  const secBody = 'padding:8px 10px;font-size:10pt;line-height:1.6;min-height:22px;'

  const css =
    '* { box-sizing:border-box; margin:0; padding:0; }' +
    'body { font-family:Arial,sans-serif; font-size:10pt; background:white; color:#000; }' +
    '@page { size:A4 portrait; margin:8mm 10mm; }' +
    '@media print { body { margin:0; } }' +
    '.page { width:100%; max-width:193mm; margin:0 auto; }' +
    '.header { display:flex; align-items:stretch; border:1.5px solid #000; }' +
    '.header-left { width:22mm; padding:6px 8px; display:flex; align-items:center; justify-content:center; font-size:8pt; color:#555; text-align:center; border-right:1px solid #ccc; }' +
    '.header-center { flex:1; text-align:center; padding:6px 10px; border-right:1px solid #ccc; }' +
    '.header-center h1 { font-size:12pt; font-weight:bold; letter-spacing:0.5px; }' +
    '.header-center h2 { font-size:9pt; font-weight:normal; color:#333; margin-top:1px; }' +
    '.header-center h3 { font-size:10pt; font-weight:bold; margin-top:2px; }' +
    '.header-right { width:48mm; padding:6px 8px; font-size:8pt; color:#333; display:flex; flex-direction:column; justify-content:center; gap:4px; }' +
    '.lbl { font-size:7pt; color:#777; text-transform:uppercase; display:block; }' +
    '.val { font-size:9.5pt; font-weight:bold; color:#000; display:block; }' +
    '.pac-bar { border:1px solid #000; border-top:none; display:flex; }' +
    '.pac-col { flex:1; padding:4px 8px; }' +
    '.pac-col:not(:last-child) { border-right:1px solid #ccc; }' +
    '.pac-lbl { font-size:7pt; color:#777; text-transform:uppercase; display:block; }' +
    '.pac-val { font-size:10pt; font-weight:bold; display:block; }' +
    '.pac-val-sm { font-size:9pt; font-weight:bold; display:block; }' +
    '.titulo-evol { text-align:center; font-size:11pt; font-weight:bold; text-transform:uppercase; letter-spacing:1.5px; border:1px solid #000; border-top:none; padding:5px; background:#f0f0f0; }' +
    '.secao { border:1px solid #999; border-top:none; }' +
    '.secao-tit { ' + secTit + ' }' +
    '.secao-body { ' + secBody + ' white-space:pre-wrap; }' +
    '.vitais-grid { display:flex; gap:5px; padding:7px 10px; }' +
    '.vital-item { flex:1; text-align:center; border:1px solid #ccc; border-radius:3px; padding:5px 3px; }' +
    '.vital-label { font-size:6.5pt; color:#666; text-transform:uppercase; display:block; margin-bottom:2px; }' +
    '.vital-val { font-size:12pt; font-weight:bold; display:block; }' +
    '.assinatura { margin-top:80px; display:flex; justify-content:flex-end; }' +
    '.assin-box { text-align:center; width:220px; }' +
    '.assin-linha { border-top:1.5px solid #000; margin-bottom:4px; }' +
    '.assin-nome { font-size:10pt; font-weight:bold; }' +
    '.assin-crm { font-size:8.5pt; color:#444; margin-top:1px; }' +
    '.assin-data { font-size:8pt; color:#666; margin-top:4px; }' +
    '.rodape { text-align:center; font-size:7pt; color:#aaa; margin-top:8px; border-top:1px solid #eee; padding-top:4px; }'

  const html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Evolução Médica</title>' +
    '<style>' + css + '</style></head><body><div class="page">' +

    // ── CABEÇALHO igual à prescrição ──
    '<div style="text-align:center;padding:8px 0 6px;border-bottom:2px solid #000;">' +
    '<p style="font-weight:bold;font-size:11pt;line-height:1.5">Prefeitura do Município de Maringá</p>' +
    '<p style="font-size:10pt;line-height:1.5">Secretaria Municipal de Saúde</p>' +
    '<p style="font-size:10pt;line-height:1.5">Unidade de Pronto Atendimento Zona Sul</p>' +
    '</div>' +

    // ── BLOCO 1: Dados do paciente ──
    '<div style="display:flex;border:1px solid #bbb;border-top:none;">' +
    '<div style="flex:3;padding:5px 10px;border-right:1px solid #ddd">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Nome do Paciente</div>' +
    '<div style="font-size:10pt;font-weight:bold">' + escHtml(p.nome||'—') + '</div>' +
    '</div>' +
    '<div style="flex:1.5;padding:5px 10px;border-right:1px solid #ddd">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Código SUS</div>' +
    '<div style="font-size:9pt;font-weight:bold">' + escHtml(p.codigo_sus||'—') + '</div>' +
    '</div>' +
    '<div style="flex:1;padding:5px 10px;border-right:1px solid #ddd">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Nascimento</div>' +
    '<div style="font-size:9pt;font-weight:bold">' + (p.data_nascimento ? new Date(p.data_nascimento+'T12:00:00').toLocaleDateString('pt-BR') : '—') + '</div>' +
    '</div>' +
    '<div style="flex:0.7;padding:5px 10px">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Idade</div>' +
    '<div style="font-size:10pt;font-weight:bold">' + (p.data_nascimento ? calcularIdadePrint(p.data_nascimento) : '—') + '</div>' +
    '</div>' +
    '</div>' +

    // ── BLOCO 2: Leito, setor, datas + dias internado ──
    '<div style="display:flex;border:1px solid #bbb;border-top:none;">' +
    '<div style="flex:1;padding:5px 10px;border-right:1px solid #ddd">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Leito</div>' +
    '<div style="font-size:10pt;font-weight:bold">' + escHtml(l.codigo||'—') + '</div>' +
    '</div>' +
    '<div style="flex:2;padding:5px 10px;border-right:1px solid #ddd">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Setor</div>' +
    '<div style="font-size:9pt;font-weight:bold">' + escHtml(l.setor||'—') + '</div>' +
    '</div>' +
    '<div style="flex:1;padding:5px 10px;border-right:1px solid #ddd">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Data de Internação</div>' +
    '<div style="font-size:9pt;font-weight:bold">' + dataInt + '</div>' +
    '</div>' +
    '<div style="flex:0.8;padding:5px 10px;border-right:1px solid #ddd">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Dias Internado</div>' +
    '<div style="font-size:10pt;font-weight:bold">' + (internacaoAtual.dias_internado != null ? internacaoAtual.dias_internado + 'd' : '—') + '</div>' +
    '</div>' +
    '<div style="flex:1;padding:5px 10px">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Data / Hora</div>' +
    '<div style="font-size:9pt;font-weight:bold">' + hoje + ' ' + agora + '</div>' +
    '</div>' +
    '</div>' +

    // ── BLOCO 3: Diagnóstico ──
    '<div style="border:1px solid #bbb;border-top:none;padding:5px 10px;">' +
    '<div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Diagnóstico</div>' +
    '<div style="font-size:10pt">' + escHtml(diagnostico||'—').replace(/\n/g,'<br>') + '</div>' +
    '</div>' +

    // ── TÍTULO EVOLUÇÃO ──
    '<div style="text-align:center;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #bbb;border-top:none;padding:4px;background:#f5f5f5;">Evolução Médica</div>' +

    // ── SINAIS VITAIS (antes da evolução) ──
    '<div class="secao">' +
    '<div class="secao-tit">Sinais Vitais (SSVV)</div>' +
    '<div class="vitais-grid">' + vitaisHTML + '</div>' +
    '</div>' +

    // ── EVOLUÇÃO CLÍNICA ──
    '<div class="secao">' +
    '<div class="secao-tit">1. Evolução Clínica</div>' +
    '<div class="secao-body" style="min-height:160px">' + escHtml(texto).replace(/\n/g,'<br>') + '</div>' +
    '</div>' +

    // ── ASSINATURA ──
    '<div class="assinatura"><div class="assin-box">' +
    '<div class="assin-linha"></div>' +
    '<div class="assin-nome">' + escHtml(medico||'Médico Responsável') + '</div>' +
    (crm ? '<div class="assin-crm">CRM/PR ' + escHtml(crm) + '</div>' : '') +
    '<div class="assin-data">Maringá–PR, ' + hoje + ' às ' + agora + '</div>' +
    '</div></div>' +

    '<div class="rodape">SigmaPEP · Prontuário Eletrônico · UPA Zona Sul – Maringá/PR · ' + hoje + ' ' + agora + '</div>' +

    // ── EXAMES EM PÁGINA SEPARADA ──
    (exames.length > 0 ?
    '<div style="page-break-before:always;padding-top:10mm;">' +
    '<div style="text-align:center;padding:8px 0 6px;border-bottom:2px solid #000;">' +
    '<p style="font-weight:bold;font-size:11pt;line-height:1.5">Prefeitura do Município de Maringá</p>' +
    '<p style="font-size:10pt;line-height:1.5">Secretaria Municipal de Saúde</p>' +
    '<p style="font-size:10pt;line-height:1.5">Unidade de Pronto Atendimento Zona Sul</p>' +
    '</div>' +
    '<div style="display:flex;border:1px solid #bbb;border-top:none;">' +
    '<div style="flex:3;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Nome do Paciente</div><div style="font-size:10pt;font-weight:bold">' + escHtml(p.nome||'—') + '</div></div>' +
    '<div style="flex:1;padding:5px 10px;border-right:1px solid #ddd"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Leito</div><div style="font-size:10pt;font-weight:bold">' + escHtml(l.codigo||'—') + '</div></div>' +
    '<div style="flex:1;padding:5px 10px"><div style="font-size:7pt;text-transform:uppercase;color:#777;margin-bottom:2px">Data</div><div style="font-size:9pt;font-weight:bold">' + hoje + '</div></div>' +
    '</div>' +
    '<div style="text-align:center;font-size:9pt;font-weight:bold;text-transform:uppercase;border:1px solid #bbb;border-top:none;padding:4px;background:#f5f5f5;margin-bottom:0;">Resultados de Exames</div>' +
    '<div style="border:1px solid #999;border-top:none;padding:6px 10px">' + examesHTML + '</div>' +
    '</div>'
    : '') +

    '</div><script>window.onload=function(){window.print()}<\/script></body></html>'

  abrirJanelaImpressao(html)
}

function abrirJanelaImpressao(html) {
  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(html)
  win.document.close()
}

function calcularIdadePrint(data_nascimento) {
  if (!data_nascimento) return '—'
  const hoje = new Date()
  const nasc = new Date(data_nascimento + 'T12:00:00')
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade + ' anos'
}
