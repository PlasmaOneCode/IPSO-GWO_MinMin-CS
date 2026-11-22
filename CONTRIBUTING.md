# Aturan kontribusi

## Batasan edit

- `ipso-gwo/` untuk materi dan simulasi IPSO + GWO
- `minmin-cs/` untuk materi dan simulasi Min-Min + Cuckoo Search
- `perbandingan/` untuk analisis dan contoh penerapan
- `css/style.css` dan `js/common.js` dipakai bersama dan perlu diuji seluruh halaman setelah perubahan

## Alur Git

1. Sebelum mulai, ambil pembaruan terbaru:

```powershell
git pull
```

2. Buat branch sesuai nama fitur:

```text
bagian/nama-fitur
```

Contoh:

```text
simulasi/simulasi-ipso-gwo
perbandingan/perbandingan-algoritma
```

3. Sebelum `git push`, pastikan branch sudah berisi commit yang teruji secara lokal.

## Format pesan commit

Gunakan format ringkas:

```text
bagian: perubahan utama
```

Contoh:

- `ipso-gwo: lengkapi penjelasan IPSO`
- `simulasi-cs: tambahkan animasi penugasan`
- `css: perbaiki navbar pada layar kecil`

## Pull Request

1. Push branch ke GitHub.
2. Buat Pull Request ke branch `main`.
3. Isi ringkasan perubahan dan daftar halaman yang diuji.
4. Lampirkan tangkapan layar jika ada perubahan tampilan.
