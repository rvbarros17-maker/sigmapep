// src/pages/login.js
import { signIn, getUsuarioLogado, atualizarSenha } from '../services/auth.js'
import { router } from '../router.js'

export async function init(container) {
  renderLogin(container)
}

function renderLogin(container) {
  container.className = 'flex h-screen bg-gradient-to-br from-[#0d3349] via-[#0e4d3a] to-[#0d3349]'
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center w-full px-4">

      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        <!-- Header verde -->
        <div class="bg-gradient-to-br from-[#0e4d3a] to-[#1a9e6a] px-8 py-8 flex flex-col items-center">
          <!-- Logo SVG SigmaPEP -->
          <div class="flex items-center gap-3 mb-2">
            <div class="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 40 40" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 4C11.16 4 4 11.16 4 20s7.16 16 16 16 16-7.16 16-16S28.84 4 20 4z" fill="white" fill-opacity="0.15"/>
                <path d="M20 8C13.37 8 8 13.37 8 20s5.37 12 12 12 12-5.37 12-12S26.63 8 20 8z" fill="white" fill-opacity="0.15"/>
                <text x="20" y="25" text-anchor="middle" font-size="16" font-weight="bold" font-family="Arial" fill="white">S</text>
                <path d="M14 20h4v-4h4v4h4v4h-4v4h-4v-4h-4v-4z" fill="white" fill-opacity="0.9"/>
              </svg>
            </div>
            <div>
              <div class="text-white font-bold text-2xl tracking-wide">SigmaPEP</div>
              <div class="text-white/60 text-[10px] tracking-widest uppercase">Prontuário Eletrônico</div>
            </div>
          </div>
          <div class="text-white/70 text-xs mt-2 text-center">UPA Zona Sul · Maringá/PR</div>
        </div>

        <!-- Form -->
        <div class="px-8 py-7">
          <h2 class="text-gray-800 font-semibold text-[15px] mb-5 text-center">Acesso ao Sistema</h2>

          <div id="login-erro" class="hidden bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 mb-4 flex items-center gap-2">
            <i class="ti ti-alert-circle text-sm"></i>
            <span id="login-erro-msg"></span>
          </div>

          <div class="flex flex-col gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Login</label>
              <div class="relative">
                <i class="ti ti-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input id="login-email" type="text" placeholder="Ex: joao.silva"
                  class="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200 transition-colors">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Senha</label>
              <div class="relative">
                <i class="ti ti-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input id="login-senha" type="password" placeholder="••••••••"
                  class="w-full border border-gray-200 rounded-lg pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200 transition-colors">
                <button id="toggle-senha" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <i class="ti ti-eye text-sm"></i>
                </button>
              </div>
            </div>
            <button id="btn-entrar" class="w-full bg-gradient-to-r from-[#0e4d3a] to-[#1a9e6a] text-white rounded-lg py-2.5 text-sm font-semibold mt-1 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <i class="ti ti-login text-sm"></i> Entrar
            </button>
          </div>
        </div>

      </div>

      <div class="text-white/30 text-[10px] mt-6 text-center">
        SigmaPEP v1.0 · Todos os direitos reservados
      </div>
    </div>
  `

  // Toggle senha
  document.getElementById('toggle-senha').addEventListener('click', () => {
    const input = document.getElementById('login-senha')
    const icon = document.querySelector('#toggle-senha i')
    if (input.type === 'password') {
      input.type = 'text'
      icon.className = 'ti ti-eye-off text-sm'
    } else {
      input.type = 'password'
      icon.className = 'ti ti-eye text-sm'
    }
  })

  // Enter para logar
  document.getElementById('login-senha').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-entrar').click()
  })

  document.getElementById('btn-entrar').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim()
    const senha = document.getElementById('login-senha').value

    if (!email || !senha) {
      mostrarErro('Preencha e-mail e senha.')
      return
    }

    const btn = document.getElementById('btn-entrar')
    btn.disabled = true
    btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Entrando...'

    try {
      await signIn(email, senha)
      const usuario = await getUsuarioLogado()

      if (!usuario) throw new Error('Usuário não encontrado.')

      // Salva usuário no sessionStorage para uso global
      sessionStorage.setItem('sigmapep_usuario', JSON.stringify(usuario))

      // Primeiro acesso — obriga trocar senha
      if (usuario.primeiro_acesso) {
        renderTrocarSenha(container, usuario)
        return
      }

      // Redireciona para o sistema
      container.className = 'flex h-screen bg-gray-100 overflow-hidden'
      router.navigate('leitos')

    } catch (err) {
      mostrarErro(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message)
      btn.disabled = false
      btn.innerHTML = '<i class="ti ti-login text-sm"></i> Entrar'
    }
  })

  function mostrarErro(msg) {
    document.getElementById('login-erro-msg').textContent = msg
    document.getElementById('login-erro').classList.remove('hidden')
  }
}

function renderTrocarSenha(container, usuario) {
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center w-full px-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        <div class="bg-gradient-to-br from-[#0e4d3a] to-[#1a9e6a] px-8 py-6 text-center">
          <div class="text-white font-bold text-xl">SigmaPEP</div>
          <div class="text-white/70 text-xs mt-1">Primeiro acesso detectado</div>
        </div>

        <div class="px-8 py-7">
          <div class="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5">
            <i class="ti ti-lock-exclamation text-amber-500"></i>
            <p class="text-xs text-amber-700">Por segurança, você precisa criar uma nova senha antes de continuar.</p>
          </div>

          <div id="trocar-erro" class="hidden bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2.5 mb-4">
            <span id="trocar-erro-msg"></span>
          </div>

          <div class="flex flex-col gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Nova senha *</label>
              <input id="nova-senha" type="password" placeholder="Mínimo 6 caracteres"
                class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Confirmar senha *</label>
              <input id="conf-senha" type="password" placeholder="Repita a nova senha"
                class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500">
            </div>
            <button id="btn-trocar" class="w-full bg-gradient-to-r from-[#0e4d3a] to-[#1a9e6a] text-white rounded-lg py-2.5 text-sm font-semibold mt-1 hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <i class="ti ti-check text-sm"></i> Salvar Nova Senha
            </button>
          </div>
        </div>
      </div>
    </div>
  `

  document.getElementById('btn-trocar').addEventListener('click', async () => {
    const nova = document.getElementById('nova-senha').value
    const conf = document.getElementById('conf-senha').value

    if (nova.length < 6) { mostrarErroTrocar('A senha deve ter pelo menos 6 caracteres.'); return }
    if (nova !== conf) { mostrarErroTrocar('As senhas não coincidem.'); return }

    const btn = document.getElementById('btn-trocar')
    btn.disabled = true
    btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Salvando...'

    try {
      await atualizarSenha(nova)
      usuario.primeiro_acesso = false
      sessionStorage.setItem('sigmapep_usuario', JSON.stringify(usuario))
      container.className = 'flex h-screen bg-gray-100 overflow-hidden'
      router.navigate('leitos')
    } catch (err) {
      mostrarErroTrocar(err.message)
      btn.disabled = false
      btn.innerHTML = '<i class="ti ti-check text-sm"></i> Salvar Nova Senha'
    }
  })

  function mostrarErroTrocar(msg) {
    document.getElementById('trocar-erro-msg').textContent = msg
    document.getElementById('trocar-erro').classList.remove('hidden')
  }
}
