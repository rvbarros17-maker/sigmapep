import { supabase } from './supabase.js'

export async function getLeitosPorSetor() {
  const { data, error } = await supabase
    .from('leitos')
    .select(`
      *,
      internacao:internacoes(
        id,
        data_internacao,
        diagnostico,
        observacoes,
        ativo,
        paciente:pacientes(id, nome, data_nascimento)
      )
    `)
    .order('setor')
    .order('codigo')

  if (error) throw error

  return (data || []).map(leito => ({
    ...leito,
    internacao: (leito.internacao || [])
      .filter(i => i.ativo)
      .map(i => ({
        ...i,
        dias_internado: i.data_internacao
          ? Math.floor((Date.now() - new Date(i.data_internacao)) / 86400000)
          : 0,
      })),
  }))
}

export async function getLeito(id) {
  const { data, error } = await supabase
    .from('leitos')
    .select(`*, internacao:internacoes(*, paciente:pacientes(*))`)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function atualizarStatusLeito(id, status) {
  const { error } = await supabase
    .from('leitos')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function internarPaciente({ leito_id, paciente_id, diagnostico, observacoes }) {
  const { data: internacao, error: errInt } = await supabase
    .from('internacoes')
    .insert({
      leito_id,
      paciente_id,
      diagnostico,
      observacoes,
      data_internacao: new Date().toISOString(),
      ativo: true,
    })
    .select()
    .single()

  if (errInt) throw errInt
  await atualizarStatusLeito(leito_id, 'ocupado')
  return internacao
}

export async function getInternacaoAtiva(leito_id) {
  const { data, error } = await supabase
    .from('internacoes')
    .select('*, paciente:pacientes(*)')
    .eq('leito_id', leito_id)
    .eq('ativo', true)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function registrarDesfecho(internacao_id, leito_id, tipo, dados) {
  const { data: desfecho, error: errDes } = await supabase
    .from('desfechos')
    .insert({
      internacao_id,
      tipo,
      dados,
      data_desfecho: new Date().toISOString(),
      medico_responsavel: 'Dr. João Silva',
    })
    .select()
    .single()

  if (errDes) throw errDes

  await supabase
    .from('internacoes')
    .update({ ativo: false, data_alta: new Date().toISOString() })
    .eq('id', internacao_id)

  await atualizarStatusLeito(leito_id, 'limpeza')
  return desfecho
}