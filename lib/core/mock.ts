// Seed data for the demo. Dates are relative to "today" so every
// screen (check-in, ratings, filters) always has something to show.
import { addDays, toISODate } from "./logic";
import type { Address, Application, Contractor, FreelancerCard, Job } from "./types";

import { ME } from "./ids";

export { ME };

export const CONTRACTORS: Contractor[] = [
  { id: "c1", name: "Buffet Villa Jardim", rating: 4.8, ratingCount: 132 },
  { id: "c2", name: "Bistrô Lamparina", rating: 4.6, ratingCount: 58 },
  { id: "c3", name: "Casa Aurora Eventos", rating: 4.9, ratingCount: 211 },
  { id: "c4", name: "Bar do Cais", rating: 4.3, ratingCount: 40 },
  { id: "c5", name: "Hotel Alameda", rating: 4.7, ratingCount: 87 },
  { id: "c6", name: "Família Becker", rating: 4.9, ratingCount: 12 },
  { id: "c7", name: "Condomínio Parque das Águas", rating: 4.5, ratingCount: 26 },
  { id: "c8", name: "Studio Bella Joinville", rating: 4.8, ratingCount: 64 },
  { id: "c9", name: "Construtora Vale Norte", rating: 4.4, ratingCount: 31 },
];

export const FREELANCERS: FreelancerCard[] = [
  {
    id: "f1",
    name: "Juliana Ramos",
    specialties: ["Garçom / Cumim", "Promoter / Recepcionista de Eventos"],
    homeArea: "Iririú, Joinville",
    rating: 4.9,
    ratingCount: 64,
    attendanceRate: 98,
  },
  {
    id: "f2",
    name: "Diego Ferreira",
    specialties: ["Bartender / Barman"],
    homeArea: "Centro, Joinville",
    rating: 4.7,
    ratingCount: 41,
    attendanceRate: 95,
  },
  {
    id: "f3",
    name: "Patrícia Souza",
    specialties: ["Garçom / Cumim", "Auxiliar de Cozinha / Cozinheiro Freela"],
    homeArea: "Aventureiro, Joinville",
    rating: 4.5,
    ratingCount: 22,
    attendanceRate: 91,
  },
  {
    id: "f4",
    name: "Marcos Vinícius",
    specialties: ["Garçom / Cumim"],
    homeArea: "Boa Vista, Joinville",
    rating: 4.2,
    ratingCount: 18,
    attendanceRate: 84,
  },
  {
    id: "f5",
    name: "Aline Costa",
    specialties: ["Promoter / Recepcionista de Eventos"],
    homeArea: "Saguaçu, Joinville",
    rating: 5.0,
    ratingCount: 9,
    attendanceRate: 100,
  },
  {
    id: "f6",
    name: "Thiago Nunes",
    specialties: ["Garçom / Cumim", "Bartender / Barman"],
    homeArea: "Glória, Joinville",
    rating: 4.6,
    ratingCount: 77,
    attendanceRate: 97,
  },
  {
    id: "f7",
    name: "Bruna Oliveira",
    specialties: ["Auxiliar de Cozinha / Cozinheiro Freela", "Garçom / Cumim"],
    homeArea: "Costa e Silva, Joinville",
    rating: 4.4,
    ratingCount: 31,
    attendanceRate: 89,
  },
];

type Place = Pick<Job, keyof Address | "lat" | "lng">;

