import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const shopsRouter = new Hono();

const ChargesSchema = z.object({
  apmcCommission: z.number().default(0),
  agentCommission: z.number().default(0),
  bardanaPerSack: z.number().default(0),
  cartagePerKg: z.number().default(0),
  telePost: z.number().default(0),
});

const ShopCreateSchema = z.object({
  id: z.string().optional(),
  firmName: z.string(),
  ownerName: z.string(),
  address: z.string(),
  city: z.string(),
  phone1: z.string(),
  phone2: z.string().default(""),
  upiId: z.string().default(""),
  upiApps: z.array(z.string()).default([]),
  commodity: z.string(),
  grades: z.array(z.object({ code: z.string(), name: z.string() })).default([]),
  charges: ChargesSchema.default({
    apmcCommission: 0,
    agentCommission: 0,
    bardanaPerSack: 0,
    cartagePerKg: 0,
    telePost: 0,
  }),
  adminPin: z.string(),
  teamNames: z.array(z.any()).default([]),
  createdAt: z.number(),
});

const ShopUpdateSchema = z.object({
  firmName: z.string().optional(),
  ownerName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  upiId: z.string().optional(),
  upiApps: z.array(z.string()).optional(),
  commodity: z.string().optional(),
  grades: z.array(z.object({ code: z.string(), name: z.string() })).optional(),
  charges: ChargesSchema.optional(),
  adminPin: z.string().optional(),
  teamNames: z.array(z.any()).optional(),
  createdAt: z.number().optional(),
});

function parseShop(shop: {
  id: string;
  firmName: string;
  ownerName: string;
  address: string;
  city: string;
  phone1: string;
  phone2: string;
  upiId: string;
  upiApps: string;
  commodity: string;
  grades: string;
  charges: string;
  adminPin: string;
  teamNames: string;
  createdAt: number;
}) {
  const { id, ...rest } = shop;
  return {
    shopId: id,
    ...rest,
    upiApps: JSON.parse(shop.upiApps) as string[],
    grades: JSON.parse(shop.grades) as { code: string; name: string }[],
    charges: JSON.parse(shop.charges) as {
      apmcCommission: number;
      agentCommission: number;
      bardanaPerSack: number;
      cartagePerKg: number;
      telePost: number;
    },
    teamNames: JSON.parse(shop.teamNames) as any[],
  };
}

// GET /api/shops/:shopId
shopsRouter.get("/:shopId", async (c) => {
  const { shopId } = c.req.param();
  try {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return c.json({ error: { message: "Shop not found", code: "NOT_FOUND" } }, 404);
    }
    return c.json({ data: parseShop(shop) });
  } catch (err) {
    console.error('[GET /api/shops/:shopId]', err);
    return c.json({ error: { message: "Failed to fetch shop", code: "INTERNAL_ERROR" } }, 500);
  }
});

// POST /api/shops
shopsRouter.post("/", zValidator("json", ShopCreateSchema), async (c) => {
  const body = c.req.valid("json");
  try {
    const shop = await prisma.shop.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        firmName: body.firmName,
        ownerName: body.ownerName,
        address: body.address,
        city: body.city,
        phone1: body.phone1,
        phone2: body.phone2,
        upiId: body.upiId,
        upiApps: JSON.stringify(body.upiApps),
        commodity: body.commodity,
        grades: JSON.stringify(body.grades),
        charges: JSON.stringify(body.charges),
        adminPin: body.adminPin,
        teamNames: JSON.stringify(body.teamNames),
        createdAt: body.createdAt,
      },
    });
    return c.json({ data: parseShop(shop) }, 201);
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2002") {
      return c.json({ error: { message: "Shop already exists", code: "CONFLICT" } }, 409);
    }
    console.error('[POST /api/shops]', err);
    return c.json({ error: { message: "Failed to create shop", code: "INTERNAL_ERROR" } }, 500);
  }
});

// PUT /api/shops/:shopId
shopsRouter.put("/:shopId", zValidator("json", ShopUpdateSchema), async (c) => {
  const { shopId } = c.req.param();
  const body = c.req.valid("json");
  try {
    const updateData: Record<string, unknown> = {};
    if (body.firmName !== undefined) updateData.firmName = body.firmName;
    if (body.ownerName !== undefined) updateData.ownerName = body.ownerName;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.phone1 !== undefined) updateData.phone1 = body.phone1;
    if (body.phone2 !== undefined) updateData.phone2 = body.phone2;
    if (body.upiId !== undefined) updateData.upiId = body.upiId;
    if (body.upiApps !== undefined) updateData.upiApps = JSON.stringify(body.upiApps);
    if (body.commodity !== undefined) updateData.commodity = body.commodity;
    if (body.grades !== undefined) updateData.grades = JSON.stringify(body.grades);
    if (body.charges !== undefined) updateData.charges = JSON.stringify(body.charges);
    if (body.adminPin !== undefined) updateData.adminPin = body.adminPin;
    if (body.teamNames !== undefined) updateData.teamNames = JSON.stringify(body.teamNames);
    if (body.createdAt !== undefined) updateData.createdAt = body.createdAt;

    const shop = await prisma.shop.update({ where: { id: shopId }, data: updateData });
    return c.json({ data: parseShop(shop) });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2025") {
      return c.json({ error: { message: "Shop not found", code: "NOT_FOUND" } }, 404);
    }
    console.error('[PUT /api/shops/:shopId]', err);
    return c.json({ error: { message: "Failed to update shop", code: "INTERNAL_ERROR" } }, 500);
  }
});

export { shopsRouter };
