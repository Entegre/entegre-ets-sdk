import type { Invoice, DocumentLine, Party, Tax, LegalMonetaryTotal } from '../types';

/**
 * Diff türleri
 */
export type DiffType = 'added' | 'removed' | 'changed' | 'unchanged';

/**
 * Tek bir değişiklik
 */
export interface DiffChange {
  /** Alan yolu (örn: 'CustomerParty.PartyName') */
  path: string;
  /** Değişiklik türü */
  type: DiffType;
  /** Eski değer */
  oldValue?: unknown;
  /** Yeni değer */
  newValue?: unknown;
}

/**
 * Fatura karşılaştırma sonucu
 */
export interface InvoiceDiffResult {
  /** Faturalar aynı mı? */
  identical: boolean;
  /** Toplam değişiklik sayısı */
  changeCount: number;
  /** Değişiklikler */
  changes: DiffChange[];
  /** Özet */
  summary: {
    headerChanges: number;
    partyChanges: number;
    lineChanges: number;
    totalChanges: number;
    taxChanges: number;
  };
}

/**
 * Karşılaştırma seçenekleri
 */
export interface DiffOptions {
  /** Ignore edilecek alanlar */
  ignoreFields?: string[];
  /** Sadece belirli alanları karşılaştır */
  onlyFields?: string[];
  /** Satır sıralamasını ignore et */
  ignoreLineOrder?: boolean;
  /** Boş değerleri ignore et */
  ignoreEmpty?: boolean;
  /** Float karşılaştırma toleransı */
  floatTolerance?: number;
}

const DEFAULT_IGNORE_FIELDS = ['IsDraft', 'InvoiceId', 'Notes'];

/**
 * Derin karşılaştırma
 */
function deepCompare(
  oldVal: unknown,
  newVal: unknown,
  path: string,
  changes: DiffChange[],
  options: DiffOptions
): void {
  // Ignore edilecek alan mı?
  if (options.ignoreFields?.some((f) => path.startsWith(f) || path.endsWith(f))) {
    return;
  }

  // Sadece belirli alanlar mı?
  if (options.onlyFields && options.onlyFields.length > 0) {
    if (!options.onlyFields.some((f) => path.startsWith(f) || path.endsWith(f))) {
      return;
    }
  }

  // Boş değerleri ignore et
  if (options.ignoreEmpty) {
    const oldEmpty = oldVal === undefined || oldVal === null || oldVal === '';
    const newEmpty = newVal === undefined || newVal === null || newVal === '';
    if (oldEmpty && newEmpty) return;
  }

  // Null/undefined kontrolü
  if (oldVal === undefined || oldVal === null) {
    if (newVal !== undefined && newVal !== null) {
      changes.push({ path, type: 'added', newValue: newVal });
    }
    return;
  }

  if (newVal === undefined || newVal === null) {
    changes.push({ path, type: 'removed', oldValue: oldVal });
    return;
  }

  // Tip kontrolü
  const oldType = typeof oldVal;
  const newType = typeof newVal;

  if (oldType !== newType) {
    changes.push({ path, type: 'changed', oldValue: oldVal, newValue: newVal });
    return;
  }

  // Primitif tipler
  if (oldType === 'string' || oldType === 'boolean') {
    if (oldVal !== newVal) {
      changes.push({ path, type: 'changed', oldValue: oldVal, newValue: newVal });
    }
    return;
  }

  // Sayılar (tolerans ile)
  if (oldType === 'number') {
    const tolerance = options.floatTolerance ?? 0.001;
    if (Math.abs((oldVal as number) - (newVal as number)) > tolerance) {
      changes.push({ path, type: 'changed', oldValue: oldVal, newValue: newVal });
    }
    return;
  }

  // Array
  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    compareArrays(oldVal, newVal, path, changes, options);
    return;
  }

  // Object
  if (oldType === 'object') {
    const oldObj = oldVal as Record<string, unknown>;
    const newObj = newVal as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      deepCompare(oldObj[key], newObj[key], `${path}.${key}`, changes, options);
    }
  }
}

/**
 * Array karşılaştırma
 */
