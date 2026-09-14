import { createServerFn } from "@tanstack/react-start";

export type FuelConfidence = {
  placa: number;
  combustivel: number;
  preco_litro: number;
  litros: number;
  valor_total: number;
  quilometragem: number;
};

export type FuelReceiptRead = {
  placa: string | null;
  combustivel: string | null;
  preco_litro: number | null;
  litros: number | null;
  valor_total: number | null;
  quilometragem: number | null;
  data: string | null; // YYYY-MM-DD
  hora: string | null; // HH:MM
  posto: string | null;
  cnpj_posto: string | null;
  observacoes: string | null;
  confianca: FuelConfidence;
  /** diagnóstico: qual tentativa/modelo funcionou */
  tentativa: number;
  modelo: string;
};

const PROMPT = `Você é um especialista em leitura (OCR) de cupons fiscais e comprovantes de abastecimento brasileiros.
Leia a imagem com máxima atenção, mesmo que esteja torta, escura, amassada ou com impressão fraca.

Procure SEMANTICAMENTE por estes termos e suas abreviações, em qualquer posição do documento:
PLACA, VEICULO, KM, HODOMETRO, ODOMETRO, QUANTIDADE, QTDE, QTD, LITROS, L, PRECO, PRECO/L, VL UNIT, UNITARIO,
VALOR, TOTAL, VALOR TOTAL, GASOLINA, GAS COMUM, ADITIVADA, ETANOL, ALCOOL, DIESEL S10, DIESEL, GNV, COMBUSTIVEL,
CNPJ, DATA, HORA. Nunca use posição fixa do texto: o layout muda de posto para posto.

Regras de OCR (evite confusões clássicas):
- Não confunda O com 0, I com 1, S com 5, B com 8, Z com 2, vírgula com ponto.
- Placa brasileira: padrão Mercosul (ABC1D23) ou antigo (ABC1234). Normalize removendo espaços, hífens e símbolos.
  A placa pode estar impressa ou escrita à mão.
- Valores em reais usam vírgula decimal: "R$ 6,99" => 6.99 ; "R$ 349,77" => 349.77.
- Litros usam vírgula decimal e podem ter 3 casas: "50,039 L" => 50.039.
- Quilometragem usa ponto de milhar: "92.125" => 92125 (número inteiro, sem separador).
- Data no formato YYYY-MM-DD; hora no formato HH:MM (24h).

Coerência: litros × preco_litro deve ficar próximo de valor_total. Se sua leitura não fechar, releia a imagem
e corrija o campo mais provável de estar errado antes de responder.

Preencha "confianca" com um número de 0 a 100 por campo, refletindo o quanto você realmente enxergou o dado
na imagem (0 quando o campo não existe ou está ilegível). Nunca invente valores: use null quando não houver dado.
Responda SOMENTE com o JSON pedido, sem texto adicional.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    placa: { type: ["string", "null"] },
    combustivel: { type: ["string", "null"] },
    preco_litro: { type: ["number", "null"] },
    litros: { type: ["number", "null"] },
    valor_total: { type: ["number", "null"] },
    quilometragem: { type: ["number", "null"] },
    data: { type: ["string", "null"] },
    hora: { type: ["string", "null"] },
    posto: { type: ["string", "null"] },
    cnpj_posto: { type: ["string", "null"] },
    observacoes: { type: ["string", "null"] },
    confianca: {
      type: "object",
      additionalProperties: false,
      properties: {
        placa: { type: "number" },
        combustivel: { type: "number" },
        preco_litro: { type: "number" },
        litros: { type: "number" },
        valor_total: { type: "number" },
        quilometragem: { type: "number" },
      },
      required: ["placa", "combustivel", "preco_litro", "litros", "valor_total", "quilometragem"],
    },
  },
  required: [
    "placa", "combustivel", "preco_litro", "litros", "valor_total",
    "quilometragem", "data", "hora", "posto", "cnpj_posto", "observacoes", "confianca",
  ],
} as const;

type Raw = Partial<Omit<FuelReceiptRead, "confianca">> & { confianca?: Partial<FuelConfidence> };

const num = (v: unknown): number | null => {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.replace(/[^\d.,-]/g, "");
    const n = parseFloat(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
    if (isFinite(n)) return n;
  }
  return null;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const conf = (v: unknown): number => {
  const n = num(v);
  if (n === null) return 0;
  return n <= 1 ? Math.round(n * 100) : Math.min(100, Math.round(n));
};

function normalize(parsed: Raw, tentativa: number, modelo: string): FuelReceiptRead {
  const placaRaw = str(parsed.placa);
  const placa = placaRaw
    ? placaRaw.toUpperCase().replace(/[^A-Z0-9]/g, "")
    : null;
  let km = num(parsed.quilometragem);
  if (km !== null) km = Math.round(km);
  const c = parsed.confianca ?? {};
  return {
    placa: placa && /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa) ? placa : placa,
    combustivel: str(parsed.combustivel),
    preco_litro: num(parsed.preco_litro),
    litros: num(parsed.litros),
    valor_total: num(parsed.valor_total),
    quilometragem: km,
    data: str(parsed.data),
    hora: str(parsed.hora),
    posto: str(parsed.posto),
    cnpj_posto: str(parsed.cnpj_posto),
    observacoes: str(parsed.observacoes),
    confianca: {
      placa: conf(c.placa),
      combustivel: conf(c.combustivel),
      preco_litro: conf(c.preco_litro),
      litros: conf(c.litros),
      valor_total: conf(c.valor_total),
      quilometragem: conf(c.quilometragem),
    },
    tentativa,
    modelo,
  };
}

function hasSomething(r: FuelReceiptRead) {
  return (
    r.placa !== null ||
    r.litros !== null ||
    r.valor_total !== null ||
    r.quilometragem !== null ||
    r.preco_litro !== null
  );
}

async function askModel(apiKey: string, model: string, imageUrl: string): Promise<Raw> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "comprovante_abastecimento", strict: true, schema: SCHEMA },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Muitas leituras seguidas. Aguarde alguns segundos e tente novamente.");
    if (res.status === 402) throw new Error("Os créditos de IA do espaço de trabalho acabaram. Adicione créditos para continuar usando a leitura automática.");
    if (res.status === 403) throw new Error("A leitura por IA está bloqueada nas configurações do espaço de trabalho.");
    throw new Error(`Falha na leitura (${res.status}). ${body.slice(0, 180)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(content) as Raw;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as Raw; } catch { /* ignore */ }
    }
    return {};
  }
}