// Real Joinville/SC streets; CEP and neighborhood checked on ViaCEP for
// the given number. Coordinates are approximate.
const PLACES = {
  centro: {
    cep: "89201-000",
    street: "Rua do Príncipe",
    number: "330",
    neighborhood: "Centro",
    city: "Joinville",
    state: "SC",
    lat: -26.3036,
    lng: -48.846,
  },
  america: {
    cep: "89204-250",
    street: "Rua Blumenau",
    number: "451",
    neighborhood: "América",
    city: "Joinville",
    state: "SC",
    lat: -26.295,
    lng: -48.85,
  },
  gloria: {
    cep: "89216-284",
    street: "Rua Otto Boehm",
    number: "1200",
    neighborhood: "Glória",
    city: "Joinville",
    state: "SC",
    lat: -26.294,
    lng: -48.87,
  },
  atiradores: {
    cep: "89203-005",
    street: "Rua Visconde de Taunay",
    number: "500",
    neighborhood: "Atiradores",
    city: "Joinville",
    state: "SC",
    lat: -26.307,
    lng: -48.856,
  },
  bucarein: {
    cep: "89202-295",
    street: "Avenida Getúlio Vargas",
    number: "901",
    neighborhood: "Bucarein",
    city: "Joinville",
    state: "SC",
    lat: -26.313,
    lng: -48.84,
  },
  iririu: {
    cep: "89227-015",
    street: "Rua Iririú",
    number: "1601",
    neighborhood: "Iririú",
    city: "Joinville",
    state: "SC",
    lat: -26.283,
    lng: -48.816,
  },
  iririuTuiuti: {
    cep: "89227-470",
    street: "Rua Tuiuti",
    number: "300",
    neighborhood: "Iririú",
    city: "Joinville",
    state: "SC",
    lat: -26.279,
    lng: -48.823,
  },
  aventureiro: {
    cep: "89226-000",
    street: "Rua Tuiuti",
    number: "2001",
    neighborhood: "Aventureiro",
    city: "Joinville",
    state: "SC",
    lat: -26.262,
    lng: -48.81,
  },
} satisfies Record<string, Place>;

export interface Seed {
  jobs: Job[];
  applications: Application[];
}

