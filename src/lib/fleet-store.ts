import { useEffect, useState, useCallback } from "react";

export type Vehicle = {
  id: string;
  nome: string;
  placa: string;
  modelo: string;
  ano: string;
  kmAtual: number;
  imagem?: string; // base64 data URL
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

const VEHICLES_KEY = "fleet.vehicles.v1";
const MAINT_KEY = "fleet.maintenances.v1";

const seedVehicles: Vehicle[] = [
  { id: "v1", nome: "Veículo 01", placa: "ABC-1A23", modelo: "Fiat Strada", ano: "2022", kmAtual: 45000 },
  { id: "v2", nome: "Veículo 02", placa: "ABC-2B34", modelo: "VW Saveiro", ano: "2021", kmAtual: 62000 },
  { id: "v3", nome: "Veículo 03", placa: "ABC-3C45", modelo: "Renault Master", ano: "2020", kmAtual: 110000 },
  { id: "v4", nome: "Veículo 04", placa: "ABC-4D56", modelo: "Mercedes Sprinter", ano: "2023", kmAtual: 18000 },
  { id: "v5", nome: "Veículo 05", placa: "ABC-5E67", modelo: "Ford Transit", ano: "2019", kmAtual: 135000 },
  { id: "v6", nome: "Veículo 06", placa: "ABC-6F78", modelo: "Hyundai HR", ano: "2022", kmAtual: 51000 },
  { id: "v7", nome: "Veículo 07", placa: "ABC-7G89", modelo: "Iveco Daily", ano: "2021", kmAtual: 78000 },
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

export function useFleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setVehicles(readLS<Vehicle[]>(VEHICLES_KEY, seedVehicles));
    setMaintenances(readLS<Maintenance[]>(MAINT_KEY, []));
  }, []);

  useEffect(() => {
    // seed on first load
    if (typeof window !== "undefined" && !window.localStorage.getItem(VEHICLES_KEY)) {
      writeLS(VEHICLES_KEY, seedVehicles);
    }
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
    if (idx >= 0) list[idx] = v;
    else list.push(v);
    writeLS(VEHICLES_KEY, list);
    emit();
  }, []);

  const deleteVehicle = useCallback((id: string) => {
    const list = readLS<Vehicle[]>(VEHICLES_KEY, []).filter((v) => v.id !== id);
    writeLS(VEHICLES_KEY, list);
    const m = readLS<Maintenance[]>(MAINT_KEY, []).filter((x) => x.vehicleId !== id);
    writeLS(MAINT_KEY, m);
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

  return {
    hydrated,
    vehicles,
    maintenances,
    saveVehicle,
    deleteVehicle,
    saveMaintenance,
    deleteMaintenance,
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