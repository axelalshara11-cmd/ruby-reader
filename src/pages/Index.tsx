import { Fragment, useMemo } from "react";
import { Sprout, FileSpreadsheet } from "lucide-react";
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
      else toast.info("جهازك لا يدعم المشاركة، تم تنزيل الملف بدلاً من ذلك");
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
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center">
            <Sprout className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold leading-tight truncate">
              كارتات الميكنة الزراعية
            </h1>
            <p className="text-xs text-primary-foreground/80">
              جهاز مستقبل مصر للتنمية المستدامة
            </p>
          </div>
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
          <div className="space-y-3">
            {items.map((it) => (
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
              </Fragment>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

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
