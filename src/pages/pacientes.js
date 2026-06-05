// src/pages/pacientes.js
import { getPacientes, getPaciente, getHistoricoInternacoes, criarPaciente, atualizarPaciente, calcularIdade, formatarCPF, formatarTelefone } from '../services/pacientes.js'
import { setNavAtivo } from '../components/sidebar.js'
import { router } from '../router.js'

let todosPacientes = []
let pacienteSelecionado = null
let modoEdicao = false

export async function init(container, params = {}) {
  setNavAtivo('pacientes')
  if (params.paciente_id) {
    await mostrarPerfil(container, params.paciente_id)
  } else {
    await mostrarListagem(container)
  }
}

// ── LISTAGEM ──────────────────────────────────────────────────
async function mostrarListagem(container) {
  container.innerHTML = `
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900">Pacientes</h1>
        <button id="btn-novo" class="btn btn-primary"><i class="ti ti-plus text-sm"></i> Novo Paciente</button>
      </div>
      <div class="px-5 py-3 bg-white border-b border-gray-100 flex gap-3 flex-shrink-0">
        <div class="relative flex-1 max-w-sm">
          <i class="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input id="busca" type="text" placeholder="Buscar por nome, CPF ou código SUS..." class="field pl-9 w-full text-xs">
        </div>
        <select id="filtro-sexo" class="field text-xs w-36">
          <option value="">Todos os sexos</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
      <div class="px-5 py-2 flex-shrink-0">
        <span id="contador" class="text-xs text-gray-400"></span>
      </div>
      <div id="lista-pacientes" class="flex-1 overflow-y-auto px-5 pb-5">
        <div class="flex justify-center py-10 text-gray-400">
          <i class="ti ti-loader-2 text-3xl animate-spin text-primary-500"></i>
        </div>
      </div>
    </div>

    <div id="modal-paciente" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div class="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 id="modal-titulo" class="text-[15px] font-semibold text-gray-900">Novo Paciente</h2>
          <button id="modal-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x text-lg"></i></button>
        </div>
        <div class="p-5 flex flex-col gap-5">
          <div>
            <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <i class="ti ti-user text-primary-500"></i> Dados Pessoais
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <label class="field-label">Nome completo *</label>
                <input id="f-nome" type="text" class="field" placeholder="Nome completo do paciente">
              </div>
              <div>
                <label class="field-label">Data de nascimento *</label>
                <input id="f-nascimento" type="date" class="field">
              </div>
              <div>
                <label class="field-label">Sexo *</label>
                <select id="f-sexo" class="field">
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label class="field-label">CPF</label>
                <input id="f-cpf" type="text" class="field" placeholder="000.000.000-00" maxlength="14">
              </div>
              <div>
                <label class="field-label">Código SUS</label>
                <input id="f-sus" type="text" class="field" placeholder="000 0000 0000 0000">
              </div>
            </div>
          </div>
          <div>
            <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <i class="ti ti-phone text-primary-500"></i> Contato
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="field-label">Telefone</label>
                <input id="f-telefone" type="text" class="field" placeholder="(00) 00000-0000" maxlength="15">
              </div>
              <div class="col-span-2">
                <label class="field-label">Endereço</label>
                <input id="f-endereco" type="text" class="field" placeholder="Rua, número, bairro, cidade">
              </div>
            </div>
          </div>
          <div>
            <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <i class="ti ti-urgent text-primary-500"></i> Contato de Emergência
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="field-label">Nome do responsável</label>
                <input id="f-emerg-nome" type="text" class="field" placeholder="Nome completo">
              </div>
              <div>
                <label class="field-label">Telefone do responsável</label>
                <input id="f-emerg-tel" type="text" class="field" placeholder="(00) 00000-0000" maxlength="15">
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button id="modal-cancelar" class="btn">Cancelar</button>
          <button id="modal-salvar" class="btn btn-primary"><i class="ti ti-check text-sm"></i> Salvar Paciente</button>
        </div>
      </div>
    </div>
  `

  bindListagem()
  await carregarPacientes()
}

