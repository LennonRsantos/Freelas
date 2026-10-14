-- Freelas: funções do app e regras de segurança.
-- Rode DEPOIS de schema.sql, no SQL Editor do Supabase. Pode rodar de novo
-- sem problema (tudo é "create or replace" / "drop if exists").
--
-- Ideia: o app só LÊ candidaturas e avaliações direto das tabelas. Toda
-- mudança (candidatar, aprovar, check-in, finalizar, cancelar, avaliar)
-- passa por uma função abaixo, que confere quem está pedindo e se a
-- mudança é permitida. Assim ninguém aprova a própria candidatura.

-- ---------------------------------------------------------------------------
-- Regras de acesso (RLS)
-- ---------------------------------------------------------------------------

drop policy if exists "freelancer vê e cria candidaturas" on applications;
drop policy if exists "contratante aprova ou recusa" on applications;
drop policy if exists "freelancer vê suas candidaturas" on applications;
create policy "freelancer vê suas candidaturas" on applications for select
  using (auth.uid() = freelancer_id);
-- "contratante vê candidaturas das suas vagas" (schema.sql) continua valendo.

-- CNPJ/CPF e endereço do contratante ficam visíveis só para o dono.
-- O público lê nome, logo e nota pela view contractor_cards.
drop policy if exists "perfis contratante públicos" on contratante_profiles;

drop policy if exists "participante avalia" on reviews;
-- Avaliações: leitura pública ("avaliações visíveis"); escrita só pela função submit_review.

drop policy if exists "contratante gerencia vagas" on jobs;
drop policy if exists "contratante publica vagas" on jobs;
create policy "contratante publica vagas" on jobs for insert
  with check (
    auth.uid() = contractor_id
    and status = 'aberta'
    and exists (select 1 from contratante_profiles c where c.user_id = auth.uid())
  );
-- Sem update/delete direto em vagas: mudanças de status vão pelas funções.

-- ---------------------------------------------------------------------------
-- Dados públicos agregados (notas e presença)
-- ---------------------------------------------------------------------------

create or replace view freelancer_cards as
  select
    f.user_id,
    f.full_name,
    f.photo_url,
    f.specialties,
    f.neighborhood,
    f.city,
    coalesce(round(avg(r.stars)::numeric, 1), 0) as rating,
    count(r.id) as rating_count,
    (
      select case when count(*) = 0 then null
        -- Presença = turnos concluídos / (concluídos + cancelados pelo freelancer).
        -- O check-in está desligado no app; quando voltar, exigir check_in_at aqui.
        else round(100.0 * count(*) filter (where a.status = 'concluida') / count(*))
      end
      from applications a
      where a.freelancer_id = f.user_id
        and (a.status = 'concluida' or (a.status = 'cancelada' and a.cancelled_by = 'freelancer'))
    ) as attendance_rate,
    -- Novas colunas só no fim: "create or replace view" não aceita mudar a ordem.
    f.created_at as member_since
  from freelancer_profiles f
  left join applications ap on ap.freelancer_id = f.user_id
  left join reviews r on r.application_id = ap.id and r.author_role = 'contratante'
  group by f.user_id;

create or replace view contractor_cards as
  select
    c.user_id,
    c.business_name,
    c.logo_url,
    coalesce(round(avg(r.stars)::numeric, 1), 0) as rating,
    count(r.id) as rating_count,
    c.created_at as member_since
  from contratante_profiles c
  left join jobs j on j.contractor_id = c.user_id
  left join applications a on a.job_id = j.id
  left join reviews r on r.application_id = a.id and r.author_role = 'freelancer'
  group by c.user_id;

grant select on freelancer_cards, contractor_cards to authenticated;

-- ---------------------------------------------------------------------------
-- Auxiliares
-- ---------------------------------------------------------------------------

create or replace function local_today() returns date
  language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- Reabre ou marca como completa a vaga conforme os aprovados.
