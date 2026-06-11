// src/services/notificacoes.js
import { supabase } from './supabase.js'

let _canal = null
let _onNovaNotif = null

export async function getNotificacoes() {
  const { data } = await supabase
    .from('notificacoes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  return data || []
}

export async function marcarTodasLidas() {
  await supabase.from('notificacoes').update({ lida: true }).eq('lida', false)
}

export async function marcarLida(id) {
  await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
}

export async function excluirNotificacao(id) {
  await supabase.from('notificacoes').delete().eq('id', id)
}

export async function criarNotificacao({ tipo = 'internacao', titulo, mensagem }) {
  await supabase.from('notificacoes').insert({ tipo, titulo, mensagem })
}

export function escutarNotificacoes(callback) {
  _onNovaNotif = callback

  // Para canal anterior se existir
  if (_canal) {
    supabase.removeChannel(_canal)
  }

  _canal = supabase
    .channel('notificacoes-realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notificacoes',
    }, (payload) => {
      if (_onNovaNotif) _onNovaNotif(payload.new)
    })
    .subscribe()
}

export function pararEscuta() {
  if (_canal) {
    supabase.removeChannel(_canal)
    _canal = null
  }
}
