import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
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
  Calendar,
  Search,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
  type Vehicle,
  type Maintenance,
} from "@/lib/fleet-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FrotaPro — Controle de Manutenção de Frotas" },
      { name: "description", content: "Sistema para gestão de manutenção de veículos, com histórico, dashboards e controle de custos." },
      { property: "og:title", content: "FrotaPro" },
      { property: "og:description", content: "Controle de manutenção da sua frota com dashboards e histórico." },
    ],
  }),
  component: Index,
});

function Index() {
  const fleet = useFleet();

  if (!fleet.hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Car className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">FrotaPro</h1>
            <p className="text-xs text-muted-foreground">Controle de manutenção de frotas</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="size-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-2">
              <Car className="size-4" /> Veículos
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="size-4" /> Manutenções
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard {...fleet} />
          </TabsContent>
          <TabsContent value="vehicles">
            <VehiclesTab {...fleet} />
          </TabsContent>
          <TabsContent value="maintenance">
            <MaintenanceTab {...fleet} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

type FleetState = ReturnType<typeof useFleet>;

function Dashboard({ vehicles, maintenances }: FleetState) {
  const totalGasto = maintenances.reduce((s, m) => s + m.valor, 0);
  const totalManut = maintenances.length;
  const gastoMes = useMemo(() => {
    const now = new Date();
    return maintenances
      .filter((m) => {
        const d = new Date(m.data);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, m) => s + m.valor, 0);
  }, [maintenances]);

  const porVeiculo = useMemo(() => {
    return vehicles.map((v) => {
      const ms = maintenances.filter((m) => m.vehicleId === v.id);
      return {
        nome: v.nome,
        placa: v.placa,
        gasto: ms.reduce((s, m) => s + m.valor, 0),
        manutencoes: ms.length,
      };
    });
  }, [vehicles, maintenances]);

  const ultimas = useMemo(
    () =>
      [...maintenances]
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 5),
    [maintenances],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Veículos" value={vehicles.length.toString()} icon={<Car className="size-5" />} />
        <StatCard label="Manutenções" value={totalManut.toString()} icon={<Wrench className="size-5" />} />
        <StatCard label="Gasto total" value={formatBRL(totalGasto)} icon={<DollarSign className="size-5" />} />
        <StatCard label="Gasto no mês" value={formatBRL(gastoMes)} icon={<Calendar className="size-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gastos por veículo</CardTitle>
            <CardDescription>Total gasto em manutenções por veículo</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porVeiculo}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="placa" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(v: number) => formatBRL(v)}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }}
                />
                <Bar dataKey="gasto" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas manutenções</CardTitle>
            <CardDescription>Mais recentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ultimas.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada.</p>
            )}
            {ultimas.map((m) => {
              const v = vehicles.find((x) => x.id === m.vehicleId);
              return (
                <div key={m.id} className="flex items-start justify-between gap-2 border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{m.tipo}</p>
                    <p className="text-xs text-muted-foreground">
                      {v?.placa ?? "—"} · {formatDate(m.data)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatBRL(m.valor)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frota</CardTitle>
          <CardDescription>Resumo rápido dos veículos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {vehicles.map((v) => {
              const ms = maintenances.filter((m) => m.vehicleId === v.id);
              const gasto = ms.reduce((s, m) => s + m.valor, 0);
              return (
                <div key={v.id} className="rounded-lg border bg-card overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {v.imagem ? (
                      <img src={v.imagem} alt={v.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground">
                        <Car className="size-10" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-background/90 text-foreground border">
                      {v.placa}
                    </Badge>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-medium text-sm leading-tight">{v.nome}</p>
                    <p className="text-xs text-muted-foreground">{v.modelo} · {v.ano}</p>
                    <div className="flex justify-between pt-2 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Gauge className="size-3.5" /> {v.kmAtual.toLocaleString("pt-BR")} km
                      </span>
                      <span className="font-medium">{formatBRL(gasto)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function VehiclesTab({ vehicles, saveVehicle, deleteVehicle, maintenances }: FleetState) {
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing({ id: newId(), nome: "", placa: "", modelo: "", ano: "", kmAtual: 0 });
    setOpen(true);
  }
  function openEdit(v: Vehicle) {
    setEditing({ ...v });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Veículos da frota</h2>
          <p className="text-sm text-muted-foreground">{vehicles.length} veículo(s) cadastrado(s)</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="size-4" /> Novo veículo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => {
          const ms = maintenances.filter((m) => m.vehicleId === v.id);
          return (
            <Card key={v.id} className="overflow-hidden pt-0">
              <div className="aspect-video bg-muted relative">
                {v.imagem ? (
                  <img src={v.imagem} alt={v.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-foreground">
                    <Car className="size-12" />
                  </div>
                )}
                <Badge className="absolute top-3 left-3 bg-background/95 text-foreground border text-sm font-mono">
                  {v.placa || "SEM PLACA"}
                </Badge>
              </div>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold">{v.nome}</p>
                  <p className="text-sm text-muted-foreground">{v.modelo} · {v.ano}</p>
                </div>
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Gauge className="size-4" /> {v.kmAtual.toLocaleString("pt-BR")} km
                  </span>
                  <span className="text-muted-foreground">{ms.length} manut.</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(v)}>
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="size-3.5" />
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
                        <AlertDialogAction
                          onClick={() => {
                            deleteVehicle(v.id);
                            toast.success("Veículo removido");
                          }}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <VehicleDialog
        open={open}
        onOpenChange={setOpen}
        vehicle={editing}
        onSave={(v) => {
          saveVehicle(v);
          setOpen(false);
          toast.success("Veículo salvo");
        }}
      />
    </div>
  );
}

function VehicleDialog({
  open,
  onOpenChange,
  vehicle,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle: Vehicle | null;
  onSave: (v: Vehicle) => void;
}) {
  const [form, setForm] = useState<Vehicle | null>(vehicle);
  const fileRef = useRef<HTMLInputElement>(null);

  // sync when opening
  useMemo(() => setForm(vehicle), [vehicle]);

  if (!form) return null;

  function handleImage(file: File) {
    if (file.size > 2_000_000) {
      toast.error("Imagem muito grande (máx 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => (f ? { ...f, imagem: reader.result as string } : f));
    };
    reader.readAsDataURL(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{vehicle && form.nome ? "Editar veículo" : "Novo veículo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="size-24 rounded-lg bg-muted overflow-hidden grid place-items-center shrink-0">
              {form.imagem ? (
                <img src={form.imagem} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImage(f);
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {form.imagem ? "Trocar imagem" : "Adicionar imagem"}
              </Button>
              {form.imagem && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm({ ...form, imagem: undefined })}
                >
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
            <div className="col-span-2">
              <Label>KM atual</Label>
              <Input
                type="number"
                min={0}
                value={form.kmAtual}
                onChange={(e) => setForm({ ...form, kmAtual: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!form.nome.trim() || !form.placa.trim()) {
                toast.error("Preencha nome e placa");
                return;
              }
              onSave(form);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceTab({ vehicles, maintenances, saveMaintenance, deleteMaintenance }: FleetState) {
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [open, setOpen] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = [...maintenances].sort((a, b) => b.data.localeCompare(a.data));
    if (filterVehicle !== "all") list = list.filter((m) => m.vehicleId === filterVehicle);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (m) =>
          m.descricao.toLowerCase().includes(q) ||
          m.tipo.toLowerCase().includes(q) ||
          (m.oficina ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [maintenances, filterVehicle, query]);

  function openNew() {
    setEditing({
      id: newId(),
      vehicleId: vehicles[0]?.id ?? "",
      data: new Date().toISOString().slice(0, 10),
      tipo: "Preventiva",
      descricao: "",
      valor: 0,
      km: 0,
      oficina: "",
    });
    setOpen(true);
  }

  function openEdit(m: Maintenance) {
    setEditing({ ...m });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Histórico de manutenções</h2>
          <p className="text-sm text-muted-foreground">{maintenances.length} registro(s) no total</p>
        </div>
        <Button onClick={openNew} className="gap-2" disabled={vehicles.length === 0}>
          <Plus className="size-4" /> Nova manutenção
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar por tipo, descrição, oficina..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={filterVehicle} onValueChange={setFilterVehicle}>
            <SelectTrigger className="sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os veículos</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nome} · {v.placa}
                </SelectItem>
              ))}
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
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhuma manutenção encontrada.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((m) => {
                const v = vehicles.find((x) => x.id === m.vehicleId);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(m.data)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{v?.nome ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{v?.placa ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{m.tipo}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={m.descricao}>{m.descricao}</div>
                      {m.oficina && <div className="text-xs text-muted-foreground">{m.oficina}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.km.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatBRL(m.valor)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover manutenção?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  deleteMaintenance(m.id);
                                  toast.success("Manutenção removida");
                                }}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
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

      <MaintenanceDialog
        open={open}
        onOpenChange={setOpen}
        maintenance={editing}
        vehicles={vehicles}
        onSave={(m) => {
          saveMaintenance(m);
          setOpen(false);
          toast.success("Manutenção salva");
        }}
      />
    </div>
  );
}

function MaintenanceDialog({
  open,
  onOpenChange,
  maintenance,
  vehicles,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  maintenance: Maintenance | null;
  vehicles: Vehicle[];
  onSave: (m: Maintenance) => void;
}) {
  const [form, setForm] = useState<Maintenance | null>(maintenance);
  useMemo(() => setForm(maintenance), [maintenance]);

  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manutenção</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Veículo</Label>
            <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.nome} · {v.placa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
          <div>
            <Label>Tipo</Label>
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
          <div>
            <Label>KM no serviço</Label>
            <Input type="number" min={0} value={form.km} onChange={(e) => setForm({ ...form, km: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) || 0 })} />
          </div>
          <div className="col-span-2">
            <Label>Oficina (opcional)</Label>
            <Input value={form.oficina ?? ""} onChange={(e) => setForm({ ...form, oficina: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Descrição do serviço</Label>
            <Textarea
              rows={3}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descreva o serviço realizado..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!form.vehicleId) return toast.error("Selecione um veículo");
              if (!form.descricao.trim()) return toast.error("Adicione uma descrição");
              onSave(form);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
