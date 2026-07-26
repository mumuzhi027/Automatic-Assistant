import jwt from "jsonwebtoken";
import { store } from "./store.js";

const secret = process.env.JWT_SECRET || "automatic-assistant-dev-secret-change-me";

export function sign(user) {
  return jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: "12h" });
}

export function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "请先登录" });
  try {
    const payload = jwt.verify(token, secret);
    const user = store.data.users.find((item) => item.id === payload.sub);
    if (!user || !user.active || user.deletedAt) {
      return res.status(401).json({ message: "账号已停用或不存在" });
    }
    req.session = { ...payload, role: user.role };
    next();
  } catch {
    res.status(401).json({ message: "登录已过期，请重新登录" });
  }
}

export function admin(req, res, next) {
  if (req.session.role !== "ADMIN") return res.status(403).json({ message: "需要管理员权限" });
  next();
}

export function owns(req, ownerId) {
  return req.session.sub === ownerId;
}
