import { useCallback, useEffect, useRef, useState } from "react";
import { extractCardFromImage } from "@/lib/extract";
import type { CardItem, ListItem } from "@/types/card";
import { loadItems, saveItems, loadSettings } from "@/lib/storage";

export function useCardStore() {
  const [items, setItems] = useState<ListItem[]>(() => loadItems());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);

  // Persist on every change
  useEffect(() => {
    saveItems(items);
  }, [items]);

  const addCards = useCallback((cards: CardItem[]) => {
    setItems((prev) => [...prev, ...cards]);
  }, []);

  const addSeparator = useCallback((text: string) => {
    setItems((prev) => [
      ...prev,
      { kind: "separator", id: crypto.randomUUID(), text, createdAt: Date.now() },
    ]);
  }, []);

  const insertSeparatorAt = useCallback((index: number, text: string) => {
    setItems((prev) => {
      const next = [...prev];
      next.splice(index, 0, {
        kind: "separator",
        id: crypto.randomUUID(),
        text,
        createdAt: Date.now(),
      });
      return next;
    });
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<ListItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? ({ ...it, ...patch } as ListItem) : it)),
    );
  }, []);

  const updateCardData = useCallback(
    (id: string, field: keyof CardItem["data"], value: string) => {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id || it.kind !== "card") return it;
          return { ...it, data: { ...it.data, [field]: value } };
        }),
      );
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  /** Process given card IDs sequentially with delay between calls. */
  const processIds = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      const settings = loadSettings();
      cancelRef.current = false;
      setProcessing(true);
      setProgress({ done: 0, total: ids.length });

      // mark all as processing
      setItems((prev) =>
        prev.map((it) =>
          ids.includes(it.id) && it.kind === "card"
            ? { ...it, status: "processing", error: undefined }
            : it,
        ),
      );

      for (let i = 0; i < ids.length; i++) {
        if (cancelRef.current) break;
        const id = ids[i];
        // get latest snapshot
        const snapshot = (await new Promise<ListItem[]>((res) =>
          setItems((prev) => {
            res(prev);
            return prev;
          }),
        )) as ListItem[];
        const target = snapshot.find((it) => it.id === id);
        if (!target || target.kind !== "card") {
          setProgress((p) => ({ ...p, done: p.done + 1 }));
          continue;
        }

        try {
          const { data, areaWarning } = await extractCardFromImage(target.imageDataUrl);
          setItems((prev) =>
            prev.map((it) =>
              it.id === id && it.kind === "card"
                ? { ...it, status: "success", data, areaWarning, error: undefined }
                : it,
            ),
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "خطأ غير معروف";
          setItems((prev) =>
            prev.map((it) =>
              it.id === id && it.kind === "card"
                ? { ...it, status: "error", error: msg }
                : it,
            ),
          );
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
        if (i < ids.length - 1 && settings.delayMs > 0) {
          await new Promise((r) => setTimeout(r, settings.delayMs));
        }
      }

      setProcessing(false);
    },
    [],
  );

  const cancelProcessing = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const retryAllErrors = useCallback(() => {
    const ids = items
      .filter((it) => it.kind === "card" && it.status === "error")
      .map((it) => it.id);
    return processIds(ids);
  }, [items, processIds]);

  return {
    items,
    setItems,
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
  };
}
