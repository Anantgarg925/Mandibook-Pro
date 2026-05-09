import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const transactionsRouter = new Hono();

const TransactionCreateSchema = z.object({
  id: z.string().optional(),
  shopId: z.string(),
  buyerCode: z.string(),
  type: z.enum(["SALE", "PAYMENT"]),
  amount: z.number(),
  date: z.number().int(),
  paymentMethod: z.enum(["CASH", "UPI", "CHEQUE"]).optional(),
  upiRef: z.string().optional(),
  note: z.string().optional(),
  slipNumber: z.number().int().optional(),
  createdAt: z.number().int(),
});

// GET /api/transactions?shopId=&buyerCode=
transactionsRouter.get("/", async (c) => {
  const shopId = c.req.query("shopId");
  const buyerCode = c.req.query("buyerCode");

  if (!shopId) {
    return c.json({ error: { message: "shopId is required", code: "BAD_REQUEST" } }, 400);
  }

  try {
    const where: Record<string, unknown> = { shopId };
    if (buyerCode) where.buyerCode = buyerCode;

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return c.json({ data: transactions });
  } catch {
    return c.json({ error: { message: "Failed to fetch transactions", code: "INTERNAL_ERROR" } }, 500);
  }
});

// POST /api/transactions
transactionsRouter.post("/", zValidator("json", TransactionCreateSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    const transaction = await prisma.transaction.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        shopId: body.shopId,
        buyerCode: body.buyerCode,
        type: body.type,
        amount: body.amount,
        date: body.date,
        paymentMethod: body.paymentMethod ?? null,
        upiRef: body.upiRef ?? null,
        note: body.note ?? null,
        slipNumber: body.slipNumber ?? null,
        createdAt: body.createdAt,
      },
    });
    return c.json({ data: transaction }, 201);
  } catch {
    return c.json({ error: { message: "Failed to create transaction", code: "INTERNAL_ERROR" } }, 500);
  }
});

export { transactionsRouter };
