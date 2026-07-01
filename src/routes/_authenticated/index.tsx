import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Car,
  Wrench,
  LayoutDashboard,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Gauge,
  DollarSign,
  Calendar as CalendarIcon,
  Search,
  Download,
  Users,
  History as HistoryIcon,
  KeyRound,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  Settings,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  useFleet,
  newId,
  formatBRL,
  formatDate,
  formatDateTime,
  vehicleStatusInfo,
  driverStatusInfo,
  eachDay,
  daysUntil,
  type Vehicle,
  type Maintenance,
  type Driver,
  type VehicleStatus,
  type DriverStatus,
} from "@/lib/fleet-store";
import logoAsset from "@/assets/patrimonial-telecom-logo.png.asset.json";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "FrotaPro — Controle de Frotas e Motoristas" },
      { name: "description", content: "Gestão integrada de veículos, motoristas, manutenções e calendário operacional." },
      { property: "og:title", content: "FrotaPro" },
      { property: "og:description", content: "Controle integrado da sua frota." },
    ],
  }),
  component: Index,
});

type FleetState = ReturnType<typeof useFleet>;

function Index() {
  const fleet = useFleet();
  const perms = usePermissions();
  const [tab, setTab] = useState<string>("dashboard");
  const [maintFilterVehicle, setMaintFilterVehicle] = useState<string>("all");

  function goToVehicleMaintenance(vehicleId: string) {
    setMaintFilterVehicle(vehicleId);
    setTab("maintenance");
  }

  if (!fleet.hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
          <img
            src={logoAsset.url}
            alt="Patrimonial Telecom"
            className="size-12 rounded-lg object-contain bg-black p-1"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight truncate">Patrimonial Telecom</h1>
            <p className="text-xs text-muted-foreground">Controle integrado de frotas</p>
          </div>
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <Input
              value={fleet.operator}
              onChange={(e) => fleet.setOperator(e.target.value)}
              placeholder="Operador"
              className="h-8 w-40 text-sm"
            />
            {!perms.canEdit && !perms.loading && (
              <Badge variant="secondary" className="gap-1 text-xs"><Eye className="size-3" /> Visualização</Badge>
            )}
            <Link to="/configuracoes" title="Configurações">
              <Button variant="ghost" size="icon" className="size-8">
                <Settings className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="size-4" /><span className="hidden sm:inline">Dashboard</span></TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-1.5"><Car className="size-4" /><span className="hidden sm:inline">Veículos</span></TabsTrigger>
            <TabsTrigger value="drivers" className="gap-1.5"><Users className="size-4" /><span className="hidden sm:inline">Motoristas</span></TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1.5"><Wrench className="size-4" /><span className="hidden sm:inline">Manutenções</span></TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5"><CalendarIcon className="size-4" /><span className="hidden sm:inline">Calendário</span></TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><HistoryIcon className="size-4" /><span className="hidden sm:inline">Histórico</span></TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard {...fleet} onVehicleClick={goToVehicleMaintenance} />
          </TabsContent>
          <TabsContent value="vehicles">
            <VehiclesTab {...fleet} onVehicleClick={goToVehicleMaintenance} />
          </TabsContent>
          <TabsContent value="drivers">
            <DriversTab {...fleet} />
          </TabsContent>
          <TabsContent value="maintenance">
            <MaintenanceTab
              {...fleet}
              filterVehicle={maintFilterVehicle}
              setFilterVehicle={setMaintFilterVehicle}
            />
          </TabsContent>
          <TabsContent value="calendar">
            <CalendarTab {...fleet} />
          </TabsContent>
          <TabsContent value="history">
            <HistoryTab {...fleet} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ===================== STATUS BADGE ===================== */

function VehicleStatusBadge({ status }: { status?: VehicleStatus }) {
  const s = status ?? "ativo";
  const info = vehicleStatusInfo[s];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${info.bg} ${info.color}`}>
      <span className={`size-2 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  );
}
function DriverStatusBadge({ status }: { status?: DriverStatus }) {
  const s = status ?? "ativo";
  const info = driverStatusInfo[s];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${info.bg} ${info.color}`}>
      <span className={`size-2 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  );
}

/* ===================== DASHBOARD ===================== */

