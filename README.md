# SigmaPEP — Prontuário Eletrônico do Paciente

## Stack
- **Vite** — bundler
- **Tailwind CSS v3** — estilização
- **Vanilla JS (ES Modules)** — sem framework
- **Supabase** — banco de dados PostgreSQL + Auth + Realtime
- **Vercel** — deploy

---

## Setup inicial

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar banco de dados
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Abra seu projeto → **SQL Editor**
3. Cole e execute o conteúdo de `supabase-schema.sql`

### 3. Rodar em desenvolvimento
```bash
npm run dev
# Acessa: http://localhost:3000
```

### 4. Build de produção
```bash
npm run build
```

### 5. Deploy Vercel
```bash
# Windows
deploy.bat

# Mac/Linux
vercel --prod
```

---

## Estrutura de pastas

```
sigmapep/
├── src/
│   ├── pages/              # Uma página = um módulo JS
│   │   ├── painel-leitos.js
│   │   ├── prontuario.js
│   │   ├── alta.js
│   │   └── internar.js
│   ├── components/         # Componentes reutilizáveis
│   │   ├── sidebar.js
│   │   └── patientBar.js
│   ├── services/           # Camada de acesso ao Supabase
│   │   ├── supabase.js     # Client + auth helpers
│   │   ├── leitos.js
│   │   ├── pacientes.js
│   │   ├── prescricoes.js
│   │   └── evolucoes.js
│   ├── styles/
│   │   └── main.css        # Tailwind + componentes customizados
│   ├── router.js           # SPA router simples
│   └── main.js             # Entry point
├── index.html
├── supabase-schema.sql     # Schema completo do banco
├── vite.config.js
├── tailwind.config.js
├── deploy.bat
└── package.json
```

---

## Módulos planejados

| Módulo           | Status      |
|------------------|-------------|
| Painel de Leitos | ✅ Pronto   |
| Prontuário       | 🔄 Em breve |
| Prescrição       | 🔄 Em breve |
| Evolução         | 🔄 Em breve |
| Alta Hospitalar  | 🔄 Em breve |
| Pacientes        | 🔄 Em breve |
| Relatórios       | 📋 Planejado|
| Autenticação     | 📋 Planejado|
