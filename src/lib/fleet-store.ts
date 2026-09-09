import { useEffect, useState, useCallback } from "react";

export type VehicleStatus = "ativo" | "manutencao" | "indisponivel" | "emprestado" | "vendido";
export type DriverStatus = "ativo" | "inativo" | "ferias" | "folga";

export type VehicleManutencao = {
  inicio: string;
  previsaoFim: string;
  fimReal?: string;
  descricao: string;
  observacoes?: string;
  valor?: number;
};
export type VehicleEmprestimo = {
  para: string;
  inicio: string;
  previsaoDevolucao: string;
  observacoes?: string;
};
export type VehicleVenda = {
  data: string;
  comprador?: string;
  valor?: number;
  observacoes?: string;
};

export type Vehicle = {
  id: string;
  nome: string;
  placa: string;
  modelo: string;
  ano: string;
  kmAtual: number;
  imagem?: string; // base64 data URL
  observacoes?: string;
  controleAcessoPortao?: boolean;
  motoristaId?: string;
  status?: VehicleStatus;
  manutencao?: VehicleManutencao;
  emprestimo?: VehicleEmprestimo;
  venda?: VehicleVenda;
};

export type Driver = {
  id: string;
  nome: string;
  telefone?: string;
  observacoes?: string;
  veiculoId?: string;
  status?: DriverStatus;
  ferias?: { inicio: string; fim: string; observacoes?: string };
  folga?: { inicio: string; fim: string; observacoes?: string };
  inativo?: { inicio: string; motivo: string; observacoes?: string };
};

export type AuditLog = {
  id: string;
  timestamp: string; // ISO
  entidade: "veiculo" | "motorista";
  entidadeId: string;
  entidadeNome: string;
  acao: string;
  antes?: string;
  depois?: string;
  observacoes?: string;
  responsavel?: string;
};

export type Maintenance = {
  id: string;
  vehicleId: string;
  data: string; // ISO date
  tipo: string;
  descricao: string;
  valor: number;
  km: number;
  oficina?: string;
};

/** Manutenção programada (lembrete por KM/data) */
export type ScheduledMaintenance = {
  id: string;
  vehicleId: string;
  titulo: string;
  descricao?: string;
  ultimaData?: string; // YYYY-MM-DD
  ultimaKm: number;
  intervaloKm: number;
  alertaKm: number;
  proximaData?: string; // YYYY-MM-DD (opcional)
  realizada?: boolean; // arquivada / concluída sem reprogramar
  createdAt?: string;
};

export type ScheduledLevel = "programada" | "proxima" | "vencida" | "realizada";

const VEHICLES_KEY = "fleet.vehicles.v1";
const MAINT_KEY = "fleet.maintenances.v1";
const DRIVERS_KEY = "fleet.drivers.v1";
const AUDIT_KEY = "fleet.audit.v1";
const OPERATOR_KEY = "fleet.operator.v1";
const SCHED_KEY = "fleet.scheduled.v1";


const seedVehicles: Vehicle[] = [
  { id: "v1", nome: "Veículo 01", placa: "ABC-1A23", modelo: "Fiat Strada", ano: "2022", kmAtual: 45000, status: "ativo", controleAcessoPortao: false },
  { id: "v2", nome: "Veículo 02", placa: "ABC-2B34", modelo: "VW Saveiro", ano: "2021", kmAtual: 62000, status: "ativo", controleAcessoPortao: false },
  { id: "v3", nome: "Veículo 03", placa: "ABC-3C45", modelo: "Renault Master", ano: "2020", kmAtual: 110000, status: "ativo", controleAcessoPortao: true },
  { id: "v4", nome: "Veículo 04", placa: "ABC-4D56", modelo: "Mercedes Sprinter", ano: "2023", kmAtual: 18000, status: "ativo", controleAcessoPortao: false },
  { id: "v5", nome: "Veículo 05", placa: "ABC-5E67", modelo: "Ford Transit", ano: "2019", kmAtual: 135000, status: "ativo", controleAcessoPortao: false },
  { id: "v6", nome: "Veículo 06", placa: "ABC-6F78", modelo: "Hyundai HR", ano: "2022", kmAtual: 51000, status: "ativo", controleAcessoPortao: false },
  { id: "v7", nome: "Veículo 07", placa: "ABC-7G89", modelo: "Iveco Daily", ano: "2021", kmAtual: 78000, status: "ativo", controleAcessoPortao: false },
];

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function appendAudit(entry: Omit<AuditLog, "id" | "timestamp"> & { timestamp?: string }) {
  const list = readLS<AuditLog[]>(AUDIT_KEY, []);
  list.push({
    id: newId(),
    timestamp: entry.timestamp ?? new Date().toISOString(),
    ...entry,
  });
  writeLS(AUDIT_KEY, list);
}

