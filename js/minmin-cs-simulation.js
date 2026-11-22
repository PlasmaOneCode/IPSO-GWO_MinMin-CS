"use strict";

(function () {
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    taskCount: $("#task-count"),
    vmCount: $("#vm-count"),
    seed: $("#seed"),
    iterations: $("#iterations"),
    population: $("#population"),
    rho: $("#rho"),
    rhoValue: $("#rho-value"),
    speed: $("#speed"),
    build: $("#build-btn"),
    reset: $("#reset-btn"),
    play: $("#play-btn"),
    pause: $("#pause-btn"),
    previous: $("#prev-step-btn"),
    next: $("#next-step-btn"),
    phaseLabel: $("#phase-label"),
    phaseTitle: $("#phase-title"),
    phaseDescription: $("#phase-description"),
    phaseProgress: $("#phase-progress"),
    stepBadge: $("#step-badge"),
    orderTag: $("#order-tag"),
    orderView: $("#order-view"),
    ganttTag: $("#gantt-tag"),
    ganttView: $("#gantt-view"),
    populationTag: $("#population-tag"),
    populationView: $("#population-view"),
    convergenceChart: $("#convergence-chart"),
    etcView: $("#etc-view"),
    logCount: $("#log-count"),
    logView: $("#log-view"),
    minminKpi: $("#kpi-minmin"),
    hybridKpi: $("#kpi-hybrid"),
    gainKpi: $("#kpi-gain"),
    stepKpi: $("#kpi-step"),
    iterationKpi: $("#kpi-iteration"),
    resultTable: $("#result-table"),
    status: $("#sim-status")
  };

  let simulation = null;
  let stepIndex = 0;
  let timer = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) return "—";
    return value.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function formatPercent(value) {
    return `${formatNumber(value, 1)}%`;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function makeRandom(seed) {
    // PRNG lokal agar simulasi dapat direproduksi dan tidak mengubah generator dataset bersama.
    let state = seed >>> 0;
    return function random() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(values, random) {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function readConfig() {
    const taskCount = clamp(Math.round(Number(elements.taskCount.value) || 12), 4, 24);
    const vmCount = clamp(Math.round(Number(elements.vmCount.value) || 4), 2, 8);
    const seed = clamp(Math.round(Number(elements.seed.value) || 2026), 1, 999999);
    const iterations = clamp(Math.round(Number(elements.iterations.value) || 15), 1, 50);
    const population = clamp(Math.round(Number(elements.population.value) || 6), 3, 12);
    const rho = clamp(Number(elements.rho.value) || 0.5, 0.1, 1);

    elements.taskCount.value = taskCount;
    elements.vmCount.value = vmCount;
    elements.seed.value = seed;
    elements.iterations.value = iterations;
    elements.population.value = population;
    elements.rho.value = rho;
    elements.rhoValue.textContent = rho.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return { taskCount, vmCount, seed, iterations, population, rho };
  }

  function buildProblem(config) {
    if (!window.CloudTaskUtils || typeof window.CloudTaskUtils.generateFairDataset !== "function") {
      throw new Error("CloudTaskUtils.generateFairDataset tidak ditemukan. Pastikan ../js/common.js dimuat sebelum simulator.");
    }

    // Wajib memakai generator bersama agar seed dan data sama dengan simulasi IPSO-GWO.
    const dataset = window.CloudTaskUtils.generateFairDataset(config.taskCount, config.vmCount, config.seed);
    const etc = dataset.tasks.map((task) => dataset.vms.map((vm) => task.lengthMI / vm.mips));
    return { ...dataset, etc };
  }

  function mapOrderToVms(order, problem) {
    const availability = problem.vms.map(() => 0);
    const assignments = [];

    order.forEach((taskIndex, orderIndex) => {
      let selectedVm = 0;
      let earliestFinish = Number.POSITIVE_INFINITY;

      problem.vms.forEach((vm, vmIndex) => {
        const finish = availability[vmIndex] + problem.etc[taskIndex][vmIndex];
        if (finish < earliestFinish) {
          earliestFinish = finish;
          selectedVm = vmIndex;
        }
      });

      const start = availability[selectedVm];
      const duration = problem.etc[taskIndex][selectedVm];
      const finish = start + duration;
      assignments.push({ taskIndex, orderIndex, vmIndex: selectedVm, start, duration, finish });
      availability[selectedVm] = finish;
    });

    return summarizeSchedule(assignments, availability, problem.vms.length);
  }

  function summarizeSchedule(assignments, loads, vmCount) {
    const makespan = loads.length ? Math.max(...loads) : 0;
    const minLoad = loads.length ? Math.min(...loads) : 0;
    const maxLoad = loads.length ? Math.max(...loads) : 0;
    const averageLoad = vmCount ? loads.reduce((sum, load) => sum + load, 0) / vmCount : 0;
    const loadBalance = makespan > 0 ? averageLoad / makespan : 0;
    return {
      assignments: assignments.slice(),
      loads: loads.slice(),
      makespan,
      minLoad,
      maxLoad,
      loadRange: maxLoad - minLoad,
      loadBalance
    };
  }

  function isBetter(candidate, current) {
    if (!current) return true;
    const epsilon = 1e-9;
    if (candidate.schedule.makespan < current.schedule.makespan - epsilon) return true;
    if (Math.abs(candidate.schedule.makespan - current.schedule.makespan) <= epsilon) {
      if (candidate.schedule.loadBalance > current.schedule.loadBalance + epsilon) return true;
      if (Math.abs(candidate.schedule.loadBalance - current.schedule.loadBalance) <= epsilon) {
        return candidate.schedule.loadRange < current.schedule.loadRange - epsilon;
      }
    }
    return false;
  }

  function evaluateOrder(order, problem, label) {
    return {
      label: label || "Nest",
      order: order.slice(),
      schedule: mapOrderToVms(order, problem)
    };
  }

  function runMinMin(problem) {
    const remaining = new Set(problem.tasks.map((_, index) => index));
    const vmAvailability = problem.vms.map(() => 0);
    const assignments = [];
    const order = [];
    const events = [];

    while (remaining.size > 0) {
      let bestPair = null;

      remaining.forEach((taskIndex) => {
        let taskBest = null;
        problem.vms.forEach((vm, vmIndex) => {
          const ect = problem.etc[taskIndex][vmIndex];
          const finish = vmAvailability[vmIndex] + ect;
          if (!taskBest || finish < taskBest.finish) {
            taskBest = { taskIndex, vmIndex, start: vmAvailability[vmIndex], ect, finish };
          }
        });
        if (!bestPair || taskBest.finish < bestPair.finish) bestPair = taskBest;
      });

      remaining.delete(bestPair.taskIndex);
      order.push(bestPair.taskIndex);
      const assignment = {
        taskIndex: bestPair.taskIndex,
        orderIndex: order.length - 1,
        vmIndex: bestPair.vmIndex,
        start: bestPair.start,
        duration: bestPair.ect,
        finish: bestPair.finish
      };
      assignments.push(assignment);
      vmAvailability[bestPair.vmIndex] = bestPair.finish;
      const partialSchedule = summarizeSchedule(assignments, vmAvailability, problem.vms.length);

      events.push({
        stage: "MIN-MIN",
        phase: "Pemilihan task",
        title: `Langkah ${order.length}: pilih ${problem.tasks[bestPair.taskIndex].id}`,
        description: `${problem.tasks[bestPair.taskIndex].id} memiliki earliest completion time terkecil di antara task yang belum dijadwalkan: ${formatNumber(bestPair.finish)} detik pada ${problem.vms[bestPair.vmIndex].id}. Ketersediaan VM tersebut kemudian diperbarui.`,
        order: order.slice(),
        schedule: partialSchedule,
        population: [],
        iteration: 0,
        detail: { taskIndex: bestPair.taskIndex, vmIndex: bestPair.vmIndex, finish: bestPair.finish }
      });
    }

    const baseline = evaluateOrder(order, problem, "Min-Min");
    return { baseline, events };
  }

  function mutateOrder(order, random, mutationCount) {
    const result = order.slice();
    if (result.length < 2) return result;
    const count = Math.max(1, mutationCount);
    for (let move = 0; move < count; move += 1) {
      const first = Math.floor(random() * result.length);
      let second = Math.floor(random() * result.length);
      if (second === first) second = (second + 1) % result.length;
      const [moved] = result.splice(first, 1);
      result.splice(second, 0, moved);
    }
    return result;
  }

  function laying(parent, problem, random, iteration, maxIterations) {
    const n = parent.order.length;
    const lambda = 0.35;
    const progress = iteration / maxIterations;
    const modificationRadius = clamp(Math.round(lambda * (0.45 + progress) * n), 1, Math.max(1, n - 1));
    const yMin = 2;
    const yMax = 4;
    const offspringCount = yMin + Math.floor(random() * (yMax - yMin + 1));
    const offspring = [];

    for (let childIndex = 0; childIndex < offspringCount; childIndex += 1) {
      const childOrder = parent.order.slice();
      const segmentStart = Math.floor(random() * Math.max(1, n - modificationRadius + 1));
      const segmentEnd = Math.min(n, segmentStart + modificationRadius);
      const segment = shuffle(childOrder.slice(segmentStart, segmentEnd), random);
      childOrder.splice(segmentStart, segment.length, ...segment);

      // Tambahkan satu pertukaran kecil agar offspring tidak identik ketika segmen sangat pendek.
      if (n > 2 && childOrder.every((task, index) => task === parent.order[index])) {
        const first = Math.floor(random() * n);
        const second = (first + 1 + Math.floor(random() * (n - 1))) % n;
        [childOrder[first], childOrder[second]] = [childOrder[second], childOrder[first]];
      }
      offspring.push(evaluateOrder(childOrder, problem, `Offspring ${childIndex + 1}`));
    }

    return { offspring, modificationRadius, offspringCount };
  }

  function immigrate(nest, prime, problem, random, rho) {
    const order = nest.order.slice();
    let changes = 0;

    // Operator diskret: task pada prime order dipindah ke posisi yang sama dengan peluang rho.
    // Semua posisi legal karena dataset demo tidak memiliki dependency antar-task.
    for (let targetPosition = 0; targetPosition < prime.order.length; targetPosition += 1) {
      if (random() > rho) continue;
      const targetTask = prime.order[targetPosition];
      const currentPosition = order.indexOf(targetTask);
      if (currentPosition !== targetPosition) {
        [order[targetPosition], order[currentPosition]] = [order[currentPosition], order[targetPosition]];
        changes += 1;
      }
    }

    return { candidate: evaluateOrder(order, problem, "Immigrant"), changes };
  }

  function copyNest(nest) {
    return { label: nest.label, order: nest.order.slice(), schedule: { ...nest.schedule, assignments: nest.schedule.assignments.slice(), loads: nest.schedule.loads.slice() } };
  }

  function createSimulation(config) {
    const problem = buildProblem(config);
    const random = makeRandom(config.seed + 7919);
    const minMin = runMinMin(problem);
    const timeline = [];

    timeline.push({
      stage: "INPUT",
      phase: "Input dataset",
      title: "Dataset siap: task, VM, dan ETC matrix",
      description: `Dataset seed ${problem.seed} berisi ${problem.tasks.length} task dan ${problem.vms.length} VM. Nilai ETC dihitung dari panjang task (MI) dibagi kecepatan VM (MIPS).`,
      order: [], schedule: summarizeSchedule([], problem.vms.map(() => 0), problem.vms.length), population: [], iteration: 0
    });

    minMin.events.forEach((event) => timeline.push(event));
    const baseline = minMin.baseline;

    // Populasi awal berangkat dari urutan Min-Min lalu didiversifikasi dengan pertukaran urutan.
    // Ini adaptasi untuk satu ETC matrix pada dataset bersama, bukan replikasi banyak matriks workflow.
    const nests = [evaluateOrder(baseline.order, problem, "Nest 1 · Min-Min")];
    for (let index = 1; index < config.population; index += 1) {
      const mutationCount = 1 + (index % Math.max(1, Math.ceil(problem.tasks.length / 5)));
      let candidateOrder = mutateOrder(baseline.order, random, mutationCount);
      let attempts = 0;
      while (nests.some((nest) => nest.order.every((task, position) => task === candidateOrder[position])) && attempts < 8) {
        candidateOrder = mutateOrder(baseline.order, random, mutationCount + attempts + 1);
        attempts += 1;
      }
      nests.push(evaluateOrder(candidateOrder, problem, `Nest ${index + 1}`));
    }
    nests.sort((a, b) => compareNests(a, b));

    let prime = copyNest(nests[0]);
    let bestSoFar = copyNest(prime);
    const convergence = [bestSoFar.schedule.makespan];

    timeline.push({
      stage: "POPULASI",
      phase: "Inisialisasi Cuckoo Search",
      title: "Populasi nest dibentuk dari urutan Min-Min",
      description: `Urutan Min-Min dipakai sebagai solusi dasar. Nest lain dibuat dengan pertukaran posisi task agar pencarian memiliki variasi; seluruh task tetap valid karena tidak ada dependensi pada dataset ini. Prime awal memiliki makespan ${formatNumber(prime.schedule.makespan)} detik.`,
      order: prime.order.slice(), schedule: prime.schedule, population: nests.map(copyNest), iteration: 0, convergence: convergence.slice()
    });

    for (let iteration = 1; iteration <= config.iterations; iteration += 1) {
      const offspring = [];
      let totalOffspring = 0;
      let maxRadius = 0;
      nests.forEach((parent) => {
        const laid = laying(parent, problem, random, iteration, config.iterations);
        totalOffspring += laid.offspringCount;
        maxRadius = Math.max(maxRadius, laid.modificationRadius);
        offspring.push(...laid.offspring);
      });

      const beforeLayingPrime = copyNest(bestSoFar);
      const layingPool = nests.map(copyNest).concat(offspring);
      layingPool.sort(compareNests);
      const selected = layingPool.slice(0, config.population);
      selected.forEach((nest, index) => { nest.label = `Nest ${index + 1}`; });
      nests.splice(0, nests.length, ...selected);
      if (isBetter(nests[0], prime)) prime = copyNest(nests[0]);
      if (isBetter(prime, bestSoFar)) bestSoFar = copyNest(prime);

      timeline.push({
        stage: "LAYING",
        phase: `Iterasi ${iteration} · Laying & seleksi`,
        title: `Laying menghasilkan ${totalOffspring} offspring`,
        description: `Setiap parent menghasilkan Y = 2–4 order baru. Modification radius terbesar pada iterasi ini adalah ${maxRadius} posisi. Offspring dievaluasi, digabung dengan nest lama, lalu nest terburuk dibuang agar ukuran populasi tetap ${config.population}. ${isBetter(bestSoFar, beforeLayingPrime) ? "Prime order diperbarui karena solusi baru lebih baik." : "Belum ada perbaikan prime pada tahap laying ini."}`,
        order: prime.order.slice(), schedule: bestSoFar.schedule, population: nests.map(copyNest), iteration, convergence: convergence.slice(),
        detail: { offspringCount: totalOffspring, modificationRadius: maxRadius }
      });

      let immigrationMoves = 0;
      const primeBeforeImmigration = copyNest(prime);
      const migrated = nests.map((nest) => {
        if (nest.order.every((task, index) => task === prime.order[index])) return copyNest(nest);
        const result = immigrate(nest, prime, problem, random, config.rho);
        immigrationMoves += result.changes;
        return isBetter(result.candidate, nest) ? result.candidate : copyNest(nest);
      });
      migrated.sort(compareNests);
      migrated.forEach((nest, index) => { nest.label = `Nest ${index + 1}`; });
      nests.splice(0, nests.length, ...migrated);
      if (isBetter(nests[0], prime)) prime = copyNest(nests[0]);
      if (isBetter(prime, bestSoFar)) bestSoFar = copyNest(prime);
      convergence.push(bestSoFar.schedule.makespan);

      timeline.push({
        stage: "IMMIGRATION",
        phase: `Iterasi ${iteration} · Immigration`,
        title: `Nest bergerak menuju prime order`,
        description: `Dengan probabilitas ρ = ${formatNumber(config.rho, 2)}, task dipindahkan ke posisi yang sama seperti pada prime order. Terdapat ${immigrationMoves} perubahan posisi pada kandidat immigration sebelum seleksi. Nest hanya menggantikan solusi lama jika kualitasnya lebih baik. ${isBetter(bestSoFar, primeBeforeImmigration) ? "Tahap ini menemukan prime baru." : "Prime terbaik tetap dipertahankan."}`,
        order: prime.order.slice(), schedule: bestSoFar.schedule, population: nests.map(copyNest), iteration, convergence: convergence.slice(),
        detail: { immigrationMoves }
      });
    }

    const hybrid = evaluateOrder(bestSoFar.order, problem, "Min-Min + Cuckoo Search");
    timeline.push({
      stage: "SELESAI",
      phase: "Solusi akhir",
      title: "Jadwal terbaik siap dibandingkan",
      description: `Hybrid memilih task order terbaik dengan makespan ${formatNumber(hybrid.schedule.makespan)} detik. Bandingkan dengan Min-Min awal (${formatNumber(baseline.schedule.makespan)} detik) pada tabel hasil.`,
      order: hybrid.order.slice(), schedule: hybrid.schedule, population: nests.map(copyNest), iteration: config.iterations, convergence: convergence.slice()
    });

    return { config, problem, baseline, hybrid, nests, timeline, convergence };
  }

  function compareNests(first, second) {
    if (first.schedule.makespan !== second.schedule.makespan) return first.schedule.makespan - second.schedule.makespan;
    if (first.schedule.loadBalance !== second.schedule.loadBalance) return second.schedule.loadBalance - first.schedule.loadBalance;
    return first.schedule.loadRange - second.schedule.loadRange;
  }

  function renderEtc(problem) {
    const headings = problem.vms.map((vm) => `<th>${escapeHTML(vm.id)}<br><small>${vm.mips} MIPS</small></th>`).join("");
    const rows = problem.tasks.map((task, taskIndex) => {
      const cells = problem.vms.map((vm, vmIndex) => `<td>${formatNumber(problem.etc[taskIndex][vmIndex], 3)}</td>`).join("");
      return `<tr><td><strong>${escapeHTML(task.id)}</strong><br><small>${task.lengthMI.toLocaleString("id-ID")} MI</small></td>${cells}</tr>`;
    }).join("");
    elements.etcView.innerHTML = `<table class="sim-table"><thead><tr><th>Task</th>${headings}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderOrder(order, focusTask) {
    if (!order || order.length === 0) {
      elements.orderView.innerHTML = `<span class="sim-empty">Urutan task belum terbentuk.</span>`;
      elements.orderTag.textContent = "Belum dijadwalkan";
      return;
    }
    elements.orderTag.textContent = `${order.length} task · sequence`;
    elements.orderView.innerHTML = order.map((taskIndex, position) => {
      const task = simulation.problem.tasks[taskIndex];
      const classes = ["sim-chip", position === 0 ? "entry" : "", taskIndex === focusTask ? "active" : ""].filter(Boolean).join(" ");
      return `<span class="${classes}" title="Posisi ${position + 1}">${escapeHTML(task.id)}</span>`;
    }).join("");
  }

  function renderGantt(schedule, problem) {
    if (!schedule || !schedule.assignments.length) {
      elements.ganttView.innerHTML = `<span class="sim-empty">Belum ada task yang dipetakan ke VM.</span>`;
      elements.ganttTag.textContent = "0 task";
      return;
    }
    const maxTime = Math.max(schedule.makespan, 0.0001);
    elements.ganttTag.textContent = `${schedule.assignments.length} task · ${formatNumber(schedule.makespan)} s`;
    const colors = ["#3157d5", "#167d91", "#7445c5", "#d06a18", "#27845f", "#53647f", "#b44f7c", "#6f7d28"];
    elements.ganttView.innerHTML = problem.vms.map((vm, vmIndex) => {
      const jobs = schedule.assignments.filter((assignment) => assignment.vmIndex === vmIndex);
      const bars = jobs.map((assignment) => {
        const left = (assignment.start / maxTime) * 100;
        const width = (assignment.duration / maxTime) * 100;
        const task = problem.tasks[assignment.taskIndex];
        return `<span class="sim-vm-bar" title="${escapeHTML(task.id)} · ${formatNumber(assignment.start)}–${formatNumber(assignment.finish)} s" style="left:${left}%;width:${Math.max(width, 1)}%;background:${colors[assignment.taskIndex % colors.length]}">${escapeHTML(task.id)}</span>`;
      }).join("");
      return `<div class="sim-vm-row"><span class="sim-vm-name">${escapeHTML(vm.id)}</span><div class="sim-vm-rail">${bars}</div><span class="sim-vm-load">${formatNumber(schedule.loads[vmIndex])} s</span></div>`;
    }).join("");
  }

  function renderPopulation(population, best) {
    if (!population || population.length === 0) {
      elements.populationView.innerHTML = `<span class="sim-empty">Populasi nest menunggu tahap inisialisasi.</span>`;
      elements.populationTag.textContent = "0 nest";
      return;
    }
    elements.populationTag.textContent = `${population.length} nest`;
    const bestOrder = best ? best.order : [];
    elements.populationView.innerHTML = population.map((nest, index) => {
      const isBestNest = nest.order.every((task, position) => task === bestOrder[position]);
      const miniature = nest.order.map((taskIndex) => `<span>${escapeHTML(simulation.problem.tasks[taskIndex].id)}</span>`).join("");
      return `<div class="sim-nest ${isBestNest ? "best" : ""}"><span class="sim-nest-label">${escapeHTML(nest.label || `Nest ${index + 1}`)}${isBestNest ? " ★" : ""}</span><div class="sim-nest-order">${miniature}</div><span class="sim-nest-score">${formatNumber(nest.schedule.makespan)} s</span></div>`;
    }).join("");
  }

  function renderChart(values, baselineValue) {
    if (!values || values.length === 0) {
      elements.convergenceChart.innerHTML = `<text x="12" y="22">Menunggu proses Cuckoo Search.</text>`;
      return;
    }
    const width = 520;
    const height = 142;
    const left = 38;
    const right = 10;
    const top = 12;
    const bottom = 24;
    const all = values.concat(Number.isFinite(baselineValue) ? [baselineValue] : []);
    const min = Math.min(...all) * 0.96;
    const max = Math.max(...all) * 1.04 || 1;
    const x = (index) => left + (values.length === 1 ? 0 : (index / (values.length - 1)) * (width - left - right));
    const y = (value) => top + ((max - value) / Math.max(max - min, 0.0001)) * (height - top - bottom);
    const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
    const baselineY = Number.isFinite(baselineValue) ? y(baselineValue) : null;
    const circles = values.map((value, index) => `<circle cx="${x(index)}" cy="${y(value)}" r="3.2" fill="#3157d5"><title>Iterasi ${index}: ${formatNumber(value)} detik</title></circle>`).join("");
    const grid = [0, 1, 2].map((index) => {
      const gy = top + index * ((height - top - bottom) / 2);
      const label = max - index * ((max - min) / 2);
      return `<line x1="${left}" y1="${gy}" x2="${width - right}" y2="${gy}" stroke="#e7ebf2"/><text x="${left - 7}" y="${gy + 3}" text-anchor="end">${formatNumber(label, 1)}</text>`;
    }).join("");
    elements.convergenceChart.innerHTML = `${grid}${baselineY === null ? "" : `<line x1="${left}" y1="${baselineY}" x2="${width - right}" y2="${baselineY}" stroke="#d06a18" stroke-dasharray="5 4"/><text x="${width - right}" y="${baselineY - 5}" text-anchor="end" fill="#d06a18">Min-Min</text>`}<polyline points="${points}" fill="none" stroke="#3157d5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${circles}<text x="${left}" y="${height - 4}">Iterasi 0</text><text x="${width - right}" y="${height - 4}" text-anchor="end">Iterasi ${values.length - 1}</text>`;
  }

  function renderLog(index) {
    const visible = simulation.timeline.slice(Math.max(0, index - 5), index + 1).reverse();
    elements.logCount.textContent = `${index + 1} aktivitas`;
    elements.logView.innerHTML = visible.map((event, offset) => {
      const actualIndex = index - offset;
      return `<div class="sim-log-item"><time>${String(actualIndex + 1).padStart(2, "0")} · ${escapeHTML(event.stage)}</time><span>${escapeHTML(event.title)}</span></div>`;
    }).join("");
  }

  function renderResults() {
    const baseline = simulation.baseline.schedule;
    const hybrid = simulation.hybrid.schedule;
    const gain = baseline.makespan > 0 ? ((baseline.makespan - hybrid.makespan) / baseline.makespan) * 100 : 0;
    elements.minminKpi.textContent = formatNumber(baseline.makespan);
    elements.hybridKpi.textContent = formatNumber(hybrid.makespan);
    elements.gainKpi.textContent = `${gain >= 0 ? "" : "−"}${formatPercent(Math.abs(gain))}`;
    elements.resultTable.innerHTML = `
      <tr><td><strong>Modified Min-Min</strong></td><td>${formatNumber(baseline.makespan)}</td><td>${formatNumber(baseline.loadBalance * 100, 1)}%</td><td>${formatNumber(baseline.loadRange)}</td></tr>
      <tr><td><strong>Min-Min + Cuckoo Search</strong></td><td class="sim-highlight">${formatNumber(hybrid.makespan)}</td><td>${formatNumber(hybrid.loadBalance * 100, 1)}%</td><td>${formatNumber(hybrid.loadRange)}</td></tr>`;
    elements.status.textContent = gain > 0.0001 ? `Makespan turun ${formatPercent(gain)}` : (gain < -0.0001 ? `Makespan naik ${formatPercent(Math.abs(gain))}` : "Makespan sama; cek load balance");
  }

  function renderStep() {
    if (!simulation) return;
    const event = simulation.timeline[stepIndex];
    const total = simulation.timeline.length;
    const percent = ((stepIndex + 1) / total) * 100;
    elements.phaseLabel.textContent = event.phase;
    elements.phaseTitle.textContent = event.title;
    elements.phaseDescription.textContent = event.description;
    elements.phaseProgress.style.width = `${percent}%`;
    elements.stepBadge.textContent = `Langkah ${stepIndex + 1} / ${total}`;
    elements.stepKpi.textContent = `${stepIndex + 1}/${total}`;
    elements.iterationKpi.textContent = event.iteration ? `Iterasi CS ${event.iteration}` : event.stage;

    const focusTask = event.detail && Number.isInteger(event.detail.taskIndex) ? event.detail.taskIndex : null;
    renderOrder(event.order, focusTask);
    renderGantt(event.schedule, simulation.problem);
    renderPopulation(event.population, event.population.length ? event.population[0] : null);
    renderChart(event.convergence || [], simulation.baseline.schedule.makespan);
    renderLog(stepIndex);

    elements.previous.disabled = stepIndex === 0;
    elements.next.disabled = stepIndex >= total - 1;
    if (stepIndex >= total - 1) stopPlayback();
  }

  function stopPlayback() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    elements.play.disabled = false;
    elements.pause.disabled = true;
  }

  function nextStep() {
    if (!simulation || stepIndex >= simulation.timeline.length - 1) {
      stopPlayback();
      return;
    }
    stepIndex += 1;
    renderStep();
  }

  function startPlayback() {
    if (!simulation) buildSimulation();
    if (timer !== null) return;
    if (stepIndex >= simulation.timeline.length - 1) stepIndex = 0;
    elements.play.disabled = true;
    elements.pause.disabled = false;
    renderStep();
    timer = window.setInterval(nextStep, Number(elements.speed.value) || 800);
  }

  function buildSimulation() {
    stopPlayback();
    try {
      const config = readConfig();
      simulation = createSimulation(config);
      stepIndex = 0;
      renderEtc(simulation.problem);
      renderResults();
      renderStep();
      elements.status.textContent = "Simulasi berhasil dibuat";
    } catch (error) {
      console.error(error);
      elements.phaseLabel.textContent = "ERROR";
      elements.phaseTitle.textContent = "Simulasi tidak dapat dibuat";
      elements.phaseDescription.textContent = error.message;
      elements.status.textContent = "Periksa konfigurasi";
    }
  }

  function resetSimulation() {
    stopPlayback();
    if (!simulation) {
      buildSimulation();
      return;
    }
    stepIndex = 0;
    renderStep();
  }

  elements.rho.addEventListener("input", () => {
    elements.rhoValue.textContent = Number(elements.rho.value).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });
  elements.build.addEventListener("click", buildSimulation);
  elements.reset.addEventListener("click", resetSimulation);
  elements.play.addEventListener("click", startPlayback);
  elements.pause.addEventListener("click", stopPlayback);
  elements.previous.addEventListener("click", () => {
    stopPlayback();
    stepIndex = Math.max(0, stepIndex - 1);
    renderStep();
  });
  elements.next.addEventListener("click", () => {
    stopPlayback();
    nextStep();
  });
  elements.speed.addEventListener("change", () => {
    if (timer !== null) {
      stopPlayback();
      startPlayback();
    }
  });

  buildSimulation();
})();
