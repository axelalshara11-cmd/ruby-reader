import { Download, Share2, RotateCcw, Trash2, X, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { loadSettings, saveSettings } from "@/lib/storage";

interface Props {
  cardCount: number;
  errorCount: number;
  processing: boolean;
  progress: { done: number; total: number };
  onCancel: () => void;
  onRetryAll: () => void;
  onClearAll: () => void;
  onExport: () => void;
  onShare: () => void;
}

export function Toolbar({
  cardCount,
  errorCount,
  processing,
  progress,
  onCancel,
  onRetryAll,
  onClearAll,
  onExport,
  onShare,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [delay, setDelay] = useState(loadSettings().delayMs);

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="rounded-2xl bg-card border border-border shadow-card p-3 sm:p-4 space-y-3">
      {/* Stats */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-3">
          <Stat label="الكارتات" value={cardCount} />
          {errorCount > 0 && (
            <Stat label="أخطاء" value={errorCount} tone="danger" />
          )}
        </div>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost">
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>الإعدادات</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>التأخير بين كل صورة (ميلي ثانية)</Label>
              <Input
                type="number"
                min={0}
                max={5000}
                step={100}
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                زيادة التأخير تقلل احتمالية حدوث أخطاء عند معالجة دفعات كبيرة.
              </p>
            </div>
            <DialogFooter>
              <Button
                className="gradient-primary text-primary-foreground"
                onClick={() => {
                  saveSettings({ delayMs: delay });
                  setSettingsOpen(false);
                }}
              >
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress */}
      {processing && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>جارٍ المعالجة... {progress.done} / {progress.total}</span>
            <button onClick={onCancel} className="text-destructive flex items-center gap-1">
              <X className="h-3 w-3" /> إيقاف
            </button>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button
          onClick={onExport}
          disabled={cardCount === 0}
          className="gradient-primary text-primary-foreground"
        >
          <Download className="ms-2 h-4 w-4" /> تصدير Excel
        </Button>
        <Button
          onClick={onShare}
          disabled={cardCount === 0}
          variant="secondary"
        >
          <Share2 className="ms-2 h-4 w-4" /> مشاركة
        </Button>
        <Button
          onClick={onRetryAll}
          disabled={errorCount === 0 || processing}
          variant="outline"
          className="border-warning/40 text-warning"
        >
          <RotateCcw className="ms-2 h-4 w-4" /> إعادة الأخطاء
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-destructive/40 text-destructive">
              <Trash2 className="ms-2 h-4 w-4" /> مسح شامل
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>مسح شامل لكل البيانات؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف كل الكارتات والفواصل من ذاكرة الجهاز. لا يمكن التراجع.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={onClearAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                نعم، احذف الكل
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger";
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={
          "num inline-flex min-w-[2rem] items-center justify-center rounded-lg px-2 py-0.5 text-sm font-bold " +
          (tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary")
        }
      >
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