function autoReactivateDrivers() {
  if (typeof window === "undefined") return;
  const drivers = readLS<Driver[]>(DRIVERS_KEY, []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let changed = false;
  for (const d of drivers) {
    if (d.status === "ferias" && d.ferias?.fim) {
      const fim = new Date(d.ferias.fim + "T00:00:00");
      if (fim < today) {
        appendAudit({
          entidade: "motorista", entidadeId: d.id, entidadeNome: d.nome,
          acao: "Férias finalizadas (automático)",
          antes: "ferias", depois: "ativo",
          responsavel: getOperator() || "sistema",
        });
        d.status = "ativo";
        d.ferias = undefined;
        changed = true;
      }
    }
    if (d.status === "folga" && d.folga?.fim) {
      const fim = new Date(d.folga.fim + "T00:00:00");
      if (fim < today) {
        appendAudit({
          entidade: "motorista", entidadeId: d.id, entidadeNome: d.nome,
          acao: "Folga finalizada (automático)",
          antes: "folga", depois: "ativo",
          responsavel: getOperator() || "sistema",
        });
        d.status = "ativo";
        d.folga = undefined;
        changed = true;
      }
    }
  }
  if (changed) writeLS(DRIVERS_KEY, drivers);
}

export function getOperator(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(OPERATOR_KEY) ?? "";
}
export function setOperator(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OPERATOR_KEY, name);
  emit();
}

