import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { hashPassword } from "../src/lib/password";
import { GENRES } from "../src/lib/preferences";
import { PrismaClient } from "../src/generated/prisma/client";

function resolveDatabasePath(url: string | undefined): string {
  const fallback = "./prisma/dev.db";
  if (!url) return fallback;
  const value = url.trim();
  if (value === ":memory:") return value;
  return value.startsWith("file:") ? value.slice("file:".length) : value;
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: resolveDatabasePath(process.env.DATABASE_URL),
  }),
});

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!username || !email || !password) {
    console.log("SEED: variáveis SEED_ADMIN_* ausentes. Nenhum usuário criado.");
    return;
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existing) {
    console.log("SEED: administrador já existe. Nada a fazer.");
    return;
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      settings: { create: { data: "{}" } },
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "SEED_ADMIN_CREATED",
      entity: "User",
      entityId: user.id,
      metadata: JSON.stringify({ username }),
    },
  });

  console.log(`SEED: administrador "${username}" criado com sucesso.`);
}

const CATALOG_TITLES: Record<
  string,
  { ANIME: string[]; MANGA: string[]; MANHWA: string[] }
> = {
  horror: {
    ANIME: ["Alma em Chamas", "O Corredor", "Sussurros"],
    MANGA: ["Noite Eterna", "Círculo Sombrio"],
    MANHWA: ["A Promessa de Sangue", "Arquivo 13"],
  },
  romance: {
    ANIME: ["Café e Chuva", "Flores de Março", "Meu Vizinho Invisível"],
    MANGA: ["Cartas sem Remetente", "A Estação Final"],
    MANHWA: ["Destinos Entrelaçados", "Segundo Encontro"],
  },
  acao: {
    ANIME: ["Sangue de Aço", "Raio Vermelho", "Os Guardiões de Ferro"],
    MANGA: ["O Punho de Gaia", "Missão Zero"],
    MANHWA: ["A Tormenta", "Caçador de Sombras"],
  },
  fantasia: {
    ANIME: ["Reino de Cinzas", "O Grimório Perdido", "Coração de Dragão"],
    MANGA: ["A Cidade Flutuante", "Jardins de Cristal"],
    MANHWA: ["Espinhos da Lua", "O Herdeiro dos Céus"],
  },
  comedia: {
    ANIME: ["Sala de Reuniões", "Minha Irmã é Treinadora", "Férias em Cartum"],
    MANGA: ["O Estagiário", "Papéis Trocados"],
    MANHWA: ["Aulas de Sábado", "Ninguém Mandou Rir"],
  },
  drama: {
    ANIME: ["Vinte e Um", "Cartas para a Primavera", "O Último Trem"],
    MANGA: ["A Mentira Certa", "Cicatrizes"],
    MANHWA: ["Recomeço", "O Preço da Família"],
  },
  aventura: {
    ANIME: ["Ilha do Eco", "A Rota das Estrelas", "Terra de Ninguém"],
    MANGA: ["O Mapa Mudo", "Meridiano 90"],
    MANHWA: ["A Frota Perdida", "Deserto Azul"],
  },
  misterio: {
    ANIME: ["O Caso da Biblioteca", "Número Três", "Silêncio no Andar"],
    MANGA: ["A Chave de Prata", "Diário Póstumo"],
    MANHWA: ["Pistas na Neve", "O Inquérito"],
  },
  suspense: {
    ANIME: ["A Última Chamada", "Segurança Máxima", "Jogo de Extremos"],
    MANGA: ["O Informante", "Hora Morta"],
    MANHWA: ["Sob Vigilância", "O Testemunho"],
  },
  scifi: {
    ANIME: ["Nave Terranova", "O Sinal de Próxima", "Protocolo Ômega"],
    MANGA: ["Cidade Orbital", "Os Últimos Humanos"],
    MANHWA: ["Realidade 2.0", "O Sistema"],
  },
  isekai: {
    ANIME: ["Reencarnado no Norte", "O Ferreiro de Outro Mundo", "Aventuras Além do Portal"],
    MANGA: ["O Herói Comum", "Mapa do Outro Reino"],
    MANHWA: ["Sob o Céu de Elendra", "Voltar para Casa"],
  },
  escolar: {
    ANIME: ["Aula Livre", "Conselho Estudantil", "O Caderno do Fundo"],
    MANGA: ["Intervalo", "Prova Final"],
    MANHWA: ["Clube da Rádio", "Primeiro Ano"],
  },
  esporte: {
    ANIME: ["O Lance Final", "Corrida Noturna", "Time das Cinco"],
    MANGA: ["O Maratonista", "Quadra Aberta"],
    MANHWA: ["A Rivalidade", "Gol de Ouro"],
  },
  historico: {
    ANIME: ["Século em Chamas", "O Império Silencioso", "Barco da Travessia"],
    MANGA: ["As Cartas de Guerra", "Aldeia do Rio"],
    MANHWA: ["A Coroa de Ferro", "Caminhos do Norte"],
  },
  outros: {
    ANIME: ["Antologia", "O Artesão", "Cozinha de Rua"],
    MANGA: ["Textos Avulsos", "O Músico"],
    MANHWA: ["Horizonte Aberto", "Enciclopédia do Absurdo"],
  },
};

const AVAILABILITY = [
  "Disponível",
  "Em exibição",
  "Completo",
  null,
  "Catálogo completo",
] as const;

