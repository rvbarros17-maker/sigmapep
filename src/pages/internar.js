// src/pages/internar.js
import { supabase } from '../services/supabase.js'
import { router } from '../router.js'
import { calcularIdade } from '../services/pacientes.js'

export async function init(container, params = {}) {
  const leito_id = params.leito_id

  if (!leito_id || leito_id === 'null') {
    container.innerHTML = `<div class="p-5"><div class="alert alert-red"><i class="ti ti-alert-circle"></i> Nenhum leito selecionado. <button class="underline ml-2" id="btn-err-voltar">Voltar</button></div></div>`
    document.getElementById('btn-err-voltar').addEventListener('click', () => router.navigate('leitos'))
    return
  }

  container.innerHTML = `<div class="flex justify-center items-center flex-1 h-full"><i class="ti ti-loader-2 text-3xl animate-spin text-primary-500"></i></div>`

  try {
    // Carrega leito e lista de pacientes
    const [{ data: leito, error: e1 }, { data: pacientes, error: e2 }] = await Promise.all([
      supabase.from('leitos').select('*').eq('id', leito_id).single(),
      supabase.from('pacientes').select('id, nome, data_nascimento, codigo_sus').order('nome'),
    ])
    if (e1) throw e1
    if (e2) throw e2

    renderForm(container, leito, pacientes)
  } catch (err) {
    container.innerHTML = `<div class="p-5"><div class="alert alert-red"><i class="ti ti-alert-circle"></i> Erro: ${err.message}</div></div>`
  }
}

