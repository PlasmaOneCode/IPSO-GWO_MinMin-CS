"use strict";

// Kerangka bersama untuk seluruh simulasi.
// Fungsi di bawah menghasilkan data yang sama jika seed-nya sama.

function mulberry32(seed) {
  let state = seed >>> 0;
  return function () {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function generateTasks(count, seed = 2026) {
  const random = mulberry32(seed);
  // TODO: Simulasi dapat memakai struktur tugas ini.
  return Array.from({ length: count }, (_, index) => ({
    id: `T${index + 1}`,
    lengthMI: 500 + Math.floor(random() * 4500),
    dependencyIds: []
  }));
}

function generateVms(count, seed = 2026) {
  const random = mulberry32(seed + 101);
  // TODO: Simulasi dapat memakai struktur VM ini.
  return Array.from({ length: count }, (_, index) => ({
    id: `VM${index + 1}`,
    mips: 800 + Math.floor(random() * 1200)
  }));
}

function generateFairDataset(taskCount = 12, vmCount = 4, seed = 2026) {
  // TODO: Panggil generator ini agar kedua simulasi memakai acuan yang adil.
  return {
    seed,
    tasks: generateTasks(taskCount, seed),
    vms: generateVms(vmCount, seed)
  };
}

window.CloudTaskUtils = {
  mulberry32,
  generateTasks,
  generateVms,
  generateFairDataset
};
