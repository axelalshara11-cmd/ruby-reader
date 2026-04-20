import { useRef, useState } from "react";
import { Upload, Plus, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fileToDataUrl, resizeImage } from "@/lib/extract";
import type { CardItem } from "@/types/card";
import { toast } from "sonner";

interface Props {
  onAddCards: (cards: CardItem[]) => void;
  onAddSeparator: (text: string) => void;
  onProcess: (ids: string[]) => Promise<void>;
  processing: boolean;
}

export function UploadBar({ onAddCards, onAddSeparator, onProcess, processing }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [sepOpen, setSepOpen] = useState(false);
  const [sepText, setSepText] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) {
      toast.error("الرجاء اختيار صور صالحة");
      return;
    }

    toast.info(`جاري تجهيز ${arr.length} صورة...`);
    const cards: CardItem[] = [];
    for (const f of arr) {
      try {
        const raw = await fileToDataUrl(f);
        const resized = await resizeImage(raw, 1600, 0.82);
        cards.push({
          kind: "card",
          id: crypto.randomUUID(),
          imageDataUrl: resized,
          status: "pending",
          data: { receiptNumber: "", date: "", crop: "", coordinates: "", area: "" },
          createdAt: Date.now(),
        });
      } catch (e) {
        console.error("file prep failed", e);
      }
    }

    onAddCards(cards);
    // start processing immediately
    onProcess(cards.map((c) => c.id));
  }

  function handleSepSave() {
    const t = sepText.trim();
    if (!t) {
      toast.error("اكتب نص الفاصل");
      return;
    }
    onAddSeparator(t);
    setSepText("");
    setSepOpen(false);
  }

  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            if (cameraRef.current) cameraRef.current.value = "";
          }}
        />

        <Button
          variant="default"
          size="lg"
          className="gradient-primary text-primary-foreground shadow-elegant flex-1 min-w-[140px]"
          disabled={processing}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="ms-2 h-5 w-5" />
          رفع صور
        </Button>

        <Button
          variant="secondary"
          size="lg"
          className="flex-1 min-w-[120px]"
          disabled={processing}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="ms-2 h-5 w-5" />
          كاميرا
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => setSepOpen(true)}
          className="border-primary/30 text-primary"
        >
          <Plus className="ms-2 h-5 w-5" />
          فاصل
        </Button>
      </div>

      <Dialog open={sepOpen} onOpenChange={setSepOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة فاصل نصي</DialogTitle>
          </DialogHeader>
          <Input
            value={sepText}
            onChange={(e) => setSepText(e.target.value)}
            placeholder="مثال: بدء توريد منطقة أ"
            onKeyDown={(e) => e.key === "Enter" && handleSepSave()}
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setSepOpen(false)}>
              إلغاء
            </Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleSepSave}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
