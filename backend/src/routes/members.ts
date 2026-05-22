import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../lib/prisma";

export const membersRouter = new Hono();

// Get all members for a shop
membersRouter.get("/:shopId", async (c) => {
  const shopId = c.req.param("shopId");
  
  try {
    const members = await prisma.member.findMany({
      where: { shopId },
      orderBy: { createdAt: "asc" }
    });
    return c.json({ data: members });
  } catch (error) {
    console.error("Error fetching members:", error);
    return c.json({ error: { message: "Failed to fetch members", code: "INTERNAL_ERROR" } }, 500);
  }
});

// Update or Create a member
const memberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone number is required"),
  pin: z.string().min(4, "PIN must be at least 4 digits"),
  role: z.string().default("MEMBER"),
});

membersRouter.post("/:shopId", zValidator("json", memberSchema), async (c) => {
  const shopId = c.req.param("shopId");
  const data = c.req.valid("json");
  
  try {
    let member;
    if (data.id) {
      member = await prisma.member.update({
        where: { id: data.id },
        data: {
          name: data.name,
          phone: data.phone,
          pin: data.pin,
          role: data.role,
        }
      });
    } else {
      member = await prisma.member.create({
        data: {
          shopId,
          name: data.name,
          phone: data.phone,
          pin: data.pin,
          role: data.role,
          createdAt: Date.now(),
        }
      });
    }
    
    return c.json({ data: member }, 201);
  } catch (error) {
    console.error("Error saving member:", error);
    return c.json({ error: { message: "Failed to save member", code: "INTERNAL_ERROR" } }, 500);
  }
});

membersRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await prisma.member.delete({
      where: { id }
    });
    return c.json({ data: { message: "Member deleted successfully" } });
  } catch (error) {
    console.error("Error deleting member:", error);
    return c.json({ error: { message: "Failed to delete member", code: "INTERNAL_ERROR" } }, 500);
  }
});

// Login via phone and pin
const loginSchema = z.object({
  shopId: z.string(),
  phone: z.string(),
  pin: z.string(),
});

membersRouter.post("/auth/login", zValidator("json", loginSchema), async (c) => {
  const data = c.req.valid("json");
  
  try {
    const member = await prisma.member.findFirst({
      where: {
        shopId: data.shopId,
        phone: data.phone,
        pin: data.pin
      }
    });
    
    if (!member) {
      return c.json({ error: { message: "Invalid phone number or PIN", code: "UNAUTHORIZED" } }, 401);
    }
    
    return c.json({ data: member });
  } catch (error) {
    console.error("Error during member login:", error);
    return c.json({ error: { message: "Failed to authenticate member", code: "INTERNAL_ERROR" } }, 500);
  }
});
