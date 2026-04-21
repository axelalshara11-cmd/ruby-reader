import { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, RotateCcw, Trash2, Clock } from "lucide-react";
import type { CardItem } from "@/types/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Props {
  card: CardItem;
  index: number;
  onChange: (id: string, field: keyof CardItem["data"], value: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CardView({ card, index, onChange, onRetry, onDelete }: Props) {
  const [zoom, setZoom] = useState(false);

  const statusBadge = (() => {
    switch (card.status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" /> في الانتظار
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-warning text-warning-foreground gap-1 animate-pulse-soft">
            <Loader2 className="h-3 w-3 animate-spin" /> جارٍ الاستخراج
          </Badge>
        );
      case "success":
        return (
          <Badge className="bg-success text-success-foreground gap-1">
            <CheckCircle2 className="h-3 w-3" /> تم
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" /> خطأ
          </Badge>
        );
    }
  })();

  return (
    <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/60 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="num inline-flex h-7 min-w-[2rem] items-center justify-center rounded-lg gradient-primary px-2 text-sm font-bold text-primary-foreground">
            #{index}
          </span>
          {statusBadge}
        </div>
        <div className="flex items-center gap-1">
          {card.status === "error" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-primary"
              onClick={() => onRetry(card.id)}
              title="إعادة محاولة"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(card.id)}
            title="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image */}
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="block w-full bg-muted"
      >
        <img
          src={card.imageDataUrl}
          alt={`كارتة رقم ${index}`}
          loading="lazy"
          className="w-full max-h-[28rem] object-contain"
        />
      </button>

      {/* Fields - inline label + value rows */}
      <div className="p-3 space-y-2">
        <InlineField label="رقم الإيصال">
          <Input
            inputMode="numeric"
            className="num h-9 text-base font-bold tracking-wider text-destructive text-right"
            value={card.data.receiptNumber}
            onChange={(e) => onChange(card.id, "receiptNumber", e.target.value)}
            placeholder="018203"
          />
        </InlineField>

        <InlineField label="التاريخ">
          <Input
            className="num h-9 text-right"
            value={card.data.date}
            onChange={(e) => onChange(card.id, "date", e.target.value)}
            placeholder="DD/MM/YYYY"
          />
        </InlineField>

        <InlineField label="المحصول">
          <Select
            value={card.data.crop || ""}
            onValueChange={(v) => onChange(card.id, "crop", v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="اختر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="قمح">قمح</SelectItem>
              <SelectItem value="بنجر">بنجر</SelectItem>
            </SelectContent>
          </Select>
        </InlineField>

        <InlineField label="الإحداثيات">
          <Input
            className="num h-9 text-right"
            value={card.data.coordinates}
            onChange={(e) => onChange(card.id, "coordinates", e.target.value)}
            placeholder="8-9-27"
          />
        </InlineField>

        <InlineField label="المساحة">
          <Input
            inputMode="decimal"
            className="num h-9 text-base font-bold text-right"
            value={card.data.area}
            onChange={(e) => onChange(card.id, "area", e.target.value)}
            placeholder="70"
          />
        </InlineField>

        {card.areaWarning && (
          <p className="text-xs text-warning flex items-start gap-1 pt-1">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{card.areaWarning}</span>
          </p>
        )}
      </div>

      {card.status === "error" && card.error && (
        <div className="mx-4 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">
          {card.error}
        </div>
      )}

      {/* Zoom overlay */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setZoom(false)}
        >
          <img src={card.imageDataUrl} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