function compareArrays(
  oldArr: unknown[],
  newArr: unknown[],
  path: string,
  changes: DiffChange[],
  options: DiffOptions
): void {
  const maxLength = Math.max(oldArr.length, newArr.length);

  for (let i = 0; i < maxLength; i++) {
    const itemPath = `${path}[${i}]`;

    if (i >= oldArr.length) {
      changes.push({ path: itemPath, type: 'added', newValue: newArr[i] });
    } else if (i >= newArr.length) {
      changes.push({ path: itemPath, type: 'removed', oldValue: oldArr[i] });
    } else {
      deepCompare(oldArr[i], newArr[i], itemPath, changes, options);
    }
  }
}

/**
 * İki faturayı karşılaştırır
 */
export function diffInvoices(
  oldInvoice: Invoice,
  newInvoice: Invoice,
  options: DiffOptions = {}
): InvoiceDiffResult {
  const mergedOptions: DiffOptions = {
    ignoreFields: [...DEFAULT_IGNORE_FIELDS, ...(options.ignoreFields || [])],
    ignoreEmpty: options.ignoreEmpty ?? true,
    floatTolerance: options.floatTolerance ?? 0.01,
    ...options,
  };

  const changes: DiffChange[] = [];

  // Header alanları
  deepCompare(oldInvoice.InvoiceTypeCode, newInvoice.InvoiceTypeCode, 'InvoiceTypeCode', changes, mergedOptions);
  deepCompare(oldInvoice.ProfileId, newInvoice.ProfileId, 'ProfileId', changes, mergedOptions);
  deepCompare(oldInvoice.IssueDate, newInvoice.IssueDate, 'IssueDate', changes, mergedOptions);
  deepCompare(oldInvoice.DocumentCurrencyCode, newInvoice.DocumentCurrencyCode, 'DocumentCurrencyCode', changes, mergedOptions);

  // Party bilgileri
  deepCompare(oldInvoice.SupplierParty, newInvoice.SupplierParty, 'SupplierParty', changes, mergedOptions);
  deepCompare(oldInvoice.CustomerParty, newInvoice.CustomerParty, 'CustomerParty', changes, mergedOptions);

  // Satırlar
  if (options.ignoreLineOrder) {
    // Satır sırası önemli değilse, ItemCode'a göre eşleştir
    const oldLines = new Map(oldInvoice.DocumentLines?.map((l) => [l.ItemCode, l]) || []);
    const newLines = new Map(newInvoice.DocumentLines?.map((l) => [l.ItemCode, l]) || []);

    const allItemCodes = new Set([...oldLines.keys(), ...newLines.keys()]);
    for (const itemCode of allItemCodes) {
      const oldLine = oldLines.get(itemCode);
      const newLine = newLines.get(itemCode);
      deepCompare(oldLine, newLine, `DocumentLines[${itemCode}]`, changes, mergedOptions);
    }
  } else {
    deepCompare(oldInvoice.DocumentLines, newInvoice.DocumentLines, 'DocumentLines', changes, mergedOptions);
  }

  // Toplamlar
  deepCompare(oldInvoice.LegalMonetaryTotal, newInvoice.LegalMonetaryTotal, 'LegalMonetaryTotal', changes, mergedOptions);

  // Vergiler
  deepCompare(oldInvoice.TaxTotals, newInvoice.TaxTotals, 'TaxTotals', changes, mergedOptions);

  // Özet hesapla
  const summary = {
    headerChanges: changes.filter((c) =>
      ['InvoiceTypeCode', 'ProfileId', 'IssueDate', 'DocumentCurrencyCode'].some((f) => c.path.startsWith(f))
    ).length,
    partyChanges: changes.filter((c) =>
      c.path.startsWith('SupplierParty') || c.path.startsWith('CustomerParty')
    ).length,
    lineChanges: changes.filter((c) => c.path.startsWith('DocumentLines')).length,
    totalChanges: changes.filter((c) => c.path.startsWith('LegalMonetaryTotal')).length,
    taxChanges: changes.filter((c) => c.path.startsWith('TaxTotals')).length,
  };

  return {
    identical: changes.length === 0,
    changeCount: changes.length,
    changes,
    summary,
  };
}

/**
 * İki satırı karşılaştırır
 */
export function diffLines(
  oldLine: DocumentLine,
  newLine: DocumentLine,
  options: DiffOptions = {}
): DiffChange[] {
  const changes: DiffChange[] = [];
  deepCompare(oldLine, newLine, 'Line', changes, options);
  return changes;
}

