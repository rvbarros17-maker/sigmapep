// src/components/patientBar.js
import { calcularIdade } from '../services/pacientes.js'

export function renderPatientBar(internacao) {
  if (!internacao) return ''

  const p = internacao.paciente || {}
  const dataInt = internacao.data_internacao
    ? new Date(internacao.data_internacao).toLocaleDateString('pt-BR')
    : '—'

  const campos = [
    { label: 'Nome do paciente',   val: p.nome || '—' },
    { label: 'Código SUS',         val: p.codigo_sus || '—' },
    { label: 'Data de nascimento', val: p.data_nascimento ? `${new Date(p.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')} (${calcularIdade(p.data_nascimento)})` : '—' },
    { label: 'Data de internação', val: dataInt },
    { label: 'Dias internado',     val: internacao.dias_internado != null ? `${internacao.dias_internado} dias` : '—' },
    { label: 'Leito',              val: internacao.leito?.codigo || '—' },
    { label: 'Data atual',         val: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) },
  ]

  return `
    <div class="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4 flex-shrink-0">
      <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
        <i class="ti ti-user text-2xl"></i>
      </div>
      <div class="flex flex-wrap gap-x-5 gap-y-1 flex-1">
        ${campos.map(c => `
          <div class="flex flex-col gap-0">
            <span class="pf-label">${c.label}</span>
            <span class="pf-val">${c.val}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `
}
