import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProductsAction } from "@/server/actions/product-actions";
import { ProductsClientPage } from "./products-client-page";

export const metadata = {
  title: "Catalogue Produits & Stock - AYLAN GROUP",
  description: "Gestion des produits, des prix de vente et des niveaux de stock.",
};

export default async function ProductsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  const role = user.role || "AGENT";

  // Fetch products
  const res = await getProductsAction();

  if (!res.success || !res.products || !res.summary) {
    throw new Error(res.error || "Erreur lors de la récupération du catalogue produits.");
  }

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role,
  };

  return (
    <ProductsClientPage
      initialProducts={res.products}
      summary={res.summary}
      currentUser={currentUser}
    />
  );
}
