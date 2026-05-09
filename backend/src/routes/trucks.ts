import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const trucksRouter = new Hono();

const TruckCreateSchema = z.object({
  id: z.string().optional(),
  shopId: z.string(),
  truckNumber: z.string(),
  senderName: z.string(),
  senderCode: z.string().default(""),
  chlNumber: z.string().default(""),
  totalKg: z.number().default(0),
  freightAmount: z.number().default(0),
  gradeInventory: z.array(z.unknown()).default([]),
  status: z.enum(["ACTIVE", "CLOSED"]).default("ACTIVE"),
  date: z.number(),
  createdAt: z.number(),
});

const TruckUpdateSchema = z.object({
  truckNumber: z.string().optional(),
  senderName: z.string().optional(),
  senderCode: z.string().optional(),
  chlNumber: z.string().optional(),
  totalKg: z.number().optional(),
  freightAmount: z.number().optional(),
  gradeInventory: z.array(z.unknown()).optional(),
  status: z.enum(["ACTIVE", "CLOSED"]).optional(),
  date: z.number().optional(),
  createdAt: z.number().optional(),
});

function parseTruck(truck: {
  id: string;
  shopId: string;
  truckNumber: string;
  senderName: string;
  senderCode: string;
  chlNumber: string;
  totalKg: number;
  freightAmount: number;
  gradeInventory: string;
  status: string;
  date: number;
  createdAt: number;
}) {
  return {
    ...truck,
    gradeInventory: JSON.parse(truck.gradeInventory) as unknown[],
  };
}

// GET /api/trucks?shopId=&date=
trucksRouter.get("/", async (c) => {
  const shopId = c.req.query("shopId");
  const dateStr = c.req.query("date");

  if (!shopId) {
    return c.json({ error: { message: "shopId is required", code: "BAD_REQUEST" } }, 400);
  }

  try {
    const where: Record<string, unknown> = { shopId };
    if (dateStr) {
      where.date = parseInt(dateStr, 10);
    }

    const trucks = await prisma.truck.findMany({ where, orderBy: { createdAt: "desc" } });
    return c.json({ data: trucks.map(parseTruck) });
  } catch (err) {
    console.error('[GET /api/trucks]', err);
    return c.json({ error: { message: "Failed to fetch trucks", code: "INTERNAL_ERROR" } }, 500);
  }
});

// POST /api/trucks
trucksRouter.post("/", zValidator("json", TruckCreateSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    const truck = await prisma.truck.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        shopId: body.shopId,
        truckNumber: body.truckNumber,
        senderName: body.senderName,
        senderCode: body.senderCode,
        chlNumber: body.chlNumber,
        totalKg: body.totalKg,
        freightAmount: body.freightAmount,
        gradeInventory: JSON.stringify(body.gradeInventory),
        status: body.status,
        date: body.date,
        createdAt: body.createdAt,
      },
    });
    return c.json({ data: parseTruck(truck) }, 201);
  } catch (err) {
    console.error('[POST /api/trucks]', err);
    return c.json({ error: { message: "Failed to create truck", code: "INTERNAL_ERROR" } }, 500);
  }
});

// PUT /api/trucks/:id
trucksRouter.put("/:id", zValidator("json", TruckUpdateSchema), async (c) => {
  const { id } = c.req.param();
  const body = c.req.valid("json");
  try {
    const updateData: Record<string, unknown> = {};
    if (body.truckNumber !== undefined) updateData.truckNumber = body.truckNumber;
    if (body.senderName !== undefined) updateData.senderName = body.senderName;
    if (body.senderCode !== undefined) updateData.senderCode = body.senderCode;
    if (body.chlNumber !== undefined) updateData.chlNumber = body.chlNumber;
    if (body.totalKg !== undefined) updateData.totalKg = body.totalKg;
    if (body.freightAmount !== undefined) updateData.freightAmount = body.freightAmount;
    if (body.gradeInventory !== undefined) updateData.gradeInventory = JSON.stringify(body.gradeInventory);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.createdAt !== undefined) updateData.createdAt = body.createdAt;

    const truck = await prisma.truck.update({ where: { id }, data: updateData });
    return c.json({ data: parseTruck(truck) });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2025") {
      return c.json({ error: { message: "Truck not found", code: "NOT_FOUND" } }, 404);
    }
    console.error('[PUT /api/trucks/:id]', err);
    return c.json({ error: { message: "Failed to update truck", code: "INTERNAL_ERROR" } }, 500);
  }
});

// DELETE /api/trucks/:id
trucksRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    await prisma.truck.delete({ where: { id } });
    return c.body(null, 204);
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2025") {
      return c.json({ error: { message: "Truck not found", code: "NOT_FOUND" } }, 404);
    }
    console.error('[DELETE /api/trucks/:id]', err);
    return c.json({ error: { message: "Failed to delete truck", code: "INTERNAL_ERROR" } }, 500);
  }
});

export { trucksRouter };
