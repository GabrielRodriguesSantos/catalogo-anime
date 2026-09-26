const TIME_UNITS: [seconds: number, singular: string, plural: string][] = [
  [31536000, "ano", "anos"],
  [2592000, "mês", "meses"],
  [86400, "dia", "dias"],
  [3600, "hora", "horas"],
  [60, "minuto", "minutos"],
];

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

export function timeSince(
  date: Date,
  now: number = Date.now()
): string {
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return "menos de um minuto";

  for (const [unitSeconds, singular, plural] of TIME_UNITS) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) {
      return `há ${value} ${value === 1 ? singular : plural}`;
    }
  }

  return "há pouco tempo";
}