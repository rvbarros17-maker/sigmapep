// src/pages/alta.js
import { supabase } from '../services/supabase.js'
import { setNavAtivo } from '../components/sidebar.js'
import { router } from '../router.js'
import { calcularIdade } from '../services/pacientes.js'

let leitoAtual = null
let internacaoAtual = null
let tipoSelecionado = null

export async function init(container, params = {}) {
  setNavAtivo('lista-alta')
  leitoAtual = params.leito
  internacaoAtual = params.internacao
  tipoSelecionado = null

  if (!leitoAtual || !internacaoAtual) {
    container.innerHTML = `<div class="p-5"><div class="alert alert-red"><i class="ti ti-alert-circle"></i> Parâmetros inválidos. <button class="underline ml-2" id="btn-err-voltar">Voltar</button></div></div>`
    document.getElementById('btn-err-voltar').addEventListener('click', () => router.navigate('leitos'))
    return
  }

  // Garante que paciente e leito estão carregados
  if (!internacaoAtual.paciente && internacaoAtual.paciente_id) {
    const { data: pac } = await supabase.from('pacientes').select('*').eq('id', internacaoAtual.paciente_id).single()
    if (pac) internacaoAtual.paciente = pac
  }
  if (!leitoAtual.setor && leitoAtual.id) {
    const { data: l } = await supabase.from('leitos').select('*').eq('id', leitoAtual.id).single()
    if (l) leitoAtual = l
  }

  const p = internacaoAtual.paciente || {}
  const hoje = new Date().toISOString().split('T')[0]
  const agora = new Date().toTimeString().slice(0,5)
  const dias = internacaoAtual.data_internacao
    ? Math.floor((Date.now() - new Date(internacaoAtual.data_internacao)) / 86400000)
    : 0

  container.innerHTML = `
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900">Alta / Desfecho</h1>
        <div class="flex gap-2">
          <button id="btn-voltar" class="btn"><i class="ti ti-arrow-left text-sm"></i> Painel de Leitos</button>
          <button id="btn-imprimir" class="btn hidden"><i class="ti ti-printer text-sm"></i> Imprimir</button>
        </div>
      </div>

      <div class="flex items-center gap-1.5 px-5 pt-3 text-xs text-gray-400 flex-shrink-0">
        <span class="text-primary-500 cursor-pointer hover:underline" id="bread-inicio">Painel de Leitos</span>
        <i class="ti ti-chevron-right text-xs"></i>
        <span class="text-gray-600">${leitoAtual.codigo} · ${p.nome}</span>
        <i class="ti ti-chevron-right text-xs"></i>
        <span class="text-gray-600">Alta / Desfecho</span>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4">

        <!-- Banner paciente -->
        <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 mb-5">
          <div class="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 text-xl font-bold flex-shrink-0">${p.nome?.charAt(0)||'?'}</div>
          <div class="flex-1">
            <div class="text-[15px] font-bold text-gray-900 mb-1">${p.nome}</div>
            <div class="flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-gray-500">
              <span><i class="ti ti-bed text-xs mr-1"></i>${leitoAtual.codigo}</span>
              <span><i class="ti ti-building-hospital text-xs mr-1"></i>${leitoAtual.setor}</span>
              ${p.data_nascimento ? `<span><i class="ti ti-user text-xs mr-1"></i>${calcularIdade(p.data_nascimento)}</span>` : ''}
              <span><i class="ti ti-clock text-xs mr-1"></i>${dias} dias internado</span>
              ${internacaoAtual.diagnostico ? `<span><i class="ti ti-stethoscope text-xs mr-1"></i>${internacaoAtual.diagnostico}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Seletor de tipo -->
        <div class="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Tipo de desfecho</div>
        <div class="grid grid-cols-4 gap-3 mb-5">
          ${tipoCard('alta',          '🏠', 'Alta Hospitalar',  'Paciente liberado para casa',       '#1a9e6a', '#f0fdf4')}
          ${tipoCard('transferencia', '🚑', 'Transferência',    'Encaminhamento a outra unidade',    '#2563eb', '#eff6ff')}
          ${tipoCard('evasao',        '🚪', 'Evasão',           'Saída sem autorização médica',       '#d97706', '#fffbeb')}
          ${tipoCard('sad',           '🏡', 'Alta SAD',         'Serviço de Atendimento Domiciliar',  '#7c3aed', '#f5f3ff')}
          ${tipoCard('obito',         '🕊️', 'Óbito',            'Registro de falecimento',            '#6b7280', '#f9fafb')}
        </div>

        <!-- Formulários (hidden por padrão) -->
        <div id="form-alta" class="hidden">${formAlta(hoje, agora, internacaoAtual.diagnostico)}</div>
        <div id="form-transferencia" class="hidden">${formTransferencia(hoje, agora, internacaoAtual.diagnostico)}</div>
        <div id="form-evasao" class="hidden">${formEvasao(hoje, agora, internacaoAtual.diagnostico)}</div>
        <div id="form-sad" class="hidden">${formSAD(hoje, agora, internacaoAtual.diagnostico)}</div>
        <div id="form-obito" class="hidden">${formObito(hoje, agora)}</div>

      </div>
    </div>
  `

  injetarEstilos()
  document.getElementById('btn-voltar').addEventListener('click', () => router.navigate('leitos'))
  document.getElementById('bread-inicio').addEventListener('click', () => router.navigate('leitos'))
  document.getElementById('btn-imprimir').addEventListener('click', () => window.print())

  document.querySelectorAll('.tipo-card').forEach(card => {
    card.addEventListener('click', () => {
      tipoSelecionado = card.dataset.tipo
      document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('selected'))
      card.classList.add('selected')
      document.querySelectorAll('[id^="form-"]').forEach(f => f.classList.add('hidden'))
      document.getElementById('form-' + tipoSelecionado).classList.remove('hidden')
      document.getElementById('btn-imprimir').classList.remove('hidden')
      setTimeout(() => document.getElementById('form-' + tipoSelecionado).scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    })
  })

  // Bind botões confirmar
  document.getElementById('btn-confirmar-alta')?.addEventListener('click', () => confirmar('alta'))
  document.getElementById('btn-confirmar-transferencia')?.addEventListener('click', () => confirmar('transferencia'))
  document.getElementById('btn-confirmar-evasao')?.addEventListener('click', () => confirmar('evasao'))
  document.getElementById('btn-confirmar-sad')?.addEventListener('click', () => confirmar('sad'))
  document.getElementById('btn-confirmar-obito')?.addEventListener('click', () => confirmar('obito'))
}

function tipoCard(id, icon, label, desc, cor, bg) {
  return `
    <div class="tipo-card" data-tipo="${id}" style="--tc:${cor};--tbg:${bg}">
      <div class="text-2xl mb-1.5">${icon}</div>
      <div class="text-[13px] font-semibold text-gray-700">${label}</div>
      <div class="text-[11px] text-gray-400 mt-0.5">${desc}</div>
    </div>`
}

function secao(titulo, icon, conteudo) {
  return `
    <div class="card mb-3">
      <div class="card-title flex items-center gap-1.5"><i class="ti ${icon} text-primary-500"></i>${titulo}</div>
      ${conteudo}
    </div>`
}

function grid2(...fields) { return `<div class="grid grid-cols-2 gap-3">${fields.join('')}</div>` }
function grid3(...fields) { return `<div class="grid grid-cols-3 gap-3">${fields.join('')}</div>` }
function field(label, id, type='text', placeholder='', value='', extra='') {
  return `<div><label class="field-label">${label}</label><input id="${id}" type="${type}" class="field text-[12.5px]" placeholder="${placeholder}" value="${value}" ${extra}></div>`
}
function fieldSelect(label, id, options) {
  return `<div><label class="field-label">${label}</label><select id="${id}" class="field text-[12.5px]">${options.map(o => `<option>${o}</option>`).join('')}</select></div>`
}
function fieldTextarea(label, id, rows=3, placeholder='', value='') {
  return `<div><label class="field-label">${label}</label><textarea id="${id}" class="field text-[12.5px]" rows="${rows}" placeholder="${placeholder}">${value}</textarea></div>`
}
function rodape(btnId, btnLabel, btnCor, tipo) {
  return `
    <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-end justify-between mt-3">
      <div>
        <p class="text-[11px] text-gray-400 mb-1">Médico responsável</p>
        <div id="${tipo}-sign-nome" class="text-[13px] font-bold text-gray-800">—</div>
      </div>
      <div class="flex gap-2">
        <button class="btn" onclick="window.print()"><i class="ti ti-printer text-sm"></i> Imprimir</button>
        <button id="${btnId}" class="btn text-white font-semibold px-5" style="background:${btnCor};border-color:${btnCor}">${btnLabel}</button>
      </div>
    </div>`
}
function medicoField(tipo) {
  return `${grid2(
    field('Médico responsável *', `${tipo}-medico`, 'text', 'Nome do médico'),
    field('CRM', `${tipo}-crm`, 'text', 'CRM/UF 00000')
  )}`
}

function formAlta(hoje, agora, diag) {
  return `
    <div class="alert alert-blue mb-3"><i class="ti ti-info-circle text-sm flex-shrink-0"></i> O leito será liberado para limpeza automaticamente após a confirmação.</div>
    ${secao('Dados da Alta', 'ti-calendar-check', grid3(
      field('Data da alta', 'ah-data', 'date', '', hoje),
      field('Hora da alta', 'ah-hora', 'time', '', agora),
      fieldSelect('Tipo de alta', 'ah-tipo', ['A pedido','Melhorada','Curada','Transferência interna','Outros'])
    ))}
    ${secao('Resumo de Alta', 'ti-file-description',
      grid2(
        field('Diagnóstico final', 'ah-diagfinal', 'text', 'Diagnóstico na alta', diag||''),
        fieldSelect('Condições de saída', 'ah-condicao', ['Estável','Melhorado','Inalterado','Com sequelas'])
      ) +
      `<div class="mt-3">` + fieldTextarea('Orientações ao paciente', 'ah-orientacoes', 3, 'Orientações de alta, retorno ambulatorial, medicações em uso...') + `</div>` +
      `<div class="mt-3">` + fieldTextarea('Observações gerais', 'ah-obs', 2, 'Observações adicionais...') + `</div>`
    )}
    ${secao('Prescrição de Saída', 'ti-pill',
      grid2(
        fieldTextarea('Medicamentos prescritos na alta', 'ah-meds', 3, 'Ex: Amoxicilina 500mg 8/8h por 7 dias'),
        fieldTextarea('Retorno / acompanhamento', 'ah-retorno', 3, 'Ex: Retorno com clínico em 7 dias')
      )
    )}
    <div class="card mb-3">${medicoField('ah')}</div>
    ${rodape('btn-confirmar-alta','<i class="ti ti-check mr-1"></i> Confirmar Alta','#1a9e6a','ah')}
  `
}

function formTransferencia(hoje, agora, diag) {
  return `
    <div class="alert alert-blue mb-3"><i class="ti ti-info-circle text-sm flex-shrink-0"></i> O leito será liberado e o paciente removido do censo ativo após a confirmação.</div>
    ${secao('Dados da Transferência', 'ti-calendar-check', grid3(
      field('Data', 'tr-data', 'date', '', hoje),
      field('Hora', 'tr-hora', 'time', '', agora),
      fieldSelect('Meio de transporte', 'tr-transporte', ['SAMU','UTI Móvel','Ambulância simples','Veículo próprio','Outros'])
    ))}
    ${secao('Destino', 'ti-building-hospital',
      grid2(
        field('Hospital / Unidade de destino', 'tr-destino', 'text', 'Nome do hospital'),
        field('Cidade de destino', 'tr-cidade', 'text', 'Cidade')
      ) + `<div class="mt-3">` +
      grid2(
        field('Setor de destino', 'tr-setor', 'text', 'Ex: UTI, Clínica Médica'),
        fieldSelect('Motivo da transferência', 'tr-motivo', ['Necessidade de UTI','Cirurgia de alta complexidade','Solicitação do paciente/família','Falta de vagas','Outros'])
      ) + `</div>`
    )}
    ${secao('Resumo Clínico', 'ti-file-description',
      grid2(
        field('Diagnóstico de saída', 'tr-diag', 'text', 'Diagnóstico principal', diag||''),
        fieldSelect('Condições na transferência', 'tr-condicao', ['Estável','Grave','Crítico','Intubado'])
      ) + `<div class="mt-3">` +
      fieldTextarea('Resumo clínico para a unidade de destino', 'tr-resumo', 3, 'Histórico relevante, evolução e condutas realizadas...') +
      `</div><div class="mt-3">` +
      fieldTextarea('Medicações em uso', 'tr-meds', 2, 'Liste os medicamentos em uso...') + `</div>`
    )}
    <div class="card mb-3">${medicoField('tr')}</div>
    ${rodape('btn-confirmar-transferencia','<i class="ti ti-ambulance mr-1"></i> Confirmar Transferência','#2563eb','tr')}
  `
}

function formEvasao(hoje, agora, diag) {
  return `
    <div class="alert alert-amber mb-3"><i class="ti ti-alert-triangle text-sm flex-shrink-0"></i> Evasão ocorre quando o paciente abandona a internação sem autorização médica. Registre os dados para fins legais.</div>
    ${secao('Dados da Evasão', 'ti-calendar-exclamation', grid3(
      field('Data constatada', 'ev-data', 'date', '', hoje),
      field('Hora constatada', 'ev-hora', 'time', '', agora),
      field('Constatado por', 'ev-quem', 'text', 'Nome do profissional')
    ))}
    ${secao('Ocorrência', 'ti-notes',
      grid2(
        field('Diagnóstico no momento', 'ev-diag', 'text', 'Diagnóstico principal', diag||''),
        fieldSelect('Condição clínica', 'ev-condicao', ['Estável','Com risco','Grave'])
      ) + `<div class="mt-3">` +
      fieldTextarea('Descrição da ocorrência', 'ev-descricao', 3, 'Descreva as circunstâncias da evasão...') +
      `</div><div class="mt-3">` +
      grid2(
        fieldSelect('Familiar notificado?', 'ev-notificado', ['Sim','Não','Não localizado']),
        field('Nome do familiar / responsável', 'ev-familiar', 'text', 'Nome completo')
      ) + `</div><div class="mt-3">` +
      fieldTextarea('Medidas tomadas', 'ev-medidas', 2, 'Ex: Boletim de ocorrência, notificação à direção...') + `</div>`
    )}
    <div class="card mb-3">${medicoField('ev')}</div>
    ${rodape('btn-confirmar-evasao','<i class="ti ti-door-exit mr-1"></i> Registrar Evasão','#d97706','ev')}
  `
}

function formSAD(hoje, agora, diag) {
  return `
    <div class="alert mb-3" style="background:#f5f3ff;border:1px solid #ddd6fe;color:#6d28d9"><i class="ti ti-home-heart text-sm flex-shrink-0"></i> O paciente será encaminhado para acompanhamento pelo Serviço de Atendimento Domiciliar (SAD). O leito será liberado após confirmação.</div>
    ${secao('Dados da Alta SAD', 'ti-calendar-check', grid3(
      field('Data', 'sad-data', 'date', '', hoje),
      field('Hora', 'sad-hora', 'time', '', agora),
      fieldSelect('Condições de saída', 'sad-condicao', ['Estável','Melhorado','Com sequelas','Dependente de cuidados'])
    ))}
    ${secao('Resumo Clínico', 'ti-file-description',
      grid2(
        field('Diagnóstico final', 'sad-diagfinal', 'text', 'Diagnóstico na alta', diag||''),
        field('', 'sad-dummy', 'text', '', '', 'style="display:none"')
      ) +
      '<div class="mt-3">' + fieldTextarea('Orientações ao paciente / cuidador', 'sad-orientacoes', 3, 'Cuidados em domicílio, sinais de alerta, orientações gerais...') + '</div>' +
      '<div class="mt-3">' + grid2(
        fieldTextarea('Medicamentos em uso', 'sad-meds', 3, 'Liste os medicamentos prescritos para uso domiciliar...'),
        fieldTextarea('Acompanhamento / retorno', 'sad-retorno', 3, 'Ex: Acompanhamento pelo SAD, retorno se piora clínica...')
      ) + '</div>' +
      '<div class="mt-3">' + fieldTextarea('Observações', 'sad-obs', 2, 'Observações adicionais...') + '</div>'
    )}
    <div class="card mb-3">${medicoField('sad')}</div>
    ${rodape('btn-confirmar-sad','<i class="ti ti-home-heart mr-1"></i> Confirmar Alta SAD','#7c3aed','sad')}
  `
}

function formObito(hoje, agora) {
  return `
    <div class="alert alert-gray mb-3"><i class="ti ti-info-circle text-sm flex-shrink-0"></i> Preencha com atenção todas as informações para emissão da Declaração de Óbito (DO).</div>
    ${secao('Dados do Óbito', 'ti-calendar', grid3(
      field('Data do óbito', 'ob-data', 'date', '', hoje),
      field('Hora do óbito', 'ob-hora', 'time', '', agora),
      fieldSelect('Local do óbito', 'ob-local', ['Leito de internação','UTI','Sala de emergência','Centro cirúrgico','Outro'])
    ))}
    ${secao('Declaração de Óbito (DO)', 'ti-file-certificate',
      grid2(
        field('Causa imediata (I-a)', 'ob-causa1', 'text', 'Ex: Choque séptico'),
        field('Causa intermediária (I-b)', 'ob-causa2', 'text', 'Ex: Pneumonia grave')
      ) + `<div class="mt-3">` +
      grid2(
        field('Causa básica (I-c)', 'ob-causa3', 'text', 'Ex: Sepse de foco pulmonar'),
        fieldSelect('Tipo de óbito', 'ob-tipo', ['Natural','Acidental','Suicídio','Homicídio','Indeterminado'])
      ) + `</div><div class="mt-3">` +
      fieldTextarea('Outras condições contribuintes (Parte II)', 'ob-outras', 2, 'Condições que contribuíram mas não são a causa básica...') +
      `</div><div class="mt-3">` +
      field('Número da DO', 'ob-numero', 'text', 'Número da declaração') + `</div>` +
      `<div class="mt-3">` + fieldTextarea('Observações', 'ob-obs', 2, 'Observações adicionais relevantes...') + `</div>`
    )}
    <div class="card mb-3">${medicoField('ob')}</div>
    ${rodape('btn-confirmar-obito','<i class="ti ti-check mr-1"></i> Registrar Óbito','#4b5563','ob')}
  `
}

// Bind dinâmico dos campos de médico para atualizar assinatura
function bindMedicoInput(tipo, prefixo) {
  setTimeout(() => {
    const el = document.getElementById(`${prefixo}-medico`)
    if (el) el.addEventListener('input', e => {
      const sign = document.getElementById(`${prefixo}-sign-nome`)
      if (sign) sign.textContent = e.target.value || '—'
    })
  }, 100)
}

async function confirmar(tipo) {
  const prefixos = { alta:'ah', transferencia:'tr', evasao:'ev', obito:'ob' }
  const pfx = prefixos[tipo]
  const medico = document.getElementById(`${pfx}-medico`)?.value.trim()
  if (!medico) { alert('Informe o médico responsável.'); return }

  const confirmMsgs = {
    alta:          `Confirmar alta de ${internacaoAtual.paciente?.nome}?`,
    transferencia: `Confirmar transferência de ${internacaoAtual.paciente?.nome}?`,
    evasao:        `Registrar evasão de ${internacaoAtual.paciente?.nome}?`,
    obito:         `Registrar óbito de ${internacaoAtual.paciente?.nome}?\n\nEsta ação não pode ser desfeita.`,
  }
  if (!confirm(confirmMsgs[tipo])) return

  // Coleta dados específicos por tipo
  const dados = coletarDados(tipo, pfx)
  dados.medico_responsavel = medico
  dados.crm = document.getElementById(`${pfx}-crm`)?.value.trim() || null

  const btnId = `btn-confirmar-${tipo}`
  const btn = document.getElementById(btnId)
  btn.disabled = true
  btn.innerHTML = '<i class="ti ti-loader-2 animate-spin mr-1"></i> Salvando...'

  try {
    // 1. Registra desfecho
    const { error: e1 } = await supabase.from('desfechos').insert({
      internacao_id: internacaoAtual.id,
      tipo,
      dados,
      data_desfecho: new Date().toISOString(),
      medico_responsavel: medico,
    })
    if (e1) throw e1

    // 2. Encerra internação
    const { error: e2 } = await supabase.from('internacoes')
      .update({ ativo: false, data_alta: new Date().toISOString() })
      .eq('id', internacaoAtual.id)
    if (e2) throw e2

    // 3. Atualiza status do leito
    const { error: e3 } = await supabase.from('leitos')
      .update({ status: 'limpeza', updated_at: new Date().toISOString() })
      .eq('id', leitoAtual.id)
    if (e3) throw e3

    // Sucesso — volta para o painel
    const tipoLabel = {alta:'Alta',transferencia:'Transferência',evasao:'Evasão',sad:'Alta SAD',obito:'Óbito'}[tipo]||tipo
    alert(`✅ ${tipoLabel} registrado com sucesso!\n\nLeito ${leitoAtual.codigo} liberado para limpeza.`)
    router.navigate('leitos')

  } catch (err) {
    alert('Erro ao registrar: ' + err.message)
    btn.disabled = false
    btn.innerHTML = btn.dataset.label || 'Confirmar'
  }
}

function coletarDados(tipo, pfx) {
  const g = id => document.getElementById(id)?.value || null
  if (tipo === 'alta') return {
    data: g('ah-data'), hora: g('ah-hora'), tipo_alta: g('ah-tipo'),
    diagnostico_final: g('ah-diagfinal'), condicao: g('ah-condicao'),
    orientacoes: g('ah-orientacoes'), observacoes: g('ah-obs'),
    medicamentos: g('ah-meds'), retorno: g('ah-retorno'),
  }
  if (tipo === 'transferencia') return {
    data: g('tr-data'), hora: g('tr-hora'), transporte: g('tr-transporte'),
    destino: g('tr-destino'), cidade: g('tr-cidade'), setor_destino: g('tr-setor'),
    motivo: g('tr-motivo'), diagnostico: g('tr-diag'), condicao: g('tr-condicao'),
    resumo: g('tr-resumo'), medicacoes: g('tr-meds'),
  }
  if (tipo === 'evasao') return {
    data: g('ev-data'), hora: g('ev-hora'), constatado_por: g('ev-quem'),
    diagnostico: g('ev-diag'), condicao: g('ev-condicao'),
    descricao: g('ev-descricao'), familiar_notificado: g('ev-notificado'),
    familiar_nome: g('ev-familiar'), medidas: g('ev-medidas'),
  }
  if (tipo === 'sad') return {
    data: g('sad-data'), hora: g('sad-hora'),
    diagnostico_final: g('sad-diagfinal'), condicao: g('sad-condicao'),
    orientacoes: g('sad-orientacoes'), medicamentos: g('sad-meds'),
    retorno: g('sad-retorno'), observacoes: g('sad-obs'),
  }
  if (tipo === 'obito') return {
    data: g('ob-data'), hora: g('ob-hora'), local: g('ob-local'),
    causa_imediata: g('ob-causa1'), causa_intermediaria: g('ob-causa2'),
    causa_basica: g('ob-causa3'), tipo_obito: g('ob-tipo'),
    outras_condicoes: g('ob-outras'), numero_do: g('ob-numero'), observacoes: g('ob-obs'),
  }
  return {}
}

function injetarEstilos() {
  if (document.getElementById('alta-style')) return
  const s = document.createElement('style'); s.id = 'alta-style'
  s.textContent = `
    .tipo-card{border:2px solid #e0e4e8;border-radius:10px;padding:14px 12px;cursor:pointer;text-align:center;transition:all .2s;background:#fff}
    .tipo-card:hover{border-color:#b0b8c4;background:#f9fafb;transform:translateY(-1px)}
    .tipo-card.selected{border-color:var(--tc);background:var(--tbg);transform:translateY(-1px)}
  `
  document.head.appendChild(s)
}
