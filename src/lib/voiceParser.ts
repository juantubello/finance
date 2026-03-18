const WORD_NUMBERS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciséis: 16, dieciseis: 16,
  diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidós: 22, veintidos: 22, veintitrés: 23,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiséis: 26,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
  setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100,
  doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500,
  seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700,
  ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};

function wordsToNumber(words: string[]): number | null {
  let total = 0;
  let current = 0;
  let found = false;

  for (const w of words) {
    if (w === "mil") {
      found = true;
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else if (w === "millón" || w === "millones" || w === "millon") {
      found = true;
      total += (current === 0 ? 1 : current) * 1_000_000;
      current = 0;
    } else if (WORD_NUMBERS[w] !== undefined) {
      found = true;
      const val = WORD_NUMBERS[w];
      if (val === 100 && current > 0 && current < 10) {
        current *= 100;
      } else {
        current += val;
      }
    }
  }

  total += current;
  return found && total > 0 ? total : null;
}

/**
 * Parse an amount from a voice transcript.
 * Key strategy: detect "mil" / "millones" as multiplier words FIRST,
 * then find any numeric value (digits or words) and apply the multiplier.
 */
export function parseAmountOnly(transcript: string): number | null {
  const s = transcript.toLowerCase().trim();
  console.log("[Voice Amount STT]:", s);

  // Detect multiplier words present anywhere in the transcript
  const hasMillon = /\bmillon(?:es)?\b|\bmillón\b/.test(s);
  const hasMil = !hasMillon && /\bmil\b/.test(s);
  const multiplier = hasMillon ? 1_000_000 : hasMil ? 1_000 : 1;

  // Try digit-based number first (STT often converts words to digits)
  // Remove the multiplier word so it doesn't confuse the digit extraction
  const withoutMul = s
    .replace(/\bmillones?\b|\bmillón\b|\bmillon\b/g, "")
    .replace(/\bmil\b/g, "")
    .trim();

  const digitMatch = withoutMul.match(/\b(\d[\d.,]*)\b/);
  if (digitMatch) {
    // Handle Argentine dot-thousands "150.000" vs plain decimal "1.5"
    const raw = digitMatch[1];
    let n: number;
    if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
      // Argentine dot-thousands: "150.000" → 150000
      n = parseFloat(raw.replace(/\./g, ""));
    } else if (/^\d{1,3}(,\d{3})+$/.test(raw)) {
      // US comma-thousands (STT on iOS/Android): "50,000" → 50000
      n = parseFloat(raw.replace(/,/g, ""));
    } else {
      // Plain number: "150", "1.5"
      n = parseFloat(raw.replace(",", "."));
    }
    if (!isNaN(n)) return n * multiplier;
  }

  // Handle space-thousands "150 000" → 150000
  const spaceMatch = withoutMul.match(/\b(\d{1,3}(?:\s\d{3})+)\b/);
  if (spaceMatch) {
    const n = parseFloat(spaceMatch[1].replace(/\s/g, ""));
    if (!isNaN(n)) return n * multiplier;
  }

  // Full word-based parsing ("ciento cincuenta mil" handled entirely by wordsToNumber)
  const wordResult = wordsToNumber(s.split(/[\s,]+/).filter(Boolean));
  if (wordResult !== null) return wordResult;

  return null;
}

export function parseVoiceInput(transcript: string): { amount: number | null; description: string } {
  console.log("[Voice STT]:", transcript);
  const lower = transcript.toLowerCase().trim();

  const amount = parseAmountOnly(transcript);

  // Extract description: text after "en" or "para"
  const descMatch = lower.split(/ en | para /);
  let description = descMatch.length > 1
    ? descMatch.slice(1).join(" ").trim()
    : lower.replace(/[\d.,]+/g, "").replace(/\s+/g, " ").trim();

  // Remove number words from description
  const numWordKeys = [...Object.keys(WORD_NUMBERS), "mil", "millón", "millones", "millon"];
  const numRe = new RegExp(`\\b(${numWordKeys.join("|")})\\b`, "gi");
  description = description.replace(numRe, "").replace(/\s+/g, " ").trim();

  description = description
    .replace(/^(gasté|gaste|pagué|pague|compré|compre|gasto)\s*/i, "")
    .replace(/\s*(pesos|dólares|dolares|ars|usd)\s*/gi, "")
    .trim();

  return { amount, description: description || transcript };
}
