import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminName = process.env.ADMIN_NAME ?? "مدیر سایت";
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPhone = process.env.ADMIN_PHONE ?? "09120000000";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123456";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.account.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const plans = await prisma.$transaction([
    prisma.plan.create({
      data: {
        name: "۲۰ گیگ / ۳۰ روز",
        price: 9.99,
      },
    }),
    prisma.plan.create({
      data: {
        name: "۵۰ گیگ / ۶۰ روز",
        price: 19.99,
      },
    }),
    prisma.plan.create({
      data: {
        name: "نامحدود / ۹۰ روز",
        price: 29.99,
      },
    }),
  ]);

  await prisma.account.createMany({
    data: [
      {
        planId: plans[0].id,
        config: "vmess://demo-account-001",
      },
      {
        planId: plans[0].id,
        config: "vmess://demo-account-002",
      },
      {
        planId: plans[1].id,
        config: "vless://demo-account-003",
      },
      {
        planId: plans[1].id,
        config: "vless://demo-account-004",
      },
      {
        planId: plans[2].id,
        config: "trojan://demo-account-005",
      },
      {
        planId: plans[2].id,
        config: "trojan://demo-account-006",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
