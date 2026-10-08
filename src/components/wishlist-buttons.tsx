"use client";

import { Check, ShoppingCart, Sparkles } from "lucide-react";
import { generateWishlist, quickWishlist } from "@/actions/wishlist";
import { useAction } from "@/lib/use-action";
import { Badge } from "./ui/badge";
import { Button, type ButtonProps } from "./ui/button";

export function QuickWishlistButton({ componentId, ordered }: { componentId: string; ordered: boolean }) {
  const { pending, run } = useAction();
  if (ordered) {
    return (
      <Badge tone="ion">
        <Check className="size-3" />
        En wishlist
      </Badge>
    );
  }
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => run(() => quickWishlist({ componentId }), { success: (d) => `${d.name} añadido a la wishlist` })}
    >
      <ShoppingCart />
      Pedir
    </Button>
  );
}

export function GenerateWishlistButton({ count, ...props }: { count: number } & ButtonProps) {
  const { pending, run } = useAction();
  if (count === 0) return null;
  return (
    <Button
      variant="warn"
      disabled={pending}
      onClick={() =>
        run(() => generateWishlist({}), {
          success: (d) => (d.created ? `${d.created} pedidos añadidos a la wishlist` : "Todo lo que falta ya estaba pedido"),
        })
      }
      {...props}
    >
      <Sparkles />
      Pedir los {count} que faltan
    </Button>
  );
}
