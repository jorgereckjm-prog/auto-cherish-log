Vou implementar uma reformulação completa do sistema de controle de frotas com integração entre veículos, motoristas, histórico, calendário e dashboard gerencial. Todos os dados continuam em `localStorage` (sem backend) — funciona offline no app Electron.

## Estrutura proposta

### Novas abas
```
Dashboard | Veículos | Motoristas | Manutenções | Calendário | Histórico
```

### Arquivos a criar/editar
- `src/lib/fleet-store.ts` — expandir tipos e store (Vehicle, Driver, Maintenance, Loan, Sale, AuditLog)
- `src/components/fleet/VehiclesTab.tsx` — extrair e expandir
- `src/components/fleet/DriversTab.tsx` — novo
- `src/components/fleet/MaintenanceTab.tsx` — extrair
- `src/components/fleet/CalendarTab.tsx` — novo (visualização mensal/semanal)
- `src/components/fleet/HistoryTab.tsx` — novo (auditoria)
- `src/components/fleet/Dashboard.tsx` — expandir com novos indicadores e alertas
- `src/components/fleet/VehicleDialog.tsx` — formulário com status, motorista, controle de portão
- `src/components/fleet/DriverDialog.tsx` — formulário com status e vínculo
- `src/routes/index.tsx` — orquestrar tabs

## Modelo de dados

```ts
type VehicleStatus = "ativo" | "manutencao" | "indisponivel" | "emprestado" | "vendido";
type DriverStatus = "ativo" | "inativo" | "ferias" | "folga";

type Vehicle = {
  id, nome, placa, modelo, ano, kmAtual, imagem?, observacoes?,
  controleAcessoPortao: boolean,
  motoristaId?: string,
  status: VehicleStatus,
  // dados conforme status
  manutencao?: { inicio, previsaoFim, fimReal?, descricao, observacoes?, valor? },
  emprestimo?: { para, inicio, previsaoDevolucao, observacoes? },
  venda?: { data, comprador?, valor?, observacoes? },
};

type Driver = {
  id, nome, telefone?, observacoes?,
  veiculoId?: string,
  status: DriverStatus,
  ferias?: { inicio, fim, observacoes? },
  folga?: { inicio, fim, observacoes? },
  inativo?: { inicio, motivo, observacoes? },
};

type AuditLog = {
  id, timestamp, entidade: "veiculo"|"motorista",
  entidadeId, entidadeNome, acao, antes?, depois?, observacoes?
};
```

## Funcionalidades

**Veículos** — Card com indicador colorido de status (🟩🟥🟨🟦⬜), checkbox controle de portão visível na lista, dialog de edição com seções dinâmicas (manutenção/empréstimo/venda), motorista vinculado (select), botão "Histórico de manutenções".

**Motoristas** — Nova aba com lista, dialog com status condicional (férias/folga/inativo abrem campos extras), veículo vinculado (select de veículos não vendidos).

**Vínculo automático** — Ao salvar veículo com motorista: limpar vínculo antigo do motorista, atualizar ambos, registrar log. Ao vender: remover vínculo.

**Calendário** — Grid mensal com navegação prev/next, células coloridas por evento (manutenção/empréstimo/férias/folga), filtros por veículo/motorista, visualização semanal opcional.

**Histórico** — Lista cronológica reversa de todos os logs, filtro por entidade, exportável.

**Dashboard** — Cards de contagem por status (veículos e motoristas), alertas automáticos (manutenções vencendo em 3 dias, empréstimos vencendo, férias terminando, veículos/motoristas sem vínculo).

**Usuário responsável** — Como não há login, usar campo "Responsável" digitado no momento da ação, ou um setting global "Usuário atual" salvo em localStorage.

## Pontos a confirmar

1. Sem backend (tudo em `localStorage`) — confirma? Ou quer Lovable Cloud para sincronizar entre dispositivos?
2. "Usuário responsável" — pedir no momento da ação ou ter um campo global "Operador" no topo?
3. Manter as 7 abas (Dashboard, Veículos, Motoristas, Manutenções, Calendário, Histórico) ou agrupar?
