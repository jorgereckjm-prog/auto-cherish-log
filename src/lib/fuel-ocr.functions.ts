import { createServerFn } from "@tanstack/react-start";

export type FuelReceiptRead = {
  placa: string | null;
  data: string | null; // YYYY-MM-DD
  km: number | null;
  litros: number | null;
  valorLitro: number | null;
  valorTotal: number | null;
  posto: string | null;
  observacoes: string | null;
};

const PROMPT = `Você é um leitor de comprovantes de abastecimento brasileiros (cupom fiscal, nota, recibo de posto).
Extraia os campos do comprovante da imagem. Regras:
- placa: placa do veículo no formato ABC1D23 ou ABC-1234, apenas se aparecer no comprovante.
- data: no formato YYYY-MM-DD.
- km: hodômetro/quilometragem do veículo (número inteiro, sem pontos). Muitas vezes aparece como "KM", "HODOMETRO" ou escrito à mão.
- litros: quantidade abastecida (use ponto decimal).
- valorLitro: preço por litro em reais.
- valorTotal: valor total pago em reais.
- posto: nome do posto/estabelecimento.
- observacoes: qualquer detalhe útil (tipo de combustível, placa manuscrita, etc).
Se um campo não estiver legível ou não existir, retorne null. Nunca invente valores.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    placa: { type: ["string", "null"] },
    data: { type: ["string", "null"] },
    km: { type: ["number", "null"] },
    litros: { type: ["number", "null"] },
    valorLitro: { type: ["number", "null"] },
    valorTotal: { type: ["number", "null"] },
    posto: { type: ["string", "null"] },
    observacoes: { type: ["string", "null"] },
  },
  required: ["placa", "data", "km", "litros", "valorLitro", "valorTotal", "posto", "observacoes"],
} as const;

export const readFuelReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: { imageDataUrl: string }) => {
    if (!input?.imageDataUrl?.startsWith("data:image/")) {
      throw new Error("Imagem inválida.");
    }
    return input;
  })
  .handler(async ({ data }): Promise<FuelReceiptRead> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Serviço de leitura indisponível no momento.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "comprovante", strict: true, schema: SCHEMA },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Muitas leituras seguidas. Aguarde alguns segundos e tente novamente.");
      if (res.status === 402) throw new Error("Os créditos de IA do espaço de trabalho acabaram. Adicione créditos para continuar usando a leitura automática.");
      if (res.status === 403) throw new Error("A leitura por IA está bloqueada nas configurações do espaço de trabalho.");
      throw new Error(`Não foi possível ler o comprovante (${res.status}). ${body.slice(0, 180)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: Partial<FuelReceiptRead> = {};
    try {
      parsed = JSON.parse(content) as Partial<FuelReceiptRead>;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]) as Partial<FuelReceiptRead>; } catch { parsed = {}; }
      }
    }

    const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

    return {
      placa: str(parsed.placa),
      data: str(parsed.data),
      km: num(parsed.km),
      litros: num(parsed.litros),
      valorLitro: num(parsed.valorLitro),
      valorTotal: num(parsed.valorTotal),
      posto: str(parsed.posto),
      observacoes: str(parsed.observacoes),
    };
  });