create or replace function refresh_job_status(p_job_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_job jobs%rowtype;
  v_filled int;
begin
  select * into v_job from jobs where id = p_job_id;
  if v_job.status in ('encerrada', 'cancelada') then return; end if;
  select count(*) into v_filled from applications
    where job_id = p_job_id and status in ('confirmada', 'concluida');
  update jobs set status = case when v_filled >= v_job.slots then 'preenchida' else 'aberta' end
    where id = p_job_id;
end $$;

-- ---------------------------------------------------------------------------
-- Ações do freelancer
-- ---------------------------------------------------------------------------

create or replace function apply_to_job(p_job_id uuid) returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  v_job jobs%rowtype;
  v_id uuid;
begin
  if not exists (select 1 from freelancer_profiles where user_id = auth.uid()) then
    raise exception 'Crie seu perfil de freelancer antes de se candidatar.';
  end if;
  select * into v_job from jobs where id = p_job_id;
  if not found or v_job.status <> 'aberta' or v_job.date < local_today() then
    raise exception 'Esta vaga não está mais aberta.';
  end if;
  if v_job.contractor_id = auth.uid() then
    raise exception 'Você não pode se candidatar à sua própria vaga.';
  end if;
  insert into applications (job_id, freelancer_id) values (p_job_id, auth.uid())
    returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Você já se candidatou a esta vaga.';
end $$;

create or replace function withdraw_application(p_application_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  delete from applications
    where id = p_application_id and freelancer_id = auth.uid() and status = 'em_analise';
  if not found then raise exception 'Só dá para retirar candidaturas em análise.'; end if;
end $$;

create or replace function cancel_application(p_application_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare v_job_id uuid;
begin
  update applications
    set status = 'cancelada', cancelled_by = 'freelancer', cancelled_at = now()
    where id = p_application_id and freelancer_id = auth.uid() and status = 'confirmada'
    returning job_id into v_job_id;
  if not found then raise exception 'Só dá para cancelar turnos confirmados.'; end if;
  perform refresh_job_status(v_job_id);
end $$;

-- Check-in validado no servidor: no dia do turno e a até 300 m do endereço.
create or replace function check_in(p_application_id uuid, p_lat double precision, p_lng double precision)
  returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_app applications%rowtype;
  v_job jobs%rowtype;
  v_meters double precision;
begin
  select * into v_app from applications where id = p_application_id and freelancer_id = auth.uid();
  if not found or v_app.status <> 'confirmada' then
    raise exception 'Check-in disponível só para turnos confirmados.';
  end if;
  if v_app.check_in_at is not null then raise exception 'Check-in já feito.'; end if;
  select * into v_job from jobs where id = v_app.job_id;
  if v_job.date <> local_today() then raise exception 'O check-in só abre no dia do turno.'; end if;
  v_meters := 2 * 6371000 * asin(sqrt(
    power(sin(radians(p_lat - v_job.lat) / 2), 2) +
    cos(radians(v_job.lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - v_job.lng) / 2), 2)
  ));
  if v_meters > 300 then
    raise exception 'Você está a % m do local. Chegue mais perto para confirmar.', round(v_meters);
  end if;
  update applications
    set check_in_at = now(), check_in_lat = p_lat, check_in_lng = p_lng
    where id = p_application_id;
end $$;

-- ---------------------------------------------------------------------------
-- Ações do contratante
-- ---------------------------------------------------------------------------

create or replace function owns_job(p_job_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from jobs where id = p_job_id and contractor_id = auth.uid())
$$;

create or replace function decide_application(p_application_id uuid, p_decision application_status)
  returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_app applications%rowtype;
  v_job jobs%rowtype;
  v_filled int;
begin
  if p_decision not in ('confirmada', 'recusada') then raise exception 'Decisão inválida.'; end if;
  select * into v_app from applications where id = p_application_id;
  if not found or not owns_job(v_app.job_id) then raise exception 'Candidatura não encontrada.'; end if;
  if v_app.status <> 'em_analise' then raise exception 'Esta candidatura já foi respondida.'; end if;
  select * into v_job from jobs where id = v_app.job_id;
  if v_job.status in ('encerrada', 'cancelada') then raise exception 'Esta vaga já foi encerrada.'; end if;
  if p_decision = 'confirmada' then
    select count(*) into v_filled from applications
      where job_id = v_job.id and status in ('confirmada', 'concluida');
    if v_filled >= v_job.slots then raise exception 'A equipe desta vaga já está completa.'; end if;
  end if;
  update applications set status = p_decision where id = p_application_id;
  perform refresh_job_status(v_job.id);
end $$;

create or replace function finish_shift(p_job_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not owns_job(p_job_id) then raise exception 'Vaga não encontrada.'; end if;
  if exists (select 1 from jobs where id = p_job_id and date > local_today()) then
    raise exception 'O turno só pode ser finalizado no dia ou depois.';
  end if;
  update applications set status = 'concluida' where job_id = p_job_id and status = 'confirmada';
  update applications set status = 'recusada' where job_id = p_job_id and status = 'em_analise';
  update jobs set status = 'encerrada' where id = p_job_id;
end $$;

create or replace function cancel_job(p_job_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not owns_job(p_job_id) then raise exception 'Vaga não encontrada.'; end if;
  update jobs set status = 'cancelada' where id = p_job_id and status in ('aberta', 'preenchida');
  if not found then raise exception 'Só dá para cancelar vagas que ainda não aconteceram.'; end if;
  update applications
    set status = 'cancelada', cancelled_by = 'contratante', cancelled_at = now()
    where job_id = p_job_id and status in ('em_analise', 'confirmada');
end $$;

-- ---------------------------------------------------------------------------
-- Avaliação mútua
-- ---------------------------------------------------------------------------

create or replace function submit_review(
  p_application_id uuid,
  p_author_role view_mode,
  p_stars int,
  p_tags text[],
  p_comment text
) returns void
  language plpgsql security definer set search_path = public as $$
declare v_app applications%rowtype;
begin
  select * into v_app from applications where id = p_application_id;
  if not found or v_app.status <> 'concluida' then
    raise exception 'Só dá para avaliar turnos concluídos.';
  end if;
  if (p_author_role = 'freelancer' and v_app.freelancer_id <> auth.uid())
     or (p_author_role = 'contratante' and not owns_job(v_app.job_id)) then
    raise exception 'Você não participou deste turno.';
  end if;
  insert into reviews (application_id, author_role, stars, tags, comment)
    values (p_application_id, p_author_role, p_stars, coalesce(p_tags, '{}'), trim(p_comment));
exception when unique_violation then
  raise exception 'Você já avaliou este turno.';
end $$;

-- ---------------------------------------------------------------------------
-- Permissões e Realtime
-- ---------------------------------------------------------------------------

revoke execute on function refresh_job_status(uuid) from public, anon, authenticated;
grant execute on function
  apply_to_job(uuid),
  withdraw_application(uuid),
  cancel_application(uuid),
  check_in(uuid, double precision, double precision),
  decide_application(uuid, application_status),
  finish_shift(uuid),
  cancel_job(uuid),
  submit_review(uuid, view_mode, int, text[], text)
  to authenticated;

-- Vagas também em tempo real (applications já foi adicionada em schema.sql).
do $$ begin
  alter publication supabase_realtime add table jobs;
exception when duplicate_object then null;
end $$;
