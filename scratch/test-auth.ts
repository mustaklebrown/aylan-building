import { auth } from "../src/lib/auth";

async function main() {
  try {
    console.log("Testing Better Auth adapter...");
    // Trigger an internal auth query to trace the exact database call
    const res = await auth.api.getSession({
      headers: new Headers({
        cookie: "better-auth.session_token=test"
      })
    });
    console.log("Auth session query completed:", res);
  } catch (error) {
    console.error("Better Auth query failed with error:", error);
  }
}

main();