function Dashboard({ vehicles, maintenances, drivers, onVehicleClick }: FleetState & { onVehicleClick: (id: string) => void }) {
  const totalGasto = maintenances.reduce((s, m) => s + m.valor, 0);
  const gastoMes = useMemo(() => {
    const now = new Date();
    return maintenances
      .filter((m) => {
        const d = new Date(m.data);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, m) => s + m.valor, 0);
  }, [maintenances]);

  const vStats = useMemo(() => {
    const c = { ativo: 0, manutencao: 0, indisponivel: 0, emprestado: 0, vendido: 0 };
    vehicles.forEach((v) => { c[v.status ?? "ativo"]++; });
    return c;
  }, [vehicles]);

  const dStats = useMemo(() => {
    const c = { ativo: 0, inativo: 0, ferias: 0, folga: 0 };
    drivers.forEach((d) => { c[d.status ?? "ativo"]++; });
    return c;
  }, [drivers]);

  const comPortao = vehicles.filter((v) => v.controleAcessoPortao).length;
  const semMotorista = vehicles.filter((v) => v.status !== "vendido" && !v.motoristaId).length;
  const motoristaSemVeic = drivers.filter((d) => (d.status ?? "ativo") === "ativo" && !d.veiculoId).length;

  const alerts = useMemo(() => {
    const out: { type: "warn" | "info"; text: string }[] = [];
    vehicles.forEach((v) => {
      if (v.status === "manutencao" && v.manutencao?.previsaoFim) {
        const d = daysUntil(v.manutencao.previsaoFim);
        if (d <= 3 && d >= 0) out.push({ type: "warn", text: `Manutenção do ${v.nome} prevista para ${formatDate(v.manutencao.previsaoFim)} (${d}d)` });
        if (d < 0 && !v.manutencao.fimReal) out.push({ type: "warn", text: `Manutenção do ${v.nome} atrasada (previsto ${formatDate(v.manutencao.previsaoFim)})` });
      }
      if (v.status === "emprestado" && v.emprestimo?.previsaoDevolucao) {
        const d = daysUntil(v.emprestimo.previsaoDevolucao);
        if (d <= 3 && d >= 0) out.push({ type: "warn", text: `${v.nome} emprestado a ${v.emprestimo.para} — devolução em ${d}d` });
        if (d < 0) out.push({ type: "warn", text: `${v.nome} (empréstimo) com devolução atrasada` });
      }
      if (v.status !== "vendido" && !v.motoristaId) out.push({ type: "info", text: `${v.nome} sem motorista vinculado` });
    });
    drivers.forEach((dr) => {
      if (dr.status === "ferias" && dr.ferias?.fim) {
        const d = daysUntil(dr.ferias.fim);
        if (d <= 3 && d >= 0) out.push({ type: "warn", text: `Férias de ${dr.nome} terminam em ${d}d` });
      }
      if (dr.status === "folga" && dr.folga?.inicio) {
        const d = daysUntil(dr.folga.inicio);
        if (d >= 0 && d <= 3) out.push({ type: "info", text: `Folga programada de ${dr.nome} em ${d}d` });
      }
      if ((dr.status ?? "ativo") === "ativo" && !dr.veiculoId) out.push({ type: "info", text: `${dr.nome} sem veículo vinculado` });
    });
    return out.slice(0, 20);
  }, [vehicles, drivers]);

  const porVeiculo = useMemo(() => {
    return vehicles.map((v) => {
      const ms = maintenances.filter((m) => m.vehicleId === v.id);
      return {
        nome: v.nome,
        placa: v.placa,
        gasto: ms.reduce((s, m) => s + m.valor, 0),
      };
    });
  }, [vehicles, maintenances]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Veículos" value={vehicles.length.toString()} icon={<Car className="size-5" />} />
        <StatCard label="Motoristas" value={drivers.length.toString()} icon={<Users className="size-5" />} />
        <StatCard label="Gasto total" value={formatBRL(totalGasto)} icon={<DollarSign className="size-5" />} />
        <StatCard label="Gasto no mês" value={formatBRL(gastoMes)} icon={<CalendarIcon className="size-5" />} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gastos por veículo</CardTitle>
        </CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porVeiculo}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="placa" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }} />
              <Bar dataKey="gasto" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Frota</CardTitle>
          <CardDescription className="text-xs">Clique em um veículo para ver as manutenções</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {vehicles.map((v) => {
              const ms = maintenances.filter((m) => m.vehicleId === v.id);
              const gasto = ms.reduce((s, m) => s + m.valor, 0);
              const motorista = drivers.find((d) => d.id === v.motoristaId);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onVehicleClick(v.id)}
                  className="text-left rounded-lg border bg-card p-2 flex gap-3 items-start hover:border-primary hover:shadow-sm transition cursor-pointer"
                >
                  <div className="shrink-0 w-16 h-16 rounded-md bg-muted relative overflow-hidden">
                    {v.imagem ? (
                      <img src={v.imagem} alt={v.nome} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground">
                        <Car className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-medium text-sm leading-tight truncate">{v.nome}</p>
                      <p className="text-xs font-medium text-muted-foreground truncate max-w-[50%] text-right">
                        {motorista ? motorista.nome : <span className="italic">sem motorista</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-xs font-mono px-1.5 py-0 h-5">{v.placa || "—"}</Badge>
                      <VehicleStatusBadge status={v.status} />
                    </div>
                    <div className="flex items-center justify-between mt-auto text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1"><Gauge className="size-3" /> {v.kmAtual.toLocaleString("pt-BR")}</span>
                        <span className="text-foreground font-medium">{formatBRL(gasto)}</span>
                      </div>
                      {v.controleAcessoPortao && <KeyRound className="size-3.5 text-indigo-500" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status dos veículos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <StatusMini label="Ativos" count={vStats.ativo} info={vehicleStatusInfo.ativo} />
            <StatusMini label="Manutenção" count={vStats.manutencao} info={vehicleStatusInfo.manutencao} />
            <StatusMini label="Indisponíveis" count={vStats.indisponivel} info={vehicleStatusInfo.indisponivel} />
            <StatusMini label="Emprestados" count={vStats.emprestado} info={vehicleStatusInfo.emprestado} />
            <StatusMini label="Vendidos" count={vStats.vendido} info={vehicleStatusInfo.vendido} />
            <StatusMini label="Sem motorista" count={semMotorista} info={{ bg: "bg-orange-100", color: "text-orange-700", dot: "bg-orange-500", label: "" }} />
            <StatusMini label="C/ portão" count={comPortao} info={{ bg: "bg-indigo-100", color: "text-indigo-700", dot: "bg-indigo-500", label: "" }} icon={<KeyRound className="size-3" />} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status dos motoristas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <StatusMini label="Ativos" count={dStats.ativo} info={driverStatusInfo.ativo} />
            <StatusMini label="Férias" count={dStats.ferias} info={driverStatusInfo.ferias} />
            <StatusMini label="Folga" count={dStats.folga} info={driverStatusInfo.folga} />
            <StatusMini label="Inativos" count={dStats.inativo} info={driverStatusInfo.inativo} />
            <StatusMini label="Sem veículo" count={motoristaSemVeic} info={{ bg: "bg-orange-100", color: "text-orange-700", dot: "bg-orange-500", label: "" }} />
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="size-4 text-amber-500" /> Alertas</CardTitle>
            <CardDescription className="text-xs">{alerts.length} item(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
            {alerts.map((a, i) => (
              <div key={i} className={`text-xs rounded-md px-2 py-1.5 flex items-start gap-2 ${a.type === "warn" ? "bg-amber-50 text-amber-900" : "bg-muted text-foreground/80"}`}>
                <span className={`size-1.5 rounded-full mt-1.5 shrink-0 ${a.type === "warn" ? "bg-amber-500" : "bg-muted-foreground"}`} />
                {a.text}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold mt-0.5">{value}</p>
        </div>
        <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">{icon}</div>
      </CardContent>
    </Card>
  );
}

function StatusMini({ label, count, info, icon }: { label: string; count: number; info: { bg: string; color: string; dot: string; label?: string }; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-md px-2.5 py-1.5 flex items-center justify-between gap-2 ${info.bg} ${info.color}`}>
      <span className="text-xs font-medium flex items-center gap-1.5">
        {icon ?? <span className={`size-2 rounded-full ${info.dot}`} />}
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums">{count}</span>
    </div>
  );
}

/* ===================== VEHICLES TAB ===================== */

function QuickStatusSelect({ vehicle, onChange }: { vehicle: Vehicle; onChange: (s: VehicleStatus) => void }) {
  const s = vehicle.status ?? "ativo";
  const info = vehicleStatusInfo[s];
  const { canEdit } = usePermissions();
  return (
    <Select value={s} onValueChange={(val) => onChange(val as VehicleStatus)} disabled={!canEdit}>
      <SelectTrigger
        className={`h-7 w-full justify-between rounded-full border-0 px-2.5 text-xs font-medium ${info.bg} ${info.color} [&>svg]:size-3 [&>svg]:opacity-60`}
      >
        <span className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${info.dot}`} />
          {info.label}
        </span>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(vehicleStatusInfo) as VehicleStatus[]).map((k) => (
          <SelectItem key={k} value={k}>
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${vehicleStatusInfo[k].dot}`} />
              {vehicleStatusInfo[k].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function QuickDriverSelect({ vehicle, drivers, onChange }: { vehicle: Vehicle; drivers: Driver[]; onChange: (driverId: string) => void }) {
  const current = drivers.find((d) => d.id === vehicle.motoristaId);
  const { canEdit } = usePermissions();
  return (
    <div className="w-full">
      <p className="text-[10px] text-muted-foreground mb-0.5 text-right">Motorista</p>
      <Select
        value={vehicle.motoristaId ?? "__none"}
        onValueChange={(val) => onChange(val === "__none" ? "" : val)}
        disabled={vehicle.status === "vendido" || !canEdit}
      >
        <SelectTrigger className="h-7 w-full text-xs [&>svg]:size-3">
          <SelectValue placeholder="—">
            <span className="truncate">{current?.nome ?? "—"}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">— sem motorista —</SelectItem>
          {drivers.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function VehiclesTab({ vehicles, drivers, saveVehicle, deleteVehicle, maintenances, onVehicleClick }: FleetState & { onVehicleClick: (id: string) => void }) {
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing({ id: newId(), nome: "", placa: "", modelo: "", ano: "", kmAtual: 0, status: "ativo", controleAcessoPortao: false });
    setOpen(true);
  }
  function openEdit(v: Vehicle) {
    setEditing({ ...v });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Veículos da frota</h2>
          <p className="text-sm text-muted-foreground">{vehicles.length} veículo(s) cadastrado(s)</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="size-4" /> Novo veículo</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {vehicles.map((v) => {
          const ms = maintenances.filter((m) => m.vehicleId === v.id);
          const gasto = ms.reduce((s, m) => s + m.valor, 0);
          return (
            <div key={v.id} className="rounded-xl border bg-card overflow-hidden flex">
              <button
                type="button"
                onClick={() => onVehicleClick(v.id)}
                title="Ver histórico de manutenções"
                className="w-32 h-32 shrink-0 bg-muted relative hover:opacity-90 transition cursor-pointer"
              >
                {v.imagem ? (
                  <img src={v.imagem} alt={v.nome} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-foreground"><Car className="size-8" /></div>
                )}
              </button>
              <div className="flex-1 min-w-0 p-3 flex flex-col gap-2">
                {/* Topo: nome+modelo à esquerda, placa+status à direita */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button type="button" onClick={() => onVehicleClick(v.id)} className="text-left hover:text-primary transition min-w-0 block">
                      <p className="font-semibold truncate">{v.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.modelo} · {v.ano}</p>
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-sm font-mono px-2 py-0.5 h-auto">{v.placa || "—"}</Badge>
                    <div className="w-36">
                      <QuickStatusSelect
                        vehicle={v}
                        onChange={(status) => {
                          const today = new Date().toISOString().slice(0, 10);
                          const next: Vehicle = { ...v, status };
                          if (status === "manutencao" && !v.manutencao) next.manutencao = { inicio: today, previsaoFim: today, descricao: "" };
                          if (status === "emprestado" && !v.emprestimo) next.emprestimo = { para: "", inicio: today, previsaoDevolucao: today };
                          if (status === "vendido" && !v.venda) next.venda = { data: today };
                          saveVehicle(next);
                          toast.success("Status atualizado");
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Meio */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Gauge className="size-3.5" /> {v.kmAtual.toLocaleString("pt-BR")} km</span>
                  <span>{ms.length} manut.</span>
                  <span className="text-foreground font-medium">{formatBRL(gasto)}</span>
                </div>

                {/* Base */}
                <div className="flex items-end justify-between mt-auto pt-1">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => openEdit(v)}>
                      <Pencil className="size-3" /> Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive">
                          <Trash2 className="size-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover veículo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá <strong>{v.nome}</strong> e todas as {ms.length} manutenção(ões) vinculadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { deleteVehicle(v.id); toast.success("Veículo removido"); }}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {v.controleAcessoPortao && (
                      <span className="inline-flex items-center gap-1 text-[10px] rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5">
                        <KeyRound className="size-3" /> Portão
                      </span>
                    )}
                    <div className="w-40">
                      <QuickDriverSelect
                        vehicle={v}
                        drivers={drivers}
                        onChange={(motoristaId) => {
                          saveVehicle({ ...v, motoristaId: motoristaId || undefined });
                          toast.success("Motorista atualizado");
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <VehicleDialog
        open={open}
        onOpenChange={setOpen}
        vehicle={editing}
        drivers={drivers}
        onSave={(v) => { saveVehicle(v); setOpen(false); toast.success("Veículo salvo"); }}
      />
    </div>
  );
}

function VehicleDialog({ open, onOpenChange, vehicle, drivers, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle: Vehicle | null;
  drivers: Driver[];
  onSave: (v: Vehicle) => void;
}) {
  const [form, setForm] = useState<Vehicle | null>(vehicle);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setForm(vehicle), [vehicle]);
  if (!form) return null;

  function handleImage(file: File) {
    if (file.size > 2_000_000) { toast.error("Imagem muito grande (máx 2MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => (f ? { ...f, imagem: reader.result as string } : f));
    reader.readAsDataURL(file);
  }

  const status = form.status ?? "ativo";
  const isSold = status === "vendido";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle && form.nome ? "Editar veículo" : "Novo veículo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="size-24 rounded-lg bg-muted overflow-hidden grid place-items-center shrink-0">
              {form.imagem ? (
                <img src={form.imagem} alt="" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {form.imagem ? "Trocar imagem" : "Adicionar imagem"}
              </Button>
              {form.imagem && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, imagem: undefined })}>
                  Remover imagem
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG/JPG até 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome / Identificação</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Veículo 01" />
            </div>
            <div>
              <Label>Placa</Label>
              <Input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} placeholder="ABC-1234" />
            </div>
            <div>
              <Label>Ano</Label>
              <Input value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} placeholder="2024" />
            </div>
            <div className="col-span-2">
              <Label>Modelo</Label>
              <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} placeholder="Ex: Fiat Strada" />
            </div>
            <div>
              <Label>KM atual</Label>
              <Input type="number" min={0} value={form.kmAtual}
                onChange={(e) => setForm({ ...form, kmAtual: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Motorista vinculado</Label>
              <Select
                value={form.motoristaId ?? "none"}
                onValueChange={(v) => setForm({ ...form, motoristaId: v === "none" ? undefined : v })}
                disabled={isSold}
              >
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem motorista —</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2 rounded-md border p-2.5 bg-muted/30">
              <Checkbox
                id="portao"
                checked={!!form.controleAcessoPortao}
                onCheckedChange={(c) => setForm({ ...form, controleAcessoPortao: !!c })}
              />
              <Label htmlFor="portao" className="cursor-pointer flex items-center gap-1.5">
                <KeyRound className="size-4 text-indigo-500" /> Possui controle de acesso ao portão
              </Label>
            </div>
            <div className="col-span-2">
              <Label>Status do veículo</Label>
              <Select value={status} onValueChange={(v) => setForm({ ...form, status: v as VehicleStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">🟢 Ativo</SelectItem>
                  <SelectItem value="manutencao">🔴 Manutenção</SelectItem>
                  <SelectItem value="indisponivel">🟡 Indisponível</SelectItem>
                  <SelectItem value="emprestado">🔵 Emprestado</SelectItem>
                  <SelectItem value="vendido">⚪ Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === "manutencao" && (
              <div className="col-span-2 rounded-md border border-red-200 bg-red-50/50 p-3 space-y-2">
                <p className="text-xs font-semibold text-red-700">Dados da manutenção</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Início</Label><Input type="date" value={form.manutencao?.inicio ?? ""} onChange={(e) => setForm({ ...form, manutencao: { ...(form.manutencao ?? { previsaoFim: "", descricao: "" }), inicio: e.target.value } })} /></div>
                  <div><Label className="text-xs">Previsão fim</Label><Input type="date" value={form.manutencao?.previsaoFim ?? ""} onChange={(e) => setForm({ ...form, manutencao: { ...(form.manutencao ?? { inicio: "", descricao: "" }), previsaoFim: e.target.value } })} /></div>
                  <div><Label className="text-xs">Fim real</Label><Input type="date" value={form.manutencao?.fimReal ?? ""} onChange={(e) => setForm({ ...form, manutencao: { ...(form.manutencao ?? { inicio: "", previsaoFim: "", descricao: "" }), fimReal: e.target.value } })} /></div>
                </div>
                <div><Label className="text-xs">Descrição</Label><Textarea rows={2} value={form.manutencao?.descricao ?? ""} onChange={(e) => setForm({ ...form, manutencao: { ...(form.manutencao ?? { inicio: "", previsaoFim: "" }), descricao: e.target.value } })} /></div>
                <div><Label className="text-xs">Observações</Label><Textarea rows={2} value={form.manutencao?.observacoes ?? ""} onChange={(e) => setForm({ ...form, manutencao: { ...(form.manutencao ?? { inicio: "", previsaoFim: "", descricao: "" }), observacoes: e.target.value } })} /></div>
                <div><Label className="text-xs">Valor gasto (opcional)</Label><Input type="number" min={0} step="0.01" value={form.manutencao?.valor ?? ""} onChange={(e) => setForm({ ...form, manutencao: { ...(form.manutencao ?? { inicio: "", previsaoFim: "", descricao: "" }), valor: e.target.value ? Number(e.target.value) : undefined } })} /></div>
              </div>
            )}

            {status === "emprestado" && (
              <div className="col-span-2 rounded-md border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-700">Dados do empréstimo</p>
                <div><Label className="text-xs">Empresa / Pessoa</Label><Input value={form.emprestimo?.para ?? ""} onChange={(e) => setForm({ ...form, emprestimo: { ...(form.emprestimo ?? { inicio: "", previsaoDevolucao: "" }), para: e.target.value } })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Início</Label><Input type="date" value={form.emprestimo?.inicio ?? ""} onChange={(e) => setForm({ ...form, emprestimo: { ...(form.emprestimo ?? { para: "", previsaoDevolucao: "" }), inicio: e.target.value } })} /></div>
                  <div><Label className="text-xs">Previsão devolução</Label><Input type="date" value={form.emprestimo?.previsaoDevolucao ?? ""} onChange={(e) => setForm({ ...form, emprestimo: { ...(form.emprestimo ?? { para: "", inicio: "" }), previsaoDevolucao: e.target.value } })} /></div>
                </div>
                <div><Label className="text-xs">Observações</Label><Textarea rows={2} value={form.emprestimo?.observacoes ?? ""} onChange={(e) => setForm({ ...form, emprestimo: { ...(form.emprestimo ?? { para: "", inicio: "", previsaoDevolucao: "" }), observacoes: e.target.value } })} /></div>
              </div>
            )}

            {status === "vendido" && (
              <div className="col-span-2 rounded-md border bg-gray-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Dados da venda</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Data da venda</Label><Input type="date" value={form.venda?.data ?? ""} onChange={(e) => setForm({ ...form, venda: { ...(form.venda ?? {}), data: e.target.value } as Vehicle["venda"] })} /></div>
                  <div><Label className="text-xs">Valor (opcional)</Label><Input type="number" min={0} step="0.01" value={form.venda?.valor ?? ""} onChange={(e) => setForm({ ...form, venda: { ...(form.venda ?? { data: "" }), valor: e.target.value ? Number(e.target.value) : undefined } })} /></div>
                </div>
                <div><Label className="text-xs">Comprador (opcional)</Label><Input value={form.venda?.comprador ?? ""} onChange={(e) => setForm({ ...form, venda: { ...(form.venda ?? { data: "" }), comprador: e.target.value } })} /></div>
                <div><Label className="text-xs">Observações</Label><Textarea rows={2} value={form.venda?.observacoes ?? ""} onChange={(e) => setForm({ ...form, venda: { ...(form.venda ?? { data: "" }), observacoes: e.target.value } })} /></div>
                <p className="text-[11px] text-orange-700">⚠ Veículo vendido será desvinculado de motorista.</p>
              </div>
            )}

            <div className="col-span-2">
              <Label>Observações gerais</Label>
              <Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!form.nome.trim() || !form.placa.trim()) { toast.error("Preencha nome e placa"); return; }
            if (status === "manutencao" && (!form.manutencao?.inicio || !form.manutencao?.previsaoFim)) { toast.error("Informe início e previsão da manutenção"); return; }
            if (status === "emprestado" && (!form.emprestimo?.para || !form.emprestimo?.inicio)) { toast.error("Informe os dados do empréstimo"); return; }
            if (status === "vendido" && !form.venda?.data) { toast.error("Informe a data da venda"); return; }
            onSave(form);
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== DRIVERS TAB ===================== */

function DriversTab({ drivers, vehicles, saveDriver, deleteDriver }: FleetState) {
  const [editing, setEditing] = useState<Driver | null>(null);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing({ id: newId(), nome: "", status: "ativo" });
    setOpen(true);
  }
  function openEdit(d: Driver) { setEditing({ ...d }); setOpen(true); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Motoristas</h2>
          <p className="text-sm text-muted-foreground">{drivers.length} motorista(s) cadastrado(s)</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="size-4" /> Novo motorista</Button>
      </div>

      {drivers.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Nenhum motorista cadastrado ainda.</CardContent></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {drivers.map((d) => {
          const v = vehicles.find((x) => x.id === d.veiculoId);
          return (
            <div key={d.id} className="rounded-xl border bg-card p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{d.nome}</p>
                  {d.telefone && <p className="text-xs text-muted-foreground">{d.telefone}</p>}
                </div>
                <DriverStatusBadge status={d.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                Veículo: <span className="text-foreground">{v ? `${v.nome} · ${v.placa}` : "—"}</span>
              </p>
              {d.status === "ferias" && d.ferias && (
                <p className="text-xs text-purple-700">Férias: {formatDate(d.ferias.inicio)} → {formatDate(d.ferias.fim)}</p>
              )}
              {d.status === "folga" && d.folga && (
                <p className="text-xs text-cyan-700">Folga: {formatDate(d.folga.inicio)} → {formatDate(d.folga.fim)}</p>
              )}
              {d.status === "inativo" && d.inativo && (
                <p className="text-xs text-gray-700">Inativo desde {formatDate(d.inativo.inicio)}{d.inativo.motivo ? ` — ${d.inativo.motivo}` : ""}</p>
              )}
              <div className="flex gap-1 mt-auto pt-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => openEdit(d)}>
                  <Pencil className="size-3" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive">
                      <Trash2 className="size-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover motorista?</AlertDialogTitle>
                      <AlertDialogDescription>Isso removerá <strong>{d.nome}</strong> e o vínculo com seu veículo.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { deleteDriver(d.id); toast.success("Motorista removido"); }}>Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>

      <DriverDialog
        open={open}
        onOpenChange={setOpen}
        driver={editing}
        vehicles={vehicles}
        onSave={(d) => { saveDriver(d); setOpen(false); toast.success("Motorista salvo"); }}
      />
    </div>
  );
}

function DriverDialog({ open, onOpenChange, driver, vehicles, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driver: Driver | null;
  vehicles: Vehicle[];
  onSave: (d: Driver) => void;
}) {
  const [form, setForm] = useState<Driver | null>(driver);
  useEffect(() => setForm(driver), [driver]);
  if (!form) return null;

  const status = form.status ?? "ativo";
  const availableVehicles = vehicles.filter((v) => v.status !== "vendido");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{driver && form.nome ? "Editar motorista" : "Novo motorista"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nome completo</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Telefone (opcional)</Label>
            <Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
          <div>
            <Label>Veículo vinculado</Label>
            <Select value={form.veiculoId ?? "none"} onValueChange={(v) => setForm({ ...form, veiculoId: v === "none" ? undefined : v })}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem veículo —</SelectItem>
                {availableVehicles.map((v) => (<SelectItem key={v.id} value={v.id}>{v.nome} · {v.placa}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setForm({ ...form, status: v as DriverStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">🟢 Ativo</SelectItem>
                <SelectItem value="ferias">🟣 Férias</SelectItem>
                <SelectItem value="folga">🔵 Folga</SelectItem>
                <SelectItem value="inativo">⚪ Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "ferias" && (
            <div className="col-span-2 rounded-md border border-purple-200 bg-purple-50/50 p-3 space-y-2">
              <p className="text-xs font-semibold text-purple-700">Dados das férias</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Início</Label><Input type="date" value={form.ferias?.inicio ?? ""} onChange={(e) => setForm({ ...form, ferias: { ...(form.ferias ?? { fim: "" }), inicio: e.target.value } })} /></div>
                <div><Label className="text-xs">Fim</Label><Input type="date" value={form.ferias?.fim ?? ""} onChange={(e) => setForm({ ...form, ferias: { ...(form.ferias ?? { inicio: "" }), fim: e.target.value } })} /></div>
              </div>
              <div><Label className="text-xs">Observações</Label><Textarea rows={2} value={form.ferias?.observacoes ?? ""} onChange={(e) => setForm({ ...form, ferias: { ...(form.ferias ?? { inicio: "", fim: "" }), observacoes: e.target.value } })} /></div>
            </div>
          )}

          {status === "folga" && (
            <div className="col-span-2 rounded-md border border-cyan-200 bg-cyan-50/50 p-3 space-y-2">
              <p className="text-xs font-semibold text-cyan-700">Dados da folga</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Início</Label><Input type="date" value={form.folga?.inicio ?? ""} onChange={(e) => setForm({ ...form, folga: { ...(form.folga ?? { fim: "" }), inicio: e.target.value } })} /></div>
                <div><Label className="text-xs">Fim</Label><Input type="date" value={form.folga?.fim ?? ""} onChange={(e) => setForm({ ...form, folga: { ...(form.folga ?? { inicio: "" }), fim: e.target.value } })} /></div>
              </div>
              <div><Label className="text-xs">Observações</Label><Textarea rows={2} value={form.folga?.observacoes ?? ""} onChange={(e) => setForm({ ...form, folga: { ...(form.folga ?? { inicio: "", fim: "" }), observacoes: e.target.value } })} /></div>
            </div>
          )}

          {status === "inativo" && (
            <div className="col-span-2 rounded-md border bg-gray-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">Dados de inativação</p>
              <div><Label className="text-xs">Data de início</Label><Input type="date" value={form.inativo?.inicio ?? ""} onChange={(e) => setForm({ ...form, inativo: { ...(form.inativo ?? { motivo: "" }), inicio: e.target.value } })} /></div>
              <div><Label className="text-xs">Motivo</Label><Input value={form.inativo?.motivo ?? ""} onChange={(e) => setForm({ ...form, inativo: { ...(form.inativo ?? { inicio: "" }), motivo: e.target.value } })} /></div>
              <div><Label className="text-xs">Observações</Label><Textarea rows={2} value={form.inativo?.observacoes ?? ""} onChange={(e) => setForm({ ...form, inativo: { ...(form.inativo ?? { inicio: "", motivo: "" }), observacoes: e.target.value } })} /></div>
            </div>
          )}

          <div className="col-span-2">
            <Label>Observações gerais</Label>
            <Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => {
            if (!form.nome.trim()) { toast.error("Informe o nome"); return; }
            onSave(form);
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== MAINTENANCE TAB ===================== */

function MaintenanceTab({ vehicles, maintenances, saveMaintenance, deleteMaintenance, filterVehicle, setFilterVehicle }: FleetState & { filterVehicle: string; setFilterVehicle: (v: string) => void }) {
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const filtered = useMemo(() => {
    let list = [...maintenances].sort((a, b) => b.data.localeCompare(a.data));
    if (filterVehicle !== "all") list = list.filter((m) => m.vehicleId === filterVehicle);
    if (filterMonth !== "all") list = list.filter((m) => m.data.slice(0, 7) === filterMonth);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((m) => m.descricao.toLowerCase().includes(q) || m.tipo.toLowerCase().includes(q) || (m.oficina ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [maintenances, filterVehicle, filterMonth, query]);

  const availableMonths = useMemo(() => {
    const set = new Set(maintenances.map((m) => m.data.slice(0, 7)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [maintenances]);

  function exportCSV() {
    if (filtered.length === 0) { toast.error("Nenhuma manutenção para exportar"); return; }
    const header = ["Data", "Veiculo", "Placa", "Tipo", "Descricao", "Oficina", "KM", "Valor"];
    const rows = filtered.map((m) => {
      const v = vehicles.find((x) => x.id === m.vehicleId);
      return [formatDate(m.data), v?.nome ?? "", v?.placa ?? "", m.tipo, m.descricao, m.oficina ?? "", String(m.km), m.valor.toFixed(2).replace(".", ",")];
    });
    const total = filtered.reduce((s, m) => s + m.valor, 0);
    rows.push(["", "", "", "", "", "", "TOTAL", total.toFixed(2).replace(".", ",")]);
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(escape).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const vehicleLabel = filterVehicle === "all" ? "geral" : (vehicles.find((v) => v.id === filterVehicle)?.placa || "veiculo").replace(/\s+/g, "_");
    const monthLabel = filterMonth === "all" ? "todos" : filterMonth;
    a.href = url; a.download = `manutencoes_${vehicleLabel}_${monthLabel}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado");
  }

  function openNew() {
    setEditing({ id: newId(), vehicleId: filterVehicle !== "all" ? filterVehicle : (vehicles[0]?.id ?? ""), data: new Date().toISOString().slice(0, 10), tipo: "Preventiva", descricao: "", valor: 0, km: 0, oficina: "" });
    setOpen(true);
  }
  function openEdit(m: Maintenance) { setEditing({ ...m }); setOpen(true); }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Histórico de manutenções</h2>
          <p className="text-sm text-muted-foreground">{maintenances.length} registro(s) no total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="size-4" /> Exportar relatório</Button>
          <Button onClick={openNew} className="gap-2" disabled={vehicles.length === 0}><Plus className="size-4" /> Nova manutenção</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input placeholder="Buscar por tipo, descrição, oficina..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={filterVehicle} onValueChange={setFilterVehicle}>
            <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os veículos</SelectItem>
              {vehicles.map((v) => (<SelectItem key={v.id} value={v.id}>{v.nome} · {v.placa}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="sm:w-48"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {availableMonths.map((m) => {
                const [y, mo] = m.split("-");
                const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                return (<SelectItem key={m} value={m}>{label}</SelectItem>);
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">KM</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma manutenção encontrada.</TableCell></TableRow>
              )}
              {filtered.map((m) => {
                const v = vehicles.find((x) => x.id === m.vehicleId);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(m.data)}</TableCell>
                    <TableCell><div className="font-medium text-sm">{v?.nome ?? "—"}</div><div className="text-xs text-muted-foreground font-mono">{v?.placa ?? ""}</div></TableCell>
                    <TableCell><Badge variant="secondary">{m.tipo}</Badge></TableCell>
                    <TableCell className="max-w-xs"><div className="truncate" title={m.descricao}>{m.descricao}</div>{m.oficina && <div className="text-xs text-muted-foreground">{m.oficina}</div>}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.km.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatBRL(m.valor)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Pencil className="size-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Remover manutenção?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { deleteMaintenance(m.id); toast.success("Manutenção removida"); }}>Remover</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MaintenanceDialog open={open} onOpenChange={setOpen} maintenance={editing} vehicles={vehicles}
        onSave={(m) => { saveMaintenance(m); setOpen(false); toast.success("Manutenção salva"); }} />
    </div>
  );
}

function MaintenanceDialog({ open, onOpenChange, maintenance, vehicles, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; maintenance: Maintenance | null; vehicles: Vehicle[]; onSave: (m: Maintenance) => void;
}) {
  const [form, setForm] = useState<Maintenance | null>(maintenance);
  useEffect(() => setForm(maintenance), [maintenance]);
  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Manutenção</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Veículo</Label>
            <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{vehicles.map((v) => (<SelectItem key={v.id} value={v.id}>{v.nome} · {v.placa}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
          <div><Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Preventiva">Preventiva</SelectItem>
                <SelectItem value="Corretiva">Corretiva</SelectItem>
                <SelectItem value="Troca de óleo">Troca de óleo</SelectItem>
                <SelectItem value="Pneus">Pneus</SelectItem>
                <SelectItem value="Freios">Freios</SelectItem>
                <SelectItem value="Revisão">Revisão</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>KM no serviço</Label><Input type="number" min={0} value={form.km} onChange={(e) => setForm({ ...form, km: Number(e.target.value) || 0 })} /></div>
          <div><Label>Valor (R$)</Label><Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) || 0 })} /></div>
          <div className="col-span-2"><Label>Oficina (opcional)</Label><Input value={form.oficina ?? ""} onChange={(e) => setForm({ ...form, oficina: e.target.value })} /></div>
          <div className="col-span-2"><Label>Descrição do serviço</Label><Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { if (!form.vehicleId) return toast.error("Selecione um veículo"); if (!form.descricao.trim()) return toast.error("Adicione uma descrição"); onSave(form); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== CALENDAR TAB ===================== */

type CalendarEvent = {
  kind: "manutencao" | "emprestimo" | "ferias" | "folga" | "venda";
  label: string;
  entityId: string;
  color: string;
};

function CalendarTab({ vehicles, drivers }: FleetState) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  const [filterDriver, setFilterDriver] = useState<string>("all");

  const events = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const add = (day: string, ev: CalendarEvent) => {
      const arr = map.get(day) ?? [];
      arr.push(ev);
      map.set(day, arr);
    };
    vehicles.forEach((v) => {
      if (filterVehicle !== "all" && filterVehicle !== v.id) return;
      if (v.status === "manutencao" && v.manutencao?.inicio && v.manutencao?.previsaoFim) {
        const end = v.manutencao.fimReal || v.manutencao.previsaoFim;
        eachDay(v.manutencao.inicio, end).forEach((d) => add(d, { kind: "manutencao", label: `Manutenção: ${v.nome}`, entityId: v.id, color: "bg-red-500" }));
      }
      if (v.status === "emprestado" && v.emprestimo?.inicio && v.emprestimo?.previsaoDevolucao) {
        eachDay(v.emprestimo.inicio, v.emprestimo.previsaoDevolucao).forEach((d) => add(d, { kind: "emprestimo", label: `Emprestado: ${v.nome} → ${v.emprestimo!.para}`, entityId: v.id, color: "bg-blue-500" }));
      }
      if (v.status === "vendido" && v.venda?.data) {
        add(v.venda.data, { kind: "venda", label: `Vendido: ${v.nome}`, entityId: v.id, color: "bg-gray-500" });
      }
    });
    drivers.forEach((dr) => {
      if (filterDriver !== "all" && filterDriver !== dr.id) return;
      if (dr.status === "ferias" && dr.ferias?.inicio && dr.ferias?.fim) {
        eachDay(dr.ferias.inicio, dr.ferias.fim).forEach((d) => add(d, { kind: "ferias", label: `Férias: ${dr.nome}`, entityId: dr.id, color: "bg-purple-500" }));
      }
      if (dr.status === "folga" && dr.folga?.inicio && dr.folga?.fim) {
        eachDay(dr.folga.inicio, dr.folga.fim).forEach((d) => add(d, { kind: "folga", label: `Folga: ${dr.nome}`, entityId: dr.id, color: "bg-cyan-500" }));
      }
    });
    return map;
  }, [vehicles, drivers, filterVehicle, filterDriver]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { day: number | null; dateStr: string }[] = [];
  for (let i = 0; i < firstDayWeek; i++) cells.push({ day: null, dateStr: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, dateStr: "" });

  const monthLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Calendário operacional</h2>
          <p className="text-sm text-muted-foreground">Indisponibilidades de veículos e motoristas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="size-4" /></Button>
          <span className="text-sm font-medium capitalize w-40 text-center">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="size-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Hoje</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Select value={filterVehicle} onValueChange={setFilterVehicle}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Veículo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os veículos</SelectItem>
              {vehicles.map((v) => (<SelectItem key={v.id} value={v.id}>{v.nome} · {v.placa}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterDriver} onValueChange={setFilterDriver}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Motorista" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os motoristas</SelectItem>
              {drivers.map((d) => (<SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3 text-xs flex-wrap ml-auto">
            <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-red-500" /> Manutenção</span>
            <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-blue-500" /> Emprestado</span>
            <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-purple-500" /> Férias</span>
            <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-cyan-500" /> Folga</span>
            <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-gray-500" /> Venda</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="text-xs text-center font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              const dayEvents = c.dateStr ? events.get(c.dateStr) ?? [] : [];
              const isToday = c.dateStr === today;
              return (
                <div key={i} className={`min-h-[80px] rounded-md border p-1 ${c.day ? "bg-card" : "bg-transparent border-transparent"} ${isToday ? "ring-2 ring-primary" : ""}`}>
                  {c.day && (
                    <>
                      <div className="text-xs font-medium text-muted-foreground mb-1">{c.day}</div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev, idx) => (
                          <div key={idx} className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${ev.color}`} title={ev.label}>
                            {ev.label}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ===================== HISTORY TAB ===================== */

function HistoryTab({ audit, clearAudit, vehicles, drivers }: FleetState) {
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterTarget, setFilterTarget] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = [...audit].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (filterEntity !== "all") list = list.filter((a) => a.entidade === filterEntity);
    if (filterTarget !== "all") list = list.filter((a) => a.entidadeId === filterTarget);
    if (filterMonth) list = list.filter((a) => a.timestamp.slice(0, 7) === filterMonth);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((a) => a.entidadeNome.toLowerCase().includes(q) || a.acao.toLowerCase().includes(q) || (a.responsavel ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [audit, filterEntity, filterTarget, filterMonth, query]);

  const targetOptions = useMemo(() => {
    if (filterEntity === "motorista") return drivers.map((d) => ({ id: d.id, nome: d.nome }));
    if (filterEntity === "veiculo") return vehicles.map((v) => ({ id: v.id, nome: `${v.nome} · ${v.placa}` }));
    return [
      ...vehicles.map((v) => ({ id: v.id, nome: `🚗 ${v.nome}` })),
      ...drivers.map((d) => ({ id: d.id, nome: `👤 ${d.nome}` })),
    ];
  }, [filterEntity, vehicles, drivers]);

  function exportTxt() {
    if (filtered.length === 0) { toast.error("Nada a exportar"); return; }
    const lines = filtered.map((a) => {
      const linha = [
        formatDateTime(a.timestamp),
        `[${a.entidade === "veiculo" ? "VEÍCULO" : "MOTORISTA"}]`,
        a.entidadeNome,
        `→ ${a.acao}`,
      ];
      if (a.antes || a.depois) linha.push(`(${a.antes ?? "—"} → ${a.depois ?? "—"})`);
      if (a.responsavel) linha.push(`por ${a.responsavel}`);
      if (a.observacoes) linha.push(`obs: ${a.observacoes}`);
      return linha.join(" ");
    });
    const blob = new Blob(["Histórico de alterações\n\n" + lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `historico_${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Histórico exportado");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Histórico de alterações</h2>
          <p className="text-sm text-muted-foreground">{audit.length} registro(s) de auditoria</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportTxt} className="gap-2"><FileText className="size-4" /> Exportar (.txt)</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" className="gap-2 text-destructive"><Trash2 className="size-4" /> Limpar</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Limpar histórico?</AlertDialogTitle><AlertDialogDescription>Isso removerá todos os {audit.length} registros de auditoria.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { clearAudit(); toast.success("Histórico limpo"); }}>Limpar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative flex-1">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input placeholder="Buscar por entidade, ação, responsável..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v); setFilterTarget("all"); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas entidades</SelectItem>
              <SelectItem value="veiculo">Veículos</SelectItem>
              <SelectItem value="motorista">Motoristas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTarget} onValueChange={setFilterTarget}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos (veículo/motorista)</SelectItem>
              {targetOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="flex-1" />
            {filterMonth && (
              <Button variant="ghost" size="icon" onClick={() => setFilterMonth("")} title="Limpar mês">
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Data/Hora</TableHead>
                <TableHead className="w-24">Tipo</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Alteração</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum registro.</TableCell></TableRow>
              )}
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDateTime(a.timestamp)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{a.entidade === "veiculo" ? "Veículo" : "Motorista"}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">{a.entidadeNome}</TableCell>
                  <TableCell className="text-sm">{a.acao}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.antes || a.depois ? (<><span className="line-through">{a.antes ?? "—"}</span> → <span className="text-foreground">{a.depois ?? "—"}</span></>) : (a.observacoes ?? "—")}
                  </TableCell>
                  <TableCell className="text-xs">{a.responsavel || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}