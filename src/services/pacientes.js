import { supabase } from './supabase.js'

export async function getPacientes(termo = '') {
  let query = supabase
    .from('pacientes')
    .select('*')
    .order('nome')

  if (termo) {
    query = query.or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%,codigo_sus.ilike.%${termo}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPaciente(id) {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getHistoricoInternacoes(paciente_id) {
  const { data, error } = await supabase
    .from('internacoes')
    .select(`*, leito:leitos(codigo, setor), desfecho:desfechos(tipo, data_desfecho)`)
    .eq('paciente_id', paciente_id)
    .order('data_internacao', { ascending: false })

  if (error) throw error
  return (data || []).map(i => ({
    ...i,
    dias_internado: i.data_internacao
      ? Math.floor((new Date(i.data_alta || Date.now()) - new Date(i.data_internacao)) / 86400000)
      : 0,
  }))
}

export async function criarPaciente(dados) {
  const { data, error } = await supabase
    .from('pacientes')
    .insert(dados)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function atualizarPaciente(id, dados) {
  const { data, error } = await supabase
    .from('pacientes')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export function calcularIdade(data_nascimento) {
  if (!data_nascimento) return '—'
  const hoje = new Date()
  const nasc = new Date(data_nascimento + 'T12:00:00')
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return `${idade} anos`
}

export function formatarCPF(cpf) {
  if (!cpf) return '—'
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatarTelefone(tel) {
  if (!tel) return '—'
  const n = tel.replace(/\D/g, '')
  if (n.length === 11) return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (n.length === 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return tel
}