export function useFleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [operator, setOperatorState] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setVehicles(readLS<Vehicle[]>(VEHICLES_KEY, seedVehicles));
    setMaintenances(readLS<Maintenance[]>(MAINT_KEY, []));
    setDrivers(readLS<Driver[]>(DRIVERS_KEY, []));
    setAudit(readLS<AuditLog[]>(AUDIT_KEY, []));
    setOperatorState(getOperator());
  }, []);

  useEffect(() => {
    // seed on first load
    if (typeof window !== "undefined" && !window.localStorage.getItem(VEHICLES_KEY)) {
      writeLS(VEHICLES_KEY, seedVehicles);
    }
    // Auto-reativa motoristas cujas férias/folga já terminaram
    autoReactivateDrivers();
    refresh();
    setHydrated(true);
    const l = () => refresh();
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [refresh]);

  const saveVehicle = useCallback((v: Vehicle) => {
    const list = readLS<Vehicle[]>(VEHICLES_KEY, []);
    const idx = list.findIndex((x) => x.id === v.id);
    const prev = idx >= 0 ? list[idx] : undefined;
    const responsavel = getOperator();

    // Bloqueio: veículo vendido não recebe motorista nem outros vínculos
    const wasSold = prev?.status === "vendido";
    const becameSold = v.status === "vendido";
    if (wasSold && v.status !== "vendido") {
      // permitir reverter via edição manual? Vamos permitir mas avisar via log
    }
    if (becameSold) {
      v = { ...v, motoristaId: undefined };
    }

    if (idx >= 0) list[idx] = v;
    else list.push(v);
    writeLS(VEHICLES_KEY, list);

    // Sincroniza vínculo de motorista
    const drivers = readLS<Driver[]>(DRIVERS_KEY, []);
    const prevDriverId = prev?.motoristaId;
    const newDriverId = v.motoristaId;
    let driversChanged = false;
    if (prevDriverId && prevDriverId !== newDriverId) {
      const d = drivers.find((x) => x.id === prevDriverId);
      if (d && d.veiculoId === v.id) {
        d.veiculoId = undefined;
        driversChanged = true;
      }
    }
    if (newDriverId) {
      // remover esse motorista de outro veículo que o tivesse
      const otherVehicle = list.find((x) => x.id !== v.id && x.motoristaId === newDriverId);
      if (otherVehicle) {
        otherVehicle.motoristaId = undefined;
        writeLS(VEHICLES_KEY, list);
      }
      const d = drivers.find((x) => x.id === newDriverId);
      if (d && d.veiculoId !== v.id) {
        d.veiculoId = v.id;
        driversChanged = true;
      }
    }
    if (driversChanged) writeLS(DRIVERS_KEY, drivers);

    // Audit
    if (!prev) {
      appendAudit({
        entidade: "veiculo", entidadeId: v.id, entidadeNome: v.nome,
        acao: "Veículo cadastrado", responsavel,
      });
    } else {
      if ((prev.status ?? "ativo") !== (v.status ?? "ativo")) {
        appendAudit({
          entidade: "veiculo", entidadeId: v.id, entidadeNome: v.nome,
          acao: "Status alterado",
          antes: prev.status ?? "ativo", depois: v.status ?? "ativo",
          responsavel,
        });
      }
      if (prev.motoristaId !== v.motoristaId) {
        const nomeAntes = drivers.find((d) => d.id === prev.motoristaId)?.nome ?? "—";
        const nomeDepois = drivers.find((d) => d.id === v.motoristaId)?.nome ?? "—";
        appendAudit({
          entidade: "veiculo", entidadeId: v.id, entidadeNome: v.nome,
          acao: "Motorista alterado",
          antes: nomeAntes, depois: nomeDepois,
          responsavel,
        });
      }
      if (v.status === "vendido" && prev.status !== "vendido") {
        appendAudit({
          entidade: "veiculo", entidadeId: v.id, entidadeNome: v.nome,
          acao: "Venda registrada",
          depois: v.venda?.data ?? "",
          observacoes: v.venda?.observacoes,
          responsavel,
        });
      }
      if (v.status === "manutencao" && prev.status !== "manutencao") {
        appendAudit({
          entidade: "veiculo", entidadeId: v.id, entidadeNome: v.nome,
          acao: "Início de manutenção",
          observacoes: v.manutencao?.descricao,
          responsavel,
        });
      }
      if (prev.status === "manutencao" && v.status !== "manutencao") {
        appendAudit({
          entidade: "veiculo", entidadeId: v.id, entidadeNome: v.nome,
          acao: "Manutenção finalizada",
          responsavel,
        });
      }
      if (v.status === "emprestado" && prev.status !== "emprestado") {
        appendAudit({
          entidade: "veiculo", entidadeId: v.id, entidadeNome: v.nome,
          acao: "Empréstimo registrado",
          depois: v.emprestimo?.para,
          responsavel,
        });
      }
    }
    emit();
  }, []);

  const deleteVehicle = useCallback((id: string) => {
    const all = readLS<Vehicle[]>(VEHICLES_KEY, []);
    const removed = all.find((v) => v.id === id);
    const list = all.filter((v) => v.id !== id);
    writeLS(VEHICLES_KEY, list);
    const m = readLS<Maintenance[]>(MAINT_KEY, []).filter((x) => x.vehicleId !== id);
    writeLS(MAINT_KEY, m);
    // limpar vínculo em motoristas
    const drivers = readLS<Driver[]>(DRIVERS_KEY, []);
    let changed = false;
    drivers.forEach((d) => { if (d.veiculoId === id) { d.veiculoId = undefined; changed = true; } });
    if (changed) writeLS(DRIVERS_KEY, drivers);
    if (removed) appendAudit({
      entidade: "veiculo", entidadeId: id, entidadeNome: removed.nome,
      acao: "Veículo removido", responsavel: getOperator(),
    });
    emit();
  }, []);

  const saveDriver = useCallback((d: Driver) => {
    const list = readLS<Driver[]>(DRIVERS_KEY, []);
    const idx = list.findIndex((x) => x.id === d.id);
    const prev = idx >= 0 ? list[idx] : undefined;
    const responsavel = getOperator();

    if (idx >= 0) list[idx] = d;
    else list.push(d);
    writeLS(DRIVERS_KEY, list);

    // Sincroniza vínculo veículo
    const vehicles = readLS<Vehicle[]>(VEHICLES_KEY, []);
    let vehiclesChanged = false;
    const prevVehicleId = prev?.veiculoId;
    const newVehicleId = d.veiculoId;
    if (prevVehicleId && prevVehicleId !== newVehicleId) {
      const v = vehicles.find((x) => x.id === prevVehicleId);
      if (v && v.motoristaId === d.id) { v.motoristaId = undefined; vehiclesChanged = true; }
    }
    if (newVehicleId) {
      const v = vehicles.find((x) => x.id === newVehicleId);
      if (v && v.status !== "vendido") {
        // limpar motorista anterior desse veículo
        if (v.motoristaId && v.motoristaId !== d.id) {
          const oldDriver = list.find((x) => x.id === v.motoristaId);
          if (oldDriver) { oldDriver.veiculoId = undefined; writeLS(DRIVERS_KEY, list); }
        }
        v.motoristaId = d.id;
        vehiclesChanged = true;
      }
    }
    if (vehiclesChanged) writeLS(VEHICLES_KEY, vehicles);

    if (!prev) {
      appendAudit({ entidade: "motorista", entidadeId: d.id, entidadeNome: d.nome, acao: "Motorista cadastrado", responsavel });
    } else {
      if ((prev.status ?? "ativo") !== (d.status ?? "ativo")) {
        appendAudit({
          entidade: "motorista", entidadeId: d.id, entidadeNome: d.nome,
          acao: "Status alterado",
          antes: prev.status ?? "ativo", depois: d.status ?? "ativo",
          responsavel,
        });
      }
      if (prev.veiculoId !== d.veiculoId) {
        const nomeAntes = vehicles.find((v) => v.id === prev.veiculoId)?.nome ?? "—";
        const nomeDepois = vehicles.find((v) => v.id === d.veiculoId)?.nome ?? "—";
        appendAudit({
          entidade: "motorista", entidadeId: d.id, entidadeNome: d.nome,
          acao: "Veículo alterado",
          antes: nomeAntes, depois: nomeDepois,
          responsavel,
        });
      }
    }
    emit();
  }, []);

  const deleteDriver = useCallback((id: string) => {
    const all = readLS<Driver[]>(DRIVERS_KEY, []);
    const removed = all.find((d) => d.id === id);
    const list = all.filter((d) => d.id !== id);
    writeLS(DRIVERS_KEY, list);
    const vehicles = readLS<Vehicle[]>(VEHICLES_KEY, []);
    let changed = false;
    vehicles.forEach((v) => { if (v.motoristaId === id) { v.motoristaId = undefined; changed = true; } });
    if (changed) writeLS(VEHICLES_KEY, vehicles);
    if (removed) appendAudit({
      entidade: "motorista", entidadeId: id, entidadeNome: removed.nome,
      acao: "Motorista removido", responsavel: getOperator(),
    });
    emit();
  }, []);

  const saveMaintenance = useCallback((m: Maintenance) => {
    const list = readLS<Maintenance[]>(MAINT_KEY, []);
    const idx = list.findIndex((x) => x.id === m.id);
    if (idx >= 0) list[idx] = m;
    else list.push(m);
    writeLS(MAINT_KEY, list);
    // update vehicle km if maintenance km is higher
    const vlist = readLS<Vehicle[]>(VEHICLES_KEY, []);
    const v = vlist.find((x) => x.id === m.vehicleId);
    if (v && m.km > v.kmAtual) {
      v.kmAtual = m.km;
      writeLS(VEHICLES_KEY, vlist);
    }
    emit();
  }, []);

  const deleteMaintenance = useCallback((id: string) => {
    const list = readLS<Maintenance[]>(MAINT_KEY, []).filter((m) => m.id !== id);
    writeLS(MAINT_KEY, list);
    emit();
  }, []);

  const clearAudit = useCallback(() => {
    writeLS(AUDIT_KEY, []);
    emit();
  }, []);

  return {
    hydrated,
    vehicles,
    maintenances,
    drivers,
    audit,
    operator,
    saveVehicle,
    deleteVehicle,
    saveDriver,
    deleteDriver,
    saveMaintenance,
    deleteMaintenance,
    setOperator,
    clearAudit,
  };
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export const vehicleStatusInfo: Record<VehicleStatus, { label: string; color: string; bg: string; dot: string }> = {
  ativo:        { label: "Ativo",        color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
  manutencao:   { label: "Manutenção",   color: "text-red-700",     bg: "bg-red-100",     dot: "bg-red-500" },
  indisponivel: { label: "Indisponível", color: "text-amber-700",   bg: "bg-amber-100",   dot: "bg-amber-500" },
  emprestado:   { label: "Emprestado",   color: "text-blue-700",    bg: "bg-blue-100",    dot: "bg-blue-500" },
  vendido:      { label: "Vendido",      color: "text-gray-700",    bg: "bg-gray-200",    dot: "bg-gray-400" },
};

export const driverStatusInfo: Record<DriverStatus, { label: string; color: string; bg: string; dot: string }> = {
  ativo:   { label: "Ativo",   color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
  inativo: { label: "Inativo", color: "text-gray-700",    bg: "bg-gray-200",    dot: "bg-gray-400" },
  ferias:  { label: "Férias",  color: "text-purple-700",  bg: "bg-purple-100",  dot: "bg-purple-500" },
  folga:   { label: "Folga",   color: "text-cyan-700",    bg: "bg-cyan-100",    dot: "bg-cyan-500" },
};

/** Itera datas entre `inicio` e `fim` inclusive, retornando strings YYYY-MM-DD */
export function eachDay(inicio: string, fim: string): string[] {
  if (!inicio || !fim) return [];
  const start = new Date(inicio + "T00:00:00");
  const end = new Date(fim + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function daysUntil(iso: string): number {
  if (!iso) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}