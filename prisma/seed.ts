import "dotenv/config";
import { auth } from "../src/lib/auth";
import prisma from "../src/lib/prisma";

async function seed() {
    try {
        const users = [
            { email: "admin@aylan.com", name: "Admin", role: "ADMIN" },
            { email: "accountant@aylan.com", name: "Accountant", role: "ACCOUNTANT" },
            { email: "leader@aylan.com", name: "Leader Aylan", role: "LEADER" },
            { email: "leader2@aylan.com", name: "Leader 2", role: "LEADER" },
            { email: "agent@aylan.com", name: "Agent", role: "AGENT", leaderEmail: "leader@aylan.com" },
            { email: "delivery@aylan.com", name: "Assistant de direction", role: "DELIVERY_ASSISTANT" }
        ];

        // First pass: create all users and update roles
        const emailToId: Record<string, string> = {};

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
                console.log(`${u.role} (${u.email}) already exists or error. Checking DB...`);
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
                emailToId[u.email] = userId;
                console.log(`${u.role} seeded/updated.`);
            }
        }

        // Second pass: associate agents to leaders
        for (const u of users) {
            if ("leaderEmail" in u && u.leaderEmail) {
                const agentId = emailToId[u.email];
                const leaderId = emailToId[u.leaderEmail];
                if (agentId && leaderId) {
                    await prisma.user.update({
                        where: { id: agentId },
                        data: { leaderId }
                    });
                    console.log(`Associated agent ${u.email} to leader ${u.leaderEmail}`);
                }
            }
        }
        console.log("All seeded.");
    } catch (e) {
        console.error("Error seeding:", e);
    }
}

seed();
