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

  // Only Admin, Accountant, Delivery Assistant, and Delivery Drivers can access this page
  if (role !== "ADMIN" && role !== "ACCOUNTANT" && role !== "DELIVERY_ASSISTANT" && role !== "DELIVERY") {
    redirect("/unauthorized");
  }

  // Fetch dbUser to get current driver availability status
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAvailable: true },
  });

  // Where clause based on role
  let whereClause: any = {};
  if (role === "DELIVERY") {
    whereClause = {
      OR: [
        { driverId: user.id },
        { shippingType: "DELIVERY", status: "PENDING", driverId: null },
      ],
    };
  }

  // Fetch sales list
  const sales = await prisma.sale.findMany({
    where: whereClause,
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
      driver: {
        select: {
          id: true,
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
    driverId: sale.driverId,
    driverName: sale.driver?.name || null,
  }));

  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role,
    isAvailable: dbUser?.isAvailable ?? true,
  };

  return (
    <DeliveriesClientPage
      initialSales={formattedSales}
      currentUser={currentUser}
    />
  );
}
