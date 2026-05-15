import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function requireAdmin(req: any, res: any): boolean {
  if (!req.session?.userId || req.session.userRole !== "admin") {
    res.status(401).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

router.get("/admin/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        displayName: usersTable.displayName,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(usersTable.createdAt);
    res.json(users);
  } catch (err) {
    req.log.error(err, "get admin users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/users", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { username, email, password, displayName } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: "username, email and password are required" });
    return;
  }
  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const usernameCheck = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);
    if (usernameCheck.length > 0) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ username, email, passwordHash, displayName: displayName || username, role: "admin" })
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        displayName: usersTable.displayName,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      });
    res.status(201).json(user);
  } catch (err) {
    req.log.error(err, "create admin user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/users/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (id === req.session.userId) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }
  try {
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "delete admin user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/users/:id/password", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "newPassword must be at least 6 characters" });
    return;
  }
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "update admin user password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
