export type CardStatus = "pending" | "processing" | "success" | "error";

export interface CardData {
  receiptNumber: string;
  date: string;
  crop: string;
  coordinates: string;
  area: string;
}

export interface CardItem {
  kind: "card";
  id: string;
  imageDataUrl: string;
  status: CardStatus;
  error?: string;
  data: CardData;
  createdAt: number;
}

export interface SeparatorItem {
  kind: "separator";
  id: string;
  text: string;
  createdAt: number;
}

export type ListItem = CardItem | SeparatorItem;
