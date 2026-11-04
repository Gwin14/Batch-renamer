# Lote: loja e monetização

Textos da App Store: `store/app-store/texts.py`. Rode `python3 store/app-store/texts.py` para validar os limites e gerar `metadata.json`.
Páginas públicas (privacidade e suporte): `docs/`, prontas para o GitHub Pages.

## Modelo: freemium + Lote Pro

| Produto | ID | EUA | Brasil | Observação |
|---|---|---|---|---|
| Anual (destaque) | `com.fabiosantos.lote.pro.annual` | US$ 14,99 | R$ 49,90 | 7 dias grátis, nível 1 do grupo |
| Mensal | `com.fabiosantos.lote.pro.monthly` | US$ 2,99 | R$ 12,90 | âncora: o anual sai 58% mais barato |
| Vitalício | `com.fabiosantos.lote.pro.lifetime` | US$ 29,99 | R$ 99,90 | compra única (não consumível) |

Demais países: equalização automática da Apple a partir do preço dos EUA. China continental ficou de fora (exige registro ICP).

**Por que assim**
- Renomear arquivos é uma tarefa episódica. Muita gente não quer assinatura para um utilitário, e o vitalício a ~2× o anual captura esse público sem canibalizar o anual.
- O anual com teste grátis é o plano pré-selecionado no paywall. É o que mais converte em utilitários e dá o melhor LTV.
- O mensal fica barato o bastante para quem precisa por um mês, mas serve sobretudo de âncora para o anual parecer vantajoso.
- No Brasil (onde o app é nativo em pt-BR) os preços estão abaixo da equalização (~R$ 89,90/ano) para converter melhor.

**Limites do plano grátis (implementados, `FREE_LIMITS` em `src/services/purchases.ts`)**
- Grátis: todas as regras e variáveis, até 20 arquivos por lote, 3 presets próprios, desfazer os 3 últimos lotes. Compartilhar continua livre.
- Pro: lotes ilimitados, presets ilimitados, desfazer qualquer lote, widgets, tela bloqueada, Central de Controle e atalhos do ícone.
- O paywall (RevenueCat) aparece ao bater num limite, depois de o usuário já ter visto a prévia funcionando, e em Ajustes → Lote Pro (com Restaurar compras e Gerenciar assinatura).
- Pedido de avaliação (`src/services/review.ts`) após o 1º, o 10º e o 40º lote concluído sem erros, nunca no onboarding.

## RevenueCat (projeto `Lote`, `proj1fe6449d`)
- Apps: `Lote (iOS)` `app4f57333bf1`, `Lote (Android)` `app2c74446be4`
- Entitlement: `pro`
- Offering `default` (atual): `$rc_annual`, `$rc_monthly`, `$rc_lifetime`