function bindListagem() {
  document.getElementById('btn-novo').addEventListener('click', () => abrirModal())
  document.getElementById('modal-fechar').addEventListener('click', fecharModal)
  document.getElementById('modal-cancelar').addEventListener('click', fecharModal)
  document.getElementById('modal-salvar').addEventListener('click', salvarPaciente)
  document.getElementById('busca').addEventListener('input', e => renderLista(e.target.value.toLowerCase(), document.getElementById('filtro-sexo').value))
  document.getElementById('filtro-sexo').addEventListener('change', e => renderLista(document.getElementById('busca').value.toLowerCase(), e.target.value))

  document.getElementById('f-cpf').addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11)
    v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    e.target.value = v
  })
  ;['f-telefone','f-emerg-tel'].forEach(id => {
    document.getElementById(id).addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 11)
      if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
      else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2')
      e.target.value = v
    })
  })
}

async function carregarPacientes() {
  try {
    todosPacientes = await getPacientes()
    renderLista('', '')
  } catch (err) {
    document.getElementById('lista-pacientes').innerHTML =
      `<div class="alert alert-red mt-4"><i class="ti ti-alert-circle"></i> Erro: ${err.message}</div>`
  }
}

function renderLista(busca, sexo) {
  const filtrados = todosPacientes.filter(p => {
    const okB = !busca || p.nome?.toLowerCase().includes(busca) || p.cpf?.includes(busca) || p.codigo_sus?.includes(busca)
    const okS = !sexo || p.sexo === sexo
    return okB && okS
  })

  document.getElementById('contador').textContent =
    `${filtrados.length} paciente${filtrados.length !== 1 ? 's' : ''} encontrado${filtrados.length !== 1 ? 's' : ''}`

  if (!filtrados.length) {
    document.getElementById('lista-pacientes').innerHTML = `
      <div class="text-center text-gray-400 py-12 text-sm">
        <i class="ti ti-users text-4xl block mb-2"></i>Nenhum paciente encontrado.
      </div>`
    return
  }

  document.getElementById('lista-pacientes').innerHTML = `
    <table class="data-table mt-1">
      <thead><tr>
        <th>Nome</th><th>Idade</th><th>Sexo</th><th>CPF</th><th>Código SUS</th><th>Telefone</th><th class="text-right">Ações</th>
      </tr></thead>
      <tbody>
        ${filtrados.map(p => `
          <tr class="hover:bg-gray-50 cursor-pointer" data-id="${p.id}">
            <td>
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 text-[11px] font-bold flex-shrink-0">${p.nome?.charAt(0) || '?'}</div>
                <span class="font-medium text-gray-800">${p.nome}</span>
              </div>
            </td>
            <td class="text-gray-600">${calcularIdade(p.data_nascimento)}</td>
            <td class="text-gray-600">${p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Feminino' : p.sexo || '—'}</td>
            <td class="text-gray-500 font-mono text-[11px]">${formatarCPF(p.cpf)}</td>
            <td class="text-gray-500 font-mono text-[11px]">${p.codigo_sus || '—'}</td>
            <td class="text-gray-600">${formatarTelefone(p.telefone)}</td>
            <td class="text-right">
              <div class="flex gap-1 justify-end">
                <button class="btn-perfil text-[11px] px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" data-id="${p.id}"><i class="ti ti-eye text-xs"></i> Ver</button>
                <button class="btn-editar text-[11px] px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50" data-id="${p.id}"><i class="ti ti-pencil text-xs"></i></button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`

  document.querySelectorAll('.btn-perfil').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); router.navigate('pacientes', { paciente_id: btn.dataset.id }) }))
  document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); abrirModal(btn.dataset.id) }))
  document.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => router.navigate('pacientes', { paciente_id: tr.dataset.id })))
}

// ── MODAL ─────────────────────────────────────────────────────
function abrirModal(id = null) {
  modoEdicao = !!id
  document.getElementById('modal-titulo').textContent = id ? 'Editar Paciente' : 'Novo Paciente'
  document.getElementById('modal-paciente').classList.remove('hidden')
  if (id) {
    const p = todosPacientes.find(x => x.id === id)
    if (!p) return
    pacienteSelecionado = p
    document.getElementById('f-nome').value = p.nome || ''
    document.getElementById('f-nascimento').value = p.data_nascimento || ''
    document.getElementById('f-sexo').value = p.sexo || ''
    document.getElementById('f-cpf').value = formatarCPF(p.cpf) !== '—' ? formatarCPF(p.cpf) : ''
    document.getElementById('f-sus').value = p.codigo_sus || ''
    document.getElementById('f-telefone').value = formatarTelefone(p.telefone) !== '—' ? formatarTelefone(p.telefone) : ''
    document.getElementById('f-endereco').value = p.endereco || ''
    document.getElementById('f-emerg-nome').value = p.contato_emergencia_nome || ''
    document.getElementById('f-emerg-tel').value = formatarTelefone(p.contato_emergencia_tel) !== '—' ? formatarTelefone(p.contato_emergencia_tel) : ''
  } else {
    pacienteSelecionado = null
    ;['f-nome','f-nascimento','f-sexo','f-cpf','f-sus','f-telefone','f-endereco','f-emerg-nome','f-emerg-tel'].forEach(i => { document.getElementById(i).value = '' })
  }
}

function fecharModal() { document.getElementById('modal-paciente').classList.add('hidden') }

async function salvarPaciente() {
  const nome = document.getElementById('f-nome').value.trim()
  const nascimento = document.getElementById('f-nascimento').value
  const sexo = document.getElementById('f-sexo').value
  if (!nome || !nascimento || !sexo) { alert('Preencha os campos obrigatórios: Nome, Data de nascimento e Sexo.'); return }

  const dados = {
    nome, data_nascimento: nascimento, sexo,
    cpf: document.getElementById('f-cpf').value.replace(/\D/g,'') || null,
    codigo_sus: document.getElementById('f-sus').value.replace(/\D/g,'') || null,
    telefone: document.getElementById('f-telefone').value.replace(/\D/g,'') || null,
    endereco: document.getElementById('f-endereco').value.trim() || null,
    contato_emergencia_nome: document.getElementById('f-emerg-nome').value.trim() || null,
    contato_emergencia_tel: document.getElementById('f-emerg-tel').value.replace(/\D/g,'') || null,
  }

  const btn = document.getElementById('modal-salvar')
  btn.disabled = true
  btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Salvando...'
  try {
    if (modoEdicao && pacienteSelecionado) await atualizarPaciente(pacienteSelecionado.id, dados)
    else await criarPaciente(dados)
    fecharModal()
    await carregarPacientes()
  } catch (err) {
    alert('Erro ao salvar: ' + err.message)
  } finally {
    btn.disabled = false
    btn.innerHTML = '<i class="ti ti-check text-sm"></i> Salvar Paciente'
  }
}

// ── PERFIL ────────────────────────────────────────────────────
async function mostrarPerfil(container, id) {
  container.innerHTML = `<div class="flex justify-center items-center flex-1 h-full"><i class="ti ti-loader-2 text-3xl animate-spin text-primary-500"></i></div>`
  try {
    const [p, historico] = await Promise.all([getPaciente(id), getHistoricoInternacoes(id)])
    const atual = historico.find(i => i.ativo)

    container.innerHTML = `
      <div class="flex flex-col h-full overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
          <h1 class="text-base font-semibold text-gray-900">Perfil do Paciente</h1>
          <div class="flex gap-2">
            <button id="btn-voltar" class="btn"><i class="ti ti-arrow-left text-sm"></i> Pacientes</button>
            <button id="btn-editar-perfil" class="btn"><i class="ti ti-pencil text-sm"></i> Editar</button>
            ${atual ? `<button id="btn-pront" class="btn btn-primary"><i class="ti ti-file-text text-sm"></i> Ver Prontuário</button>` : ''}
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          <div class="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-5">
            <div class="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 text-2xl font-bold flex-shrink-0">${p.nome?.charAt(0) || '?'}</div>
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-1">
                <h2 class="text-lg font-bold text-gray-900">${p.nome}</h2>
                ${atual ? `<span class="badge badge-ocupado">Internado</span>` : `<span class="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Não internado</span>`}
              </div>
              <div class="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                ${pf('Idade', calcularIdade(p.data_nascimento))}
                ${pf('Nascimento', p.data_nascimento ? new Date(p.data_nascimento+'T12:00:00').toLocaleDateString('pt-BR') : '—')}
                ${pf('Sexo', p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Feminino' : p.sexo || '—')}
                ${pf('CPF', formatarCPF(p.cpf))}
                ${pf('Código SUS', p.codigo_sus || '—')}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="card">
              <div class="card-title flex items-center gap-1.5"><i class="ti ti-phone text-primary-500"></i> Contato</div>
              ${cc('Telefone', formatarTelefone(p.telefone))}
              ${cc('Endereço', p.endereco || '—')}
            </div>
            <div class="card">
              <div class="card-title flex items-center gap-1.5"><i class="ti ti-urgent text-primary-500"></i> Emergência</div>
              ${cc('Responsável', p.contato_emergencia_nome || '—')}
              ${cc('Telefone', formatarTelefone(p.contato_emergencia_tel))}
            </div>
          </div>

          ${atual ? `
            <div class="card border-l-4 border-l-red-400">
              <div class="card-title flex items-center gap-1.5"><i class="ti ti-bed text-red-400"></i> Internação Atual</div>
              <div class="flex flex-wrap gap-x-5 gap-y-2">
                ${cc('Leito', atual.leito?.codigo || '—')}
                ${cc('Setor', atual.leito?.setor || '—')}
                ${cc('Dias internado', atual.dias_internado + ' dias')}
                ${cc('Diagnóstico', atual.diagnostico || '—')}
              </div>
            </div>` : ''}

          <div class="card">
            <div class="card-title flex items-center gap-1.5">
              <i class="ti ti-history text-primary-500"></i> Histórico de Internações
              <span class="text-gray-400 font-normal normal-case">(${historico.length})</span>
            </div>
            ${!historico.length ? `<p class="text-sm text-gray-400">Nenhuma internação registrada.</p>` : `
              <table class="data-table">
                <thead><tr><th>Data</th><th>Leito</th><th>Setor</th><th>Diagnóstico</th><th>Dias</th><th>Desfecho</th></tr></thead>
                <tbody>
                  ${historico.map(i => `
                    <tr>
                      <td class="text-[11px]">${new Date(i.data_internacao).toLocaleDateString('pt-BR')}</td>
                      <td class="font-medium">${i.leito?.codigo || '—'}</td>
                      <td>${i.leito?.setor || '—'}</td>
                      <td class="max-w-[180px] truncate text-gray-600">${i.diagnostico || '—'}</td>
                      <td>${i.dias_internado}d</td>
                      <td>${i.ativo ? '<span class="badge badge-ocupado">Internado</span>' : dbadge(i.desfecho?.[0]?.tipo)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>`}
          </div>
        </div>
      </div>

      <!-- Modal edição embutido no perfil -->
      <div id="modal-paciente" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
          <div class="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 class="text-[15px] font-semibold text-gray-900">Editar Paciente</h2>
            <button id="modal-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x text-lg"></i></button>
          </div>
          <div class="p-5 flex flex-col gap-5">
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2"><label class="field-label">Nome completo *</label><input id="f-nome" type="text" class="field" value="${p.nome || ''}"></div>
              <div><label class="field-label">Data de nascimento *</label><input id="f-nascimento" type="date" class="field" value="${p.data_nascimento || ''}"></div>
              <div><label class="field-label">Sexo *</label>
                <select id="f-sexo" class="field">
                  <option value="">Selecione</option>
                  <option value="M" ${p.sexo==='M'?'selected':''}>Masculino</option>
                  <option value="F" ${p.sexo==='F'?'selected':''}>Feminino</option>
                  <option value="Outro" ${p.sexo==='Outro'?'selected':''}>Outro</option>
                </select>
              </div>
              <div><label class="field-label">CPF</label><input id="f-cpf" type="text" class="field" value="${formatarCPF(p.cpf) !== '—' ? formatarCPF(p.cpf) : ''}" maxlength="14"></div>
              <div><label class="field-label">Código SUS</label><input id="f-sus" type="text" class="field" value="${p.codigo_sus || ''}"></div>
              <div><label class="field-label">Telefone</label><input id="f-telefone" type="text" class="field" value="${formatarTelefone(p.telefone) !== '—' ? formatarTelefone(p.telefone) : ''}" maxlength="15"></div>
              <div class="col-span-2"><label class="field-label">Endereço</label><input id="f-endereco" type="text" class="field" value="${p.endereco || ''}"></div>
              <div><label class="field-label">Responsável emergência</label><input id="f-emerg-nome" type="text" class="field" value="${p.contato_emergencia_nome || ''}"></div>
              <div><label class="field-label">Tel. emergência</label><input id="f-emerg-tel" type="text" class="field" value="${formatarTelefone(p.contato_emergencia_tel) !== '—' ? formatarTelefone(p.contato_emergencia_tel) : ''}" maxlength="15"></div>
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
            <button id="modal-cancelar" class="btn">Cancelar</button>
            <button id="modal-salvar" class="btn btn-primary"><i class="ti ti-check text-sm"></i> Salvar</button>
          </div>
        </div>
      </div>
    `

    document.getElementById('btn-voltar').addEventListener('click', () => router.navigate('pacientes'))
    document.getElementById('btn-pront')?.addEventListener('click', () => router.navigate('prontuario', { internacao_id: atual.id, leito_id: atual.leito_id }))

    document.getElementById('btn-editar-perfil').addEventListener('click', () => {
      document.getElementById('modal-paciente').classList.remove('hidden')
    })
    document.getElementById('modal-fechar').addEventListener('click', () => document.getElementById('modal-paciente').classList.add('hidden'))
    document.getElementById('modal-cancelar').addEventListener('click', () => document.getElementById('modal-paciente').classList.add('hidden'))
    document.getElementById('modal-salvar').addEventListener('click', async () => {
      const nome = document.getElementById('f-nome').value.trim()
      const nasc = document.getElementById('f-nascimento').value
      const sexo = document.getElementById('f-sexo').value
      if (!nome || !nasc || !sexo) { alert('Preencha os campos obrigatórios.'); return }
      const btn = document.getElementById('modal-salvar')
      btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Salvando...'
      try {
        await atualizarPaciente(id, {
          nome, data_nascimento: nasc, sexo,
          cpf: document.getElementById('f-cpf').value.replace(/\D/g,'') || null,
          codigo_sus: document.getElementById('f-sus').value.replace(/\D/g,'') || null,
          telefone: document.getElementById('f-telefone').value.replace(/\D/g,'') || null,
          endereco: document.getElementById('f-endereco').value.trim() || null,
          contato_emergencia_nome: document.getElementById('f-emerg-nome').value.trim() || null,
          contato_emergencia_tel: document.getElementById('f-emerg-tel').value.replace(/\D/g,'') || null,
        })
        await mostrarPerfil(container, id)
      } catch (err) {
        alert('Erro: ' + err.message)
        btn.disabled = false; btn.innerHTML = '<i class="ti ti-check text-sm"></i> Salvar'
      }
    })

  } catch (err) {
    container.innerHTML = `<div class="p-5"><div class="alert alert-red"><i class="ti ti-alert-circle"></i> Erro: ${err.message}</div></div>`
  }
}

const pf = (l,v) => `<div class="flex flex-col"><span class="pf-label">${l}</span><span class="pf-val">${v}</span></div>`
const cc = (l,v) => `<div class="mb-2"><span class="text-[11px] text-gray-400 uppercase tracking-wide">${l}</span><div class="text-[12.5px] font-medium text-gray-700 mt-0.5">${v}</div></div>`
const dbadge = t => ({'alta':'<span class="badge badge-disponivel">Alta</span>','transferencia':'<span class="badge badge-reservado">Transferência</span>','evasao':'<span class="badge badge-limpeza">Evasão</span>','obito':'<span class="badge badge-manutencao">Óbito</span>'}[t] || '<span class="text-gray-400 text-[11px]">—</span>')
