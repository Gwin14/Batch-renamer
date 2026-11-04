import { tr, trn } from '@/i18n';
import { undoBatch } from '@/services/actions';
import { FREE_LIMITS, requirePro } from '@/services/purchases';
import { useHistory, type HistoryBatch } from '@/store/history';
import { confirmDestructive } from '@/ui/ActionSheet';
import { toast } from '@/ui/Toast';

/** Free users can undo only their most recent batches; older ones need Lote Pro. */
async function canUndo(batch: HistoryBatch) {
  const recent = useHistory.getState().batches.slice(0, FREE_LIMITS.undoableBatches);
  if (recent.some((b) => b.id === batch.id)) return true;
  return requirePro(tr('No plano grátis, dá para desfazer os {{n}} últimos lotes.', { n: FREE_LIMITS.undoableBatches }));
}

export async function confirmUndo(batch: HistoryBatch, after?: () => void) {
  if (!(await canUndo(batch))) return;
  confirmDestructive({
    title: tr('Desfazer “{{name}}”?', { name: batch.label }),
    message: trn(batch.ops.length, '{{n}} arquivo volta ao nome anterior.', '{{n}} arquivos voltam ao nome anterior.'),
    confirm: tr('Desfazer lote'),
    onConfirm: async () => {
      const res = await undoBatch(batch);
      toast(
        res.missing ? tr('{{restored}} restaurados · {{missing}} não encontrados (movidos ou apagados)', { restored: res.restored, missing: res.missing }) : trn(res.restored, '{{n}} nome restaurado', '{{n}} nomes restaurados'),
        { tone: res.restored ? 'success' : 'error' },
      );
      after?.();
    },
  });
}
