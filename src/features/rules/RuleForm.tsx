import { router } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';

import { CASE_LABELS } from '@/engine/catalog';
import { DATE_FORMATS, formatDate } from '@/engine/date';
import { validateRegex } from '@/engine/rules';
import { unknownVariables } from '@/engine/template';
import type { CaseStyle, Rule } from '@/engine/types';
import { useInsertBus } from '@/hooks/useInsertBus';
import { Chip, ChipGroup, Field, Segmented, Stepper, TokenBar, type FieldHandle } from '@/ui/Inputs';
import { Card, Separator, SwitchRow } from '@/ui/List';
import { Text } from '@/ui/Text';
import { space } from '@/ui/theme';

type Update = (patch: Partial<Rule>) => void;

/** Fixed sample date for the format chips (keeps render pure). */
const SAMPLE_DATE = new Date(2026, 6, 14, 19, 42, 8).getTime();

function FormCard({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <View style={{ gap: space.sm }}>
      {!!title && (
        <Text variant="footnote" tone="secondary" weight="600" style={{ textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: space.lg }}>
          {title}
        </Text>
      )}
      <Card padded style={{ gap: space.lg }}>
        {children}
      </Card>
    </View>
  );
}

function ToggleCard({ children }: { children: ReactNode }) {
  return <Card>{children}</Card>;
}

const QUICK_TOKENS = [
  { token: '{name}', label: 'nome' },
  { token: '{n:3}', label: '001' },
  { token: '{taken:YYYY-MM-DD}', label: 'data captura' },
  { token: '{date:YYYY-MM-DD}', label: 'hoje' },
  { token: '{folder}', label: 'pasta' },
  { token: '{ext}', label: 'extensão' },
  { token: '{dims}', label: 'dimensões' },
  { token: '{rand:4}', label: 'aleatório' },
];

/** Template field with quick variable chips + link to the full catalog. Receives tokens from the Variables screen. */
function TemplateField({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  const ref = useRef<FieldHandle>(null);
  const seq = useInsertBus((s) => s.seq);
  useEffect(() => {
    const { token, consume } = useInsertBus.getState();
    if (token) {
      ref.current?.insert(token);
      consume();
    }
  }, [seq]);
  const unknown = unknownVariables(value);
  return (
    <View style={{ gap: space.md }}>
      <Field
        ref={ref}
        label={label}
        value={value}
        onChangeText={onChange}
        mono
        placeholder={placeholder}
        error={unknown.length ? `Variável desconhecida: {${unknown[0]}}` : null}
        hint={hint}
        returnKeyType="done"
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <TokenBar tokens={QUICK_TOKENS} onInsert={(tk) => ref.current?.insert(tk)} />
        </View>
        <Chip label="Todas" icon={{ sf: 'curlybraces', md: 'data_object' }} onPress={() => router.push('/rules/variables')} />
      </View>
    </View>
  );
}

const POSITION_3 = [
  { value: 'start', label: 'Início' },
  { value: 'end', label: 'Fim' },
  { value: 'replace', label: 'Substituir' },
] as const;

const SEPARATORS = [
  { value: '_', label: '_' },
  { value: '-', label: '-' },
  { value: ' ', label: 'espaço' },
  { value: ' - ', label: ' - ' },
  { value: '.', label: '.' },
  { value: '', label: 'nada' },
];

function SeparatorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="footnote" tone="secondary" weight="600">
        Separador
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {SEPARATORS.map((s) => (
          <Chip key={s.label} label={s.label} mono={s.label.length <= 3} selected={value === s.value} onPress={() => onChange(s.value)} />
        ))}
      </View>
    </View>
  );
}