/**
 * Lê um comprovante de abastecimento.
 * Recebe até 3 variações da mesma foto (original, tratada, recortada) já hospedadas
 * em URL — evita enviar imagens grandes em base64, que estouravam o limite da requisição.
 */
export const readFuelReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: { imageUrls: string[] }) => {
    const urls = (input?.imageUrls ?? []).filter((u) => typeof u === "string" && /^https?:\/\//.test(u));
    if (!urls.length) throw new Error("Nenhuma imagem válida foi enviada para leitura.");
    return { imageUrls: urls.slice(0, 3) };
  })
  .handler(async ({ data }): Promise<FuelReceiptRead> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Serviço de leitura indisponível no momento.");

    const models = ["google/gemini-3.8-flash", "google/gemini-3.1-pro-preview"];
    let last: FuelReceiptRead | null = null;
    let lastError: Error | null = null;
    let tentativa = 0;

    for (let i = 0; i < data.imageUrls.length; i++) {
      for (const model of models) {
        tentativa++;
        try {
          const parsed = await askModel(apiKey, model, data.imageUrls[i]);
          const result = normalize(parsed, tentativa, model);
          last = result;
          if (hasSomething(result)) return result;
        } catch (e) {
          lastError = e instanceof Error ? e : new Error("Falha na leitura.");
          // limites de uso não melhoram com nova tentativa
          if (/créditos|bloqueada/i.test(lastError.message)) throw lastError;
        }
      }
    }

    if (last) return last;
    throw lastError ?? new Error("Não foi possível interpretar o comprovante.");
  });
