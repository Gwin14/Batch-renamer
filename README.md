# Lote — renomeador de arquivos em lote

App para celulares e tablets (iOS e Android) feito com Expo SDK 58 + Expo Router. **Roda inteiro no Expo Go**. As integrações com o sistema (Compartilhar, widgets, tela bloqueada, atalhos do ícone) entram automaticamente quando você gera um build nativo, sem quebrar o Expo Go.

## Rodar

```bash
npm install
npm start            # abre o QR code → escaneie com o Expo Go
npm test             # testes do motor de renomeação
npm run typecheck && npm run lint
```

Build nativo (ativa share extension, widgets, tela bloqueada e atalhos):

```bash
npx expo prebuild --clean
npx expo run:ios      # ou: npx expo run:android
# ou na nuvem: npx eas-cli@latest build --profile development
```

> iOS: defina `ios.appleTeamId` no `app.json` e registre o App Group `group.com.gwin14.lote` no seu time da Apple (o EAS Build faz isso sozinho).

## Funcionalidades

**Essenciais**
- Renomeação em lote com **prévia ao vivo** de cada nome e o trecho alterado destacado
- 13 regras combináveis, em ordem: Novo nome (template), Substituir (com regex, palavra inteira, maiúsc./minúsc.), Inserir, Remover (N primeiros/últimos, intervalo, entre parênteses, dígitos, símbolos), Maiúsc./minúsc. (Título, kebab-case, snake_case, camelCase…), Numeração (decimal, romanos, letras, hex, por pasta), Data (EXIF, criação, modificação, hoje), Zeros à esquerda, Limpar (“(1)”, “cópia”, emoji, acentos, espaços), Limitar tamanho, Extensão, Inverter partes e **Organizar em pastas**
- **Variáveis** com argumentos e **filtros encadeáveis**: `{taken:YYYY-MM-DD}_{folder|upper}_{n:3}`, `{name|ascii|kebab|slice:0:30}`, `{dims}`, `{orientation}`, `{rand:6}`…
- Pausar, duplicar, reordenar e remover regras (com “Desfazer”)
- Ordenação natural (foto 2 < foto 10), por data de captura, modificação, tamanho ou tipo
- Detecção de conflitos (sem diferenciar maiúsculas, como no iOS/Android): adicionar “(2)”, pular ou parar
- Renomeação segura em duas fases: troca de nomes (a↔b), cadeias e mudança só de maiúsculas funcionam
- **Histórico com desfazer** de qualquer lote (inclusive remove as subpastas criadas)

**Arquivos e pastas**
- Importar de Fotos (com EXIF), do app Arquivos, da câmera (“foto já nomeada”) ou pelo Compartilhar
- **Renomear uma pasta do aparelho no lugar** (Android: qualquer pasta via SAF; iOS: pasta escolhida no app Arquivos), com opção de subpastas
- Biblioteca própria com pastas: criar, renomear, mover, excluir, seleção múltipla, visualização rápida (Quick Look)
- No iOS, a biblioteca aparece em **Arquivos → No Meu iPhone → Lote**
- Exportar: compartilhar (vários viram ZIP), copiar para uma pasta (iCloud Drive, Google Drive, cartão SD) ou salvar nas Fotos

**Presets**
- 10 presets prontos (Fotos por data, Pronto para web, Limpar capturas de tela, Remover “(1)”, Organizar por ano/mês…)
- Salvar, editar, favoritar, duplicar, buscar e **compartilhar/importar presets** (`.lote.json`)
- **Preset rápido** usado pelo Compartilhar, widgets e atalhos

**Integrações nativas** (só no build; no Expo Go ficam desligadas e o app avisa)
- Share extension iOS e share intent Android (`expo-sharing`) → arquivos chegam no Estúdio
- Widgets de tela inicial: iOS (pequeno/médio, SwiftUI) e Android
- **Tela bloqueada**: widgets acessórios iOS (circular, retangular, inline), controle iOS 18 “Renomear fotos” (Central de Controle, botões da tela bloqueada, botão de Ação) e widget Android na tela de bloqueio
- Atalhos do ícone (toque e segure): Renomear fotos, Renomear arquivos, Foto já nomeada, Histórico
- Links profundos: `lote://quick?action=photos|files|camera|folder`, `lote://quick?action=preset&id=…`

**UX**
- Onboarding com demonstrações animadas e opção de começar com arquivos de exemplo
- Haptics em pontos-chave: seleção, confirmação, sucesso, erro
- Tema claro/escuro/sistema, Reduce Motion respeitado, layout dividido em tablets (regras | prévia)
- Abas nativas (Liquid Glass no iOS 26, Material 3 no Android), títulos grandes e folhas nativas

## Arquitetura

```
src/
  app/               rotas (Expo Router): abas, modal de regras, revisão, folhas, onboarding, deep links
  engine/            motor puro em TypeScript (regras, variáveis, datas, conflitos, presets) — testado
  services/
    fs/              driver de arquivos (expo-file-system; driver em memória para web)
    native/          widgets e atalhos, carregados sob demanda só fora do Expo Go
    actions.ts       casos de uso: importar, aplicar, desfazer
  store/             zustand + AsyncStorage (ajustes, estúdio, presets, histórico)
  ui/                design system (tokens, tipografia, componentes)
  features/          componentes por área
  widgets/android.tsx  widget Android (react-native-android-widget)
targets/widget/      widgets e controle iOS em SwiftUI (@bacons/apple-targets)
tests/               testes do motor (node:test)
```

**Como o Expo Go continua funcionando:** os módulos que o Expo Go não tem (`@bacons/apple-targets`, `react-native-android-widget`, `expo-quick-actions`) só são carregados com `require` dentro de funções protegidas por `hasCustomNative` (`src/services/env.ts`). Os config plugins só rodam no `prebuild`; o Expo Go os ignora.
