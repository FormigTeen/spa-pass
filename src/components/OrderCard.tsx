import { motion } from "framer-motion";
import { Check, Package } from "lucide-react";
import { cn } from "../lib/cn";
import { orderStatusLabel } from "../lib/orderStatus";

export type OrderSummary = {
  orderId: string;
  status: string | null;
  createdAt: string | null;
  value: number | null;
  items: string[];
};

const formatMoney = (value: number | null) =>
  value == null
    ? null
    : // Ordering returns cents.
      (value / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

export function OrderCard({
  order,
  selected,
  onSelect,
}: {
  order: OrderSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const money = formatMoney(order.value);
  const date = formatDate(order.createdAt);
  const [first, ...rest] = order.items;

  const facts = [date, money, orderStatusLabel(order.status)].filter(
    Boolean,
  ) as string[];

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      layout
      whileTap={{ scale: 0.99 }}
      aria-pressed={selected}
      className={cn(
        "relative w-full rounded-2xl border p-4 text-left transition-colors duration-200",
        selected
          ? "border-cream bg-cream/10"
          : "border-cream/10 bg-cream/5 hover:border-cream/35",
      )}
    >
      {/* The selected card grows a rail on its edge, so the choice reads at a
          glance even when the colours are close. */}
      {selected && (
        <motion.span
          layoutId="order-card-rail"
          className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-brand"
          aria-hidden
        />
      )}

      <span className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors",
            selected ? "bg-cream text-ink" : "bg-cream/10 text-cream/70",
          )}
        >
          {selected ? (
            <Check className="h-5 w-5" aria-hidden />
          ) : (
            <Package className="h-5 w-5" aria-hidden />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-cream">
            {first ?? "Pedido"}
          </span>

          {/* Status is ignored while testing, so the id is what actually
              identifies the order — it has to be readable. */}
          <span className="mt-1 block font-mono text-xs text-cream/70">
            {order.orderId}
          </span>

          {rest.length > 0 && (
            <span className="mt-0.5 block text-xs text-cream/45">
              e mais {rest.length} {rest.length === 1 ? "item" : "itens"}
            </span>
          )}

          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cream/50">
            {facts.map((fact, index) => (
              <span key={fact} className="flex items-center gap-2">
                {index > 0 && (
                  <span className="h-1 w-1 rounded-full bg-cream/25" aria-hidden />
                )}
                {fact}
              </span>
            ))}
          </span>
        </span>
      </span>
    </motion.button>
  );
}