export function RuleForm({ rule, update }: { rule: Rule; update: Update }) {
  switch (rule.type) {
    case 'template':
      return (
        <FormCard>
          <TemplateField
            label="Novo nome (sem extensão)"
            value={rule.template}
            onChange={(template) => update({ template })}
            placeholder="{taken:YYYY-MM-DD}_{n:3}"
            hint="Combine texto com variáveis. Filtros: {name|kebab}, {folder|upper}."
          />
        </FormCard>
      );

    case 'replace': {
      const regexError = rule.useRegex && rule.find ? validateRegex(rule.find) : null;
      return (
        <>
          <FormCard>
            <Field label="Procurar" value={rule.find} onChangeText={(find) => update({ find })} mono={rule.useRegex} placeholder={rule.useRegex ? '^IMG_(\\d+)' : 'IMG_'} error={regexError} returnKeyType="next" />
            <TemplateField
              label="Substituir por"
              value={rule.replace}
              onChange={(replace) => update({ replace })}
              placeholder={rule.useRegex ? 'Foto $1' : 'deixe vazio para apagar'}
              hint={rule.useRegex ? 'Use $1, $2… para os grupos capturados.' : undefined}
            />
            <Segmented
              options={[
                { value: 'name', label: 'Nome' },
                { value: 'extension', label: 'Extensão' },
                { value: 'full', label: 'Tudo' },
              ]}
              value={rule.target}
              onChange={(target) => update({ target })}
            />
          </FormCard>
          <ToggleCard>
            <SwitchRow title="Expressão regular" subtitle="Padrões avançados (regex)" value={rule.useRegex} onValueChange={(useRegex) => update({ useRegex })} />
            <Separator />
            <SwitchRow title="Diferenciar maiúsculas" value={rule.matchCase} onValueChange={(matchCase) => update({ matchCase })} />
            <Separator />
            <SwitchRow title="Palavra inteira" subtitle="“cat” não pega “catálogo”" value={rule.wholeWord} onValueChange={(wholeWord) => update({ wholeWord })} />
            <Separator />
            <SwitchRow title="Só a primeira ocorrência" value={rule.firstOnly} onValueChange={(firstOnly) => update({ firstOnly })} />
          </ToggleCard>
        </>
      );
    }

    case 'insert':
      return (
        <FormCard>
          <TemplateField label="Texto" value={rule.text} onChange={(text) => update({ text })} placeholder="Ex.: Viagem_ ou {date:YYYY}-" />
          <Segmented
            options={[
              { value: 'start', label: 'Início' },
              { value: 'end', label: 'Fim' },
              { value: 'index', label: 'Posição' },
            ]}
            value={rule.position}
            onChange={(position) => update({ position })}
          />
          {rule.position === 'index' && (
            <>
              <Stepper label="Posição" value={rule.index} onChange={(index) => update({ index })} min={0} max={255} />
              <Segmented
                options={[
                  { value: 'start', label: 'Contar do início' },
                  { value: 'end', label: 'Contar do fim' },
                ]}
                value={rule.fromEnd ? 'end' : 'start'}
                onChange={(v) => update({ fromEnd: v === 'end' })}
              />
            </>
          )}
        </FormCard>
      );

    case 'remove':
      return (
        <FormCard>
          <ChipGroup
            options={[
              { value: 'first', label: 'Primeiros N' },
              { value: 'last', label: 'Últimos N' },
              { value: 'range', label: 'Intervalo' },
              { value: 'between', label: 'Entre símbolos' },
              { value: 'digits', label: 'Números' },
              { value: 'symbols', label: 'Símbolos' },
              { value: 'letters', label: 'Letras' },
            ]}
            value={rule.mode}
            onChange={(mode) => update({ mode })}
          />
          {(rule.mode === 'first' || rule.mode === 'last') && <Stepper label="Caracteres" value={rule.count} onChange={(count) => update({ count })} min={1} max={255} />}
          {rule.mode === 'range' && (
            <>
              <Stepper label="Do caractere" value={rule.from} onChange={(from) => update({ from, to: Math.max(from, rule.to) })} min={1} max={255} />
              <Stepper label="Até o caractere" value={rule.to} onChange={(to) => update({ to })} min={rule.from} max={255} />
            </>
          )}
          {rule.mode === 'between' && (
            <View style={{ gap: space.sm }}>
              <Text variant="footnote" tone="secondary" weight="600">
                Remover trechos entre
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {[
                  ['(', ')'],
                  ['[', ']'],
                  ['{', '}'],
                  ['<', '>'],
                ].map(([open, close]) => (
                  <Chip key={open} mono label={`${open} … ${close}`} selected={rule.open === open} onPress={() => update({ open, close })} />
                ))}
              </View>
            </View>
          )}
        </FormCard>
      );

    case 'case':
      return (
        <FormCard>
          <ChipGroup
            options={(Object.keys(CASE_LABELS) as CaseStyle[]).map((k) => ({ value: k, label: CASE_LABELS[k] }))}
            value={rule.style}
            onChange={(style) => update({ style })}
          />
          <Segmented
            options={[
              { value: 'name', label: 'Nome' },
              { value: 'extension', label: 'Extensão' },
              { value: 'full', label: 'Tudo' },
            ]}
            value={rule.target}
            onChange={(target) => update({ target })}
          />
        </FormCard>
      );

    case 'numbering':
      return (
        <>
          <FormCard>
            <Segmented
              options={[
                { value: 'decimal', label: '1 2 3' },
                { value: 'roman', label: 'I II III' },
                { value: 'alpha', label: 'a b c' },
                { value: 'hex', label: 'Hex' },
              ]}
              value={rule.format}
              onChange={(format) => update({ format })}
            />
            <Stepper label="Começar em" value={rule.start} onChange={(start) => update({ start })} min={0} max={99999} />
            <Stepper label="Incremento" value={rule.step} onChange={(step) => update({ step })} min={1} max={1000} />
            {(rule.format === 'decimal' || rule.format === 'hex') && (
              <Stepper label="Dígitos" value={rule.pad} onChange={(pad) => update({ pad })} min={1} max={8} format={(v) => '0'.repeat(Math.max(0, v - 1)) + '1'} />
            )}
          </FormCard>
          <FormCard>
            <Segmented options={[...POSITION_3]} value={rule.position} onChange={(position) => update({ position })} />
            {rule.position !== 'replace' && <SeparatorPicker value={rule.separator} onChange={(separator) => update({ separator })} />}
          </FormCard>
          <ToggleCard>
            <SwitchRow title="Recomeçar em cada pasta" subtitle="Útil ao importar várias pastas" value={rule.perFolder} onValueChange={(perFolder) => update({ perFolder })} />
          </ToggleCard>
        </>
      );

    case 'date': {
      const sample = SAMPLE_DATE;
      return (
        <>
          <FormCard>
            <ChipGroup
              options={[
                { value: 'taken', label: 'Captura (EXIF)' },
                { value: 'created', label: 'Criação' },
                { value: 'modified', label: 'Modificação' },
                { value: 'now', label: 'Hoje' },
              ]}
              value={rule.source}
              onChange={(source) => update({ source })}
            />
            <Text variant="footnote" tone="secondary">
              {rule.source === 'taken' ? 'Usa o EXIF da foto; se faltar, a data no nome (IMG_20240517…) ou a criação.' : ' '}
            </Text>
          </FormCard>
          <FormCard title="Formato">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {DATE_FORMATS.map((f) => (
                <Chip key={f.format} label={formatDate(sample, f.format)} selected={rule.format === f.format} onPress={() => update({ format: f.format })} />
              ))}
            </View>
            <Field label="Personalizado" value={rule.format} onChangeText={(format) => update({ format })} mono hint="YYYY MM DD HH mm ss · MMMM = mês por extenso · [texto] fica literal" />
          </FormCard>
          <FormCard>
            <Segmented options={[...POSITION_3]} value={rule.position} onChange={(position) => update({ position })} />
            {rule.position !== 'replace' && <SeparatorPicker value={rule.separator} onChange={(separator) => update({ separator })} />}
          </FormCard>
        </>
      );
    }

    case 'extension':
      return (
        <FormCard>
          <ChipGroup
            options={[
              { value: 'lower', label: '.jpg minúsculas' },
              { value: 'upper', label: '.JPG maiúsculas' },
              { value: 'normalize', label: 'Normalizar' },
              { value: 'set', label: 'Trocar' },
              { value: 'remove', label: 'Remover' },
            ]}
            value={rule.mode}
            onChange={(mode) => update({ mode })}
          />
          {rule.mode === 'set' && <Field label="Nova extensão" value={rule.value} onChangeText={(value) => update({ value })} placeholder="jpg" mono hint="Só muda o nome — o conteúdo do arquivo não é convertido." />}
          {rule.mode === 'normalize' && (
            <Text variant="footnote" tone="secondary">
              .jpeg → .jpg, .tiff → .tif, .htm → .html, e tudo em minúsculas.
            </Text>
          )}
        </FormCard>
      );

    case 'clean':
      return (
        <>
          <ToggleCard>
            <SwitchRow title="Remover “(1)”, “cópia”, “copy”" value={rule.removeCopySuffix} onValueChange={(removeCopySuffix) => update({ removeCopySuffix })} />
            <Separator />
            <SwitchRow title="Remover emoji" value={rule.removeEmoji} onValueChange={(removeEmoji) => update({ removeEmoji })} />
            <Separator />
            <SwitchRow title="Remover acentos" subtitle="ação → acao" value={rule.removeAccents} onValueChange={(removeAccents) => update({ removeAccents })} />
            <Separator />
            <SwitchRow title="Remover símbolos" subtitle="Mantém letras, números, _ - . ( )" value={rule.removeSpecial} onValueChange={(removeSpecial) => update({ removeSpecial })} />
            <Separator />
            <SwitchRow title="Juntar espaços repetidos" value={rule.collapseSpaces} onValueChange={(collapseSpaces) => update({ collapseSpaces })} />
            <Separator />
            <SwitchRow title="Aparar bordas" subtitle="Espaços e traços no início/fim" value={rule.trim} onValueChange={(trim) => update({ trim })} />
          </ToggleCard>
          <FormCard title="Espaços viram">
            <ChipGroup
              options={[
                { value: 'keep', label: 'Manter' },
                { value: 'underscore', label: '_' },
                { value: 'dash', label: '-' },
                { value: 'dot', label: '.' },
                { value: 'remove', label: 'Remover' },
              ]}
              value={rule.spaces}
              onChange={(spaces) => update({ spaces })}
            />
          </FormCard>
        </>
      );

    case 'pad':
      return (
        <FormCard>
          <Stepper label="Dígitos" value={rule.digits} onChange={(digits) => update({ digits })} min={2} max={8} format={(v) => '0'.repeat(v - 1) + '7'} />
          <Text variant="footnote" tone="secondary">
            Todo número no nome ganha zeros à esquerda, para que “foto 10” venha depois de “foto 9” em qualquer app.
          </Text>
        </FormCard>
      );

    case 'swap':
      return (
        <FormCard>
          <Field label="Separador entre as partes" value={rule.separator} onChangeText={(separator) => update({ separator })} mono placeholder=" - " />
          <Text variant="footnote" tone="secondary">
            Troca o que vem antes e depois da primeira ocorrência do separador.
          </Text>
        </FormCard>
      );

    case 'truncate':
      return (
        <FormCard>
          <Stepper label="Máximo de caracteres" value={rule.max} onChange={(max) => update({ max })} min={1} max={200} step={rule.max >= 20 ? 5 : 1} />
          <Segmented
            options={[
              { value: 'end', label: 'Manter o começo' },
              { value: 'start', label: 'Manter o final' },
            ]}
            value={rule.from}
            onChange={(from) => update({ from })}
          />
        </FormCard>
      );

    case 'folder':
      return (
        <>
          <FormCard>
            <TemplateField
              label="Subpasta de destino"
              value={rule.template}
              onChange={(template) => update({ template })}
              placeholder="{taken:YYYY}/{taken:MM}"
              hint="Use / para criar níveis. As pastas são criadas dentro da pasta de origem."
            />
          </FormCard>
          <FormCard title="Sugestões">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {[
                ['{taken:YYYY}/{taken:MM}', 'Ano / mês'],
                ['{taken:YYYY}', 'Ano'],
                ['{type}', 'Tipo de arquivo'],
                ['{ext|upper}', 'Extensão'],
                ['{orientation}', 'Orientação'],
                ['{taken:YYYY-MM-DD}', 'Dia'],
              ].map(([tpl, label]) => (
                <Chip key={tpl} label={label} selected={rule.template === tpl} onPress={() => update({ template: tpl })} />
              ))}
            </View>
          </FormCard>
        </>
      );
  }
}