export function buildSeed(today: Date): Seed {
  const day = (n: number) => toISODate(addDays(today, n));
  const created = addDays(today, -3).toISOString();

  const job = (
    id: string,
    contractorId: string,
    data: Omit<Job, "id" | "contractorId" | "status" | "createdAt"> & Partial<Pick<Job, "status">>,
  ): Job => ({ id, contractorId, status: "aberta", createdAt: created, ...data });

  const jobs: Job[] = [
    // Feed (other contractors)
    job("j1", "c1", {
      role: "Garçom / Cumim",
      slots: 6,
      date: day(0),
      start: "19:00",
      end: "01:00",
      pay: 180,
      dressCode: "Calça e sapato pretos, camisa branca",
      notes: "Casamento para 220 convidados. Serviço francês.",
      ...PLACES.gloria,
    }),
    job("j2", "c2", {
      role: "Garçom / Cumim",
      slots: 2,
      date: day(1),
      start: "11:00",
      end: "16:00",
      pay: 120,
      dressCode: "Avental fornecido. Calça preta.",
      ...PLACES.centro,
    }),
    job("j3", "c3", {
      role: "Bartender / Barman",
      slots: 3,
      date: day(2),
      start: "20:00",
      end: "03:00",
      pay: 250,
      dressCode: "Camisa preta social",
      notes: "Bar de drinks clássicos. Experiência com coquetelaria.",
      ...PLACES.atiradores,
    }),
    job("j4", "c4", {
      role: "Garçom / Cumim",
      slots: 4,
      date: day(1),
      start: "18:00",
      end: "00:00",
      pay: 150,
      dressCode: "Camiseta do bar (fornecida), jeans escuro",
      ...PLACES.iririu,
    }),
    job("j5", "c5", {
      role: "Promoter / Recepcionista de Eventos",
      slots: 2,
      date: day(3),
      start: "08:00",
      end: "17:00",
      pay: 200,
      dressCode: "Terninho ou social escuro",
      notes: "Credenciamento de congresso. Inglês básico é um diferencial.",
      ...PLACES.bucarein,
    }),
    job("j6", "c1", {
      role: "Auxiliar de Cozinha / Cozinheiro Freela",
      slots: 5,
      date: day(4),
      start: "14:00",
      end: "23:00",
      pay: 140,
      dressCode: "Roupa preta confortável, tênis preto",
      notes: "Preparo de entradas e apoio na cozinha do buffet.",
      ...PLACES.gloria,
    }),
    job("j7", "c3", {
      role: "Garçom / Cumim",
      slots: 10,
      date: day(5),
      start: "19:30",
      end: "02:30",
      pay: 220,
      dressCode: "Terno preto completo",
      notes: "Formatura. Bandeja e serviço volante.",
      ...PLACES.aventureiro,
    }),
    job("j8", "c2", {
      role: "Bartender / Barman",
      slots: 1,
      date: day(6),
      start: "17:00",
      end: "23:00",
      pay: 190,
      dressCode: "Camisa preta",
      ...PLACES.centro,
    }),
    job("j9", "c4", {
      role: "Garçom / Cumim",
      slots: 2,
      date: day(2),
      start: "18:00",
      end: "23:30",
      pay: 110,
      dressCode: "Calça preta, sapato fechado",
      ...PLACES.iririuTuiuti,
    }),

    // Shifts the current user works / worked
    job("j10", "c5", {
      role: "Garçom / Cumim",
      slots: 3,
      date: day(0),
      start: "12:00",
      end: "16:00",
      pay: 160,
      dressCode: "Social preto",
      notes: "Almoço executivo no salão principal.",
      status: "preenchida",
      ...PLACES.atiradores,
    }),
    job("j11", "c3", {
      role: "Garçom / Cumim",
      slots: 8,
      date: day(-2),
      start: "19:00",
      end: "01:00",
      pay: 200,
      dressCode: "Terno preto",
      status: "encerrada",
      ...PLACES.aventureiro,
    }),
    job("j12", "c1", {
      role: "Auxiliar de Cozinha / Cozinheiro Freela",
      slots: 4,
      date: day(-6),
      start: "10:00",
      end: "18:00",
      pay: 140,
      dressCode: "Roupa preta",
      status: "encerrada",
      ...PLACES.gloria,
    }),

    // Jobs posted by the current user (visible in "Quero contratar")
    job("j20", ME, {
      role: "Garçom / Cumim",
      slots: 4,
      date: day(3),
      start: "19:00",
      end: "00:00",
      pay: 170,
      dressCode: "Calça e sapato pretos, camisa branca",
      notes: "Jantar de aniversário, 80 convidados.",
      ...PLACES.america,
    }),
    job("j21", ME, {
      role: "Bartender / Barman",
      slots: 1,
      date: day(0),
      start: "18:00",
      end: "23:00",
      pay: 210,
      dressCode: "Camisa preta",
      status: "preenchida",
      ...PLACES.america,
    }),
    job("j22", ME, {
      role: "Garçom / Cumim",
      slots: 3,
      date: day(-4),
      start: "12:00",
      end: "17:00",
      pay: 150,
      dressCode: "Social preto",
      notes: "Almoço de confraternização.",
      status: "encerrada",
      ...PLACES.america,
    }),
  ];

  const at = (n: number) => addDays(today, n).toISOString();

  const applications: Application[] = [
    { id: "a1", jobId: "j3", freelancerId: ME, status: "em_analise", appliedAt: at(-1) },
    { id: "a2", jobId: "j10", freelancerId: ME, status: "confirmada", appliedAt: at(-4) },
    { id: "a3", jobId: "j7", freelancerId: ME, status: "confirmada", appliedAt: at(-2) },
    {
      id: "a4",
      jobId: "j11",
      freelancerId: ME,
      status: "concluida",
      appliedAt: at(-8),
      checkInAt: at(-2),
    },
    {
      id: "a5",
      jobId: "j12",
      freelancerId: ME,
      status: "concluida",
      appliedAt: at(-10),
      checkInAt: at(-6),
      freelancerReview: {
        stars: 5,
        tags: ["Pagou em dia", "Briefing claro"],
        comment: "Pix caiu no mesmo dia e a gerente explicou tudo antes do salão abrir.",
        createdAt: at(-6),
      },
      contractorReview: {
        stars: 5,
        tags: ["Pontual", "Proativo"],
        comment: "Chegou antes do horário e ajudou na montagem sem precisar pedir.",
        createdAt: at(-6),
      },
    },

    { id: "a20", jobId: "j20", freelancerId: "f1", status: "em_analise", appliedAt: at(-1) },
    { id: "a21", jobId: "j20", freelancerId: "f4", status: "em_analise", appliedAt: at(-1) },
    { id: "a22", jobId: "j20", freelancerId: "f6", status: "confirmada", appliedAt: at(-2) },
    { id: "a23", jobId: "j20", freelancerId: "f3", status: "em_analise", appliedAt: at(0) },
    {
      id: "a24",
      jobId: "j21",
      freelancerId: "f2",
      status: "confirmada",
      appliedAt: at(-3),
      checkInAt: at(0),
    },
    {
      id: "a25",
      jobId: "j22",
      freelancerId: "f1",
      status: "concluida",
      appliedAt: at(-7),
      checkInAt: at(-4),
      freelancerReview: {
        stars: 5,
        tags: ["Pagou em dia", "Equipe acolhedora"],
        comment: "Equipe muito receptiva e jantar servido no intervalo. Volto com certeza.",
        createdAt: at(-4),
      },
      contractorReview: {
        stars: 5,
        tags: ["Pontual", "Traje correto"],
        comment: "Atendimento impecável, os clientes elogiaram.",
        createdAt: at(-4),
      },
    },
    {
      id: "a26",
      jobId: "j22",
      freelancerId: "f5",
      status: "concluida",
      appliedAt: at(-7),
      checkInAt: at(-4),
      freelancerReview: {
        stars: 4,
        tags: ["Briefing claro"],
        comment: "Turno tranquilo. Só faltou um lugar para guardar a mochila.",
        createdAt: at(-3),
      },
    },
    {
      id: "a27",
      jobId: "j22",
      freelancerId: "f6",
      status: "concluida",
      appliedAt: at(-6),
      checkInAt: at(-4),
    },
  ];

  // Home, repair and beauty services (the catalog beyond events).
  const service = (
    id: string,
    contractorId: string,
    role: Job["role"],
    offset: number,
    start: string,
    end: string,
    pay: number,
    dressCode: string,
    notes: string,
    place: Place,
  ) =>
    jobs.push(
      job(id, contractorId, {
        role,
        slots: 1,
        date: day(offset),
        start,
        end,
        pay,
        dressCode,
        notes,
        ...place,
      }),
    );
  service(
    "s1",
    "c6",
    "Diarista / Auxiliar de Limpeza",
    1,
    "08:00",
    "16:00",
    180,
    "Roupa confortável",
    "Casa de 3 quartos. Produtos fornecidos.",
    PLACES.gloria,
  );
  service(
    "s2",
    "c7",
    "Eletricista",
    2,
    "09:00",
    "13:00",
    260,
    "Traga suas ferramentas e EPI",
    "Troca de disjuntores no salão de festas.",
    PLACES.iririu,
  );
  service(
    "s3",
    "c8",
    "Manicure / Pedicure",
    3,
    "13:00",
    "19:00",
    150,
    "Jaleco",
    "Atendimento de noivas e madrinhas no studio.",
    PLACES.centro,
  );
  service(
    "s4",
    "c3",
    "Fotógrafo(a) Presencial",
    4,
    "18:00",
    "23:00",
    450,
    "Roupa social preta",
    "Cobertura de aniversário de 15 anos. Equipamento próprio.",
    PLACES.atiradores,
  );
  service(
    "s5",
    "c6",
    "Cuidador de Idosos",
    2,
    "19:00",
    "07:00",
    220,
    "Roupa confortável",
    "Plantão noturno, senhora de 82 anos com mobilidade reduzida.",
    PLACES.bucarein,
  );
  service(
    "s6",
    "c9",
    "Montador de Móveis",
    5,
    "08:00",
    "17:00",
    280,
    "Uniforme próprio",
    "Montagem de cozinha planejada em apartamento decorado.",
    PLACES.iririuTuiuti,
  );
  service(
    "s7",
    "c1",
    "Churrasqueiro",
    6,
    "11:00",
    "17:00",
    240,
    "Avental e touca",
    "Churrasco para 120 convidados em confraternização.",
    PLACES.aventureiro,
  );
  service(
    "s8",
    "c8",
    "Cabeleireiro / Barbeiro Freela",
    3,
    "09:00",
    "18:00",
    200,
    "Preto",
    "Cobrir folga de profissional fixo no sábado.",
    PLACES.centro,
  );
  service(
    "s9",
    "c7",
    "Jardineiro",
    4,
    "07:00",
    "12:00",
    160,
    "Roupa de trabalho e bota",
    "Poda e manutenção das áreas verdes do condomínio.",
    PLACES.iririu,
  );

  // History: months of finished work on both sides, so the dashboard and
  // the services list have something to show. Deterministic, no randomness.
  const places = [
    PLACES.centro,
    PLACES.gloria,
    PLACES.atiradores,
    PLACES.bucarein,
    PLACES.iririu,
    PLACES.aventureiro,
  ];
  const shifts = [
    { start: "19:00", end: "01:00" },
    { start: "11:00", end: "16:00" },
    { start: "18:00", end: "23:00" },
    { start: "20:00", end: "02:00" },
  ];
  const pick = <T>(list: readonly T[], i: number) => list[i % list.length]!;

  const workedDays = [
    -9, -13, -17, -22, -28, -35, -41, -49, -58, -66, -77, -90, -105, -120, -140, -160,
  ];
  workedDays.forEach((offset, i) => {
    const id = `h${i}`;
    jobs.push(
      job(id, pick(["c1", "c2", "c3", "c4", "c5"], i), {
        role: pick(
          [
            "Garçom / Cumim",
            "Garçom / Cumim",
            "Bartender / Barman",
            "Garçom / Cumim",
            "Auxiliar de Cozinha / Cozinheiro Freela",
          ] as const,
          i,
        ),
        slots: 4,
        date: day(offset),
        ...pick(shifts, i),
        pay: pick([180, 200, 150, 220, 160, 140, 190, 170], i),
        dressCode: "Social preto",
        status: "encerrada",
        ...pick(places, i),
      }),
    );
    applications.push({
      id: `ha${i}`,
      jobId: id,
      freelancerId: ME,
      status: "concluida",
      appliedAt: at(offset - 4),
      checkInAt: at(offset),
      contractorReview: {
        stars: pick([5, 5, 4, 5, 4, 5, 3, 5], i),
        tags: [pick(["Pontual", "Proativo", "Traje correto", "Ágil"], i)],
        comment: pick(FREELANCER_COMMENTS, i),
        createdAt: at(offset + 1),
      },
      freelancerReview: {
        stars: pick([5, 4, 5, 5, 3, 4], i),
        tags: [pick(["Pagou em dia", "Bem organizado", "Briefing claro"], i)],
        comment: pick(CONTRACTOR_COMMENTS, i),
        createdAt: at(offset + 1),
      },
    });
  });

  // A shift the freelancer called off, and one the contractor cancelled.
  jobs.push(
    job("h90", "c4", {
      role: "Garçom / Cumim",
      slots: 3,
      date: day(-31),
      start: "18:00",
      end: "00:00",
      pay: 150,
      dressCode: "Preto",
      status: "encerrada",
      ...PLACES.iririu,
    }),
    job("h91", "c2", {
      role: "Garçom / Cumim",
      slots: 2,
      date: day(5),
      start: "12:00",
      end: "16:00",
      pay: 140,
      dressCode: "Avental fornecido",
      status: "cancelada",
      ...PLACES.centro,
    }),
  );
  applications.push(
    {
      id: "ha90",
      jobId: "h90",
      freelancerId: ME,
      status: "cancelada",
      appliedAt: at(-36),
      cancelledBy: "freelancer",
      cancelledAt: at(-33),
    },
    {
      id: "ha91",
      jobId: "h91",
      freelancerId: ME,
      status: "cancelada",
      appliedAt: at(-2),
      cancelledBy: "contratante",
      cancelledAt: at(-1),
    },
  );

  // Jobs the user's establishment offered in the past.
  const hiredDays = [-11, -25, -38, -52, -70, -88, -110, -135];
  hiredDays.forEach((offset, i) => {
    const id = `hc${i}`;
    const team = [FREELANCERS[i % FREELANCERS.length]!, FREELANCERS[(i + 3) % FREELANCERS.length]!];
    jobs.push(
      job(id, ME, {
        role: pick(
          ["Garçom / Cumim", "Bartender / Barman", "Garçom / Cumim", "Garçom / Cumim"] as const,
          i,
        ),
        slots: team.length,
        date: day(offset),
        ...pick(shifts, i + 1),
        pay: pick([170, 210, 160, 120], i),
        dressCode: "Calça e sapato pretos, camisa branca",
        status: "encerrada",
        ...PLACES.america,
      }),
    );
    team.forEach((f, k) =>
      applications.push({
        id: `hca${i}_${k}`,
        jobId: id,
        freelancerId: f.id,
        status: "concluida",
        appliedAt: at(offset - 5),
        checkInAt: at(offset),
        contractorReview: {
          stars: pick([5, 4, 5, 5, 4], i + k),
          tags: [pick(["Pontual", "Proativo", "Traje correto"], i + k)],
          comment: pick(FREELANCER_COMMENTS, i + k + 2),
          createdAt: at(offset + 1),
        },
        freelancerReview: {
          stars: pick([5, 5, 4, 4, 5], i + k),
          tags: [pick(["Pagou em dia", "Equipe acolhedora", "Refeição oferecida"], i + k)],
          comment: pick(CONTRACTOR_COMMENTS, i + k + 1),
          createdAt: at(offset + 1),
        },
      }),
    );
  });
  jobs.push(
    job("hc90", ME, {
      role: "Promoter / Recepcionista de Eventos",
      slots: 1,
      date: day(6),
      start: "09:00",
      end: "15:00",
      pay: 180,
      dressCode: "Social",
      status: "cancelada",
      ...PLACES.america,
    }),
  );
  applications.push({
    id: "hca90",
    jobId: "hc90",
    freelancerId: "f5",
    status: "cancelada",
    appliedAt: at(-3),
    cancelledBy: "contratante",
    cancelledAt: at(-1),
  });

  return { jobs, applications };
}

const FREELANCER_COMMENTS = [
  "Chegou no horário e atendeu bem as mesas.",
  "Muito educado com os convidados, recomendo.",
  "Ágil no salão e ajudou a fechar a casa.",
  "Bom trabalho, só precisou de orientação no início.",
  "Organizado e com o traje impecável.",
];

const CONTRACTOR_COMMENTS = [
  "Pix na hora e equipe bem tratada.",
  "Evento bem organizado, briefing claro.",
  "Ofereceram jantar e transporte no fim do turno.",
  "Gerente atencioso, voltaria a trabalhar aqui.",
  "Turno puxado, mas tudo combinado foi cumprido.",
];

/** Applicants that "arrive" a few seconds after a job is published,
 * simulating what Supabase Realtime will deliver in production. */
export const SIMULATED_APPLICANTS = ["f5", "f1", "f7", "f6"];
