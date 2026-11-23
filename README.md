# AeroGlide 3D

Game pesawat 3D ringan berbasis Three.js dengan kontrol giroskop kiri-kanan, power-up (Turbo & Perisai), tema lingkungan acak, musik & efek suara prosedural, mode latihan, papan peringkat daring, serta dukungan aksesibilitas lengkap.

## Build Otomatis di GitHub (Web & Android APK)

Repositori ini sudah dilengkapi workflow **GitHub Actions** (`.github/workflows/build.yml`) yang berjalan otomatis setiap kali Anda melakukan `push` ke branch `main` atau `master` (atau dijalankan manual lewat tab **Actions -> Run workflow**).

Workflow akan menjalankan dua tahap:
1. **`build-web`**: Memeriksa TypeScript (`npm run lint`), membangun bundle produksi (`npm run build`), dan mengunggah artefak `aeroglide-web-dist`.
2. **`build-android-apk`**: Membungkus hasil build menggunakan **Capacitor** dan mengompilasinya dengan **Gradle** menjadi file **`app-debug.apk`** (dapat diunduh langsung dari bagian *Artifacts* di halaman GitHub Actions dengan nama `AeroGlide-3D-Android-APK`).

### Opsional: Menghubungkan APK ke Server Papan Peringkat Online
Secara default, versi web memanggil `/api/leaderboard` di domain yang sama. Jika Anda ingin APK Android terhubung ke server papan peringkat yang sudah di-deploy:
1. Buka repositori GitHub Anda -> **Settings** -> **Secrets and variables** -> **Actions** -> tab **Variables**.
2. Tambahkan variabel `VITE_API_BASE_URL` berisi URL server backend Anda (contoh: `https://nama-server-anda.run.app`).
3. Jalankan ulang workflow build APK.

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
npm run start
```
