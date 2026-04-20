import { Fragment, useMemo, useState } from "react";
import { FileSpreadsheet, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCardStore } from "@/hooks/useCardStore";
import { UploadBar } from "@/components/UploadBar";
import { CardView } from "@/components/CardView";
import { SeparatorView } from "@/components/SeparatorView";
import { Toolbar } from "@/components/Toolbar";
import { downloadXlsx, shareXlsx, countCards } from "@/lib/excel";
import { toast } from "sonner";

const Index = () => {
  const {
    items,
    addCards,
    addSeparator,
    insertSeparatorAt,
    updateItem,
    updateCardData,
    removeItem,
    clearAll,
    processIds,
    cancelProcessing,
    retryAllErrors,
    processing,
    progress,
  } = useCardStore();

  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [insertText, setInsertText] = useState("");

  function openInsert(idx: number) {
    setInsertText("");
    setInsertIndex(idx);
  }
  function confirmInsert() {
    const t = insertText.trim();
    if (!t || insertIndex === null) {
      setInsertIndex(null);
      return;
    }
    insertSeparatorAt(insertIndex, t);
    setInsertIndex(null);
  }

  // Build a map of card-id → sequential card number (skip separators)
  const cardNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const it of items) {
      if (it.kind === "card") {
        n += 1;
        map.set(it.id, n);
      }
    }
    return map;
  }, [items]);

  const cardCount = countCards(items);
  const errorCount = items.filter(
    (it) => it.kind === "card" && it.status === "error",
  ).length;

  function handleExport() {
    const fname = `cards_${new Date().toISOString().slice(0, 10)}.xlsx`;
    downloadXlsx(items, fname);
    toast.success("تم تصدير الملف");
  }

  async function handleShare() {
    const fname = `cards_${new Date().toISOString().slice(0, 10)}.xlsx`;
    try {
      const res = await shareXlsx(items, fname);
      if (res.shared) toast.success("تمت المشاركة");
      else if ((res as any).canceled) toast.info("تم إلغاء المشاركة");
      else toast.info("جهازك لا يدعم مشاركة الملفات، تم تنزيل الملف بدلاً من ذلك");
    } catch (e) {
      toast.error("فشلت المشاركة");
    }
  }

  function handleClear() {
    clearAll();
    toast.success("تم مسح كل البيانات");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/40">
      {/* Header */}
      <header className="gradient-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <h1 className="text-xl sm:text-2xl font-extrabold leading-tight text-center">
            مستخرج البيانات
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24 space-y-4">
        <UploadBar
          onAddCards={addCards}
          onAddSeparator={addSeparator}
          onProcess={processIds}
          processing={processing}
        />

        <Toolbar
          cardCount={cardCount}
          errorCount={errorCount}
          processing={processing}
          progress={progress}
          onCancel={cancelProcessing}
          onRetryAll={retryAllErrors}
          onClearAll={handleClear}
          onExport={handleExport}
          onShare={handleShare}
        />

        {/* List */}
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {items.map((it, idx) => (
              <Fragment key={it.id}>
                {it.kind === "card" ? (
                  <CardView
                    card={it}
                    index={cardNumberMap.get(it.id) ?? 0}
                    onChange={updateCardData}
                    onRetry={(id) => processIds([id])}
                    onDelete={removeItem}
                  />
                ) : (
                  <SeparatorView
                    separator={it}
                    onChange={(id, text) => updateItem(id, { text } as any)}
                    onDelete={removeItem}
                  />
                )}
                {idx < items.length - 1 && (
                  <InsertSeparatorButton onClick={() => openInsert(idx + 1)} />
                )}
              </Fragment>
            ))}
          </div>
        )}
      </main>

      <Dialog open={insertIndex !== null} onOpenChange={(o) => !o && setInsertIndex(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة فاصل بين الكارتات</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={insertText}
            onChange={(e) => setInsertText(e.target.value)}
            placeholder="مثال: بدء توريد منطقة أ"
            onKeyDown={(e) => e.key === "Enter" && confirmInsert()}
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setInsertIndex(null)}>إلغاء</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={confirmInsert}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function InsertSeparatorButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="group relative flex items-center justify-center h-3 -my-1">
      <button
        type="button"
        onClick={onClick}
        aria-label="إضافة فاصل هنا"
        className="opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-110"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-card/50 p-8 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
        <FileSpreadsheet className="h-7 w-7 text-primary" />
      </div>
      <h2 className="font-extrabold text-lg text-foreground mb-1">
        ابدأ برفع صور الكارتات
      </h2>
      <p className="text-sm text-muted-foreground">
        ارفع صورة واحدة أو دفعة كاملة، وسنستخرج البيانات تلقائياً.
      </p>
    </div>
  );
}

export default Index;
