import { undoBatch } from '@/services/actions';
import type { HistoryBatch } from '@/store/history';
import { confirmDestructive } from '@/ui/ActionSheet';
import { toast } from '@/ui/Toast';

export function confirmUndo(batch: HistoryBatch, after?: () => void) {
  confirmDestructive({
    title: `Desfazer “${batch.label}”?`,
    message: `${batch.ops.length} arquivos voltam ao nome anterior.`,
    confirm: 'Desfazer lote',
    onConfirm: async () => {
      const res = await undoBatch(batch);
      toast(
        res.missing ? `${res.restored} restaurados · ${res.missing} não encontrados (movidos ou apagados)` : `${res.restored} nomes restaurados`,
        { tone: res.restored ? 'success' : 'error' },
      );
      after?.();
    },
  });
}
