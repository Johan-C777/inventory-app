import { PageHeader } from "@/components/ui/panel";
import { GenerateWishlistButton } from "@/components/wishlist-buttons";
import { getOverview, getWishlist } from "@/lib/queries";
import WishlistClient from "./WishlistClient";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const [items, overview] = await Promise.all([getWishlist(), getOverview()]);
  return (
    <>
      <PageHeader title="Wishlist" lead="Lo que hay que comprar. Los componentes que bajan de su mínimo entran solos; al marcarlos como comprados vuelven al stock.">
        <GenerateWishlistButton count={overview.unordered} />
      </PageHeader>
      <WishlistClient items={items} />
    </>
  );
}
