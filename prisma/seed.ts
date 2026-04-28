// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "Admin1234!";

async function main() {
  console.log("🌱 Memulai seed data TandaHadir...\n");

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // ── 1. LICENSE ─────────────────────────────────
  console.log("🔑 Membuat license trial...");
  await prisma.license.upsert({
    where: { key: "TRIAL-DEV-2026" },
    update: {},
    create: {
      key: "TRIAL-DEV-2026",
      schoolName: "SMP Nusantara Jaya",
      status: "TRIAL",
      trialEndsAt: addDays(new Date(), 14),
    },
  });
  console.log("   ✅ License trial aktif (14 hari)\n");

  // ── 2. SCHOOL PROFILE ──────────────────────────
  console.log("🏫 Membuat profil sekolah...");
  await prisma.school.upsert({
    where: { id: "school-001" },
    update: {},
    create: {
      id: "school-001",
      name: "SMP Nusantara Jaya",
      address: "Jl. Pendidikan No. 12, Surakarta, Jawa Tengah",
      phone: "0271-123456",
      email: "info@smpnusantara.sch.id",
      principal: "Drs. Bambang Supriyadi, M.Pd",
      npsn: "20328123",
    },
  });
  console.log("   ✅ SMP Nusantara Jaya\n");

  // ── 3. USERS ───────────────────────────────────
  console.log("👥 Membuat users...");

  const admin = await prisma.user.upsert({
    where: { email: "admin@smpnusantara.sch.id" },
    update: {},
    create: {
      email: "admin@smpnusantara.sch.id",
      name: "Budi Santoso",
      password: hashedPassword,
      role: "ADMIN",
      phone: "08123456789",
    },
  });
  console.log(`   ✅ ${admin.name} — Admin`);

  const teacher1 = await prisma.user.upsert({
    where: { email: "siti@smpnusantara.sch.id" },
    update: {},
    create: {
      email: "siti@smpnusantara.sch.id",
      name: "Siti Rahayu, S.Pd",
      password: hashedPassword,
      role: "TEACHER",
      phone: "08234567890",
    },
  });
  console.log(`   ✅ ${teacher1.name} — Guru`);

  const teacher2 = await prisma.user.upsert({
    where: { email: "ahmad@smpnusantara.sch.id" },
    update: {},
    create: {
      email: "ahmad@smpnusantara.sch.id",
      name: "Ahmad Fauzi, S.Pd",
      password: hashedPassword,
      role: "TEACHER",
      phone: "08345678901",
    },
  });
  console.log(`   ✅ ${teacher2.name} — Guru`);

  const teacher3 = await prisma.user.upsert({
    where: { email: "dewi@smpnusantara.sch.id" },
    update: {},
    create: {
      email: "dewi@smpnusantara.sch.id",
      name: "Dewi Lestari, S.Pd",
      password: hashedPassword,
      role: "TEACHER",
      phone: "08456789012",
    },
  });
  console.log(`   ✅ ${teacher3.name} — Guru`);

  // ── 4. KELAS ───────────────────────────────────
  console.log("\n📚 Membuat kelas...");

  const classesData = [
    { id: "class-7a", name: "VII A", grade: "7", teacherId: teacher1.id },
    { id: "class-7b", name: "VII B", grade: "7", teacherId: teacher2.id },
    { id: "class-8a", name: "VIII A", grade: "8", teacherId: teacher3.id },
    { id: "class-8b", name: "VIII B", grade: "8", teacherId: teacher1.id },
    { id: "class-9a", name: "IX A",   grade: "9", teacherId: teacher2.id },
  ];

  const classes = [];
  for (const cls of classesData) {
    const created = await prisma.class.upsert({
      where: { id: cls.id },
      update: {},
      create: cls,
    });
    classes.push(created);
    console.log(`   ✅ Kelas ${created.name}`);
  }

  // ── 5. SISWA ───────────────────────────────────
  console.log("\n🧑‍🎓 Membuat siswa...");

  const maleNames = [
    "Rizki Pratama", "Doni Setiawan", "Fajar Nugroho",
    "Hendra Wijaya", "Ivan Kusuma", "Joko Susilo",
    "Lutfi Hakim", "Malik Ibrahim", "Nando Saputra",
    "Oscar Adi", "Putra Mandala", "Qori Ramadhani",
    "Reza Ananda", "Sandy Kurnia", "Taufik Hidayat",
  ];
  const femaleNames = [
    "Ayu Wandira", "Bella Safitri", "Citra Dewi",
    "Dina Rahayu", "Eka Permata", "Fira Aulia",
    "Gita Purnama", "Hani Aisyah", "Indah Lestari",
    "Jihan Nabila", "Kiki Amelia", "Lisa Oktavia",
    "Mira Santika", "Nita Sari", "Olivia Putri",
  ];

  let maleIdx = 0;
  let femaleIdx = 0;
  let nisnCounter = 10000000001;

  for (const cls of classes) {
    for (let i = 0; i < 6; i++) {
      const isMale = i % 2 === 0;
      const name = isMale ? maleNames[maleIdx++] : femaleNames[femaleIdx++];
      const nisn = String(nisnCounter++);

      await prisma.student.upsert({
        where: { nisn },
        update: {},
        create: {
          nisn,
          name,
          gender: isMale ? "MALE" : "FEMALE",
          parentName: `Orang Tua ${name.split(" ")[0]}`,
          parentPhone: `08${Math.floor(100000000 + Math.random() * 900000000)}`,
          classId: cls.id,
          status: "ACTIVE",
        },
      });
    }
    console.log(`   ✅ 6 siswa di kelas ${cls.name}`);
  }

  // ── SUMMARY ────────────────────────────────────
  console.log("\n" + "=".repeat(50));
  console.log("✅ SEED SELESAI!");
  console.log("=".repeat(50));
  console.log("\n📊 Data:");
  console.log("   • 1 License trial (14 hari)");
  console.log("   • 1 Profil sekolah");
  console.log("   • 1 Admin + 3 Guru");
  console.log("   • 5 Kelas, 30 Siswa");
  console.log(`\n🔑 Login (password: ${DEFAULT_PASSWORD})`);
  console.log("   ADMIN  : admin@smpnusantara.sch.id");
  console.log("   GURU 1 : siti@smpnusantara.sch.id");
  console.log("   GURU 2 : ahmad@smpnusantara.sch.id");
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });