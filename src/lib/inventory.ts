import type { Database } from "@/integrations/supabase/types";

export type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];
export type InventoryType = Database["public"]["Enums"]["inventory_item_type"];
export type InventoryOwner = Database["public"]["Enums"]["inventory_owner"];
export type InventoryUnit = Database["public"]["Enums"]["inventory_unit"];
export type InventoryLocationType = Database["public"]["Enums"]["inventory_location_type"];

export const typeLabels: Record<InventoryType, string> = {
  material: "Material",
  ferramenta: "Ferramenta",
  equipamento: "Equipamento",
  epi: "EPI",
  outros: "Outros",
};

export const ownerLabels: Record<InventoryOwner, string> = {
  lange: "Lange Construções",
  contratante: "Empresa contratante",
};

export const unitLabels: Record<InventoryUnit, string> = {
  unidade: "unidade",
  saco: "saco",
  caixa: "caixa",
  litro: "litro",
  metro: "metro",
  kg: "kg",
  m2: "m²",
  m3: "m³",
  outro: "outro",
};

export const typeOptions = Object.keys(typeLabels) as InventoryType[];
export const ownerOptions = Object.keys(ownerLabels) as InventoryOwner[];
export const unitOptions = Object.keys(unitLabels) as InventoryUnit[];

export const formatQuantity = (value: number | string) => {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
};

export const unitDisplay = (item: Pick<InventoryItem, "unit" | "unit_other">) =>
  item.unit === "outro" && item.unit_other ? item.unit_other : unitLabels[item.unit];
