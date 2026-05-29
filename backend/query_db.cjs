const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("=== SHOPS ===");
  const shops = await prisma.shop.findMany();
  for (const shop of shops) {
    console.log({
      id: shop.id,
      firmName: shop.firmName,
      ownerName: shop.ownerName,
      phone1: shop.phone1,
      adminPin: shop.adminPin
    });
  }

  console.log("\n=== MEMBERS ===");
  const members = await prisma.member.findMany();
  for (const member of members) {
    console.log({
      id: member.id,
      shopId: member.shopId,
      name: member.name,
      phone: member.phone,
      pin: member.pin,
      role: member.role
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
