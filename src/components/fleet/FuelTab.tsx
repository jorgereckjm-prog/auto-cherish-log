import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Upload, Loader2, Trash2, Pencil, Download, Fuel, Plus } from "lucide-react";
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
import { readFuelReceipt } from "@/lib/fuel-ocr.functions";

const kmFmt = (n: number) => Math.round(n).toLocaleString("pt-BR");
const parseKm = (v: string) => {
  const digits = v.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
};
const parseDec = (v: string) => {
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return isFinite(n) ? n : 0;
};
const normPlaca = (p: string) => p.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    r.readAsDataURL(file);
  });
}

/** Reduz a imagem para no máx. 1600px para acelerar o envio */
async function shrinkImage(dataUrl: string): Promise<string> {
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("erro"));
      img.src = dataUrl;
    });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale >= 1) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return dataUrl;
  }
}

type Draft = {
  id: string;
  vehicleId: string;
  data: string;
  km: string;
  litros: string;
  valorLitro: string;
  valorTotal: string;
  posto: string;
  observacoes: string;
  origem: "foto" | "manual";
};

const emptyDraft = (): Draft => ({
  id: newId(),
  vehicleId: "",
  data: new Date().toISOString().slice(0, 10),
  km: "",
  litros: "",
  valorLitro: "",
  valorTotal: "",
  posto: "",
  observacoes: "",
  origem: "manual",
});

