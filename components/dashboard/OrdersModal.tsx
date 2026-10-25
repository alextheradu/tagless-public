"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import type { AirtableRecordWithId, ShopOrderWithId } from "@/lib/types";

interface Props {
  orders: ShopOrderWithId[];
  submissions: AirtableRecordWithId[];
  itemImages: Record<string, string>;
  onClose: () => void;
  onChanged: () => void;
}

const statusClasses: Record<string, string> = {
  Pending: "text-ink-soft",
  Fulfilled: "text-mint",
  Cancelled: "text-smoke",
};

export function OrdersModal({ orders, submissions, itemImages, onClose, onChanged }: Props) {
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const claimedTagSubmissions = submissions.filter((s) => s["Tag Claimed"]);

  async function cancel(id: string) {
    if (!confirm("Cancel this order?")) return;
    setCancelingId(id);
    const res = await fetch(`/api/shop/orders/${id}/cancel`, { method: "POST" });
    setCancelingId(null);
    if (res.ok) {
      onChanged();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Couldn't cancel that order.");
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <EyebrowLabel>my orders</EyebrowLabel>
        <button
          onClick={onClose}
          aria-label="Close"
          className="font-mono text-sm text-ink-soft hover:text-ink"
        >
          ✕ close
        </button>
      </div>

      {orders.length === 0 && claimedTagSubmissions.length === 0 ? (
        <p className="text-smoke text-sm py-8 text-center">No orders yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {claimedTagSubmissions.map((s) => (
            <div
              key={`tag-${s._id}`}
              className="flex items-center gap-4 border-[1.5px] border-ink rounded-md p-3"
            >
              <TagThumb />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">Luggage Tag</p>
                <p className="text-xs text-smoke">
                  claimed {s["Tag Claimed At"] ? new Date(s["Tag Claimed At"]).toLocaleDateString() : ""}
                </p>
              </div>
              <span className="font-mono text-xs uppercase text-mint">fulfilled</span>
            </div>
          ))}
          {orders.map((o) => {
            const imageUrl = o.Item?.[0] ? itemImages[o.Item[0]] : undefined;
            return (
              <div
                key={o._id}
                className="flex items-center gap-4 border-[1.5px] border-ink rounded-md p-3 flex-wrap"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-14 h-14 rounded-md object-cover border border-bone shrink-0"
                  />
                ) : (
                  <ItemThumb />
                )}
                <div className="flex-1 min-w-[140px]">
                  <p className="text-sm font-medium text-ink">
                    {o["Item Name"]}
                    {o.Label ? <span className="text-ink-soft"> ({o.Label})</span> : null}{" "}
                    <span className="text-ink-soft">x{o.Quantity}</span>
                  </p>
                  <p className="text-xs text-smoke">{o["Total Stamps Spent"]} stamps</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-xs uppercase ${statusClasses[o.Status] ?? "text-ink-soft"}`}>
                    {o.Status}
                  </span>
                  {o.Status === "Pending" && (
                    <button
                      onClick={() => cancel(o._id)}
                      disabled={cancelingId === o._id}
                      className="font-mono text-xs text-ink-soft underline hover:text-magenta disabled:opacity-50"
                    >
                      {cancelingId === o._id ? "canceling..." : "cancel"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function ItemThumb() {
  return (
    <div className="w-14 h-14 rounded-md bg-paper-warm border border-bone shrink-0 flex items-center justify-center text-smoke text-[10px] font-mono">
      no image
    </div>
  );
}

function TagThumb() {
  return (
    <div className="w-14 h-14 rounded-md bg-highlight/30 border border-bone shrink-0 flex items-center justify-center text-lg">
      🏷️
    </div>
  );
}
