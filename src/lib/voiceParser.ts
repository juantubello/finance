const WORD_NUMBERS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, veinte: 20, treinta: 30, cuarenta: 40,
  cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400,
  quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800,
  novecientos: 900, mil: 1000, millón: 1000000, millones: 1000000,
};

export function parseVoiceInput(text: string): { amount: number | null; description: string } {
  const lower = text.toLowerCase().trim();

  // Try numeric match first
  const numMatch = lower.match(/(\d+[\.,]?\d*)/);
  let amount: number | null = numMatch
    ? parseFloat(numMatch[1].replace(",", "."))
    : null;

  // Try word-based number parsing if no numeric found
  if (!amount) {
    const words = lower.split(/\s+/);
    let acc = 0;
    let found = false;
    for (const w of words) {
      if (WORD_NUMBERS[w] !== undefined) {
        found = true;
        const val = WORD_NUMBERS[w];
        if (val === 1000) {
          acc = acc === 0 ? 1000 : acc * 1000;
        } else if (val >= 1000000) {
          acc = acc === 0 ? val : acc * val;
        } else {
          acc += val;
        }
      }
    }
    if (found && acc > 0) amount = acc;
  }

  // Extract description: text after "en" or "para", or full text minus numbers
  const descMatch = lower.split(/ en | para /);
  let description = descMatch.length > 1
    ? descMatch.slice(1).join(" ").trim()
    : lower.replace(/\d+[\.,]?\d*/g, "").replace(/\s+/g, " ").trim();

  // Clean common prefixes
  description = description
    .replace(/^(gasté|gaste|pagué|pague|compré|compre)\s*/i, "")
    .replace(/\s*(pesos|dólares|dolares)\s*/gi, "")
    .trim();

  return { amount, description: description || text };
}
