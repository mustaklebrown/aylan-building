import "dotenv/config";
import { auth } from "../src/lib/auth";
import prisma from "../src/lib/prisma";

async function seed() {
    try {
        const users = [
            { email: "admin@aylan.com", name: "Admin", role: "ADMIN" },
            { email: "accountant@aylan.com", name: "Accountant", role: "ACCOUNTANT" },
            { email: "agent@aylan.com", name: "Agent", role: "AGENT" },
            { email: "delivery@aylan.com", name: "Assistant de direction", role: "DELIVERY_ASSISTANT" }
        ];

        for (const u of users) {
            console.log(`Seeding ${u.role}...`);
            let userId = "";
            try {
                const res = await auth.api.signUpEmail({
                    body: {
                        email: u.email,
                        password: "password123",
                        name: u.name,
                    }
                });
                if (res?.user) {
                    userId = res.user.id;
                }
            } catch (e) {
                console.log(`${u.role} already exists or error. Checking DB...`);
                const existing = await prisma.user.findFirst({ where: { email: u.email } });
                if (existing) {
                    userId = existing.id;
                }
            }
            
            if (userId) {
                await prisma.user.update({
                    where: { id: userId },
                    data: { role: u.role }
                });
                console.log(`${u.role} seeded/updated.`);
            }
        }
        console.log("All seeded.");
    } catch (e) {
        console.error("Error seeding:", e);
    }
}

seed();
