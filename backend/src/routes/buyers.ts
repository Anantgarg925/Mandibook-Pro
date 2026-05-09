import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const buyersRouter = new Hono();

const BuyerCreateSchema = z.object({
  id: z.string().optional(),
  shopId: z.string(),
  code: z.string(),
  name: z.string(),
  phone: z.string().default(""),
  outstandingBalance: z.number().default(0),
  lastTransactionDate: z.number().int(),
  lastPaymentAmount: z.number().optional(),
  lastPaymentDate: z.number().int().optional(),
  createdAt: z.number().int(),
});

const BuyerUpdateSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  outstandingBalance: z.number().optional(),
  lastTransactionDate: z.number().int().optional(),
  lastPaymentAmount: z.number().nullable().optional(),
  lastPaymentDate: z.number().int().nullable().optional(),
  createdAt: z.number().int().optional(),
});

// GET /api/buyers?shopId=
buyersRouter.get("/", async (c) => {
  const shopId = c.req.query("shopId");

  if (!shopId) {
    return c.json({ error: { message: "shopId is required", code: "BAD_REQUEST" } }, 400);
  }

  try {
    const buyers = await prisma.buyer.findMany({ where: { shopId }, orderBy: { name: "asc" } });
    return c.json({ data: buyers });
  } catch {
    return c.json({ error: { message: "Failed to fetch buyers", code: "INTERNAL_ERROR" } }, 500);
  }
});

// GET /api/buyers/:id
buyersRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    const buyer = await prisma.buyer.findUnique({ where: { id } });
    if (!buyer) {
      return c.json({ error: { message: "Buyer not found", code: "NOT_FOUND" } }, 404);
    }
    return c.json({ data: buyer });
  } catch {
    return c.json({ error: { message: "Failed to fetch buyer", code: "INTERNAL_ERROR" } }, 500);
  }
});

// POST /api/buyers
buyersRouter.post("/", zValidator("json", BuyerCreateSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    const buyer = await prisma.buyer.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        shopId: body.shopId,
        code: body.code,
        name: body.name,
        phone: body.phone,
        outstandingBalance: body.outstandingBalance,
        lastTransactionDate: body.lastTransactionDate,
        lastPaymentAmount: body.lastPaymentAmount ?? null,
        lastPaymentDate: body.lastPaymentDate ?? null,
        createdAt: body.createdAt,
      },
    });
    return c.json({ data: buyer }, 201);
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2002") {
      return c.json({ error: { message: "Buyer with this code already exists in shop", code: "CONFLICT" } }, 409);
    }
    return c.json({ error: { message: "Failed to create buyer", code: "INTERNAL_ERROR" } }, 500);
  }
});

// PUT /api/buyers/:id
buyersRouter.put("/:id", zValidator("json", BuyerUpdateSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid("json");
  try {
    const buyer = await prisma.buyer.update({ where: { id }, data: body });
    return c.json({ data: buyer });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2025") {
      return c.json({ error: { message: "Buyer not found", code: "NOT_FOUND" } }, 404);
    }
    return c.json({ error: { message: "Failed to update buyer", code: "INTERNAL_ERROR" } }, 500);
  }
});

export { buyersRouter };
