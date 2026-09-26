"use server";

import { decorate, fetchSparseWorksByIds } from "@/lib/catalog";
import type { WorkCardItem } from "@/lib/catalog-data";
import { validateDiscoveryImage, saveDiscoveryImage } from "@/lib/discovery-files";
import { isAdultViewer } from "@/lib/content-gates";
import { requireUser } from "@/lib/dal";
import { searchCatalog, tokenize, type RankedResult } from "@/lib/search";
import {
  classifyVideoUrl,
  externalSearch,
  externalSearchEnabled,
  fetchVideoMeta,
} from "@/lib/webinfo";

export type ScoredCard = WorkCardItem & {
  confidence: number;
  matchedFields: string[];
};

async function cardsFromResults(
  results: RankedResult[],
  userId: string
): Promise<ScoredCard[]> {
  const adult = await isAdultViewer(userId);
  const ids = results.map((result) => result.workId);
  const sparse = await fetchSparseWorksByIds(ids, { adult });
  const cards = await decorate(sparse, userId);
  return cards.map((card, index) => {
    const rank = results[index];
    return {
      ...card,
      confidence: rank ? Math.round(rank.confidence * 1000) / 1000 : 0,
      matchedFields: rank?.matchedFields ?? [],
    };
  });
}

export type TextSearchInput = {
  q: string;
  type?: string;
  genres?: string[];
  status?: string;
  language?: string;
  platform?: string;
  skip?: number;
  take?: number;
};

export type TextSearchResult = {
  results: ScoredCard[];
  total: number;
  hasMore: boolean;
};

export async function textSearch(
  input: TextSearchInput
): Promise<TextSearchResult> {
  const user = await requireUser();
  const adult = await isAdultViewer(user.id);

  const ranked = await searchCatalog({
    text: input.q ?? "",
    filters: {
      type: input.type || undefined,
      genres: input.genres?.filter(Boolean),
      status: input.status || undefined,
      language: input.language || undefined,
      platform: input.platform || undefined,
    },
    skip: input.skip ?? 0,
    take: input.take ?? 20,
    minConfidence: input.q?.trim() ? 0.05 : 0.02,
    adult,
  });

  const results = await cardsFromResults(ranked.results, user.id);
  return { results, total: ranked.total, hasMore: ranked.hasMore };
}

export type VideoMetaState =
  | {
      ok: true;
      source: "oembed" | "opengraph";
      platform: string;
      title: string;
      description: string | null;
      author: string | null;
      thumbnail: string | null;
      pageUrl: string;
      visualAnalysis: false;
      notes: string;
    }
  | { ok: false; error: string; pageUrl: string; visualAnalysis: false };

export type VideoIdentifyState = {
  url: string;
  text: string;
  attempted: number;
  video: VideoMetaState | null;
  results: ScoredCard[];
  needMore: boolean;
  message: string | null;
};

