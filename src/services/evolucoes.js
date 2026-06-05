import { supabase } from './supabase.js'

export async function salvarEvolucao({ internacao_id, diagnostico, texto, resultados_exames }) {
  const { data, error } = await supabase
    .from('evolucoes')
    .insert({
      internacao_id,
      diagnostico,
      texto,
      medico_responsavel: 'Dr. João Silva',
    })
    .select()
    .single()

  if (error) throw error

  // Insere resultados de exames se houver
  if (resultados_exames?.length) {
    const { error: errEx } = await supabase
      .from('evolucao_exames')
      .insert(resultados_exames.map(e => ({ ...e, evolucao_id: data.id })))
    if (errEx) throw errEx
  }

  return data
}

export async function getUltimaEvolucao(internacao_id) {
  const { data, error } = await supabase
    .from('evolucoes')
    .select('*, exames:evolucao_exames(*)')
    .eq('internacao_id', internacao_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getHistoricoEvolucoes(internacao_id) {
  const { data, error } = await supabase
    .from('evolucoes')
    .select('*, exames:evolucao_exames(*)')
    .eq('internacao_id', internacao_id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