function renderForm(container, leito, pacientes) {
  container.innerHTML = `
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900">Internar Paciente</h1>
        <button id="btn-voltar" class="btn"><i class="ti ti-arrow-left text-sm"></i> Painel de Leitos</button>
      </div>

      <div class="flex items-center gap-1.5 px-5 pt-3 text-xs text-gray-400 flex-shrink-0">
        <span class="text-primary-500 cursor-pointer hover:underline" id="bread-inicio">Painel de Leitos</span>
        <i class="ti ti-chevron-right text-xs"></i>
        <span class="text-gray-600">Internar em ${leito.codigo}</span>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4">

        <!-- Info leito -->
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
            <i class="ti ti-bed text-xl"></i>
          </div>
          <div>
            <div class="font-bold text-gray-800">Leito ${leito.codigo}</div>
            <div class="text-xs text-gray-500">${leito.setor} · <span class="text-green-600 font-medium">Disponível</span></div>
          </div>
        </div>

        <!-- Seleção de paciente -->
        <div class="card mb-3">
          <div class="card-title flex items-center gap-1.5"><i class="ti ti-user-search text-primary-500"></i> Paciente</div>
          <div class="flex gap-2 mb-3">
            <div class="relative flex-1">
              <i class="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input id="busca-pac" type="text" placeholder="Buscar paciente por nome ou código SUS..." class="field pl-9 text-xs w-full">
            </div>
            <button id="btn-novo-pac" class="btn btn-primary whitespace-nowrap">
              <i class="ti ti-plus text-sm"></i> Novo Paciente
            </button>
          </div>

          <!-- Lista de pacientes -->
          <div id="lista-pac" class="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
            ${pacientes.map(p => `
              <div class="pac-item flex items-center gap-3 px-3 py-2.5 hover:bg-primary-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors" data-id="${p.id}" data-nome="${p.nome}">
                <div class="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 text-[11px] font-bold flex-shrink-0">${p.nome?.charAt(0)||'?'}</div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-gray-800 text-[12.5px]">${p.nome}</div>
                  <div class="text-[11px] text-gray-400">${calcularIdade(p.data_nascimento)} · SUS: ${p.codigo_sus||'—'}</div>
                </div>
                <i class="ti ti-chevron-right text-gray-300 text-sm"></i>
              </div>`).join('')}
          </div>

          <!-- Paciente selecionado -->
          <div id="pac-selecionado" class="hidden mt-3 bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0" id="pac-sel-inicial">?</div>
            <div class="flex-1">
              <div class="font-semibold text-gray-800" id="pac-sel-nome">—</div>
              <div class="text-[11px] text-gray-500">Paciente selecionado</div>
            </div>
            <button id="btn-trocar-pac" class="text-xs text-primary-500 hover:underline">Trocar</button>
          </div>
          <input type="hidden" id="pac-id">
        </div>

        <!-- Dados da internação -->
        <div class="card mb-3">
          <div class="card-title flex items-center gap-1.5"><i class="ti ti-clipboard-text text-primary-500"></i> Dados da Internação</div>
          <div class="flex flex-col gap-3">
            <div>
              <label class="field-label">Diagnóstico / Motivo de internação *</label>
              <textarea id="int-diagnostico" class="field text-[12.5px]" rows="2" placeholder="Diagnóstico principal ou motivo da internação..."></textarea>
            </div>
            <div>
              <label class="field-label">Observações do leito</label>
              <input id="int-obs" type="text" class="field text-[12.5px]" placeholder="Ex: Isolamento de contato, oxigênio, dreno torácico...">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="field-label">Data de internação</label>
                <input id="int-data" type="date" class="field text-[12.5px]" value="${new Date().toISOString().split('T')[0]}">
              </div>
              <div>
                <label class="field-label">Médico responsável *</label>
                <input id="int-medico" type="text" class="field text-[12.5px]" placeholder="Nome do médico">
              </div>
            </div>
          </div>
        </div>

        <!-- Botões -->
        <div class="flex justify-end gap-2 pb-4">
          <button id="btn-cancelar" class="btn">Cancelar</button>
          <button id="btn-internar" class="btn btn-primary px-6">
            <i class="ti ti-check text-sm"></i> Confirmar Internação
          </button>
        </div>

      </div>
    </div>

    <!-- Modal novo paciente rápido -->
    <div id="modal-novo-pac" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Cadastro Rápido de Paciente</h3>
          <button id="modal-pac-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x"></i></button>
        </div>
        <div class="p-4 grid grid-cols-2 gap-3">
          <div class="col-span-2"><label class="field-label">Nome completo *</label><input id="np-nome" type="text" class="field" placeholder="Nome completo"></div>
          <div><label class="field-label">Data de nascimento *</label><input id="np-nasc" type="date" class="field"></div>
          <div><label class="field-label">Sexo *</label>
            <select id="np-sexo" class="field">
              <option value="">Selecione</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div><label class="field-label">CPF</label><input id="np-cpf" type="text" class="field" placeholder="000.000.000-00" maxlength="14"></div>
          <div><label class="field-label">Código SUS</label><input id="np-sus" type="text" class="field" placeholder="000 0000 0000 0000"></div>
          <div><label class="field-label">Telefone</label><input id="np-tel" type="text" class="field" placeholder="(00) 00000-0000" maxlength="15"></div>
          <div><label class="field-label">Contato emergência</label><input id="np-emerg" type="text" class="field" placeholder="Nome do responsável"></div>
        </div>
        <div class="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button id="modal-pac-cancelar" class="btn">Cancelar</button>
          <button id="modal-pac-salvar" class="btn btn-primary"><i class="ti ti-plus text-sm"></i> Cadastrar e Selecionar</button>
        </div>
      </div>
    </div>
  `

  let pacienteSelecionadoId = null

  // Seleção de paciente
  function selecionarPaciente(id, nome) {
    pacienteSelecionadoId = id
    document.getElementById('pac-id').value = id
    document.getElementById('pac-sel-nome').textContent = nome
    document.getElementById('pac-sel-inicial').textContent = nome.charAt(0)
    document.getElementById('pac-selecionado').classList.remove('hidden')
    document.getElementById('lista-pac').classList.add('hidden')
    document.getElementById('busca-pac').classList.add('hidden')
    document.getElementById('btn-novo-pac').classList.add('hidden')
  }

  document.querySelectorAll('.pac-item').forEach(el => {
    el.addEventListener('click', () => selecionarPaciente(el.dataset.id, el.dataset.nome))
  })

  document.getElementById('btn-trocar-pac').addEventListener('click', () => {
    pacienteSelecionadoId = null
    document.getElementById('pac-selecionado').classList.add('hidden')
    document.getElementById('lista-pac').classList.remove('hidden')
    document.getElementById('busca-pac').classList.remove('hidden')
    document.getElementById('btn-novo-pac').classList.remove('hidden')
  })

  // Busca
  document.getElementById('busca-pac').addEventListener('input', e => {
    const t = e.target.value.toLowerCase()
    document.querySelectorAll('.pac-item').forEach(el => {
      el.style.display = el.dataset.nome.toLowerCase().includes(t) ? '' : 'none'
    })
  })

  // Voltar
  document.getElementById('btn-voltar').addEventListener('click', () => router.navigate('leitos'))
  document.getElementById('bread-inicio').addEventListener('click', () => router.navigate('leitos'))
  document.getElementById('btn-cancelar').addEventListener('click', () => router.navigate('leitos'))

  // Modal novo paciente
  const modalNovoPac = document.getElementById('modal-novo-pac')
  document.getElementById('btn-novo-pac').addEventListener('click', () => {
    modalNovoPac.classList.remove('hidden')
    setTimeout(() => document.getElementById('np-nome').focus(), 50)
  })
  document.getElementById('modal-pac-fechar').addEventListener('click', () => modalNovoPac.classList.add('hidden'))
  document.getElementById('modal-pac-cancelar').addEventListener('click', () => modalNovoPac.classList.add('hidden'))

  // Máscara CPF
  document.getElementById('np-cpf').addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g,'').slice(0,11)
    v = v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2')
    e.target.value = v
  })

  document.getElementById('modal-pac-salvar').addEventListener('click', async () => {
    const nome = document.getElementById('np-nome').value.trim()
    const nasc = document.getElementById('np-nasc').value
    const sexo = document.getElementById('np-sexo').value
    if (!nome || !nasc || !sexo) { alert('Preencha nome, data de nascimento e sexo.'); return }

    const btn = document.getElementById('modal-pac-salvar')
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Salvando...'
    try {
      const { data: novoPac, error } = await supabase.from('pacientes').insert({
        nome, data_nascimento: nasc, sexo,
        cpf: document.getElementById('np-cpf').value.replace(/\D/g,'')||null,
        codigo_sus: document.getElementById('np-sus').value.replace(/\D/g,'')||null,
        telefone: document.getElementById('np-tel').value.replace(/\D/g,'')||null,
        contato_emergencia_nome: document.getElementById('np-emerg').value.trim()||null,
      }).select().single()
      if (error) throw error

      modalNovoPac.classList.add('hidden')
      selecionarPaciente(novoPac.id, novoPac.nome)
    } catch (err) {
      alert('Erro ao cadastrar: ' + err.message)
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-plus text-sm"></i> Cadastrar e Selecionar'
    }
  })

  // Confirmar internação
  document.getElementById('btn-internar').addEventListener('click', async () => {
    if (!pacienteSelecionadoId) { alert('Selecione um paciente.'); return }
    const diagnostico = document.getElementById('int-diagnostico').value.trim()
    const medico = document.getElementById('int-medico').value.trim()
    if (!diagnostico) { alert('Informe o diagnóstico / motivo de internação.'); return }
    if (!medico) { alert('Informe o médico responsável.'); return }

    const btn = document.getElementById('btn-internar')
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Internando...'

    try {
      const dataInt = document.getElementById('int-data').value
      const obs = document.getElementById('int-obs').value.trim()

      // Cria internação
      const { error: e1 } = await supabase.from('internacoes').insert({
        paciente_id: pacienteSelecionadoId,
        leito_id: leito.id,
        diagnostico,
        observacoes: obs || null,
        data_internacao: dataInt ? new Date(dataInt).toISOString() : new Date().toISOString(),
        ativo: true,
      })
      if (e1) throw e1

      // Atualiza status do leito
      const { error: e2 } = await supabase.from('leitos')
        .update({ status: 'ocupado', updated_at: new Date().toISOString() })
        .eq('id', leito.id)
      if (e2) throw e2

      router.navigate('leitos')
    } catch (err) {
      alert('Erro ao internar: ' + err.message)
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-check text-sm"></i> Confirmar Internação'
    }
  })
}
