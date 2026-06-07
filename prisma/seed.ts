import "dotenv/config";
import { auth } from "../src/lib/auth";
import prisma from "../src/lib/prisma";

async function seed() {
    try {
        const users = [
            { email: "admin@aylan.com", name: "Admin", role: "ADMIN" },
            { email: "accountant@aylan.com", name: "Accountant", role: "ACCOUNTANT" },
            { email: "agent@aylan.com", name: "Agent", role: "AGENT" }
        ];

        for (const u of users) {
            console.log(`Seeding ${u.role}...`);
            const res = await auth.api.signUpEmail({
                body: {
                    email: u.email,
                    password: "password123",
                    name: u.name,
                }
            });
            if (res?.user) {
                await prisma.user.update({
                    where: { id: res.user.id },
                    data: { role: u.role }
                });
                console.log(`${u.role} seeded.`);
            }
        }
        console.log("All seeded.");
    } catch (e) {
        console.error("Error seeding:", e);
    }
}

seed();
