-- Freelas: schema inicial para Supabase (PostgreSQL).
-- Espelha os tipos de lib/core/types.ts.

create type view_mode as enum ('freelancer', 'contratante');
-- Mesma lista e ordem de lib/core/roles.ts.
create type job_role as enum (
  'Garçom / Cumim',
  'Bartender / Barman',
  'Auxiliar de Cozinha / Cozinheiro Freela',
  'Churrasqueiro',
  'Promoter / Recepcionista de Eventos',
  'Segurança / Porteiro de Eventos',
  'Fotógrafo(a) Presencial',
  'Diarista / Auxiliar de Limpeza',
  'Jardineiro',
  'Passadeira de Roupas',
  'Cuidador de Idosos',
  'Babá / Pet Sitter',
  'Personal Organizer',
  'Eletricista',
  'Encanador',
  'Pintor',
  'Montador de Móveis',
  'Instalador de Ar-Condicionado',
  'Carregador / Ajudante de Mudança',
  'Detalhador Automotivo / Lavador',
  'Manicure / Pedicure',
  'Cabeleireiro / Barbeiro Freela',
  'Maquiador(a) e Penteador(a)',
  'Depilador(a) / Designer de Sobrancelhas',
  'Massoterapeuta'
);
create type job_status as enum ('aberta', 'preenchida', 'encerrada', 'cancelada');
create type application_status as enum ('em_analise', 'confirmada', 'recusada', 'concluida', 'cancelada');

-- Um login pode ter os dois perfis.
create table freelancer_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  photo_url text,
  phone text not null,
  cpf text not null unique,
  specialties job_role[] not null default '{}',
  bio text not null default '',
  pix_key text not null,
  -- Endereço de onde o freelancer sai (preenchido via ViaCEP).
  -- Contratantes veem só bairro e cidade: exponha via view, não pela tabela.
  cep char(9) not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state char(2) not null,
  created_at timestamptz not null default now()
);

create table contratante_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  business_name text not null,
  document text not null,
  manager text not null,
  -- Endereço padrão das vagas (preenchido via ViaCEP).
  cep char(9) not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state char(2) not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contratante_profiles (user_id) on delete cascade,
  role job_role not null,
  slots int not null check (slots > 0),
  date date not null,
  start_time time not null,
  end_time time not null,
  pay numeric(10, 2) not null check (pay > 0),
  -- Endereço completo da vaga (preenchido via ViaCEP).
  cep char(9) not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state char(2) not null,
  lat double precision not null,
  lng double precision not null,
  dress_code text not null,
  notes text,
  status job_status not null default 'aberta',
  created_at timestamptz not null default now()
);
create index jobs_open_idx on jobs (status, date);
-- Busca por região: "vagas de Joinville, bairro Iririú" (sem diferenciar maiúsculas).
create index jobs_region_idx on jobs (status, lower(city), lower(neighborhood));

create table applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs on delete cascade,
  freelancer_id uuid not null references freelancer_profiles (user_id) on delete cascade,
  status application_status not null default 'em_analise',
  applied_at timestamptz not null default now(),
  check_in_at timestamptz,
  cancelled_by view_mode,
  cancelled_at timestamptz,
  check_in_lat double precision,
  check_in_lng double precision,
  unique (job_id, freelancer_id)
);

-- Avaliação mútua: uma linha por direção.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications on delete cascade,
  author_role view_mode not null,
  stars int not null check (stars between 1 and 5),
  tags text[] not null default '{}',
  comment text not null check (char_length(trim(comment)) between 10 and 280),
  created_at timestamptz not null default now(),
  unique (application_id, author_role)
);

-- RLS
alter table freelancer_profiles enable row level security;
alter table contratante_profiles enable row level security;
alter table jobs enable row level security;
alter table applications enable row level security;
alter table reviews enable row level security;

-- CPF, Pix e endereço completo ficam visíveis só para o dono.
create policy "dono edita perfil freelancer" on freelancer_profiles for all using (auth.uid() = user_id);

-- Dados públicos do freelancer: o contratante vê bairro e cidade, nunca o endereço completo.
create view public_freelancers as
  select user_id, full_name, photo_url, specialties, bio, neighborhood, city, state
  from freelancer_profiles;
grant select on public_freelancers to authenticated;
create policy "perfis contratante públicos" on contratante_profiles for select using (true);
create policy "dono edita perfil contratante" on contratante_profiles for all using (auth.uid() = user_id);

create policy "vagas visíveis" on jobs for select using (true);
create policy "contratante gerencia vagas" on jobs for all using (auth.uid() = contractor_id);

create policy "freelancer vê e cria candidaturas" on applications for all
  using (auth.uid() = freelancer_id);
create policy "contratante vê candidaturas das suas vagas" on applications for select
  using (exists (select 1 from jobs j where j.id = job_id and j.contractor_id = auth.uid()));
create policy "contratante aprova ou recusa" on applications for update
  using (exists (select 1 from jobs j where j.id = job_id and j.contractor_id = auth.uid()));

create policy "avaliações visíveis" on reviews for select using (true);
create policy "participante avalia" on reviews for insert with check (
  exists (
    select 1 from applications a join jobs j on j.id = a.job_id
    where a.id = application_id
      and ((author_role = 'freelancer' and a.freelancer_id = auth.uid())
        or (author_role = 'contratante' and j.contractor_id = auth.uid()))
  )
);

-- Realtime: novas candidaturas chegam ao contratante sem recarregar.
alter publication supabase_realtime add table applications;
