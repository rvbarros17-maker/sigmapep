import { supabase } from './supabase.js'

export async function getPrescricaoAtiva(internacao_id) {
  const { data, error } = await supabase
    .from('prescricoes')
    .select('*, medicamentos:prescricao_medicamentos(*), exames:prescricao_exames(*), outras_solicitacoes:prescricao_solicitacoes(*)')
    .eq('internacao_id', internacao_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function salvarPrescricao({ internacao_id, diagnostico, dieta, medicamentos, exames, solicitacoes }) {
  // Cria nova prescrição
  const { data: presc, error } = await supabase
    .from('prescricoes')
    .insert({
      internacao_id,
      diagnostico,
      dieta,
      medico_responsavel: 'Dr. João Silva',
    })
    .select()
    .single()

  if (error) throw error

  // Insere medicamentos
  if (medicamentos?.length) {
    const { error: errMed } = await supabase
      .from('prescricao_medicamentos')
      .insert(medicamentos.map(m => ({ ...m, prescricao_id: presc.id })))
    if (errMed) throw errMed
  }

  // Insere exames solicitados
  if (exames?.length) {
    const { error: errEx } = await supabase
      .from('prescricao_exames')
      .insert(exames.map(e => ({ ...e, prescricao_id: presc.id })))
    if (errEx) throw errEx
  }

  // Insere outras solicitações
  if (solicitacoes?.length) {
    const { error: errSol } = await supabase
      .from('prescricao_solicitacoes')
      .insert(solicitacoes.map(s => ({ descricao: s, prescricao_id: presc.id })))
    if (errSol) throw errSol
  }

  return presc
}

export async function getHistoricoPrescricoes(internacao_id) {
  const { data, error } = await supabase
    .from('prescricoes')
    .select('*, medicamentos:prescricao_medicamentos(*)')
    .eq('internacao_id', internacao_id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