export async function identifyByVideo(
  prev: VideoIdentifyState | undefined,
  formData: FormData
): Promise<VideoIdentifyState> {
  const user = await requireUser();
  const adult = await isAdultViewer(user.id);

  const url = String(formData.get("url") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const attempted = (prev?.attempted ?? 0) + 1;

  const classified = url
    ? classifyVideoUrl(url)
    : { error: "Informe um link de vídeo." };

  if ("error" in classified) {
    return {
      url,
      text,
      attempted,
      video: null,
      results: [],
      needMore: true,
      message: `O link de vídeo não foi aceito: ${classified.error}`,
    };
  }

  const video = await fetchVideoMeta(url);

  const parts: string[] = [text];
  if (video.ok) {
    parts.push(video.title, video.description ?? "", video.author ?? "");
  }
  const combined = parts.filter(Boolean).join(" ").trim();

  if (!combined) {
    return {
      url,
      text,
      attempted,
      video:
        video.ok
          ? { ...video, platform: video.platform }
          : { ok: false, error: video.error, pageUrl: video.pageUrl, visualAnalysis: false },
      results: [],
      needMore: true,
      message:
        "Não consegui identificar a obra só com esse link. Tente descrever a cena, os personagens ou adicione outros detalhes.",
    };
  }

  const ranked = await searchCatalog({
    text: combined,
    minConfidence: 0.05,
    take: 8,
    adult,
  });
  const results = await cardsFromResults(ranked.results, user.id);
  const top = ranked.results[0];
  const topOk = Boolean(top && top.confidence >= 0.35 && attempted < 3);

  return {
    url,
    text,
    attempted,
    video: video.ok
      ? {
          ok: true,
          source: video.source,
          platform: video.platform,
          title: video.title,
          description: video.description,
          author: video.author,
          thumbnail: video.thumbnail,
          pageUrl: video.pageUrl,
          visualAnalysis: false,
          notes: video.notes,
        }
      : { ok: false, error: video.error, pageUrl: video.pageUrl, visualAnalysis: false },
    results,
    needMore: attempted >= 3 && !topOk,
    message: null,
  };
}

export type ImageIdentifyState = {
  uploaded: string | null;
  imageUrl: string;
  text: string;
  attempted: number;
  visionAvailable: boolean;
  results: ScoredCard[];
  needMore: boolean;
  message: string | null;
};

export async function identifyByImage(
  prev: ImageIdentifyState | undefined,
  formData: FormData
): Promise<ImageIdentifyState> {
  const user = await requireUser();
  const adult = await isAdultViewer(user.id);

  const text = String(formData.get("text") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const attempted = (prev?.attempted ?? 0) + 1;

  const file = formData.get("image");
  let uploaded: string | null = null;
  let filenameTokens = "";

  if (file instanceof File && file.size > 0) {
    const check = await validateDiscoveryImage(file);
    if (!check.ok) {
      return {
        uploaded: null,
        imageUrl,
        text,
        attempted,
        visionAvailable: false,
        results: [],
        needMore: true,
        message: check.error,
      };
    }
    uploaded = await saveDiscoveryImage(file);
    const baseName = (file.name ?? "").replace(/\.[a-z0-9]+$/i, "");
    filenameTokens = tokenize(baseName).join(" ");
  }

  const combined = [text, filenameTokens].filter(Boolean).join(" ").trim();
  // Honest configuration: este servidor não tem modelo de reconhecimento visual ativo.
  const visionAvailable = false;

  if (!combined) {
    return {
      uploaded,
      imageUrl,
      text,
      attempted,
      visionAvailable,
      results: [],
      needMore: true,
      message:
        "Este servidor ainda não tem reconhecimento automático de imagens ativo. " +
        "Combine a imagem com uma descrição ou um link de vídeo para buscar no catálogo.",
    };
  }

  const ranked = await searchCatalog({
    text: combined,
    minConfidence: 0.05,
    take: 8,
    adult,
  });
  const results = await cardsFromResults(ranked.results, user.id);

  return {
    uploaded,
    imageUrl,
    text,
    attempted,
    visionAvailable,
    results,
    needMore: attempted >= 3 && ranked.results.length > 0 && ranked.results[0].confidence < 0.35,
    message:
      ranked.results.length === 0
        ? "Nenhuma obra encontrada no catálogo com essas informações."
        : null,
  };
}

export type AjudaSource = { label: string; url: string };

export type AjudaState = {
  description: string;
  videoUrl: string;
  uploaded: string | null;
  attempted: number;
  answer: string | null;
  results: ScoredCard[];
  sources: AjudaSource[];
  externalAvailable: boolean;
  needMore: boolean;
  error: string | null;
};

function buildAnswer(input: {
  text: string;
  videoTitle: string | null;
  topScore: number | null;
  totalFound: number;
  reasons: string[];
  attempts: number;
}): string {
  const { text, videoTitle, topScore, totalFound, reasons, attempts } = input;
  const withVideo = videoTitle ? ` (usando também o vídeo "${videoTitle}")` : "";
  if (totalFound === 0) {
    return `Não encontrei nada correspondente no catálogo com "${text}"${withVideo}. Não invento respostas: se a obra ainda não está cadastrada, nada aparece.`;
  }
  const scoreText =
    topScore === null
      ? ""
      : ` A melhor correspondência aparece com confiança estimada de ${Math.round(topScore * 100)}%.`;
  let base =
    `Encontrei ${totalFound} possível(is) obra(s) no catálogo para "${text}"${withVideo}${scoreText}`;
  if (reasons.length > 0) {
    base += ` (com base em ${reasons.join(", ")})`;
  }
  base +=
    ". A confiança é uma estimativa da busca local, não uma certeza — revise.'";
  if (attempts >= 3) {
    base +=
      " Recomendo adicionar mais detalhes (personagens, cenário, época, canal/perfil do vídeo) para melhorar.";
  }
  return base;
}

export async function askAjuda(
  prev: AjudaState | undefined,
  formData: FormData
): Promise<AjudaState> {
  const user = await requireUser();
  const adult = await isAdultViewer(user.id);

  const description = String(formData.get("description") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const attempted = (prev?.attempted ?? 0) + 1;

  const file = formData.get("image");
  let uploaded: string | null = null;
  let filenameTokens = "";
  if (file instanceof File && file.size > 0) {
    const check = await validateDiscoveryImage(file);
    if (!check.ok) {
      return {
        description,
        videoUrl,
        uploaded: null,
        attempted,
        answer: null,
        results: [],
        sources: [],
        externalAvailable: externalSearchEnabled(),
        needMore: true,
        error: check.error,
      };
    }
    uploaded = await saveDiscoveryImage(file);
    filenameTokens = tokenize((file.name ?? "").replace(/\.[a-z0-9]+$/i, "")).join(" ");
  }

  const video = videoUrl ? await fetchVideoMeta(videoUrl) : null;

  const parts = [
    description,
    video?.ok ? video.title : null,
    video?.ok ? video.description : null,
    video?.ok ? video.author : null,
    filenameTokens,
  ];
  const combined = parts.filter(Boolean).join(" ").trim();

  let queryForRank = combined;
  if (attempted >= 2) {
    queryForRank = tokenize(combined)
      .filter((token) => token.length >= 4)
      .join(" ");
  }
  if (attempted >= 3) {
    queryForRank = tokenize(combined).slice(0, 3).join(" ");
  }

  const ranked = await searchCatalog({
    text: queryForRank,
    minConfidence: 0.03,
    take: 8,
    adult,
  });
  const results = await cardsFromResults(ranked.results, user.id);
  const top = ranked.results[0];
  const topOk = Boolean(top && top.confidence >= 0.45);
  const needMore = attempted >= 3 && !topOk;

  const reasons: string[] = [];
  if (ranked.results.length > 0) {
    reasons.push(
      ...ranked.results
        .slice(0, 3)
        .flatMap((result) => result.matchedFields)
        .filter((field, index, all) => all.indexOf(field) === index)
        .slice(0, 3)
    );
  }

  const sources: AjudaSource[] = results.slice(0, 5).map((card) => ({
    label: `${card.title} — catálogo`,
    url: `/obras/${card.id}`,
  }));

  if (externalSearchEnabled() && combined) {
    const externalResult = await externalSearch(combined, 5);
    if ("items" in externalResult) {
      sources.push(
        ...externalResult.items.map((item) => ({
          label: item.title,
          url: item.url,
        }))
      );
    }
  }

  const answer = buildAnswer({
    text: description || combined,
    videoTitle: video?.ok ? video.title : null,
    topScore: top ? top.confidence : null,
    totalFound: ranked.total,
    reasons,
    attempts: attempted,
  });

  return {
    description,
    videoUrl,
    uploaded,
    attempted,
    answer,
    results,
    sources,
    externalAvailable: externalSearchEnabled(),
    needMore,
    error: null,
  };
}