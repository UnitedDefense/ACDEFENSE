"use client";

/**
 * AddonSelector
 *
 * Controlled list of billable add-ons a customer can attach to a course booking.
 * Supports two per-addon pricing modes:
 *   - "flat"     -> checkbox, charged once
 *   - "quantity" -> checkbox + stepper, charged price x quantity
 *
 * Controlled by design: the parent owns `selection` so it can compute the order
 * total and submit it. The selected amounts shown here are for display only —
 * the server recomputes the charged total from the DB (see
 * app/api/revere/checkout/route.ts), so tampering with client state cannot
 * change what is actually billed.
 */

export interface CourseAddon {
  id: number;
  name: string;
  description: string | null;
  price: string;
  pricingType: "flat" | "quantity";
  maxQuantity: number;
}

/** addonId -> quantity. Absent key means "not selected". */
export type AddonSelection = Record<number, number>;

interface AddonSelectorProps {
  addons: CourseAddon[];
  selection: AddonSelection;
  onChange: (selection: AddonSelection) => void;
  disabled?: boolean;
}

/** Sum of selected add-ons, in dollars. Display-only; server is authoritative. */
export function addonsSubtotal(
  addons: CourseAddon[],
  selection: AddonSelection
): number {
  return addons.reduce((sum, addon) => {
    const qty = selection[addon.id] ?? 0;
    if (qty <= 0) return sum;
    return sum + parseFloat(addon.price) * qty;
  }, 0);
}

export function AddonSelector({
  addons,
  selection,
  onChange,
  disabled = false,
}: AddonSelectorProps) {
  if (addons.length === 0) return null;

  const toggle = (addon: CourseAddon) => {
    const next = { ...selection };
    if (next[addon.id]) {
      delete next[addon.id];
    } else {
      next[addon.id] = 1;
    }
    onChange(next);
  };

  const setQuantity = (addon: CourseAddon, qty: number) => {
    const clamped = Math.max(1, Math.min(addon.maxQuantity, qty));
    onChange({ ...selection, [addon.id]: clamped });
  };

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="field-label">
        Add-ons <span className="font-normal text-ink-muted">(optional)</span>
      </legend>

      <ul className="space-y-2">
        {addons.map((addon) => {
          const qty = selection[addon.id] ?? 0;
          const isSelected = qty > 0;
          const lineTotal = parseFloat(addon.price) * (qty || 1);

          return (
            <li
              key={addon.id}
              className={`rounded-md border px-3 py-2.5 transition-colors ${
                isSelected
                  ? "border-brand-blue bg-brand-blue-tint"
                  : "border-line bg-white"
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(addon)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-blue cursor-pointer"
                />

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{addon.name}</span>
                    <span className="text-sm text-ink-muted whitespace-nowrap tabular-nums">
                      {isSelected ? `$${lineTotal.toFixed(2)}` : `+$${parseFloat(addon.price).toFixed(2)}`}
                      {addon.pricingType === "quantity" && !isSelected && (
                        <span className="text-ink-muted"> ea</span>
                      )}
                    </span>
                  </span>

                  {addon.description && (
                    <span className="block text-xs text-ink-muted mt-0.5">
                      {addon.description}
                    </span>
                  )}
                </span>
              </label>

              {isSelected && addon.pricingType === "quantity" && (
                <div className="flex items-center gap-2 mt-2 pl-7">
                  <span className="text-xs text-ink-muted">Qty</span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      aria-label={`Decrease ${addon.name} quantity`}
                      onClick={() => setQuantity(addon, qty - 1)}
                      disabled={qty <= 1}
                      className="h-8 w-8 rounded-l border border-input bg-white text-ink text-sm leading-none hover:bg-surface disabled:opacity-40"
                    >
                      &minus;
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={addon.maxQuantity}
                      value={qty}
                      aria-label={`${addon.name} quantity`}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        if (!Number.isNaN(parsed)) setQuantity(addon, parsed);
                      }}
                      className="h-8 w-12 border-y border-input bg-white text-center text-sm text-ink tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      aria-label={`Increase ${addon.name} quantity`}
                      onClick={() => setQuantity(addon, qty + 1)}
                      disabled={qty >= addon.maxQuantity}
                      className="h-8 w-8 rounded-r border border-input bg-white text-ink text-sm leading-none hover:bg-surface disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-ink-muted">max {addon.maxQuantity}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