const LANGUAGES = ["pt", "ja", "en", "ko", "fr"] as const;
const PLATFORMS = [
  "Crunchyroll",
  "Netflix",
  "Max",
  "Prime Video",
  "YouTube",
] as const;

const ALT_TITLES: Record<string, string> = {
  "Sangue de Aço": "Blood of Steel, Sangre de Acero",
  "Sala de Reuniões": "会議室",
  "Nave Terranova": "Terra Nova, Terranova 01",
  "O Lance Final": "Final Shot, 最終シュート",
  "Realidade 2.0": "Reality 2.0",
};

async function seedCatalog() {
  for (const genre of GENRES) {
    await prisma.genre.upsert({
      where: { name: genre.value },
      create: { name: genre.value },
      update: {},
    });
  }

  const existingWorks = await prisma.work.count();
  if (existingWorks > 0) {
    console.log("SEED: obras já existem no banco. Catálogo não alterado.");
    return;
  }

  let index = 0;
  for (const [genre, byType] of Object.entries(CATALOG_TITLES)) {
    for (const type of ["ANIME", "MANGA", "MANHWA"] as const) {
      for (const title of byType[type]) {
        index += 1;
        await prisma.work.create({
          data: {
            title,
            type,
            status: (["ONGOING", "COMPLETED", "HIATUS"] as const)[index % 3],
            ageRating: "LIVRE",
            year: 2014 + (index % 12),
            availability: AVAILABILITY[index % AVAILABILITY.length],
            titles: ALT_TITLES[title] ?? (index % 4 === 0 ? `Título alternativo ${index}` : null),
            language: LANGUAGES[index % LANGUAGES.length],
            platform: PLATFORMS[index % PLATFORMS.length],
            synopsis:
              `Uma história de ${genre} que conquista o público e acompanha o protagonista em jornadas marcantes.`,
            genres: {
              create: { genre: { connect: { name: genre } } },
            },
          },
        });
      }
    }
  }

  console.log(
    `SEED: catálogo criado com ${GENRES.length} gêneros e ${index} obras.`
  );
}

const EXAMPLE_NOTE =
  "Exemplo rotulado no seed — confirme a disponibilidade antes de compartilhar.";

const EXAMPLE_LINKS = [
  {
    title: "Nave Terranova",
    platform: "Crunchyroll",
    url: "https://www.crunchyroll.com/",
    country: "Brasil",
    flag: "🇧🇷",
    language: "pt",
    priceModel: "SUBSCRIPTION",
    dubbingStatus: "ANNOUNCED_FUTURE",
    subtitleAvailable: true,
  },
  {
    title: "O Lance Final",
    platform: "Netflix",
    url: "https://www.netflix.com/",
    country: "Brasil",
    flag: "🇧🇷",
    language: "pt",
    priceModel: "SUBSCRIPTION",
    dubbingStatus: "ACTUAL",
    subtitleAvailable: true,
  },
  {
    title: "O Lance Final",
    platform: "YouTube",
    url: "https://www.youtube.com/",
    country: "Japão",
    flag: "🇯🇵",
    language: "ja",
    priceModel: "FREE",
    dubbingStatus: "NONE",
    subtitleAvailable: true,
  },
  {
    title: "Cartas sem Remetente",
    platform: "LeYa",
    url: "https://www.leya.com/pt/",
    country: "Portugal",
    flag: "🇵🇹",
    language: "pt",
    priceModel: "PAID",
    dubbingStatus: "NONE",
    subtitleAvailable: false,
  },
] as const;

async function seedLinks() {
  const existing = await prisma.workExternalLink.count();
  if (existing > 0) return;

  const works = await prisma.work.findMany({ select: { id: true, title: true } });
  const byTitle = new Map(works.map((work) => [work.title, work.id]));

  for (const link of EXAMPLE_LINKS) {
    const workId = byTitle.get(link.title);
    if (!workId) continue;
    await prisma.workExternalLink.create({
      data: {
        workId,
        platform: link.platform,
        url: link.url,
        country: link.country,
        flag: link.flag,
        language: link.language,
        priceModel: link.priceModel,
        dubbingStatus: link.dubbingStatus,
        subtitleAvailable: link.subtitleAvailable,
        verified: false,
        note: EXAMPLE_NOTE,
      },
    });
  }

  console.log("SEED: links de exemplo criados (não verificados).");
}

async function seedEmojis() {
  const existing = await prisma.customEmoji.count();
  if (existing > 0) return;

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) return;

  const emojis = [
    {
      name: "Rato gamer",
      prompt: "um rato gamer agitando controle",
      imagePath: "/uploads/emojis/rato-gamer.svg",
      mime: "image/svg+xml",
    },
    {
      name: "Unicórnio",
      prompt: "um unicórnio estrelado fofo",
      imagePath: "/uploads/emojis/unicornio.svg",
      mime: "image/svg+xml",
    },
    {
      name: "Explosão",
      prompt: "explosão de natal com fogos",
      imagePath: "/uploads/emojis/explosao.svg",
      mime: "image/svg+xml",
    },
  ];

  for (const emoji of emojis) {
    await prisma.customEmoji.create({
      data: { userId: admin.id, ...emoji },
    });
  }

  console.log("SEED: emojis de exemplo criados para o administrador.");
}

main()
  .then(seedCatalog)
  .then(seedLinks)
  .then(seedEmojis)
  .catch((error) => {
    console.error("SEED: erro durante execução.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });