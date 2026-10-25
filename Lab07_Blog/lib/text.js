// Спрощена нормалізація українських словоформ для текстового індексу MongoDB.
// У вбудованого text-індексу немає стемінгу української мови (default_language: "none").

const ENDINGS = ["оями", "ями", "ами", "ого", "ому", "ої", "ій", "ий", "ою", "ах", "ів", "ам", "ях", "ом", "ем", "ю", "я", "а", "у", "і", "и", "е", "о"];

function stemWord(word) {
  const w = String(word || "").toLowerCase().replace(/['’`]/g, "");
  if (w.length < 5) return w;
  const sorted = ENDINGS.slice().sort((a, b) => b.length - a.length);
  for (const ending of sorted) {
    if (w.endsWith(ending) && w.length - ending.length >= 4) {
      return w.slice(0, -ending.length);
    }
  }
  return w;
}

function ukTokens(text) {
  const words = String(text || "")
    .toLowerCase()
    .split(/[^a-zа-яіїєґ0-9]+/)
    .filter((word) => word.length > 2);
  return Array.from(new Set(words.map(stemWord)));
}

function textSearchQuery(raw) {
  return ukTokens(raw).join(" ");
}

module.exports = { stemWord, ukTokens, textSearchQuery };
