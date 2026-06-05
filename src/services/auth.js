// src/services/auth.js
import { supabase } from './supabase.js'

export const ADMIN_EMAIL = 'admin@sigmapep.app'

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

export async function signIn(email, password) {
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
  // Marca primeiro acesso como concluído
  const { data: { user } } = await supabase.auth.getUser()
  if (user && user.email !== ADMIN_EMAIL) {
    await supabase.from('usuarios').update({ primeiro_acesso: false }).eq('auth_id', user.id)
  }
}

export async function criarUsuario({ email, senha, nome, perfil, crm }) {
  // Cria usuário no Supabase Auth via admin (service role não disponível no client)
  // Usa signUp normal — admin define a senha
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: null }
  })
  if (error) throw error

  // Salva perfil na tabela usuarios
  const { error: e2 } = await supabase.from('usuarios').insert({
    auth_id: data.user.id,
    nome,
    perfil,
    crm: crm || null,
    primeiro_acesso: true,
  })
  if (e2) throw e2

  return data.user
}

export async function listarUsuarios() {
  const { data, error } = await supabase.from('usuarios').select('*').order('nome')
  if (error) throw error
  return data || []
}

export async function excluirUsuario(authId, usuarioId) {
  const { error } = await supabase.from('usuarios').delete().eq('id', usuarioId)
  if (error) throw error
}

export async function resetarSenhaUsuario(email, novaSenha) {
  // Admin busca usuário e reseta via update
  const { error } = await supabase.rpc('admin_reset_password', { user_email: email, new_password: novaSenha })
  if (error) throw error
}
