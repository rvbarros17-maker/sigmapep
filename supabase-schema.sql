-- ============================================================
--  SigmaPEP — Schema Supabase
--  Execute no SQL Editor do Supabase (em ordem)
-- ============================================================

-- ── Extensões ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Pacientes ────────────────────────────────────────────────
create table if not exists pacientes (
  id               uuid primary key default uuid_generate_v4(),
  nome             text not null,
  data_nascimento  date,
  sexo             text check (sexo in ('M','F','Outro')),
  cpf              text unique,
  codigo_sus       text unique,
  telefone         text,
  endereco         text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── Leitos ───────────────────────────────────────────────────
create table if not exists leitos (
  id         uuid primary key default uuid_generate_v4(),
  codigo     text not null unique,        -- ex: UTI-01, INT-03
  setor      text not null,               -- UTI | Clínica Médica | Cirúrgico
  status     text not null default 'disponivel'
               check (status in ('ocupado','disponivel','limpeza','manutencao','reservado')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Internações ──────────────────────────────────────────────
create table if not exists internacoes (
  id               uuid primary key default uuid_generate_v4(),
  paciente_id      uuid not null references pacientes(id),
  leito_id         uuid not null references leitos(id),
  diagnostico      text,
  observacoes      text,
  data_internacao  timestamptz not null default now(),
  data_alta        timestamptz,
  ativo            boolean not null default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- View de dias internado (calculada)
create or replace view internacoes_view as
select
  i.*,
  extract(day from now() - i.data_internacao)::int as dias_internado,
  p.nome        as paciente_nome,
  p.data_nascimento,
  p.codigo_sus,
  l.codigo      as leito_codigo,
  l.setor
from internacoes i
join pacientes p on p.id = i.paciente_id
join leitos    l on l.id = i.leito_id;

-- ── Prescrições ──────────────────────────────────────────────
create table if not exists prescricoes (
  id                  uuid primary key default uuid_generate_v4(),
  internacao_id       uuid not null references internacoes(id),
  diagnostico         text,
  dieta               text,
  medico_responsavel  text,
  created_at          timestamptz default now()
);

create table if not exists prescricao_medicamentos (
  id             uuid primary key default uuid_generate_v4(),
  prescricao_id  uuid not null references prescricoes(id) on delete cascade,
  medicamento    text not null,
  dose           text,
  via            text,
  frequencia     text,
  data_inicio    date,
  dias           int,
  created_at     timestamptz default now()
);

create table if not exists prescricao_exames (
  id             uuid primary key default uuid_generate_v4(),
  prescricao_id  uuid not null references prescricoes(id) on delete cascade,
  exame          text not null,
  solicitado     boolean default true,
  created_at     timestamptz default now()
);

create table if not exists prescricao_solicitacoes (
  id             uuid primary key default uuid_generate_v4(),
  prescricao_id  uuid not null references prescricoes(id) on delete cascade,
  descricao      text not null,
  created_at     timestamptz default now()
);

-- ── Evoluções ────────────────────────────────────────────────
create table if not exists evolucoes (
  id                  uuid primary key default uuid_generate_v4(),
  internacao_id       uuid not null references internacoes(id),
  diagnostico         text,
  texto               text,
  medico_responsavel  text,
  created_at          timestamptz default now()
);

create table if not exists evolucao_exames (
  id            uuid primary key default uuid_generate_v4(),
  evolucao_id   uuid not null references evolucoes(id) on delete cascade,
  exame         text not null,
  resultado     text,
  data_resultado date,
  created_at    timestamptz default now()
);

-- ── Desfechos (Alta / Transferência / Evasão / Óbito) ────────
create table if not exists desfechos (
  id                  uuid primary key default uuid_generate_v4(),
  internacao_id       uuid not null references internacoes(id),
  tipo                text not null check (tipo in ('alta','transferencia','evasao','obito')),
  dados               jsonb not null default '{}',   -- campos específicos de cada tipo
  data_desfecho       timestamptz not null default now(),
  medico_responsavel  text,
  created_at          timestamptz default now()
);

-- ── Dados de exemplo ─────────────────────────────────────────
-- Leitos
insert into leitos (codigo, setor, status) values
  ('UTI-01', 'UTI', 'ocupado'),
  ('UTI-02', 'UTI', 'ocupado'),
  ('UTI-03', 'UTI', 'ocupado'),
  ('UTI-04', 'UTI', 'limpeza'),
  ('UTI-05', 'UTI', 'disponivel'),
  ('INT-01', 'Clínica Médica', 'ocupado'),
  ('INT-02', 'Clínica Médica', 'ocupado'),
  ('INT-03', 'Clínica Médica', 'reservado'),
  ('INT-04', 'Clínica Médica', 'disponivel'),
  ('INT-05', 'Clínica Médica', 'disponivel'),
  ('INT-06', 'Clínica Médica', 'manutencao'),
  ('CIR-01', 'Cirúrgico', 'ocupado'),
  ('CIR-02', 'Cirúrgico', 'ocupado'),
  ('CIR-03', 'Cirúrgico', 'disponivel'),
  ('CIR-04', 'Cirúrgico', 'limpeza'),
  ('CIR-05', 'Cirúrgico', 'reservado')
on conflict (codigo) do nothing;

-- Pacientes
insert into pacientes (nome, data_nascimento, sexo, codigo_sus) values
  ('João da Silva',          '1952-02-10', 'M', '89800123456789'),
  ('Maria Aparecida Santos', '1956-06-20', 'F', '89800123456790'),
  ('Roberto Ferreira Lima',  '1950-03-15', 'M', '89800123456791'),
  ('Ana Paula Gomes',        '1972-11-05', 'F', '89800123456792'),
  ('Francisca Oliveira',     '1965-08-22', 'F', '89800123456793'),
  ('Carlos Eduardo Mota',    '1979-01-30', 'M', '89800123456794'),
  ('Luciana Martins',        '1986-04-12', 'F', '89800123456795')
on conflict (codigo_sus) do nothing;

-- ── Row Level Security (básico por ora — habilitar após auth) ─
-- alter table pacientes   enable row level security;
-- alter table leitos      enable row level security;
-- alter table internacoes enable row level security;
-- (descomentar quando implementar autenticação)
