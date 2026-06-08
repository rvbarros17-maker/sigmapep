// src/pages/mensagens.js
import { supabase } from '../services/supabase.js'
import { setNavAtivo } from '../components/sidebar.js'
import { isAdmin } from '../services/auth.js'

export async function init(container) {
  setNavAtivo('mensagens')

  const usuario = JSON.parse(localStorage.getItem('sigmapep_usuario') || 'null')
  const admin = isAdmin(usuario)

  container.innerHTML = `
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900 flex items-center gap-2">
          <i class="ti ti-message-circle text-primary-500"></i>
          ${admin ? 'Caixa de Mensagens' : 'Enviar Mensagem'}
        </h1>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

        ${!admin ? `
        <!-- Formulário para usuários -->
        <div class="card max-w-lg">
          <div class="card-title mb-3">Nova Mensagem</div>
          <div class="flex flex-col gap-3">
            <div>
              <label class="field-label">Tipo *</label>
              <select id="msg-tipo" class="field">
                <option value="">Selecione</option>
                <option value="Sugestão">💡 Sugestão</option>
                <option value="Reclamação">⚠️ Reclamação</option>
                <option value="Elogio">⭐ Elogio</option>
                <option value="Outro">💬 Outro</option>
              </select>
            </div>
            <div>
              <label class="field-label">Mensagem *</label>
              <textarea id="msg-texto" class="field" rows="5" placeholder="Descreva sua mensagem..."></textarea>
            </div>
            <div class="flex items-center gap-2">
              <input id="msg-anonimo" type="checkbox" class="w-4 h-4 accent-primary-500">
              <label for="msg-anonimo" class="text-sm text-gray-600">Enviar anonimamente</label>
            </div>
            <div id="msg-erro" class="hidden bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2"></div>
            <div id="msg-sucesso" class="hidden bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
              <i class="ti ti-check"></i> Mensagem enviada com sucesso!
            </div>
            <button id="btn-enviar-msg" class="btn btn-primary self-end">
              <i class="ti ti-send text-sm"></i> Enviar Mensagem
            </button>
          </div>
        </div>
        ` : `
        <!-- Caixa do admin -->
        <div id="msgs-lista" class="flex flex-col gap-3">
          <div class="flex justify-center py-6"><i class="ti ti-loader-2 animate-spin text-primary-500 text-2xl"></i></div>
        </div>
        `}

      </div>
    </div>
  `

  if (!admin) {
    document.getElementById('btn-enviar-msg').addEventListener('click', async () => {
      const tipo  = document.getElementById('msg-tipo').value
      const texto = document.getElementById('msg-texto').value.trim()
      const anonimo = document.getElementById('msg-anonimo').checked

      if (!tipo || !texto) {
        document.getElementById('msg-erro').textContent = 'Preencha o tipo e a mensagem.'
        document.getElementById('msg-erro').classList.remove('hidden')
        return
      }

      const btn = document.getElementById('btn-enviar-msg')
      btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 animate-spin text-sm"></i> Enviando...'

      const { error } = await supabase.from('mensagens').insert({
        tipo,
        texto,
        remetente: anonimo ? 'Anônimo' : (usuario?.nome || 'Usuário'),
        lida: false,
      })

      if (error) {
        document.getElementById('msg-erro').textContent = error.message
        document.getElementById('msg-erro').classList.remove('hidden')
        btn.disabled = false; btn.innerHTML = '<i class="ti ti-send text-sm"></i> Enviar Mensagem'
      } else {
        document.getElementById('msg-sucesso').classList.remove('hidden')
        document.getElementById('msg-erro').classList.add('hidden')
        document.getElementById('msg-tipo').value = ''
        document.getElementById('msg-texto').value = ''
        btn.disabled = false; btn.innerHTML = '<i class="ti ti-send text-sm"></i> Enviar Mensagem'
      }
    })
  } else {
    // Admin — carrega todas as mensagens
    await carregarMensagens()
  }
}

async function carregarMensagens() {
  const lista = document.getElementById('msgs-lista')

  const { data: msgs, error } = await supabase
    .from('mensagens')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { lista.innerHTML = `<div class="alert alert-red">${error.message}</div>`; return }

  const TIPOS_ICON = { 'Sugestão':'💡', 'Reclamação':'⚠️', 'Elogio':'⭐', 'Outro':'💬' }
  const naoLidas = (msgs||[]).filter(m => !m.lida).length

  lista.innerHTML = `
    <div class="flex items-center gap-3 mb-2">
      <span class="font-semibold text-gray-700">${(msgs||[]).length} mensagem(ns)</span>
      ${naoLidas > 0 ? `<span class="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">${naoLidas} não lida(s)</span>` : ''}
    </div>
    ${!(msgs||[]).length ? '<div class="text-center text-gray-400 py-10">Nenhuma mensagem ainda.</div>' :
    (msgs||[]).map(m => `
      <div class="card ${!m.lida ? 'border-primary-300 bg-primary-50/30' : ''}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">${TIPOS_ICON[m.tipo]||'💬'}</span>
            <div>
              <span class="font-semibold text-gray-800">${m.tipo}</span>
              <span class="text-xs text-gray-400 ml-2">${m.remetente} · ${new Date(m.created_at).toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short'})}</span>
            </div>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            ${!m.lida ? `<button class="btn text-xs py-1 px-2 btn-marcar-lida" data-id="${m.id}"><i class="ti ti-check text-xs"></i> Marcar lida</button>` : '<span class="text-xs text-gray-400 flex items-center gap-1"><i class="ti ti-check"></i> Lida</span>'}
            <button class="btn text-xs py-1 px-2 text-red-500 hover:bg-red-50 btn-del-msg" data-id="${m.id}"><i class="ti ti-trash text-xs"></i></button>
          </div>
        </div>
        <p class="text-sm text-gray-700 mt-2 whitespace-pre-wrap">${m.texto}</p>
      </div>
    `).join('')}
  `

  document.querySelectorAll('.btn-marcar-lida').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabase.from('mensagens').update({ lida: true }).eq('id', btn.dataset.id)
      await carregarMensagens()
    })
  })

  document.querySelectorAll('.btn-del-msg').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta mensagem?')) return
      await supabase.from('mensagens').delete().eq('id', btn.dataset.id)
      await carregarMensagens()
    })
  })
}
