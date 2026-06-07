import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { DeliveriesClientPage } from "./deliveries-client-page";

export const metadata = {
  title: "Gestion des Livraisons - AYLAN GROUP",
  description: "Portail de suivi et gestion des expéditions et retraits de colis.",
};

export default async function DeliveriesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  const role = user.role || "AGENT";

  // Only Admin, Accountant, and Delivery Assistant can access this page
  if (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "DELIVERY_ASSISTANT") {
    redirect("/unauthorized");
  }

  // Fetch sales list
  const sales = await prisma.sale.findMany({
    orderBy: { date: "desc" },
    include: {
      product: {
        select: {
          name: true,
          sku: true,
        },
      },
      agent: {
        select: {
          name: true,
        },
      },
      prospect: {
        select: {
          phone: true,
          whatsapp: true,
        },
      },
    },
  });

  const formattedSales = sales.map((sale) => ({
    id: sale.id,
    date: sale.date,
    customerName: sale.customerName,
    customerPhone: sale.prospect?.phone || "Non spécifié",
    customerWhatsapp: sale.prospect?.whatsapp || null,
    productName: sale.product.name,
    productSku: sale.product.sku,
    quantity: sale.quantity,
    price: sale.price,
    totalAmount: sale.price * sale.quantity + (sale.shippingFee || 0),
    agentName: sale.agent.name,
    status: sale.status,
    shippingType: sale.shippingType,
    shippingCity: sale.shippingCity,
    shippingAddress: sale.shippingAddress,
    shippingFee: sale.shippingFee,
  }));

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role,
  };

  return (
    <DeliveriesClientPage
      initialSales={formattedSales}
      currentUser={currentUser}
    />
  );
}
