export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return;
  try {
    const { ensureBuiltInSuperAdmin } = await import("@/lib/auth/built-in-admin");
    await ensureBuiltInSuperAdmin();
  } catch (error) {
    console.error(
      "Built-in super administrator was not ensured.",
      error instanceof Error ? error.message : error,
    );
  }
}