/**
 * İki party'yi karşılaştırır
 */
export function diffParties(
  oldParty: Party,
  newParty: Party,
  options: DiffOptions = {}
): DiffChange[] {
  const changes: DiffChange[] = [];
  deepCompare(oldParty, newParty, 'Party', changes, options);
  return changes;
}

/**
 * Diff sonucunu okunabilir formata çevirir
 */
export function formatDiff(result: InvoiceDiffResult): string {
  if (result.identical) {
    return 'Faturalar aynı.';
  }

  const lines: string[] = [
    `Toplam ${result.changeCount} değişiklik bulundu:`,
    '',
  ];

  if (result.summary.headerChanges > 0) {
    lines.push(`  Header: ${result.summary.headerChanges} değişiklik`);
  }
  if (result.summary.partyChanges > 0) {
    lines.push(`  Taraflar: ${result.summary.partyChanges} değişiklik`);
  }
  if (result.summary.lineChanges > 0) {
    lines.push(`  Satırlar: ${result.summary.lineChanges} değişiklik`);
  }
  if (result.summary.totalChanges > 0) {
    lines.push(`  Toplamlar: ${result.summary.totalChanges} değişiklik`);
  }
  if (result.summary.taxChanges > 0) {
    lines.push(`  Vergiler: ${result.summary.taxChanges} değişiklik`);
  }

  lines.push('', 'Detaylar:');

  for (const change of result.changes) {
    const symbol = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : '~';
    let detail = `  ${symbol} ${change.path}`;

    if (change.type === 'added') {
      detail += `: ${JSON.stringify(change.newValue)}`;
    } else if (change.type === 'removed') {
      detail += `: ${JSON.stringify(change.oldValue)}`;
    } else if (change.type === 'changed') {
      detail += `: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`;
    }

    lines.push(detail);
  }

  return lines.join('\n');
}

/**
 * Diff sonucunu HTML formatına çevirir
 */
export function formatDiffHtml(result: InvoiceDiffResult): string {
  if (result.identical) {
    return '<p style="color: green;">Faturalar aynı.</p>';
  }

  const lines: string[] = [
    `<div class="diff-result">`,
    `<h3>Toplam ${result.changeCount} değişiklik</h3>`,
    `<ul class="diff-summary">`,
  ];

  if (result.summary.headerChanges > 0) {
    lines.push(`<li>Header: ${result.summary.headerChanges}</li>`);
  }
  if (result.summary.partyChanges > 0) {
    lines.push(`<li>Taraflar: ${result.summary.partyChanges}</li>`);
  }
  if (result.summary.lineChanges > 0) {
    lines.push(`<li>Satırlar: ${result.summary.lineChanges}</li>`);
  }
  if (result.summary.totalChanges > 0) {
    lines.push(`<li>Toplamlar: ${result.summary.totalChanges}</li>`);
  }

  lines.push('</ul>', '<table class="diff-details">', '<thead><tr><th>Alan</th><th>Değişiklik</th><th>Eski</th><th>Yeni</th></tr></thead>', '<tbody>');

  for (const change of result.changes) {
    const typeClass = change.type === 'added' ? 'diff-added' : change.type === 'removed' ? 'diff-removed' : 'diff-changed';
    lines.push(
      `<tr class="${typeClass}">`,
      `<td>${change.path}</td>`,
      `<td>${change.type}</td>`,
      `<td>${change.oldValue !== undefined ? JSON.stringify(change.oldValue) : '-'}</td>`,
      `<td>${change.newValue !== undefined ? JSON.stringify(change.newValue) : '-'}</td>`,
      '</tr>'
    );
  }

  lines.push('</tbody>', '</table>', '</div>');

  return lines.join('\n');
}

/**
 * Değişiklikleri gruplara ayırır
 */
export function groupChanges(changes: DiffChange[]): Map<string, DiffChange[]> {
  const groups = new Map<string, DiffChange[]>();

  for (const change of changes) {
    const rootPath = change.path.split('.')[0].replace(/\[\d+\]/, '');
    const existing = groups.get(rootPath) || [];
    existing.push(change);
    groups.set(rootPath, existing);
  }

  return groups;
}
