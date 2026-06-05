// src/pages/gerenciar-leitos.js
import { supabase } from '../services/supabase.js'
import { setNavAtivo } from '../components/sidebar.js'
import { router } from '../router.js'

const STATUS_LABEL = { ocupado:'Ocupado', disponivel:'Disponível', limpeza:'Em limpeza', manutencao:'Em manutenção', reservado:'Reservado' }
const STATUS_COR   = { ocupado:'red', disponivel:'green', limpeza:'amber', manutencao:'gray', reservado:'violet' }

let todosLeitos = []

export async function init(container) {
  setNavAtivo('config')
  container.innerHTML = `
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900">Gerenciar Leitos</h1>
        <button id="btn-voltar" class="btn"><i class="ti ti-arrow-left text-sm"></i> Voltar</button>
      </div>
      <div class="px-5 py-3 bg-white border-b border-gray-100 flex gap-3 flex-shrink-0 flex-wrap">
        <select id="filtro-setor" class="field text-xs w-64">
          <option value="">Todos os setores</option>
          <option>Aguardando Leito - Medicação</option>
          <option>Aguardando Leito - Intermediário</option>
          <option>Aguardando Leito - Sala de Emergência</option>
          <option>Internação</option>
          <option>Internação - Isolamento</option>
        </select>
        <select id="filtro-status" class="field text-xs w-44">
          <option value="">Todos os status</option>
          <option value="ocupado">Ocupado</option>
          <option value="disponivel">Disponível</option>
          <option value="limpeza">Em limpeza</option>
          <option value="manutencao">Em manutenção</option>
          <option value="reservado">Reservado</option>
        </select>
        <span id="contador" class="text-xs text-gray-400 self-center"></span>
      </div>
      <div id="lista-leitos" class="flex-1 overflow-y-auto px-5 py-4">
        <div class="flex justify-center py-10"><i class="ti ti-loader-2 text-2xl animate-spin text-primary-500"></i></div>
      </div>
    </div>

    <!-- Modal alterar status -->
    <div id="modal-status" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Alterar Status do Leito</h3>
          <button id="modal-st-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x"></i></button>
        </div>
        <div class="p-4 flex flex-col gap-3">
          <div class="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <div class="text-[11px] text-gray-400 mb-0.5">Leito</div>
            <div class="font-bold text-gray-800" id="modal-st-leito">—</div>
            <div class="text-xs text-gray-500" id="modal-st-setor">—</div>
          </div>
          <div>
            <label class="field-label">Novo status *</label>
            <select id="modal-st-novo" class="field text-[12.5px]">
              <option value="">Selecione</option>
              <option value="disponivel">✅ Disponível</option>
              <option value="limpeza">🧹 Em limpeza</option>
              <option value="manutencao">🔧 Em manutenção</option>
              <option value="reservado">🔒 Reservado</option>
            </select>
          </div>
          <div>
            <label class="field-label">Observação</label>
            <input id="modal-st-obs" type="text" class="field text-[12.5px]" placeholder="Ex: Aguardando troca de colchão...">
          </div>
        </div>
        <div class="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button id="modal-st-cancelar" class="btn">Cancelar</button>
          <button id="modal-st-salvar" class="btn btn-primary"><i class="ti ti-check text-sm"></i> Salvar</button>
        </div>
      </div>
    </div>
  `

  document.getElementById('btn-voltar').addEventListener('click', () => router.navigate('leitos'))
  document.getElementById('filtro-setor').addEventListener('change', renderLista)
  document.getElementById('filtro-status').addEventListener('change', renderLista)

  const modal = document.getElementById('modal-status')
  document.getElementById('modal-st-fechar').addEventListener('click', () => modal.classList.add('hidden'))
  document.getElementById('modal-st-cancelar').addEventListener('click', () => modal.classList.add('hidden'))

  let leitoEditando = null
  document.getElementById('modal-st-salvar').addEventListener('click', async () => {
    const novoStatus = document.getElementById('modal-st-novo').value
    if (!novoStatus) { alert('Selecione o novo status.'); return }
    if (!leitoEditando) return

    const btn = document.getElementById('modal-st-salvar')
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i>'

    try {
      const { error } = await supabase.from('leitos')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', leitoEditando.id)
      if (error) throw error

      modal.classList.add('hidden')
      await carregarLeitos()
    } catch (err) {
      alert('Erro: ' + err.message)
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-check text-sm"></i> Salvar'
    }
  })

  // Expõe para os botões inline
  window._abrirModalStatus = (id) => {
    leitoEditando = todosLeitos.find(l => l.id === id)
    if (!leitoEditando) return
    document.getElementById('modal-st-leito').textContent = leitoEditando.codigo
    document.getElementById('modal-st-setor').textContent = leitoEditando.setor
    document.getElementById('modal-st-novo').value = ''
    document.getElementById('modal-st-obs').value = ''
    // Se ocupado, não mostra disponível direto
    const selectNovo = document.getElementById('modal-st-novo')
    Array.from(selectNovo.options).forEach(opt => {
      opt.disabled = leitoEditando.status === 'ocupado' && opt.value === 'disponivel'
        ? true : false
    })
    modal.classList.remove('hidden')
  }

  await carregarLeitos()
}

