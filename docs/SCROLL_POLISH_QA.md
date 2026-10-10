# Scroll polish — 11 Oktober 2026 (WIB)

Baseline: commit ed7d0dc dari https://github.com/rahmat-369/My-portofolio.

Revisi memakai source stabil yang di-clone, bukan membangun ulang situs dari awal. Controller `useExperience.ts`, stylesheet `glass.css`, hero, orbit, aset, data, API, dependency, env, dan konfigurasi Vercel tidak diubah. Animasi penutup hero menuju bagian 01 tetap memakai controller asli.

## Gerak baru

- About: heading menahan posisi pada desktop, prose berjalan pada tiga kedalaman.
- Journey: camera sweep mengitari ponsel dan depth wave pada modul; pilihan chapter tetap manual.
- Stack teknologi: penampang kaca membuka lalu merapat menurut scroll, tetap dapat dipisahkan lewat tombol dan diputar melalui alur Source/Build/Deploy.
- My Waifu: kartu membentuk fan dan kembali sejajar di posisi baca. Swipe horizontal native tetap tersedia.
- Banner video: sedikit camera tilt pada keseluruhan frame. Kings & Queen: caption/frame bergerak, gambar utuh tetap memakai contain.
- Relay: narasi dan panel chat menyeimbangkan arah gerak; panel diam saat input difokuskan.
- Jejaring/komunitas: dua arah gerak antarbaris dan depth bergantian; detail terbuka tetap datar.
- Ethos: dua baris teks berjalan berlawanan arah. Rating/footer: panel menutup alur secara bertahap; form tetap diam saat difokuskan.

Semua gerak langsung berasal dari posisi scroll native, bisa dibalik, dan tidak menyembunyikan konten. Tidak menambah scroll hijacking atau spacer panjang. Mobile memiliki amplitude lebih kecil.

## Screenshot

Panah shelf kini sejajar dalam satu baris dengan target 44px. Tombol hapus pencarian hilang saat input kosong. VisitButton/link Website menggunakan ukuran, border, dan jarak yang konsisten. Stack/CTA/status pada modal diberi pemisahan yang rapi. Semua panel splash berpusat pada avatar, dengan offset layer kecil. Durasi dan progres splash yang sudah stabil tidak diubah.

## Verifikasi

TypeScript, build Vite/prerender, dan 55 tes berhasil. Tiga tes baru memeriksa posisi baca, reversibilitas, batas mobile, kontinuitas, dan deep link/lompatan frame. Tes geometri lama tetap ada sebagai riwayat, bukan bukti layout CSS aktif.

Audit byte-identik, konten, ID, referensi aset, dan ukuran bundle ada di SCROLL_POLISH_AUDIT.json. Controller baru hanya mengantre satu RAF ketika ada scroll/resize, memakai geometri cache, mengubah CSS variables tanpa React setState per frame, dan berhenti ketika tab tersembunyi/splash/dialog aktif. Cleanup mematikan callback tertunda. Reduced motion/global pause menonaktifkan controller.

Browser yang didukung tidak tersedia, sehingga FPS/perangkat nyata dan screenshot runtime belum diuji. Tidak ada klaim deployment baru. Repo remote belum dipush.
