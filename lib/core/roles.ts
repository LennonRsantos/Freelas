// Catalog of services a freelancer can offer, grouped for browsing, with
// extra search words so people find a role by what they would type.
// Plain TypeScript: shared with the future React Native app.

export const ROLE_GROUPS = [
  {
    id: "eventos",
    label: "Eventos e gastronomia",
    roles: [
      "Garçom / Cumim",
      "Bartender / Barman",
      "Auxiliar de Cozinha / Cozinheiro Freela",
      "Churrasqueiro",
      "Promoter / Recepcionista de Eventos",
      "Segurança / Porteiro de Eventos",
      "Fotógrafo(a) Presencial",
    ],
  },
  {
    id: "casa",
    label: "Casa e cuidados",
    roles: [
      "Diarista / Auxiliar de Limpeza",
      "Jardineiro",
      "Passadeira de Roupas",
      "Cuidador de Idosos",
      "Babá / Pet Sitter",
      "Personal Organizer",
    ],
  },
  {
    id: "reparos",
    label: "Reparos, montagem e transporte",
    roles: [
      "Eletricista",
      "Encanador",
      "Pintor",
      "Montador de Móveis",
      "Instalador de Ar-Condicionado",
      "Carregador / Ajudante de Mudança",
      "Detalhador Automotivo / Lavador",
    ],
  },
  {
    id: "beleza",
    label: "Beleza e bem-estar",
    roles: [
      "Manicure / Pedicure",
      "Cabeleireiro / Barbeiro Freela",
      "Maquiador(a) e Penteador(a)",
      "Depilador(a) / Designer de Sobrancelhas",
      "Massoterapeuta",
    ],
  },
] as const;

export type Role = (typeof ROLE_GROUPS)[number]["roles"][number];

export const ROLES: readonly Role[] = ROLE_GROUPS.flatMap((g) => g.roles);

/** Words people type that are not in the role name. */
const KEYWORDS: Partial<Record<Role, string[]>> = {
  "Garçom / Cumim": ["garcom", "garconete", "atendente", "salao", "buffet", "restaurante"],
  "Bartender / Barman": ["drinks", "bar", "coquetel"],
  "Auxiliar de Cozinha / Cozinheiro Freela": ["chef", "cozinha", "copa", "copeiro"],
  Churrasqueiro: ["churrasco", "assador", "parrilla"],
  "Promoter / Recepcionista de Eventos": ["recepcao", "hostess", "credenciamento"],
  "Segurança / Porteiro de Eventos": ["vigilante", "controlador de acesso", "portaria"],
  "Fotógrafo(a) Presencial": ["foto", "fotografia", "ensaio", "casamento"],
  "Diarista / Auxiliar de Limpeza": ["faxina", "faxineira", "limpeza", "empregada"],
  Jardineiro: ["jardim", "grama", "poda", "paisagismo"],
  "Passadeira de Roupas": ["passar roupa", "lavadeira"],
  "Cuidador de Idosos": ["idoso", "acompanhante", "cuidadora"],
  "Babá / Pet Sitter": ["baba", "crianca", "cachorro", "gato", "pet", "dog walker"],
  "Personal Organizer": ["organizacao", "arrumacao", "closet"],
  Eletricista: ["eletrica", "tomada", "chuveiro", "fiacao"],
  Encanador: ["vazamento", "hidraulica", "cano", "torneira"],
  Pintor: ["pintura", "parede"],
  "Montador de Móveis": ["montagem", "moveis", "guarda-roupa"],
  "Instalador de Ar-Condicionado": ["ar condicionado", "split", "climatizacao"],
  "Carregador / Ajudante de Mudança": ["mudanca", "frete", "carreto"],
  "Detalhador Automotivo / Lavador": ["lava jato", "carro", "polimento", "lavagem"],
  "Manicure / Pedicure": ["unha", "unhas", "esmalte"],
  "Cabeleireiro / Barbeiro Freela": ["cabelo", "corte", "barba", "barbearia"],
  "Maquiador(a) e Penteador(a)": ["maquiagem", "make", "penteado", "noiva"],
  "Depilador(a) / Designer de Sobrancelhas": ["depilacao", "cera", "sobrancelha"],
  Massoterapeuta: ["massagem", "drenagem", "relaxante"],
};

/** Lowercase, no accents, so "eletrica" finds "Elétrica". */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** True when every word of the query appears in the role name or its keywords. */
export function matchesRole(role: Role, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold([role, ...(KEYWORDS[role] ?? [])].join(" "));
  return words.every((w) => haystack.includes(w));
}

/** Short name for tight spaces: "Garçom / Cumim" → "Garçom". */
export function shortRole(role: Role): string {
  return role.split(" / ")[0]!.replace(/\(a\)/g, "");
}

/** Names used before the catalog grew; kept to migrate saved profiles. */
const LEGACY: Record<string, Role> = {
  Garçom: "Garçom / Cumim",
  Cumim: "Garçom / Cumim",
  Barman: "Bartender / Barman",
  Recepcionista: "Promoter / Recepcionista de Eventos",
  Apoio: "Promoter / Recepcionista de Eventos",
};

export function migrateRoles(roles: string[]): Role[] {
  const out = new Set<Role>();
  for (const r of roles) {
    if ((ROLES as readonly string[]).includes(r)) out.add(r as Role);
    else if (LEGACY[r]) out.add(LEGACY[r]);
  }
  return [...out];
}
