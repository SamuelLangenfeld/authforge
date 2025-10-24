import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;
  const demoPass = await bcrypt.hash("demo", saltRounds);

  // Clean up existing data
  await prisma.membership.deleteMany();
  await prisma.apiCredential.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.role.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  console.log("✓ Cleaned up existing data");

  // Create 10 demo users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "alice@demo.com",
        name: "Alice Johnson",
        password: demoPass,
      },
    }),
    prisma.user.create({
      data: {
        email: "bob@demo.com",
        name: "Bob Smith",
        password: demoPass,
      },
    }),
    prisma.user.create({
      data: {
        email: "charlie@demo.com",
        name: "Charlie Brown",
        password: demoPass,
      },
    }),
    prisma.user.create({
      data: {
        email: "diana@demo.com",
        name: "Diana Prince",
        password: demoPass,
      },
    }),
    prisma.user.create({
      data: {
        email: "eve@demo.com",
        name: "Eve Wilson",
        password: demoPass,
      },
    }),
    prisma.user.create({
      data: {
        email: "frank@demo.com",
        name: "Frank Castle",
        password: demoPass,
      },
    }),
    prisma.user.create({
      data: {
        email: "grace@demo.com",
        name: "Grace Hopper",
        password: demoPass,
      },
    }),
    prisma.user.create({
      data: {
        email: "henry@demo.com",
        name: "Henry Ford",
        password: demoPass,
      },
    }),
    prisma.user.create({
      data: {
        email: "iris@demo.com",
        name: "Iris West",
        password: demoPass,
      },
    }),
    prisma.user.create({
      data: {
        email: "jack@demo.com",
        name: "Jack Ryan",
        password: demoPass,
      },
    }),
  ]);

  const [alice, bob, charlie, diana, eve, frank, grace, henry, iris, jack] =
    users;

  console.log(`✓ Created ${users.length} users`);

  // Create 5 organizations
  const organizations = await Promise.all([
    prisma.organization.create({
      data: {
        name: "Demo Org",
      },
    }),
    prisma.organization.create({
      data: {
        name: "Acme Corp",
      },
    }),
    prisma.organization.create({
      data: {
        name: "TechStart Inc",
      },
    }),
    prisma.organization.create({
      data: {
        name: "Global Solutions",
      },
    }),
    prisma.organization.create({
      data: {
        name: "Innovation Labs",
      },
    }),
  ]);

  const [demoOrg, acmeCorp, techStart, globalSolutions, innovationLabs] =
    organizations;

  console.log(`✓ Created ${organizations.length} organizations`);

  // Create roles
  const [adminRole, userRole] = await Promise.all([
    prisma.role.create({
      data: {
        name: "admin",
      },
    }),
    prisma.role.create({
      data: {
        name: "user",
      },
    }),
  ]);

  console.log("✓ Created roles");

  // Create memberships
  // Each organization must have at least one admin
  // Each user belongs to 1-5 organizations

  const memberships = [
    // Demo Org - Admins: Alice, Bob
    {
      userId: alice.id,
      orgId: demoOrg.id,
      roleId: adminRole.id,
    },
    {
      userId: bob.id,
      orgId: demoOrg.id,
      roleId: adminRole.id,
    },
    {
      userId: charlie.id,
      orgId: demoOrg.id,
      roleId: userRole.id,
    },
    {
      userId: diana.id,
      orgId: demoOrg.id,
      roleId: userRole.id,
    },
    {
      userId: eve.id,
      orgId: demoOrg.id,
      roleId: userRole.id,
    },

    // Acme Corp - Admin: Charlie
    {
      userId: charlie.id,
      orgId: acmeCorp.id,
      roleId: adminRole.id,
    },
    {
      userId: alice.id,
      orgId: acmeCorp.id,
      roleId: userRole.id,
    },
    {
      userId: bob.id,
      orgId: acmeCorp.id,
      roleId: userRole.id,
    },
    {
      userId: frank.id,
      orgId: acmeCorp.id,
      roleId: userRole.id,
    },

    // TechStart Inc - Admins: Diana, Grace
    {
      userId: diana.id,
      orgId: techStart.id,
      roleId: adminRole.id,
    },
    {
      userId: grace.id,
      orgId: techStart.id,
      roleId: adminRole.id,
    },
    {
      userId: bob.id,
      orgId: techStart.id,
      roleId: userRole.id,
    },
    {
      userId: eve.id,
      orgId: techStart.id,
      roleId: userRole.id,
    },
    {
      userId: henry.id,
      orgId: techStart.id,
      roleId: userRole.id,
    },

    // Global Solutions - Admin: Eve
    {
      userId: eve.id,
      orgId: globalSolutions.id,
      roleId: adminRole.id,
    },
    {
      userId: charlie.id,
      orgId: globalSolutions.id,
      roleId: userRole.id,
    },
    {
      userId: iris.id,
      orgId: globalSolutions.id,
      roleId: userRole.id,
    },

    // Innovation Labs - Admin: Frank
    {
      userId: frank.id,
      orgId: innovationLabs.id,
      roleId: adminRole.id,
    },
    {
      userId: diana.id,
      orgId: innovationLabs.id,
      roleId: userRole.id,
    },
    {
      userId: grace.id,
      orgId: innovationLabs.id,
      roleId: userRole.id,
    },
    {
      userId: jack.id,
      orgId: innovationLabs.id,
      roleId: userRole.id,
    },
  ];

  await Promise.all(
    memberships.map((membership) =>
      prisma.membership.create({
        data: membership,
      })
    )
  );

  console.log(`✓ Created ${memberships.length} memberships`);

  // Summary
  console.log("\n========== Seed Data Summary ==========");
  console.log(`Users (${users.length}):`);
  users.forEach((user) => console.log(`  - ${user.name} (${user.email})`));

  console.log(`\nOrganizations (${organizations.length}):`);
  organizations.forEach((org) => console.log(`  - ${org.name}`));

  console.log("\nUser Organization Memberships:");
  console.log(`  - Alice: Demo Org (admin), Acme Corp (user) - 2 orgs`);
  console.log(`  - Bob: Demo Org (admin), Acme Corp (user), TechStart Inc (user) - 3 orgs`);
  console.log(
    `  - Charlie: Demo Org (user), Acme Corp (admin), Global Solutions (user) - 3 orgs`
  );
  console.log(
    `  - Diana: Demo Org (user), TechStart Inc (admin), Innovation Labs (user) - 3 orgs`
  );
  console.log(
    `  - Eve: Demo Org (user), TechStart Inc (user), Global Solutions (admin) - 3 orgs`
  );
  console.log(`  - Frank: Acme Corp (user), Innovation Labs (admin) - 2 orgs`);
  console.log(
    `  - Grace: TechStart Inc (admin), Innovation Labs (user) - 2 orgs`
  );
  console.log(`  - Henry: TechStart Inc (user) - 1 org`);
  console.log(`  - Iris: Global Solutions (user) - 1 org`);
  console.log(`  - Jack: Innovation Labs (user) - 1 org`);

  console.log("\nOrganization Admins:");
  console.log(`  - Demo Org: Alice, Bob`);
  console.log(`  - Acme Corp: Charlie`);
  console.log(`  - TechStart Inc: Diana, Grace`);
  console.log(`  - Global Solutions: Eve`);
  console.log(`  - Innovation Labs: Frank`);

  console.log("\nAll passwords: 'demo'");
  console.log("All emails: @demo.com domain");
  console.log("=========================================\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("✓ Seed completed successfully");
  })
  .catch(async (e) => {
    console.error("✗ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
