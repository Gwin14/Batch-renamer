/**
 * Core domain types for the rename engine.
 * The engine is pure TypeScript (no React Native imports) so it can be unit
 * tested in Node and reused by widgets / share flows.
 */

export type FileKind = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other';

export type FileSource = 'library' | 'device-folder' | 'imported';

export interface FileItem {
  id: string;
  uri: string;
  /** Full file name including extension, e.g. "IMG_0001.JPG" */
  name: string;
  size: number;
  /** epoch ms */
  modifiedAt: number | null;
  createdAt: number | null;
  /** EXIF DateTimeOriginal (epoch ms) when known */
  takenAt?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  mimeType?: string | null;
  /** Name of the containing folder */
  folder: string;
  /** URI of containing folder */
  folderUri: string;
  source: FileSource;
}

export type Position = 'start' | 'end' | 'index';

export type CaseStyle =
  | 'lower'
  | 'upper'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'invert';

export type DateSource = 'taken' | 'created' | 'modified' | 'now';

export type NumberFormat = 'decimal' | 'roman' | 'alpha' | 'hex';

export type RuleTarget = 'name' | 'extension' | 'full';

interface RuleBase {
  id: string;
  enabled: boolean;
}

export interface ReplaceRule extends RuleBase {
  type: 'replace';
  find: string;
  replace: string;
  matchCase: boolean;
  useRegex: boolean;
  firstOnly: boolean;
  wholeWord: boolean;
  target: RuleTarget;
}

export interface InsertRule extends RuleBase {
  type: 'insert';
  /** Supports variables, e.g. "{date:YYYY}-" */
  text: string;
  position: Position;
  index: number;
  /** count index from end when position === 'index' */
  fromEnd: boolean;
}

export interface RemoveRule extends RuleBase {
  type: 'remove';
  mode: 'first' | 'last' | 'range' | 'digits' | 'symbols' | 'letters' | 'between';
  count: number;
  from: number;
  to: number;
  /** used for 'between' */
  open: string;
  close: string;
}

export interface CaseRule extends RuleBase {
  type: 'case';
  style: CaseStyle;
  target: RuleTarget;
}

export interface NumberingRule extends RuleBase {
  type: 'numbering';
  start: number;
  step: number;
  pad: number;
  position: 'start' | 'end' | 'replace';
  separator: string;
  format: NumberFormat;
  /** Restart counter for each source folder */
  perFolder: boolean;
}

export interface DateRule extends RuleBase {
  type: 'date';
  source: DateSource;
  format: string;
  position: 'start' | 'end' | 'replace';
  separator: string;
}

export interface TemplateRule extends RuleBase {
  type: 'template';
  /** Full new base name, e.g. "{date:YYYY-MM-DD}_{n:3}" */
  template: string;
}

export interface ExtensionRule extends RuleBase {
  type: 'extension';
  mode: 'lower' | 'upper' | 'set' | 'remove' | 'normalize';
  value: string;
}

export interface CleanRule extends RuleBase {
  type: 'clean';
  trim: boolean;
  collapseSpaces: boolean;
  spaces: 'keep' | 'underscore' | 'dash' | 'dot' | 'remove';
  removeAccents: boolean;
  removeEmoji: boolean;
  removeCopySuffix: boolean;
  removeSpecial: boolean;
}

export interface PadRule extends RuleBase {
  type: 'pad';
  /** Pad every number found in the name to this many digits */
  digits: number;
}

export interface SwapRule extends RuleBase {
  type: 'swap';
  separator: string;
}

export interface TruncateRule extends RuleBase {
  type: 'truncate';
  max: number;
  from: 'end' | 'start';
}

export interface FolderRule extends RuleBase {
  type: 'folder';
  /** Template for destination subfolder, e.g. "{taken:YYYY}/{taken:MM}" */
  template: string;
}

export type Rule =
  | ReplaceRule
  | InsertRule
  | RemoveRule
  | CaseRule
  | NumberingRule
  | DateRule
  | TemplateRule
  | ExtensionRule
  | CleanRule
  | PadRule
  | SwapRule
  | TruncateRule
  | FolderRule;

export type RuleType = Rule['type'];

export type ConflictStrategy = 'suffix' | 'skip' | 'stop';

export interface PipelineOptions {
  conflict: ConflictStrategy;
  /** keep extension untouched by name rules (default true) */
  protectExtension: boolean;
  /**
   * Keep file pairs in sync: files in the same folder that share a base name
   * (IMG_1.HEIC + IMG_1.photo, IMG_1.CR2 + IMG_1.CR2.xmp) get the same new name.
   */
  keepPairs?: boolean;
  now?: number;
}

export type PreviewStatus = 'changed' | 'unchanged' | 'conflict' | 'error' | 'resolved';

export interface PreviewItem {
  id: string;
  file: FileItem;
  from: string;
  to: string;
  /** Relative destination subfolder (from FolderRule), '' when none */
  subfolder: string;
  status: PreviewStatus;
  message?: string;
  /** Original name of the file this one follows (set on sidecars / pair companions) */
  pairedWith?: string;
  /** How many companions follow this file (set on the pair's main file) */
  companions?: number;
}

export interface PreviewSummary {
  items: PreviewItem[];
  changed: number;
  unchanged: number;
  conflicts: number;
  errors: number;
  resolved: number;
}
