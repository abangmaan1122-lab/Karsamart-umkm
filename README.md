# KarsaMart (`karsamart.id`) — Web Toko UMKM, Kasir POS & Mini-CMS

Aplikasi web terpadu berbasis **HTML5, CSS3 (Tailwind CSS), dan Vanilla JavaScript** dengan arsitektur file modular untuk mendukung operasional toko ritel dan UMKM.

## Fitur Utama
1. **Toko Online Publik:** Katalog responsif, filter kategori, pencarian produk *real-time*, keranjang belanja *slide-over*, serta *checkout* simulasi pembayaran online maupun pemesanan otomatis via **WhatsApp**.
2. **Terminal Kasir (POS):** Perhitungan diskon (`%`), sakelar **PPN 11%**, dukungan pembayaran **Tunai** (hitung kembalian otomatis), **QRIS**, dan **Transfer Virtual Account**, serta cetak struk termal.
3. **Mini-CMS Produk & Stok:** Tambah, ubah, dan hapus data produk (CRUD) dengan sinkronisasi stok langsung ke etalase toko dan kasir.
4. **Laporan & Analitik:** Ringkasan omzet, jumlah faktur, peringatan stok menipis (`< 5` unit), grafik pendapatan per kategori, dan cetak ulang struk.
5. **Keamanan & Database:** Kontrol akses berbasis peran (**RBAC**: Publik, Kasir, Admin), sanitasi anti-XSS (`escapeHTML`), *password hashing*, serta ekspor *backup* database `.json`.

## Akun Demo Sistem
* **Admin (Akses Penuh):** Username `admin` | Password `admin123`
* **Kasir (POS & Laporan):** Username `kasir` | Password `kasir123`

## Cara Menjalankan Secara Lokal
1. Simpan semua file (`index.html`, `style.css`, `database.js`, `app.js`, `README.md`) dalam satu folder.
2. Buka file `index.html` langsung di browser modern (Chrome, Edge, Firefox, atau Safari).