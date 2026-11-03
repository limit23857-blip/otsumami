import type { DrinkType } from "@/generated/prisma/enums";

/** 画面に表示するお酒の名前（DB の enum と対応） */
export const DRINK_LABELS: Record<DrinkType, string> = {
  beer: "ビール",
  sake: "日本酒",
  highball: "ハイボール",
  wine: "ワイン",
  shochu: "焼酎",
  other: "その他",
};

export const DRINK_TYPES = Object.keys(DRINK_LABELS) as DrinkType[];

/** 選べる調理時間（分） */
export const COOK_MINUTES_OPTIONS = [5, 10, 15, 30] as const;
