import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Upload, Loader2, Trash2, Pencil, Download, Fuel, Plus, AlertTriangle, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { newId, formatBRL, formatDate, type Vehicle, type Fueling } from "@/lib/fleet-store";
import { usePermissions } from "@/lib/permissions";
import { readFuelReceipt, type FuelReceiptRead } from "@/lib/fuel-ocr.functions";
import { prepareReceiptVariants, uploadReceipt, receiptSignedUrl } from "@/lib/receipt-image";

const kmFmt = (n: number) => Math.round(n).toLocaleString("pt-BR");
const parseKm = (v: string) => {
  const digits = v.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
};
const parseDec = (v: string) => {
  const s = v.trim();
  if (!s) return 0;
  const n = parseFloat(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return isFinite(n) ? n : 0;
};
const dec = (n: number, casas = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });
const normPlaca = (p: string) => p.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const ACEITOS = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

type Draft = {
  id: string;
  vehicleId: string;
  data: string;
  hora: string;
  km: string;
  combustivel: string;
  litros: string;
  valorLitro: string;
  valorTotal: string;
  posto: string;
  cnpjPosto: string;
  observacoes: string;
  origem: "foto" | "manual";
  comprovantePath?: string;
  dadosIa?: Record<string, unknown>;
  lidoEm?: string;
};

const emptyDraft = (): Draft => ({
  id: newId(),
  vehicleId: "",
  data: new Date().toISOString().slice(0, 10),
  hora: "",
  km: "",
  combustivel: "",
  litros: "",
  valorLitro: "",
  valorTotal: "",
  posto: "",
  cnpjPosto: "",
  observacoes: "",
  origem: "manual",
});

type Conf = FuelReceiptRead["confianca"];
const emptyConf: Conf = { placa: 100, combustivel: 100, preco_litro: 100, litros: 100, valor_total: 100, quilometragem: 100 };

/** cor do campo conforme a confiança da leitura */
function confClass(c: number) {
  if (c >= 85) return "";
  if (c >= 60) return "border-amber-400 bg-amber-50 dark:bg-amber-950/30";
  return "border-red-400 bg-red-50 dark:bg-red-950/30";
}
function ConfHint({ c }: { c: number }) {
  if (c >= 85) return null;
  return (
    <p className={`text-[11px] ${c >= 60 ? "text-amber-600" : "text-red-600"}`}>
      {c >= 60 ? "Verifique este dado." : "Leitura duvidosa — confirme manualmente."}
    </p>
  );
}

