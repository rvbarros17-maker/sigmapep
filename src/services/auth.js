// src/services/auth.js
import { supabase } from './supabase.js'

export const ADMIN_EMAIL = 'admin@sigmapep.app'
const DOMAIN = '@sigmapep.local'

// Converte login livre para email fictício
export function loginParaEmail(login) {
  if (login.includes('@')) return login // já é email (admin)
  return login.toLowerCase().trim() + DOMAIN
}

export async function getUsuarioLogado() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Admin fixo
  if (user.email === ADMIN_EMAIL) {
    return { id: user.id, email: user.email, nome: 'Administrador', perfil: 'admin', crm: null, primeiro_acesso: false }
  }

  // Busca perfil na tabela usuarios
  const { data } = await supabase.from('usuarios').select('*').eq('auth_id', user.id).single()
  return data ? { ...data, email: user.email } : null
}

export function isAdmin(usuario) {
  return usuario?.perfil === 'admin' || usuario?.email === ADMIN_EMAIL
}

export async function signIn(login, password) {
  const email = loginParaEmail(login)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function atualizarSenha(novaSenha) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) throw error
  const { data: { user } } = await supabase.auth.getUser()
  if (user && user.email !== ADMIN_EMAIL) {
    await supabase.from('usuarios').update({ primeiro_acesso: false }).eq('auth_id', user.id)
  }
}

export async function listarUsuarios() {
  const { data, error } = await supabase.from('usuarios').select('*').order('nome')
  if (error) throw error
  return data || []
}

export async function excluirUsuario(usuarioId) {
  const { error } = await supabase.from('usuarios').delete().eq('id', usuarioId)
  if (error) throw error
}

