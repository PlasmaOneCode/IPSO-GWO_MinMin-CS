# Strategi Optimasi Komputasi Awan

Situs statis pembelajaran untuk membahas dua algoritma hybrid penjadwalan cloud:

- IPSO + GWO (Improved Particle Swarm Optimization + Grey Wolf Optimizer)
- Min-Min + Cuckoo Search (EMMCA)

## Situs live

Placeholder: `https://[username].github.io/[nama-repo]/`

Ganti `[username]` dan `[nama-repo]` setelah repo dipublikasikan.

## Struktur folder

```text
index.html
css/style.css
js/common.js
ipso-gwo/
  index.html
  simulasi.html
minmin-cs/
  index.html
  simulasi.html
perbandingan/
  index.html
assets/img/
README.md
CONTRIBUTING.md
.gitignore
```

## Menjalankan secara lokal

### Python

```powershell
python -m http.server 8000
```

Buka `http://localhost:8000/`.

### Live Server

Buka folder repo di VS Code, lalu gunakan ekstensi Live Server dan pilih **Open with Live Server**.

## Deploy ke GitHub Pages

1. Push branch `main` ke GitHub.
2. Buka **Settings → Pages** pada repo.
3. Pada **Build and deployment**, pilih **Deploy from a branch**.
4. Pilih branch `main` dan folder `/ (root)`.
5. Simpan, lalu tunggu GitHub menghasilkan URL situs.

## Referensi

- Awad, S., Gamal, M., El Salam, K. A., & Abdel-Kader, R. F. (2026). “Efficient workflow scheduling in fog-cloud collaboration using a hybrid IPSO-GWO algorithm.” *Scientific Reports*. https://pubmed.ncbi.nlm.nih.gov/41617810/
- Choudhary, A., & Rajak, R. (2026). “EMMCA: enhancing modified Min-Min using cuckoo search algorithm in cloud computing.” *Evolving Systems, 17*, 15. https://doi.org/10.1007/s12530-025-09768-9
