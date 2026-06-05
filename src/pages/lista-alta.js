// src/pages/lista-alta.js
// Tela de seleção de paciente para dar alta pelo menu lateral
import { supabase } from '../services/supabase.js'
import { setNavAtivo } from '../components/sidebar.js'
import { router } from '../router.js'
import { calcularIdade } from '../services/pacientes.js'

export async function init(container) {
  setNavAtivo('alta')
  container.innerHTML = `<div class="flex justify-center items-center flex-1 h-full"><i class="ti ti-loader-2 text-3xl animate-spin text-primary-500"></i></div>`

  try {
    const { data, error } = await supabase
      .from('internacoes')
      .select('*, paciente:pacientes(*), leito:leitos(id, codigo, setor)')
      .eq('ativo', true)
      .order('data_internacao')

    if (error) throw error

    const internacoes = (data || []).map(i => ({
      ...i,
      dias_internado: i.data_internacao
        ? Math.floor((Date.now() - new Date(i.data_internacao)) / 86400000)
        : 0,
    }))

    container.innerHTML = `
      <div class="flex flex-col h-full overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
          <h1 class="text-base font-semibold text-gray-900">Alta Hospitalar</h1>
        </div>

        <div class="px-5 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <div class="relative max-w-sm">
            <i class="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input id="busca" type="text" placeholder="Buscar paciente ou leito..."
              class="field pl-9 w-full text-xs">
          </div>
        </div>

        <div class="px-5 py-2 flex-shrink-0">
          <span class="text-xs text-gray-400">${internacoes.length} paciente${internacoes.length !== 1 ? 's' : ''} internado${internacoes.length !== 1 ? 's' : ''} — selecione para registrar o desfecho</span>
        </div>

        <div id="lista" class="flex-1 overflow-y-auto px-5 pb-5">
          ${renderLista(internacoes)}
        </div>
      </div>
    `

    // Busca
    document.getElementById('busca').addEventListener('input', e => {
      const t = e.target.value.toLowerCase()
      const filtrados = internacoes.filter(i =>
        i.paciente?.nome?.toLowerCase().includes(t) ||
        i.leito?.codigo?.toLowerCase().includes(t) ||
        i.leito?.setor?.toLowerCase().includes(t)
      )
      document.getElementById('lista').innerHTML = renderLista(filtrados)
      bindCards(filtrados, internacoes)
    })

    bindCards(internacoes, internacoes)

  } catch (err) {
    container.innerHTML = `<div class="p-5"><div class="alert alert-red"><i class="ti ti-alert-circle"></i> Erro: ${err.message}</div></div>`
  }
}

function renderLista(internacoes) {
  if (!internacoes.length) return `
    <div class="text-center text-gray-400 py-12 text-sm">
      <i class="ti ti-door-exit text-4xl block mb-2"></i>
      Nenhum paciente internado encontrado.
    </div>`

  return `
    <table class="data-table mt-1">
      <thead><tr>
        <th>Paciente</th><th>Leito</th><th>Setor</th><th>Dias internado</th><th>Diagnóstico</th><th class="text-right">Ação</th>
      </tr></thead>
      <tbody>
        ${internacoes.map(i => `
          <tr class="hover:bg-gray-50 cursor-pointer alta-row" data-id="${i.id}">
            <td>
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 text-[11px] font-bold flex-shrink-0">
                  ${i.paciente?.nome?.charAt(0) || '?'}
                </div>
                <div>
                  <div class="font-medium text-gray-800">${i.paciente?.nome || '—'}</div>
                  <div class="text-[11px] text-gray-400">${calcularIdade(i.paciente?.data_nascimento)}</div>
                </div>
              </div>
            </td>
            <td class="font-semibold text-gray-700">${i.leito?.codigo || '—'}</td>
            <td class="text-gray-600">${i.leito?.setor || '—'}</td>
            <td>
              <span class="text-[11px] px-2 py-0.5 rounded-full font-medium ${i.dias_internado >= 7 ? 'bg-red-100 text-red-700' : i.dias_internado >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}">
                ${i.dias_internado} dia${i.dias_internado !== 1 ? 's' : ''}
              </span>
            </td>
            <td class="text-gray-600 max-w-[200px] truncate text-[12px]">${i.diagnostico || '—'}</td>
            <td class="text-right">
              <button class="btn-alta-pac text-[11px] px-3 py-1.5 rounded border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium" data-id="${i.id}">
                <i class="ti ti-door-exit text-xs"></i> Registrar Desfecho
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

function bindCards(filtrados, todos) {
  document.querySelectorAll('.alta-row, .btn-alta-pac').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation()
      const id = el.dataset.id
      const internacao = todos.find(i => i.id === id)
      if (!internacao) return
      router.navigate('alta', {
        leito: internacao.leito,
        internacao: internacao,
      })
    })
  })
}
