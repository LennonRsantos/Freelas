# Freelas

**Seu freela na hora certa.** Marketplace que conecta restaurantes, buffets e eventos a garçons, cumins, barmen, recepcionistas e equipe de apoio freelancers.

Web app responsivo (PWA) em Next.js 16 (App Router), React 19, TypeScript e Tailwind CSS 4.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # produção (o service worker só registra em produção)
```

Sem `.env.local`, o app roda em **modo demonstração**, com dados de exemplo salvos no navegador. Com as chaves do Supabase, usa o banco de verdade (veja abaixo).

## Supabase

1. No **SQL Editor** do projeto, rode `supabase/schema.sql` e depois `supabase/002_funcoes_e_seguranca.sql`. O segundo pode ser rodado de novo sem problema.
2. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a chave **publishable**, `sb_publishable_…`). Nunca use a chave secreta no app.
3. Login por código: em **Authentication → Emails → Templates**, edite **Magic Link** e **Confirm signup** para mostrar o código com `{{ .Token }}` (ex.: `Seu código Freelas: {{ .Token }}`).
4. Em **Authentication → URL Configuration**, coloque o endereço do site em **Site URL**.
5. O e-mail padrão do Supabase só entrega para membros do projeto e tem limite baixo por hora. Para usuários reais, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**.

Como funciona: as telas leem as tabelas direto; toda mudança (candidatar, aprovar, check-in, finalizar, cancelar, avaliar) passa por funções no banco que conferem quem pede e se é permitido. O check-in é validado no servidor (dia do turno e até 300 m). Candidaturas e vagas chegam em tempo real.

## Fluxo de teste

Navegação (barra inferior no celular, lateral no desktop):

- **Procurar** (lupa): feed de vagas abertas. Abre na cidade do freelancer; filtre por cidade e bairro (ex.: Joinville, Iririú), função (25 serviços em 4 categorias, com busca que entende sinônimos como "faxina" ou "unha"), data (atalhos ou **Escolher dia** no calendário) e valor mínimo (faixas prontas ou **Outro valor** digitado), e toque em **Me candidatar**.
- **Serviços**: tudo o que você fez, em **Prestados** (turnos trabalhados) e **Oferecidos** (vagas da sua empresa), com os filtros **Próximos**, **Finalizados** e **Cancelados**.
  - Próximos: check-in GPS no dia do turno (fora do raio, **Simular chegada ao local (demo)**), retirar candidatura, **Cancelar participação** ou **Cancelar vaga**.
  - Finalizados: nota e comentário recebidos, e **Avaliar** quando ainda falta a sua avaliação.
  - Cancelados: quem cancelou e quando.
- **Oferecer** (só aparece se você tem empresa cadastrada): candidatos aguardando, turnos de hoje e **Publicar vaga**. Três candidatos simulados chegam alguns segundos depois de publicar, como o Supabase Realtime fará em produção.
- **Dashboard**: total ganho (ou pago à equipe), este mês contra o mês passado, turnos, horas, média por turno, valor a receber, nota, presença (ou vagas preenchidas) e gráficos por mês e por função. Cada gráfico tem **Ver tabela**.
- **Perfil**: dados pessoais e da empresa, **Avaliações** de cada lado e **Restaurar dados de demonstração**.

Para começar, em `/entrar` escolha **Quero trabalhar** ou **Quero contratar** e preencha o perfil com o CEP (ViaCEP). O outro perfil pode ser criado depois, em **Perfil**, com o mesmo login. Os dados de exemplo usam datas relativas a hoje e são recriados a cada novo dia.

## Estrutura

```
lib/core/        TypeScript puro, sem React nem DOM. Reutilizável no React Native / Expo.
  types.ts       Modelos: perfis, vagas, candidaturas, avaliações
  logic.ts       Regras: filtros, distância GPS (haversine), check-in, máscaras, formatação
  mock.ts        Dados de demonstração
lib/store/
  reducer.ts     Estado e ações (puro, roda igual com useReducer no Expo)
  freelas-store.tsx  Provider React: persistência, toasts, Realtime simulado
lib/supabase/    Cliente opcional (null sem .env)
supabase/schema.sql  Tabelas, RLS e publicação Realtime
components/ui/   Button, Field/Input/Select/Textarea, Chip, Badge, Modal (bottom sheet no celular), Tabs, Stars, Avatar
components/      JobTicket (card de vaga), AppShell (sidebar ≥768px, barra inferior <768px), CheckInPanel, RatingModal, ApplicantRow…
app/entrar       Cadastro e escolha de perfil
app/(app)/       vagas, candidaturas, contratar, contratar/vagas/[id], publicar, perfil
app/manifest.ts + public/sw.js   PWA: instalação e cache offline do app shell
```

## Design

- Cores em `app/globals.css`. As da marca (`navy`, `cta`, `ok`, `warn`) são fixas. As de interface (`canvas`, `card`, `ink`, `muted`, `line`, `inverse`…) mudam com o tema.
- Tema claro e escuro: segue o sistema até a pessoa escolher no botão de sol/lua (topo no celular, sidebar no desktop). A escolha fica salva no aparelho e é aplicada antes da página aparecer, sem piscar.
- Botões laranja usam texto azul noturno, porque texto branco sobre `#FF6B00` não passa no contraste WCAG AA. Valores em R$ usam o verde escuro `#047857` para texto, e `#10B981` fica nos preenchimentos.
- O card de vaga imita uma comanda de turno: canhoto escuro com data e horário, borda picotada e corpo com função, local e valor.
- Tipografia: Plus Jakarta Sans (títulos) e Inter (texto, formulários e botões).

## Próximos passos para produção

- Trocar o reducer local por chamadas ao Supabase (Auth com magic link, tabelas de `schema.sql`) e assinar `applications` via Realtime.
- Geocodificar o endereço ao publicar a vaga. Hoje a demo usa o centro aproximado do bairro (tabela em `lib/core/places.ts`, só Joinville).
- Validar o check-in no servidor (posição e horário) para impedir fraude.
- Upload de fotos para o Supabase Storage. Hoje ficam reduzidas a 256 px no `localStorage`.
