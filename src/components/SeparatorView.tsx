import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import type { SeparatorItem } from "@/types/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  separator: SeparatorItem;
  onChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

export function SeparatorView({ separator, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(separator.text);

  function save() {
    const v = draft.trim();
    if (v) onChange(separator.id, v);
    setEditing(false);
  }

  return (
    <div className="my-1 flex items-center gap-2 animate-fade-in">
      <div className="flex-1 h-px bg-primary/30" />
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold max-w-[80%]">
        {editing ? (
          <>
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-7 px-2 text-sm bg-card"
            />
            <button onClick={save} className="text-success">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => setEditing(false)} className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span className="truncate">— {separator.text} —</span>
            <button onClick={() => setEditing(true)} className="opacity-70 hover:opacity-100">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(separator.id)} className="text-destructive opacity-70 hover:opacity-100">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
      <div className="flex-1 h-px bg-primary/30" />
    </div>
  );
}
