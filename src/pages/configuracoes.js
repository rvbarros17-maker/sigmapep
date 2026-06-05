// src/pages/configuracoes.js
import { setNavAtivo } from '../components/sidebar.js'
import { router } from '../router.js'

export async function init(container) {
  setNavAtivo('config')
  container.innerHTML = `
    <div class="flex flex-col h-full overflow-hidden">
      <div class="px-5 py-3.5 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 class="text-base font-semibold text-gray-900">Configurações</h1>
      </div>
      <div class="flex-1 overflow-y-auto p-5">
        <div class="grid grid-cols-3 gap-4 max-w-3xl">

          <div class="card hover:border-primary-500 hover:shadow-sm transition-all cursor-pointer" id="btn-gerenciar-leitos">
            <div class="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-500 mb-3">
              <i class="ti ti-bed text-xl"></i>
            </div>
            <div class="font-semibold text-gray-800 mb-1">Gerenciar Leitos</div>
            <div class="text-xs text-gray-500">Altere o status dos leitos: limpeza, manutenção, disponível</div>
          </div>

          <div class="card opacity-50 cursor-not-allowed">
            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <i class="ti ti-users text-xl"></i>
            </div>
            <div class="font-semibold text-gray-700 mb-1">Usuários</div>
            <div class="text-xs text-gray-400">Gerenciar médicos e acessos — disponível em breve</div>
          </div>

          <div class="card opacity-50 cursor-not-allowed">
            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <i class="ti ti-building-hospital text-xl"></i>
            </div>
            <div class="font-semibold text-gray-700 mb-1">Unidade</div>
            <div class="text-xs text-gray-400">Nome da unidade, logo e configurações gerais — disponível em breve</div>
          </div>

        </div>
      </div>
    </div>
  `

  document.getElementById('btn-gerenciar-leitos').addEventListener('click', () => {
    router.navigate('gerenciar-leitos')
  })
}
