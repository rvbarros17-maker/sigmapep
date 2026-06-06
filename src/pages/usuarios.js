// src/pages/usuarios.js
import { supabase } from '../services/supabase.js'
import { setNavAtivo } from '../components/sidebar.js'
import { router } from '../router.js'
import { isAdmin, ADMIN_EMAIL } from '../services/auth.js'

const PERFIS = ['Médico', 'Enfermagem', 'Administrativo', 'Coordenação', 'Direção']

export async function init(container) {
  setNavAtivo('usuarios')

  const usuario = JSON.parse(sessionStorage.getItem('sigmapep_usuario') || 'null')
  if (!isAdmin(usuario)) {
    container.innerHTML = `<div class="p-5"><div class="alert alert-red"><i class="ti ti-lock"></i> Acesso restrito ao administrador.</div></div>`
    return
  }

  await renderUsuarios(container)
}

async function renderUsuarios(container) {
  container.innerHTML = `<div class="flex justify-center py-10"><i class="ti ti-loader-2 text-2xl animate-spin text-primary-500"></i></div>`

  const { data: usuarios } = await supabase.from('usuarios').select('*').order('nome')

  container.innerHTML = `
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900 flex items-center gap-2">
          <i class="ti ti-users text-primary-500"></i> Gerenciar Usuários
        </h1>
        <button id="btn-novo-usuario" class="btn btn-primary">
          <i class="ti ti-plus text-sm"></i> Novo Usuário
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4">

        <!-- Lista de usuários -->
        <div class="card">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login</th>
                <th>Perfil</th>
                <th>CRM</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${!usuarios?.length ? `
                <tr><td colspan="6" class="text-center text-gray-400 py-8">Nenhum usuário cadastrado ainda.</td></tr>
              ` : usuarios.map(u => `
                <tr>
                  <td class="font-semibold text-gray-800">${u.nome}</td>
                  <td class="text-gray-500 text-xs">${u.login || '—'}</td>
                  <td><span class="badge badge-${badgePerfil(u.perfil)}">${u.perfil}</span></td>
                  <td class="text-gray-500 text-xs">${u.crm || '—'}</td>
                  <td>
                    ${u.primeiro_acesso
                      ? '<span class="text-amber-600 text-xs flex items-center gap-1"><i class="ti ti-clock text-xs"></i> Aguardando 1º acesso</span>'
                      : '<span class="text-green-600 text-xs flex items-center gap-1"><i class="ti ti-check text-xs"></i> Ativo</span>'
                    }
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button class="btn text-xs py-1 px-2 btn-resetar" data-id="${u.id}" data-nome="${u.nome}" data-auth="${u.auth_id}" title="Resetar senha">
                        <i class="ti ti-key text-xs"></i>
                      </button>
                      <button class="btn text-xs py-1 px-2 text-red-500 hover:bg-red-50 btn-excluir" data-id="${u.id}" data-nome="${u.nome}" data-auth="${u.auth_id}" title="Excluir usuário">
                        <i class="ti ti-trash text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

      </div>
    </div>

    <!-- Modal novo usuário -->
    <div id="modal-novo-user" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Novo Usuário</h3>
          <button id="modal-user-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x"></i></button>
        </div>

        <!-- Passo 1: instruções -->
        <div id="passo1" class="p-4">
          <div class="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 mb-4 text-xs text-amber-800">
            <p class="font-semibold mb-1 flex items-center gap-1"><i class="ti ti-info-circle"></i> Como criar um novo usuário:</p>
            <ol class="list-decimal ml-4 space-y-1">
              <li>Acesse o <b>painel do Supabase</b></li>
              <li>Vá em <b>Authentication → Users → Add User</b></li>
              <li>Informe o email no formato: <b>login@sigmapep.app</b></li>
              <li>Defina uma senha temporária</li>
              <li>Clique em <b>Create User</b> no Supabase</li>
              <li>Volte aqui e clique em <b>Continuar</b></li>
            </ol>
          </div>
          <div class="flex justify-end gap-2">
            <button id="passo1-cancelar" class="btn">Cancelar</button>
            <a href="https://supabase.com/dashboard/project/ahhnflbiadbvlorhfkrc/auth/users" target="_blank" class="btn btn-primary flex items-center gap-1">
              <i class="ti ti-external-link text-sm"></i> Abrir Supabase
            </a>
            <button id="passo1-continuar" class="btn btn-primary"><i class="ti ti-arrow-right text-sm"></i> Continuar</button>
          </div>
        </div>

        <!-- Passo 2: dados do perfil -->
        <div id="passo2" class="hidden p-4 flex flex-col gap-3">
          <p class="text-xs text-gray-500 mb-1">Preencha os dados do perfil do usuário criado no Supabase:</p>
          <div><label class="field-label">Nome completo *</label><input id="nu-nome" type="text" class="field" placeholder="Nome completo"></div>
          <div>
            <label class="field-label">Login *</label>
            <input id="nu-login" type="text" class="field" placeholder="Ex: joao.silva (mesmo usado no Supabase, sem @sigmapep.app)">
            <p class="text-[10px] text-gray-400 mt-1">Deve ser o mesmo login usado ao criar no Supabase.</p>
          </div>
          <div><label class="field-label">Perfil *</label>
            <select id="nu-perfil" class="field">
              <option value="">Selecione o perfil</option>
              ${PERFIS.map(p => `<option value="${p}">${p}</option>`).join('')}
            </select>
          </div>
          <div id="nu-crm-wrap" class="hidden"><label class="field-label">CRM</label><input id="nu-crm" type="text" class="field" placeholder="Ex: 12345/PR"></div>
          <div id="modal-user-erro" class="hidden bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2"></div>
          <div class="flex justify-end gap-2 pt-1">
            <button id="passo2-voltar" class="btn">Voltar</button>
            <button id="modal-user-salvar" class="btn btn-primary"><i class="ti ti-plus text-sm"></i> Criar Usuário</button>
          </div>
        </div>

      </div>
    </div>

    <!-- Modal resetar senha -->
    <div id="modal-reset" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Resetar Senha</h3>
          <button id="modal-reset-fechar" class="text-gray-400 hover:text-gray-600"><i class="ti ti-x"></i></button>
        </div>
        <div class="p-4 flex flex-col gap-3">
          <p class="text-sm text-gray-600">Definindo nova senha temporária para: <b id="reset-nome"></b></p>
          <div>
            <label class="field-label">Nova senha temporária *</label>
            <div class="flex gap-2">
              <input id="reset-senha" type="text" class="field flex-1" placeholder="Nova senha temporária">
              <button id="reset-gerar" class="btn text-xs whitespace-nowrap">Gerar</button>
            </div>
          </div>
        </div>
        <div id="modal-reset-erro" class="hidden mx-4 mb-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2"></div>
        <div class="flex justify-end gap-2 p-4 border-t border-gray-100">
          <button id="modal-reset-cancelar" class="btn">Cancelar</button>
          <button id="modal-reset-salvar" class="btn btn-primary"><i class="ti ti-key text-sm"></i> Redefinir Senha</button>
        </div>
      </div>
    </div>
  `

  // Listeners
  document.getElementById('btn-novo-usuario').addEventListener('click', () => {
    document.getElementById('passo1').classList.remove('hidden')
    document.getElementById('passo2').classList.add('hidden')
    document.getElementById('modal-novo-user').classList.remove('hidden')
  })
  document.getElementById('modal-user-fechar').addEventListener('click', () => {
    document.getElementById('modal-novo-user').classList.add('hidden')
  })
  document.getElementById('passo1-cancelar').addEventListener('click', () => {
    document.getElementById('modal-novo-user').classList.add('hidden')
  })
  document.getElementById('passo1-continuar').addEventListener('click', () => {
    document.getElementById('passo1').classList.add('hidden')
    document.getElementById('passo2').classList.remove('hidden')
  })
  document.getElementById('passo2-voltar').addEventListener('click', () => {
    document.getElementById('passo1').classList.remove('hidden')
    document.getElementById('passo2').classList.add('hidden')
  })

  // Mostrar CRM só se perfil = Médico
  document.getElementById('nu-perfil').addEventListener('change', e => {
    document.getElementById('nu-crm-wrap').classList.toggle('hidden', e.target.value !== 'Médico')
  })

  // Salvar perfil do usuário (já criado no Supabase Auth)
  document.getElementById('modal-user-salvar').addEventListener('click', async () => {
    const nome   = document.getElementById('nu-nome').value.trim()
    const login  = document.getElementById('nu-login').value.trim().toLowerCase().replace(/\s+/g,'.')
    const perfil = document.getElementById('nu-perfil').value
    const crm    = document.getElementById('nu-crm')?.value.trim()

    if (!nome || !login || !perfil) {
      document.getElementById('modal-user-erro').textContent = 'Preencha todos os campos obrigatórios.'
      document.getElementById('modal-user-erro').classList.remove('hidden')
      return
    }

    const btn = document.getElementById('modal-user-salvar')
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Salvando...'

    try {
      const email = login + '@sigmapep.app'

      // Busca o auth_id pelo email no Supabase
      const { data: authData, error: eAuth } = await supabase.rpc('get_user_id_by_email', { user_email: email })
      if (eAuth || !authData) throw new Error('Usuário não encontrado no Supabase Auth. Verifique se o login foi criado corretamente.')

      const { error: e2 } = await supabase.from('usuarios').insert({
        auth_id: authData,
        nome, login, email, perfil,
        crm: crm || null,
        primeiro_acesso: true,
      })
      if (e2) throw e2

      document.getElementById('modal-novo-user').classList.add('hidden')
      await renderUsuarios(container)
    } catch (err) {
      document.getElementById('modal-user-erro').textContent = err.message
      document.getElementById('modal-user-erro').classList.remove('hidden')
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-plus text-sm"></i> Criar Usuário'
    }
  })

  // Excluir usuário
  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Excluir o usuário "${btn.dataset.nome}"? Esta ação não pode ser desfeita.`)) return
      await supabase.from('usuarios').delete().eq('id', btn.dataset.id)
      await renderUsuarios(container)
    })
  })

  // Resetar senha
  let resetAuthId = null
  document.querySelectorAll('.btn-resetar').forEach(btn => {
    btn.addEventListener('click', () => {
      resetAuthId = btn.dataset.auth
      document.getElementById('reset-nome').textContent = btn.dataset.nome
      document.getElementById('reset-senha').value = ''
      document.getElementById('modal-reset').classList.remove('hidden')
    })
  })

  document.getElementById('modal-reset-fechar').addEventListener('click', () => {
    document.getElementById('modal-reset').classList.add('hidden')
  })
  document.getElementById('modal-reset-cancelar').addEventListener('click', () => {
    document.getElementById('modal-reset').classList.add('hidden')
  })
  document.getElementById('reset-gerar').addEventListener('click', () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
    document.getElementById('reset-senha').value = Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  })

  document.getElementById('modal-reset-salvar').addEventListener('click', async () => {
    const senha = document.getElementById('reset-senha').value
    if (!senha || senha.length < 6) {
      document.getElementById('modal-reset-erro').textContent = 'A senha deve ter pelo menos 6 caracteres.'
      document.getElementById('modal-reset-erro').classList.remove('hidden')
      return
    }

    const btn = document.getElementById('modal-reset-salvar')
    btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Salvando...'

    try {
      // Marca primeiro_acesso = true para forçar troca
      await supabase.from('usuarios').update({ primeiro_acesso: true }).eq('auth_id', resetAuthId)
      document.getElementById('modal-reset').classList.add('hidden')
      alert('Senha resetada! O usuário deverá trocar no próximo acesso.')
      await renderUsuarios(container)
    } catch (err) {
      document.getElementById('modal-reset-erro').textContent = err.message
      document.getElementById('modal-reset-erro').classList.remove('hidden')
      btn.disabled = false; btn.innerHTML = '<i class="ti ti-key text-sm"></i> Redefinir Senha'
    }
  })
}

function badgePerfil(perfil) {
  const map = { 'Médico': 'ocupado', 'Enfermagem': 'limpeza', 'Administrativo': 'disponivel', 'Coordenação': 'reservado', 'Direção': 'manutencao' }
  return map[perfil] || 'disponivel'
}
