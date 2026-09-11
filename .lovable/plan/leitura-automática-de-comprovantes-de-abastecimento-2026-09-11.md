# Leitura automática de comprovantes de abastecimento

Sim, é possível. Você tira/anexa a foto do comprovante, o sistema lê a placa, a quilometragem, a data, os litros e o valor, mostra tudo na tela para você conferir e, ao confirmar, atualiza a km do veículo e guarda o abastecimento no histórico.

## Como vai funcionar

1. Nova aba "Abastecimentos" no sistema, com o botão "+ Enviar comprovante".
2. Você escolhe a foto (uma por vez) ou tira pela câmera do celular.
3. A leitura acontece em alguns segundos e abre uma janela de conferência com:
   - Veículo identificado pela placa (se a placa não bater com nenhum cadastrado, você escolhe o veículo na lista)
   - Data, quilometragem, litros, valor por litro e valor total
   - A foto ao lado, para você comparar
4. Você corrige o que estiver errado e clica em "Confirmar".
5. Ao confirmar:
   - A quilometragem do veículo é atualizada (com aviso se a km lida for menor que a atual ou muito acima do normal)
   - O abastecimento entra no histórico de abastecimentos do veículo, com custo
   - Fica registrado no histórico de alterações quem confirmou

## Histórico de abastecimentos

- Lista com filtro por veículo e por mês, igual às manutenções
- Totais de litros e de gastos no período
- Exportação em planilha (CSV)
- Editar e excluir um lançamento
- Média de consumo (km rodados ÷ litros) entre abastecimentos do mesmo veículo

## Alertas na Dashboard

- Card com gasto de combustível do mês e comparação com o mês anterior
- Aviso quando a km de um veículo estiver desatualizada há muito tempo

## Pontos a considerar

- A leitura é muito boa em cupons legíveis, mas nem todo comprovante traz a placa ou a km impressa. Quando faltar, o sistema pede que você complete manualmente — por isso a tela de conferência.
- Fotos tortas, escuras ou amassadas reduzem a precisão.

## Detalhes técnicos

- Leitura da imagem por IA (Lovable AI, modelo com entrada de imagem) via `createServerFn` no servidor, com saída estruturada: `placa`, `data`, `km`, `litros`, `valorLitro`, `valorTotal`, `posto`, mais um nível de confiança por campo. Chave da IA fica só no servidor.
- Imagem enviada como base64 (redimensionada no navegador antes do envio para reduzir tamanho); a foto é guardada junto ao registro para consulta.
- Erros do serviço de IA (limite, crédito, falha) aparecem como mensagem clara na tela, com a opção de lançar manualmente.
- Novos dados em `src/lib/fleet-store.ts`, seguindo o padrão atual (localStorage): tipo `Fueling` + chave `fleet.fuelings.v1`, funções `saveFueling`/`deleteFueling`, atualização de `kmAtual` e registro em auditoria.
- Nova aba e componente `src/components/fleet/FuelingTab.tsx`, ligados em `src/routes/_authenticated/index.tsx`, mantendo o padrão visual atual.
- Ações de criar/editar/excluir respeitam as permissões já existentes.