export function FuelTab({
  vehicles, fuelings, saveFueling, deleteFueling,
}: {
  vehicles: Vehicle[];
  fuelings: Fueling[];
  saveFueling: (f: Fueling) => void;
  deleteFueling: (id: string) => void;
}) {
  const { canEdit, email } = usePermissions();
  const [filterVehicle, setFilterVehicle] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [inicial, setInicial] = useState<Draft | null>(null);
  const [conf, setConf] = useState<Conf>(emptyConf);
  const [preview, setPreview] = useState<string | null>(null);
  const [placaLida, setPlacaLida] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const vehicleName = (id: string) => vehicles.find((v) => v.id === id)?.nome ?? "—";

  const filtered = useMemo(() => {
    return fuelings
      .filter((f) => (filterVehicle === "all" ? true : f.vehicleId === filterVehicle))
      .filter((f) => (filterMonth ? f.data.startsWith(filterMonth) : true))
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [fuelings, filterVehicle, filterMonth]);

  const totalLitros = filtered.reduce((s, f) => s + f.litros, 0);
  const totalValor = filtered.reduce((s, f) => s + f.valorTotal, 0);

  const media = useMemo(() => {
    const byVehicle = new Map<string, Fueling[]>();
    for (const f of fuelings) {
      const arr = byVehicle.get(f.vehicleId) ?? [];
      arr.push(f);
      byVehicle.set(f.vehicleId, arr);
    }
    let kmTotal = 0;
    let litrosTotal = 0;
    for (const [vid, arr] of byVehicle) {
      if (filterVehicle !== "all" && vid !== filterVehicle) continue;
      const sorted = [...arr].sort((a, b) => a.km - b.km);
      for (let i = 1; i < sorted.length; i++) {
        const d = sorted[i].km - sorted[i - 1].km;
        if (d > 0 && d < 5000 && sorted[i].litros > 0) {
          kmTotal += d;
          litrosTotal += sorted[i].litros;
        }
      }
    }
    return litrosTotal > 0 ? kmTotal / litrosTotal : null;
  }, [fuelings, filterVehicle]);

  /** validação matemática: litros x preço ≈ total */
  const contaOk = useMemo(() => {
    const l = parseDec(draft.litros);
    const p = parseDec(draft.valorLitro);
    const t = parseDec(draft.valorTotal);
    if (!l || !p || !t) return null;
    const esperado = l * p;
    const tolerancia = Math.max(0.05, esperado * 0.02);
    return Math.abs(esperado - t) <= tolerancia;
  }, [draft.litros, draft.valorLitro, draft.valorTotal]);

  const veiculoDraft = vehicles.find((v) => v.id === draft.vehicleId);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACEITOS.includes(file.type.toLowerCase())) {
      toast.error("Formato não aceito. Envie a foto em JPG, PNG ou WEBP.");
      return;
    }
    setLoading(true);
    setAvisos([]);
    setPlacaLida(null);
    setConf(emptyConf);
    let path: string | undefined;
    let previewUrl: string | null = null;

    try {
      setEtapa("Preparando a foto...");
      const variants = await prepareReceiptVariants(file);
      previewUrl = variants.previewUrl;
      setPreview(variants.previewUrl);

      setEtapa("Enviando a foto...");
      const original = await uploadReceipt(variants.original, "original");
      path = original.path;
      const urls = [original.signedUrl];
      const tratada = await uploadReceipt(variants.enhanced, "tratada");
      urls.push(tratada.signedUrl);
      if (variants.cropped) {
        const recorte = await uploadReceipt(variants.cropped, "recorte");
        urls.push(recorte.signedUrl);
      }

      setEtapa("Lendo o comprovante...");
      const r = await readFuelReceipt({ data: { imageUrls: urls } });

      const d = emptyDraft();
      d.origem = "foto";
      d.comprovantePath = path;
      d.lidoEm = new Date().toISOString();
      d.dadosIa = r as unknown as Record<string, unknown>;
      if (r.data) d.data = r.data;
      if (r.hora) d.hora = r.hora;
      if (r.quilometragem) d.km = kmFmt(r.quilometragem);
      if (r.combustivel) d.combustivel = r.combustivel;
      if (r.litros) d.litros = dec(r.litros, 3);
      if (r.preco_litro) d.valorLitro = dec(r.preco_litro, 3);
      if (r.valor_total) d.valorTotal = dec(r.valor_total, 2);
      if (r.posto) d.posto = r.posto;
      if (r.cnpj_posto) d.cnpjPosto = r.cnpj_posto;
      if (r.observacoes) d.observacoes = r.observacoes;

      const msgs: string[] = [];
      if (r.placa) {
        setPlacaLida(r.placa);
        const v = vehicles.find((x) => normPlaca(x.placa) === normPlaca(r.placa!));
        if (v) d.vehicleId = v.id;
        else msgs.push(`Placa identificada (${r.placa}), mas o veículo não está cadastrado. Escolha o veículo na lista.`);
      } else {
        msgs.push("Não foi possível ler a placa. Escolha o veículo na lista.");
      }
      if (!r.quilometragem) msgs.push("A quilometragem não foi encontrada no comprovante — preencha manualmente.");
      if (!r.litros && !r.valor_total) msgs.push("Os valores do abastecimento não foram lidos. Complete os campos olhando a foto ao lado.");

      setConf(r.confianca);
      setAvisos(msgs);
      setDraft(d);
      setInicial(d);
      setOpen(true);
    } catch (e) {
      // nunca deixa o usuário sem saída: abre o lançamento manual com a foto
      const d = emptyDraft();
      d.origem = "foto";
      if (path) d.comprovantePath = path;
      setDraft(d);
      setInicial(d);
      setPreview(previewUrl);
      setAvisos([
        e instanceof Error ? e.message : "Não foi possível ler o comprovante automaticamente.",
        "Confira a foto ao lado e preencha os dados manualmente.",
      ]);
      setOpen(true);
    } finally {
      setLoading(false);
      setEtapa("");
      if (fileRef.current) fileRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    }
  }

  function openManual() {
    setPreview(null);
    setAvisos([]);
    setPlacaLida(null);
    setConf(emptyConf);
    const d = emptyDraft();
    setDraft(d);
    setInicial(d);
    setOpen(true);
  }

  async function openEdit(f: Fueling) {
    setAvisos([]);
    setPlacaLida(null);
    setConf(emptyConf);
    const d: Draft = {
      id: f.id,
      vehicleId: f.vehicleId,
      data: f.data,
      hora: f.hora ?? "",
      km: kmFmt(f.km),
      combustivel: f.combustivel ?? "",
      litros: dec(f.litros, 3),
      valorLitro: dec(f.valorLitro, 3),
      valorTotal: dec(f.valorTotal, 2),
      posto: f.posto ?? "",
      cnpjPosto: f.cnpjPosto ?? "",
      observacoes: f.observacoes ?? "",
      origem: f.origem ?? "manual",
      comprovantePath: f.comprovantePath,
      dadosIa: f.dadosIa,
      lidoEm: f.lidoEm,
    };
    setDraft(d);
    setInicial(d);
    setPreview(null);
    setOpen(true);
    if (f.comprovantePath) {
      const url = await receiptSignedUrl(f.comprovantePath);
      if (url) setPreview(url);
    }
  }

  function confirmar() {
    const km = parseKm(draft.km);
    const litros = parseDec(draft.litros);
    const valorLitro = parseDec(draft.valorLitro);
    let valorTotal = parseDec(draft.valorTotal);
    if (!draft.vehicleId) return toast.error("Escolha o veículo.");
    if (!draft.data) return toast.error("Informe a data do abastecimento.");
    if (km <= 0) return toast.error("Informe a quilometragem.");
    if (litros <= 0) return toast.error("Informe a quantidade de litros.");
    if (!valorTotal && litros && valorLitro) valorTotal = +(litros * valorLitro).toFixed(2);
    if (contaOk === false) {
      return toast.error("Os valores lidos não conferem. Verifique o comprovante.", {
        description: `${dec(litros, 3)} L × ${formatBRL(valorLitro)} = ${formatBRL(+(litros * valorLitro).toFixed(2))}, mas o total informado é ${formatBRL(valorTotal)}.`,
      });
    }

    const dup = fuelings.find(
      (f) => f.id !== draft.id && f.vehicleId === draft.vehicleId && f.data === draft.data && Math.abs(f.km - km) < 2,
    );
    if (dup) return toast.error("Já existe um abastecimento igual para este veículo nesta data.");

    const v = vehicles.find((x) => x.id === draft.vehicleId);
    if (v && km < v.kmAtual) {
      toast.warning(`KM informada (${kmFmt(km)}) é menor que a atual do veículo (${kmFmt(v.kmAtual)}). O registro foi salvo, mas a KM do veículo não mudou.`);
    }

    const corrigidos = inicial
      ? (Object.keys(draft) as (keyof Draft)[]).filter(
          (k) => !["id", "dadosIa", "lidoEm", "comprovantePath", "origem"].includes(k) && draft[k] !== inicial[k],
        ).map(String)
      : [];

    saveFueling({
      id: draft.id,
      vehicleId: draft.vehicleId,
      data: draft.data,
      hora: draft.hora || undefined,
      km,
      litros,
      valorLitro: valorLitro || (litros ? +(valorTotal / litros).toFixed(3) : 0),
      valorTotal,
      combustivel: draft.combustivel || undefined,
      posto: draft.posto || undefined,
      cnpjPosto: draft.cnpjPosto || undefined,
      observacoes: draft.observacoes || undefined,
      origem: draft.origem,
      comprovantePath: draft.comprovantePath,
      lidoEm: draft.lidoEm,
      lidoPor: email || undefined,
      dadosIa: draft.dadosIa,
      camposCorrigidos: corrigidos.length ? corrigidos : undefined,
    });
    toast.success("Abastecimento salvo e quilometragem atualizada.");
    setOpen(false);
    setPreview(null);
  }

  function exportCsv() {
    const rows = [
      ["Data", "Hora", "Veículo", "Placa", "KM", "Combustível", "Litros", "Valor/L", "Total", "Posto", "CNPJ", "Origem", "Observações"],
      ...filtered.map((f) => {
        const v = vehicles.find((x) => x.id === f.vehicleId);
        return [
          formatDate(f.data), f.hora ?? "", v?.nome ?? "", v?.placa ?? "",
          String(f.km), f.combustivel ?? "", String(f.litros), String(f.valorLitro), String(f.valorTotal),
          f.posto ?? "", f.cnpjPosto ?? "", f.origem === "foto" ? "Leitura de comprovante" : "Manual",
          (f.observacoes ?? "").replace(/[\r\n]+/g, " "),
        ];
      }),
      ["", "", "", "", "", "", String(totalLitros.toFixed(2)), "", String(totalValor.toFixed(2)), "", "", "", ""],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `abastecimentos${filterMonth ? "-" + filterMonth : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function verComprovante(f: Fueling) {
    if (!f.comprovantePath) return;
    const url = await receiptSignedUrl(f.comprovantePath);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("Não foi possível abrir a foto do comprovante.");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Fuel className="size-4" /> Abastecimentos</CardTitle>
              <CardDescription>Envie a foto do comprovante (JPG, PNG ou WEBP): o sistema lê placa, data, KM, litros e valores para você conferir.</CardDescription>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2 flex-wrap">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                <Button size="sm" onClick={() => fileRef.current?.click()} disabled={loading} className="gap-1.5">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {loading ? etapa || "Lendo comprovante..." : "Enviar comprovante"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => camRef.current?.click()} disabled={loading} className="gap-1.5">
                  <Camera className="size-4" /> Câmera
                </Button>
                <Button size="sm" variant="ghost" onClick={openManual} className="gap-1.5">
                  <Plus className="size-4" /> Manual
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Veículo</Label>
              <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os veículos</SelectItem>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome} · {v.placa}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mês</Label>
              <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="h-9 w-40" />
            </div>
            <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5 h-9" disabled={!filtered.length}>
              <Download className="size-4" /> Exportar
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Abastecimentos</p>
              <p className="text-lg font-semibold tabular-nums">{filtered.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Litros</p>
              <p className="text-lg font-semibold tabular-nums">{totalLitros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total gasto</p>
              <p className="text-lg font-semibold tabular-nums">{formatBRL(totalValor)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Média</p>
              <p className="text-lg font-semibold tabular-nums">{media ? `${media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km/L` : "—"}</p>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum abastecimento registrado ainda.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {filtered.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-medium">{vehicleName(f.vehicleId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(f.data)}{f.hora ? ` ${f.hora}` : ""} · {kmFmt(f.km)} km{f.combustivel ? ` · ${f.combustivel}` : ""}{f.posto ? ` · ${f.posto}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <p>{f.litros.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} L</p>
                    <p className="text-xs text-muted-foreground">{formatBRL(f.valorTotal)}</p>
                  </div>
                  {f.origem === "foto" && <Badge variant="secondary" className="text-[10px]">foto</Badge>}
                  {f.comprovantePath && (
                    <Button size="icon" variant="ghost" className="size-7" title="Ver comprovante" onClick={() => verComprovante(f)}>
                      <ImageIcon className="size-3.5" />
                    </Button>
                  )}
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(f)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-7 text-destructive"><Trash2 className="size-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover abastecimento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A quilometragem já registrada no veículo não será alterada.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteFueling(f.id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conferir abastecimento</DialogTitle>
            <DialogDescription>Revise e corrija os dados antes de salvar. Nada é gravado e a quilometragem do veículo só muda após confirmar.</DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-[220px_1fr] gap-4">
            <div className="space-y-2">
              {preview ? (
                <a href={preview} target="_blank" rel="noopener noreferrer">
                  <img src={preview} alt="Comprovante enviado" className="w-full max-h-72 object-contain rounded-md border bg-muted" />
                </a>
              ) : (
                <div className="rounded-md border bg-muted/40 p-4 text-xs text-muted-foreground text-center">Lançamento manual (sem foto)</div>
              )}
              <div className="rounded-md border p-2 text-xs space-y-1">
                <p className="font-medium">Veículo</p>
                {veiculoDraft ? (
                  <p className="text-muted-foreground">Identificado: {veiculoDraft.modelo || veiculoDraft.nome} · {veiculoDraft.placa}</p>
                ) : placaLida ? (
                  <p className="text-amber-600">Placa {placaLida} lida, mas o veículo não está cadastrado.</p>
                ) : (
                  <p className="text-muted-foreground">Selecione o veículo ao lado.</p>
                )}
              </div>
              {contaOk !== null && (
                <div className={`rounded-md border p-2 text-xs flex gap-2 ${contaOk ? "text-emerald-700 border-emerald-300" : "text-red-700 border-red-300 bg-red-50 dark:bg-red-950/30"}`}>
                  {contaOk ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
                  {contaOk
                    ? "Conta conferida: litros × preço bate com o total."
                    : "Os valores lidos não conferem. Verifique o comprovante."}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {avisos.length > 0 && (
                <ul className="text-xs rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-2 space-y-1 list-disc pl-5">
                  {avisos.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Veículo</Label>
                  <Select value={draft.vehicleId} onValueChange={(v) => setDraft({ ...draft, vehicleId: v })}>
                    <SelectTrigger className={confClass(conf.placa)}><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome} · {v.placa}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <ConfHint c={conf.placa} />
                </div>
                <div className="space-y-1">
                  <Label>Data</Label>
                  <Input type="date" value={draft.data} onChange={(e) => setDraft({ ...draft, data: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Hora</Label>
                  <Input type="time" value={draft.hora} onChange={(e) => setDraft({ ...draft, hora: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>KM do veículo</Label>
                  <Input inputMode="numeric" className={confClass(conf.quilometragem)} value={draft.km} onChange={(e) => setDraft({ ...draft, km: e.target.value })} placeholder="92.125" />
                  <ConfHint c={conf.quilometragem} />
                </div>
                <div className="space-y-1">
                  <Label>Combustível</Label>
                  <Input className={confClass(conf.combustivel)} value={draft.combustivel} onChange={(e) => setDraft({ ...draft, combustivel: e.target.value })} placeholder="Gasolina" />
                  <ConfHint c={conf.combustivel} />
                </div>
                <div className="space-y-1">
                  <Label>Litros</Label>
                  <Input inputMode="decimal" className={confClass(conf.litros)} value={draft.litros} onChange={(e) => setDraft({ ...draft, litros: e.target.value })} placeholder="50,039" />
                  <ConfHint c={conf.litros} />
                </div>
                <div className="space-y-1">
                  <Label>Preço por litro</Label>
                  <Input inputMode="decimal" className={confClass(conf.preco_litro)} value={draft.valorLitro} onChange={(e) => setDraft({ ...draft, valorLitro: e.target.value })} placeholder="6,99" />
                  <ConfHint c={conf.preco_litro} />
                </div>
                <div className="space-y-1">
                  <Label>Valor total</Label>
                  <Input inputMode="decimal" className={confClass(conf.valor_total)} value={draft.valorTotal} onChange={(e) => setDraft({ ...draft, valorTotal: e.target.value })} placeholder="349,77" />
                  <ConfHint c={conf.valor_total} />
                </div>
                <div className="space-y-1">
                  <Label>Posto</Label>
                  <Input value={draft.posto} onChange={(e) => setDraft({ ...draft, posto: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>CNPJ do posto</Label>
                  <Input value={draft.cnpjPosto} onChange={(e) => setDraft({ ...draft, cnpjPosto: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Observações</Label>
                  <Textarea rows={2} value={draft.observacoes} onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirmar}>Confirmar lançamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
