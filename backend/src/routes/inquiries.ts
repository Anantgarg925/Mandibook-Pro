import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const inquiriesRouter = new Hono();

const InquiryCreateSchema = z.object({
  id: z.string().optional(),
  shopId: z.string(),
  slipNumber: z.number().int(),
  truckId: z.string(),
  truckNumber: z.string(),
  customerName: z.string(),
  customerPhone: z.string().default(""),
  grade: z.string(),
  gradeName: z.string(),
  sacks: z.number().int(),
  weightPerSack: z.number(),
  totalWeight: z.number(),
  ratePerKg: z.number(),
  grossAmount: z.number(),
  apmcAmount: z.number().default(0),
  bardanaAmount: z.number().default(0),
  cartageAmount: z.number().default(0),
  netAmount: z.number(),
  paymentMode: z.enum(["CASH", "UPI", "UDHAARI", "PENDING"]).default("PENDING"),
  upiRef: z.string().default(""),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).default("PENDING"),
  date: z.number(),
  createdAt: z.number(),
});

const InquiryUpdateSchema = z.object({
  slipNumber: z.number().int().optional(),
  truckId: z.string().optional(),
  truckNumber: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  grade: z.string().optional(),
  gradeName: z.string().optional(),
  sacks: z.number().int().optional(),
  weightPerSack: z.number().optional(),
  totalWeight: z.number().optional(),
  ratePerKg: z.number().optional(),
  grossAmount: z.number().optional(),
  apmcAmount: z.number().optional(),
  bardanaAmount: z.number().optional(),
  cartageAmount: z.number().optional(),
  netAmount: z.number().optional(),
  paymentMode: z.enum(["CASH", "UPI", "UDHAARI", "PENDING"]).optional(),
  upiRef: z.string().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
  date: z.number().optional(),
  createdAt: z.number().optional(),
});

// GET /api/inquiries?shopId=&date=&status=&truckId=
inquiriesRouter.get("/", async (c) => {
  const shopId = c.req.query("shopId");
  const dateStr = c.req.query("date");
  const status = c.req.query("status");
  const truckId = c.req.query("truckId");

  if (!shopId) {
    return c.json({ error: { message: "shopId is required", code: "BAD_REQUEST" } }, 400);
  }

  try {
    const where: Record<string, unknown> = { shopId };
    if (dateStr) {
      const dayStart = parseInt(dateStr, 10);
      where.date = { gte: dayStart, lt: dayStart + 86400000 };
    }
    if (status) where.status = status;
    if (truckId) where.truckId = truckId;

    const inquiries = await prisma.inquiry.findMany({ where, orderBy: { createdAt: "desc" } });
    return c.json({ data: inquiries });
  } catch (err) {
    console.error('[GET /api/inquiries]', err);
    return c.json({ error: { message: "Failed to fetch inquiries", code: "INTERNAL_ERROR" } }, 500);
  }
});

// GET /api/inquiries/:id
inquiriesRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  const shopId = c.req.query("shopId");
  try {
    const inquiry = await prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry || (shopId && inquiry.shopId !== shopId)) {
      return c.json({ error: { message: "Inquiry not found", code: "NOT_FOUND" } }, 404);
    }
    return c.json({ data: inquiry });
  } catch (err) {
    console.error('[GET /api/inquiries/:id]', err);
    return c.json({ error: { message: "Failed to fetch inquiry", code: "INTERNAL_ERROR" } }, 500);
  }
});

// POST /api/inquiries
inquiriesRouter.post("/", zValidator("json", InquiryCreateSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    const inquiry = await prisma.inquiry.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        shopId: body.shopId,
        slipNumber: body.slipNumber,
        truckId: body.truckId,
        truckNumber: body.truckNumber,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        grade: body.grade,
        gradeName: body.gradeName,
        sacks: body.sacks,
        weightPerSack: body.weightPerSack,
        totalWeight: body.totalWeight,
        ratePerKg: body.ratePerKg,
        grossAmount: body.grossAmount,
        apmcAmount: body.apmcAmount,
        bardanaAmount: body.bardanaAmount,
        cartageAmount: body.cartageAmount,
        netAmount: body.netAmount,
        paymentMode: body.paymentMode,
        upiRef: body.upiRef,
        status: body.status,
        date: body.date,
        createdAt: body.createdAt,
      },
    });
    return c.json({ data: inquiry }, 201);
  } catch (err) {
    console.error('[POST /api/inquiries]', err);
    return c.json({ error: { message: "Failed to create inquiry", code: "INTERNAL_ERROR" } }, 500);
  }
});

// PUT /api/inquiries/:id
inquiriesRouter.put("/:id", zValidator("json", InquiryUpdateSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid("json");
  try {
    const inquiry = await prisma.inquiry.update({ where: { id }, data: body });
    return c.json({ data: inquiry });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2025") {
      return c.json({ error: { message: "Inquiry not found", code: "NOT_FOUND" } }, 404);
    }
    console.error('[PUT /api/inquiries/:id]', err);
    return c.json({ error: { message: "Failed to update inquiry", code: "INTERNAL_ERROR" } }, 500);
  }
});

// DELETE /api/inquiries/:id
inquiriesRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    await prisma.inquiry.delete({ where: { id } });
    return c.body(null, 204);
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2025") {
      return c.json({ error: { message: "Inquiry not found", code: "NOT_FOUND" } }, 404);
    }
    console.error('[DELETE /api/inquiries/:id]', err);
    return c.json({ error: { message: "Failed to delete inquiry", code: "INTERNAL_ERROR" } }, 500);
  }
});

export { inquiriesRouter };