async function carregarLeitos() {
  try {
    const { data, error } = await supabase
      .from('leitos')
      .select('*, internacao:internacoes(id, paciente:pacientes(nome), ativo)')
      .order('setor').order('codigo')
    if (error) throw error
    todosLeitos = (data || []).map(l => ({
      ...l,
      internacao_ativa: (l.internacao || []).find(i => i.ativo) || null
    }))
    renderLista()
  } catch (err) {
    document.getElementById('lista-leitos').innerHTML =
      `<div class="alert alert-red"><i class="ti ti-alert-circle"></i> ${err.message}</div>`
  }
}

function renderLista() {
  const setor  = document.getElementById('filtro-setor').value
  const status = document.getElementById('filtro-status').value

  const filtrados = todosLeitos.filter(l =>
    (!setor  || l.setor  === setor) &&
    (!status || l.status === status)
  )

  document.getElementById('contador').textContent = `${filtrados.length} leito${filtrados.length!==1?'s':''}`

  if (!filtrados.length) {
    document.getElementById('lista-leitos').innerHTML =
      `<div class="text-center text-gray-400 py-10 text-sm">Nenhum leito encontrado.</div>`
    return
  }

  // Agrupa por setor
  const setores = {}
  filtrados.forEach(l => { if (!setores[l.setor]) setores[l.setor]=[]; setores[l.setor].push(l) })

  document.getElementById('lista-leitos').innerHTML = Object.entries(setores).map(([setor, leitos]) => `
    <div class="mb-5">
      <div class="flex items-center gap-2 mb-2">
        <i class="ti ti-building-hospital text-primary-500"></i>
        <span class="font-semibold text-gray-700 text-sm">${setor}</span>
        <span class="text-xs text-gray-400">${leitos.length} leitos</span>
      </div>
      <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table class="data-table">
          <thead><tr>
            <th>Leito</th><th>Status atual</th><th>Paciente</th><th class="text-right">Alterar status</th>
          </tr></thead>
          <tbody>
            ${leitos.map(l => {
              const cor = STATUS_COR[l.status] || 'gray'
              const badgeClass = `badge badge-${l.status}`
              const paciente = l.internacao_ativa?.paciente?.nome || '—'
              const podeAlterar = l.status !== 'ocupado'
              return `
                <tr>
                  <td class="font-semibold text-gray-700">${l.codigo}</td>
                  <td><span class="${badgeClass}">${STATUS_LABEL[l.status]||l.status}</span></td>
                  <td class="text-gray-600 text-[12px]">${paciente}</td>
                  <td class="text-right">
                    ${podeAlterar
                      ? `<button onclick="window._abrirModalStatus('${l.id}')"
                          class="text-[11px] px-2 py-1.5 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
                          <i class="ti ti-pencil text-xs"></i> Alterar
                        </button>`
                      : `<span class="text-[11px] text-gray-400">Leito ocupado</span>`
                    }
                  </td>
                </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('')
}
