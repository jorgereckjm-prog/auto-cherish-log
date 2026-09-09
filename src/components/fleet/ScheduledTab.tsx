import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Car, CheckCircle2, AlertTriangle, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  newId, formatDate, computeSchedule, scheduleLevelInfo, servicosSugeridos,
  type Vehicle, type ScheduledMaintenance, type ScheduleComputed,
} from "@/lib/fleet-store";
import { usePermissions } from "@/lib/permissions";

const km = (n: number) => n.toLocaleString("pt-BR");

/* ============ BARRA DE PROGRESSO ============ */

export function ScheduleProgress({ s, kmAtual, c }: { s: ScheduledMaintenance; kmAtual: number; c: ScheduleComputed }) {
  const pct = Math.min(100, Math.max(0, c.progresso * 100));
  const info = scheduleLevelInfo[c.level];
  return (
    <div className="space-y-1">
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${info.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{km(s.ultimaKm)} km</span>
        <span className="font-medium text-foreground">atual {km(kmAtual)} km</span>
        <span>{km(c.proximaKm)} km</span>
      </div>
    </div>
  );
}

/* ============ CARD DE UMA MANUTENÇÃO PROGRAMADA ============ */

function ScheduleCard({ s, vehicle, onEdit, onDelete, onRealizar }: {
  s: ScheduledMaintenance;
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete: () => void;
  onRealizar: () => void;
}) {
  const { canEdit } = usePermissions();
  const c = computeSchedule(s, vehicle.kmAtual);
  const info = scheduleLevelInfo[c.level];

  return (
    <div className={`rounded-xl border bg-card p-3 space-y-2 ${c.level === "vencida" ? "border-red-300" : c.level === "proxima" ? "border-amber-300" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{s.titulo}</p>
          <p className="text-xs text-muted-foreground truncate">{vehicle.nome} · {vehicle.placa}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${info.bg} ${info.color}`}>
          <span className={`size-2 rounded-full ${info.dot}`} />
          {info.label}
        </span>
      </div>

      {s.descricao && <p className="text-xs text-muted-foreground">{s.descricao}</p>}

      <ScheduleProgress s={s} kmAtual={vehicle.kmAtual} c={c} />

      <div className={`rounded-md px-2 py-1.5 text-xs ${info.bg} ${info.color}`}>
        {c.level === "vencida" ? (
          <>
            <p className="font-semibold">🚨 Manutenção vencida</p>
            <p>Deveria ter sido feita em {km(c.proximaKm)} km — atrasada em {km(Math.abs(c.restanteKm))} km.</p>
          </>
        ) : c.level === "proxima" ? (
          <>
            <p className="font-semibold">⚠ Manutenção próxima</p>
            <p>Faltam {km(c.restanteKm)} km para a manutenção.</p>
          </>
        ) : c.level === "realizada" ? (
          <p className="font-semibold">✔ Realizada em {s.ultimaData ? formatDate(s.ultimaData) : `${km(s.ultimaKm)} km`}</p>
        ) : (
          <>
            <p className="font-semibold">Manutenção programada</p>
            <p>Faltam {km(c.restanteKm)} km</p>
          </>
        )}
        {c.diasParaData !== undefined && c.level !== "realizada" && (
          <p className="mt-0.5 opacity-80">
            Data prevista: {formatDate(s.proximaData!)} ({c.diasParaData < 0 ? `${Math.abs(c.diasParaData)}d atrasada` : `em ${c.diasParaData}d`})
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Intervalo {km(s.intervaloKm)} km · alerta {km(s.alertaKm)} km</span>
        {canEdit && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={onRealizar}>
              <CheckCircle2 className="size-3" /> Realizada
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onEdit}>
              <Pencil className="size-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive">
                  <Trash2 className="size-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir manutenção programada?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>{s.titulo}</strong> de {vehicle.nome} será removida.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ ABA ============ */

export function ScheduledTab({ vehicles, schedules, saveSchedule, deleteSchedule, onRealizar, filterVehicle, setFilterVehicle }: {
  vehicles: Vehicle[];
  schedules: ScheduledMaintenance[];
  saveSchedule: (s: ScheduledMaintenance) => void;
  deleteSchedule: (id: string) => void;
  onRealizar: (s: ScheduledMaintenance) => void;
  filterVehicle: string;
  setFilterVehicle: (v: string) => void;
}) {
  const { canEdit } = usePermissions();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledMaintenance | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>("all");

  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const list = useMemo(() => {
    const rank = { vencida: 0, proxima: 1, programada: 2, realizada: 3 };
    return schedules
      .filter((s) => vehicleById.has(s.vehicleId))
      .filter((s) => filterVehicle === "all" || s.vehicleId === filterVehicle)
      .map((s) => ({ s, c: computeSchedule(s, vehicleById.get(s.vehicleId)!.kmAtual) }))
      .filter((x) => filterLevel === "all" || x.c.level === filterLevel)
      .sort((a, b) => rank[a.c.level] - rank[b.c.level] || a.c.restanteKm - b.c.restanteKm);
  }, [schedules, vehicleById, filterVehicle, filterLevel]);

  function openNew() {
    const today = new Date().toISOString().slice(0, 10);
    const v = filterVehicle !== "all" ? vehicleById.get(filterVehicle) : undefined;
    setEditing({
      id: newId(),
      vehicleId: v?.id ?? vehicles[0]?.id ?? "",
      titulo: "",
      descricao: "",
      ultimaData: today,
      ultimaKm: v?.kmAtual ?? 0,
      intervaloKm: 10000,
      alertaKm: 1000,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Manutenções programadas</h2>
          <p className="text-sm text-muted-foreground">{list.length} lembrete(s) exibido(s)</p>
        </div>
        {canEdit && vehicles.length > 0 && (
          <Button onClick={openNew} className="gap-2"><Plus className="size-4" /> Manutenção programável</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterVehicle} onValueChange={setFilterVehicle}>
          <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os veículos</SelectItem>
            {vehicles.map((v) => (<SelectItem key={v.id} value={v.id}>{v.nome} · {v.placa}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="vencida">Vencidas</SelectItem>
            <SelectItem value="proxima">Próximas</SelectItem>
            <SelectItem value="programada">Programadas</SelectItem>
            <SelectItem value="realizada">Realizadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <CalendarClock className="size-8 mx-auto mb-2 opacity-40" />
            Nenhuma manutenção programada por aqui.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {list.map(({ s }) => (
            <ScheduleCard
              key={s.id}
              s={s}
              vehicle={vehicleById.get(s.vehicleId)!}
              onEdit={() => { setEditing({ ...s }); setOpen(true); }}
              onDelete={() => { deleteSchedule(s.id); toast.success("Manutenção programada excluída"); }}
              onRealizar={() => onRealizar(s)}
            />
          ))}
        </div>
      )}

      <ScheduleDialog
        open={open}
        onOpenChange={setOpen}
        schedule={editing}
        vehicles={vehicles}
        schedules={schedules}
        onSave={(s) => { saveSchedule(s); setOpen(false); toast.success("Manutenção programada salva"); }}
      />
    </div>
  );
}

/* ============ FORMULÁRIO ============ */

function ScheduleDialog({ open, onOpenChange, schedule, vehicles, schedules, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schedule: ScheduledMaintenance | null;
  vehicles: Vehicle[];
  schedules: ScheduledMaintenance[];
  onSave: (s: ScheduledMaintenance) => void;
}) {
  const [form, setForm] = useState<ScheduledMaintenance | null>(schedule);
  useEffect(() => setForm(schedule), [schedule]);
  if (!form) return null;

  const proximaKm = (form.ultimaKm || 0) + (form.intervaloKm || 0);
  const veiculo = vehicles.find((v) => v.id === form.vehicleId);

  function submit() {
    if (!form) return;
    if (!form.vehicleId) return toast.error("Selecione um veículo");
    if (!form.titulo.trim()) return toast.error("Informe o título do serviço");
    if (!form.intervaloKm || form.intervaloKm <= 0) return toast.error("Informe um intervalo em KM maior que zero");
    if (form.ultimaKm < 0 || form.alertaKm < 0) return toast.error("Valores de KM não podem ser negativos");
    const dup = schedules.some(
      (s) => s.id !== form.id && s.vehicleId === form.vehicleId &&
        s.titulo.trim().toLowerCase() === form.titulo.trim().toLowerCase() && !s.realizada,
    );
    if (dup) return toast.error("Já existe uma manutenção com esse título para este veículo");
    onSave({ ...form, titulo: form.titulo.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Manutenção programada</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Veículo *</Label>
            <Select value={form.vehicleId} onValueChange={(v) => {
              const veh = vehicles.find((x) => x.id === v);
              setForm({ ...form, vehicleId: v, ultimaKm: form.ultimaKm || (veh?.kmAtual ?? 0) });
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{vehicles.map((v) => (<SelectItem key={v.id} value={v.id}>{v.nome} · {v.placa}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Título do serviço *</Label>
            <Input
              value={form.titulo}
              placeholder="Ex.: Troca de óleo"
              list="servicos-sugeridos"
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
            <datalist id="servicos-sugeridos">
              {servicosSugeridos.map((t) => <option key={t} value={t} />)}
            </datalist>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {servicosSugeridos.slice(0, 6).map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, titulo: t })}
                  className="text-[10px] rounded-full border px-2 py-0.5 hover:bg-muted transition">
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <Label>Descrição / observações</Label>
            <Textarea rows={2} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>

          <div>
            <Label>Data do último serviço</Label>
            <Input type="date" value={form.ultimaData ?? ""} onChange={(e) => setForm({ ...form, ultimaData: e.target.value })} />
          </div>
          <div>
            <Label>KM no último serviço *</Label>
            <Input type="number" min={0} value={form.ultimaKm}
              onChange={(e) => setForm({ ...form, ultimaKm: Number(e.target.value) || 0 })} />
          </div>

          <div>
            <Label>Intervalo em KM *</Label>
            <Input type="number" min={1} value={form.intervaloKm}
              onChange={(e) => setForm({ ...form, intervaloKm: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Antecedência do alerta (KM)</Label>
            <Input type="number" min={0} value={form.alertaKm}
              onChange={(e) => setForm({ ...form, alertaKm: Number(e.target.value) || 0 })} />
          </div>

          <div className="col-span-2">
            <Label>Data prevista da próxima manutenção (opcional)</Label>
            <Input type="date" value={form.proximaData ?? ""} onChange={(e) => setForm({ ...form, proximaData: e.target.value })} />
          </div>

          <div className="col-span-2 rounded-lg bg-muted px-3 py-2 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">KM da próxima manutenção</span>
            <span className="font-semibold tabular-nums">{km(proximaKm)} km</span>
          </div>
          {veiculo && (
            <div className="col-span-2 text-xs text-muted-foreground -mt-1">
              KM atual de {veiculo.nome}: <strong className="text-foreground">{km(veiculo.kmAtual)} km</strong>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============ RESUMO PARA O DASHBOARD ============ */

export function ScheduleAlertsCard({ vehicles, schedules, onOpen }: {
  vehicles: Vehicle[];
  schedules: ScheduledMaintenance[];
  onOpen: (vehicleId?: string) => void;
}) {
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const items = useMemo(() => {
    return schedules
      .filter((s) => vehicleById.has(s.vehicleId) && !s.realizada)
      .map((s) => ({ s, v: vehicleById.get(s.vehicleId)!, c: computeSchedule(s, vehicleById.get(s.vehicleId)!.kmAtual) }))
      .filter((x) => x.c.level === "vencida" || x.c.level === "proxima")
      .sort((a, b) => a.c.restanteKm - b.c.restanteKm);
  }, [schedules, vehicleById]);

  if (items.length === 0) return null;
  const vencidas = items.filter((i) => i.c.level === "vencida").length;
  const proximas = items.length - vencidas;

  return (
    <Card className="border-amber-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" /> Atenção — manutenções programadas
        </CardTitle>
        <CardDescription className="text-xs flex gap-3 pt-1">
          <span>Existem <strong>{items.length}</strong> manutenções que precisam de atenção.</span>
          {vencidas > 0 && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">🔴 {vencidas} vencida(s)</Badge>}
          {proximas > 0 && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">🟡 {proximas} próxima(s)</Badge>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-64 overflow-y-auto">
        {items.slice(0, 12).map(({ s, v, c }) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onOpen(v.id)}
            className={`w-full text-left text-xs rounded-md px-2 py-1.5 flex items-center gap-2 hover:opacity-80 transition ${scheduleLevelInfo[c.level].bg} ${scheduleLevelInfo[c.level].color}`}
          >
            <Car className="size-3.5 shrink-0" />
            <span className="font-medium truncate">{v.nome}</span>
            <span className="truncate">· {s.titulo}</span>
            <span className="ml-auto shrink-0 tabular-nums font-semibold">
              {c.restanteKm <= 0 ? `atrasada ${km(Math.abs(c.restanteKm))} km` : `faltam ${km(c.restanteKm)} km`}
            </span>
          </button>
        ))}
        <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => onOpen()}>
          Ver todas as manutenções programadas
        </Button>
      </CardContent>
    </Card>
  );
}
