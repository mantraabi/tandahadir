# TandaHadir

Sistem absensi sekolah berbasis QR code & tanda tangan dokumen elektronik.

## Fitur

- **Admin**: Manajemen user, kelas, siswa, dokumen, laporan, pengaturan sekolah
- **Guru**: Dashboard, sesi absensi QR, dokumen tanda tangan
- **Public**: Scan QR untuk absensi siswa, tanda tangan dokumen via token

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript, Tailwind CSS 4
- Prisma + PostgreSQL
- NextAuth v5 (Credentials)
- react-qr-code, react-signature-canvas, recharts, xlsx

## Setup Local

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env, isi DATABASE_URL & AUTH_SECRET

# 3. Setup database
npx prisma migrate dev
npm run db:seed

# 4. Run dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Deploy ke Vercel

### 1. Database

Siapkan PostgreSQL (rekomendasi: [Neon](https://neon.tech), [Supabase](https://supabase.com), atau [Railway](https://railway.app)). Salin connection string-nya.

### 2. Deploy

1. Push repo ke GitHub
2. Import project di [vercel.com/new](https://vercel.com/new)
3. Set environment variables:
   - `DATABASE_URL` — pooler connection (port 6543) + `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` — direct connection (port 5432) untuk migrations
   - `AUTH_SECRET` — generate via `npx auth secret`
   - `NEXT_PUBLIC_APP_URL` — URL deployment (mis. `https://tandahadir.vercel.app`)
4. Deploy

### 3. Setelah Deploy Pertama

Jalankan migrasi & seed dari local:

```bash
# Set DATABASE_URL ke production di .env, lalu:
npx prisma migrate deploy
npm run db:seed
```

Atau pakai Vercel CLI dengan production env.

## Environment Variables

Lihat [`.env.example`](./.env.example) untuk daftar lengkap.

## Routing

| Path | Akses | Fungsi |
|------|-------|--------|
| `/login`, `/forgot-password` | Public | Auth |
| `/admin/*` | ADMIN | Manajemen sistem |
| `/teacher/*` | TEACHER, ADMIN | Dashboard guru |
| `/scan/[qrCode]` | Public | Absensi siswa via QR |
| `/sign/[token]` | Public | Tanda tangan dokumen |
| `/unauthorized` | Auth | 403 page |