export function FuelTab({
  vehicles, fuelings, saveFueling, deleteFueling,
}: {
  vehicles: Vehicle[];
  fuelings: Fueling[];
  saveFueling: (f: Fueling) => void;
  deleteFueling: (id: string) => void;
}) {
  const { canEdit } = usePermissions();
  const [filterVehicle, setFilterVehicle] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [preview, setPreview] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
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

  /** Média km/L do veículo filtrado (ou geral por veículo) */
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

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    setAviso(null);
    try {
      const raw = await fileToDataUrl(file);
      const img = await shrinkImage(raw);
      setPreview(img);
      const r = await readFuelReceipt({ data: { imageDataUrl: img } });

      const d = emptyDraft();
      d.origem = "foto";
      if (r.data) d.data = r.data;
      if (r.km) d.km = kmFmt(r.km);
      if (r.litros) d.litros = String(r.litros).replace(".", ",");
      if (r.valorLitro) d.valorLitro = String(r.valorLitro).replace(".", ",");
      if (r.valorTotal) d.valorTotal = String(r.valorTotal).replace(".", ",");
      if (r.posto) d.posto = r.posto;
      if (r.observacoes) d.observacoes = r.observacoes;

      const avisos: string[] = [];
      if (r.placa) {
        const alvo = normPlaca(r.placa);
        const v = vehicles.find((x) => normPlaca(x.placa) === alvo);
        if (v) d.vehicleId = v.id;
        else avisos.push(`A placa lida (${r.placa}) não corresponde a nenhum veículo cadastrado.`);
      } else {
        avisos.push("Não foi possível ler a placa no comprovante.");
      }
      if (!r.km) avisos.push("A quilometragem não foi encontrada — preencha manualmente.");
      setAviso(avisos.length ? avisos.join(" ") : null);
      setDraft(d);
      setOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ler o comprovante.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (camRef.current) camRef.current.value = "";
    }
  }

  function openManual() {
    setPreview(null);
    setAviso(null);
    setDraft(emptyDraft());
    setOpen(true);
  }

  function openEdit(f: Fueling) {
    setPreview(null);
    setAviso(null);
    setDraft({
      id: f.id,
      vehicleId: f.vehicleId,
      data: f.data,
      km: kmFmt(f.km),
      litros: String(f.litros).replace(".", ","),
      valorLitro: String(f.valorLitro).replace(".", ","),
      valorTotal: String(f.valorTotal).replace(".", ","),
      posto: f.posto ?? "",
      observacoes: f.observacoes ?? "",
      origem: f.origem ?? "manual",
    });
    setOpen(true);
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

    const dup = fuelings.find(
      (f) => f.id !== draft.id && f.vehicleId === draft.vehicleId && f.data === draft.data && Math.abs(f.km - km) < 2,
    );
    if (dup) return toast.error("Já existe um abastecimento igual para este veículo nesta data.");

    const v = vehicles.find((x) => x.id === draft.vehicleId);
    if (v && km < v.kmAtual) {
      toast.warning(`KM informada (${kmFmt(km)}) é menor que a atual do veículo (${kmFmt(v.kmAtual)}). O registro foi salvo, mas a KM do veículo não mudou.`);
    }

    saveFueling({
      id: draft.id,
      vehicleId: draft.vehicleId,
      data: draft.data,
      km,
      litros,
      valorLitro: valorLitro || (litros ? +(valorTotal / litros).toFixed(3) : 0),
      valorTotal,
      posto: draft.posto || undefined,
      observacoes: draft.observacoes || undefined,
      origem: draft.origem,
    });
    toast.success("Abastecimento salvo e quilometragem atualizada.");
    setOpen(false);
    setPreview(null);
  }

  function exportCsv() {
    const rows = [
      ["Data", "Veículo", "Placa", "KM", "Litros", "Valor/L", "Total", "Posto", "Observações"],
      ...filtered.map((f) => {
        const v = vehicles.find((x) => x.id === f.vehicleId);
        return [
          formatDate(f.data), v?.nome ?? "", v?.placa ?? "",
          String(f.km), String(f.litros), String(f.valorLitro), String(f.valorTotal),
          f.posto ?? "", (f.observacoes ?? "").replace(/[\r\n]+/g, " "),
        ];
      }),
      ["", "", "", "", String(totalLitros.toFixed(2)), "", String(totalValor.toFixed(2)), "", ""],
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Fuel className="size-4" /> Abastecimentos</CardTitle>
              <CardDescription>Envie a foto do comprovante: o sistema lê placa, data, KM, litros e valores para você conferir.</CardDescription>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2 flex-wrap">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                <Button size="sm" onClick={() => fileRef.current?.click()} disabled={loading} className="gap-1.5">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {loading ? "Lendo comprovante..." : "Enviar comprovante"}
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
                      {formatDate(f.data)} · {kmFmt(f.km)} km{f.posto ? ` · ${f.posto}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <p>{f.litros.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L</p>
                    <p className="text-xs text-muted-foreground">{formatBRL(f.valorTotal)}</p>
                  </div>
                  {f.origem === "foto" && <Badge variant="secondary" className="text-[10px]">foto</Badge>}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conferir abastecimento</DialogTitle>
            <DialogDescription>Revise os dados antes de salvar. A quilometragem do veículo só é atualizada após confirmar.</DialogDescription>
          </DialogHeader>

          {preview && (
            <img src={preview} alt="Comprovante enviado" className="max-h-40 w-full object-contain rounded-md border bg-muted" />
          )}
          {aviso && (
            <p className="text-xs rounded-md border border-amber-300 bg-amber-50 text-amber-800 p-2">{aviso}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Veículo</Label>
              <Select value={draft.vehicleId} onValueChange={(v) => setDraft({ ...draft, vehicleId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome} · {v.placa}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={draft.data} onChange={(e) => setDraft({ ...draft, data: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>KM atual</Label>
              <Input inputMode="numeric" value={draft.km} onChange={(e) => setDraft({ ...draft, km: e.target.value })} placeholder="167.500" />
            </div>
            <div className="space-y-1">
              <Label>Litros</Label>
              <Input inputMode="decimal" value={draft.litros} onChange={(e) => setDraft({ ...draft, litros: e.target.value })} placeholder="42,5" />
            </div>
            <div className="space-y-1">
              <Label>Valor por litro</Label>
              <Input inputMode="decimal" value={draft.valorLitro} onChange={(e) => setDraft({ ...draft, valorLitro: e.target.value })} placeholder="5,89" />
            </div>
            <div className="space-y-1">
              <Label>Valor total</Label>
              <Input inputMode="decimal" value={draft.valorTotal} onChange={(e) => setDraft({ ...draft, valorTotal: e.target.value })} placeholder="250,32" />
            </div>
            <div className="space-y-1">
              <Label>Posto</Label>
              <Input value={draft.posto} onChange={(e) => setDraft({ ...draft, posto: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} value={draft.observacoes} onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirmar}>Confirmar e salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
