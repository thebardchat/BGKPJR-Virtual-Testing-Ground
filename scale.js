/** BGKPJR scale-law engine — mirrors Core-Simulations/simulation/src/scale_laws.py */
export const G_EARTH = 9.80665;
export const MACH_1_SL = 340.29;
export const ISA_RHO0 = 1.225;

export const PATENT = {
  machMin: 3, machMax: 5, gMax: 5,
  inclMin: 15, inclMax: 45, pAtmMin: 0.05, pAtmMax: 0.2,
};

export const VG = { L: 37000, v: 1700, n: 4, theta: 15, qMPa: 1.77 };

export const PRESETS = {
  RIFLE: { L: 1.5, D: 0.02, m: 0.02, label: "RIFLE · 1.5 m long barrel" },
  BENCH: { L: 10, D: 0.05, m: 0.2, label: "BENCH · 10 m lab tube" },
  FIELD: { L: 200, D: 0.3, m: 50, label: "FIELD · 200 m outdoor" },
  KM: { L: 2000, D: 1.0, m: 500, label: "KM · 2 km civil-lite" },
  VACUUMGATE: { L: 37000, D: 10, m: 85000, label: "VACUUMGATE · 37 km canon" },
};

export function solve({
  L, mode = "lock_G", n = 4, v = null, mach = null,
  theta = 15, D = 0.02, sHat = 0.5, m = 0.02, eta = 0.6, rho = ISA_RHO0,
}) {
  const flags = [];
  let a, vOut, nOut = n;
  if (mode === "lock_G") {
    a = n * G_EARTH;
    vOut = Math.sqrt(2 * a * L);
  } else if (mode === "lock_Mach") {
    vOut = mach * MACH_1_SL;
    a = (vOut * vOut) / (2 * L);
    nOut = a / G_EARTH;
  } else {
    vOut = v;
    a = (vOut * vOut) / (2 * L);
    nOut = a / G_EARTH;
  }
  const machOut = vOut / MACH_1_SL;
  const t = a > 0 ? vOut / a : Infinity;
  const s = sHat * D;
  const Nc = s > 0 ? Math.max(1, Math.floor(L / s)) : 0;
  const Ek = 0.5 * m * vOut * vOut;
  const Ewall = eta > 0 ? Ek / eta : Infinity;
  const qe = 0.5 * rho * vOut * vOut;

  if (machOut < PATENT.machMin) flags.push("mach_below_patent_band_expected_at_small_L");
  if (nOut > PATENT.gMax + 1e-9) flags.push("FAIL_g_exceeds_patent");
  if (theta < PATENT.inclMin || theta > PATENT.inclMax) flags.push("FAIL_inclination_outside_patent");
  if (qe < 0.01 * VG.qMPa * 1e6) flags.push("muzzle_q_dissimilar_vs_VG_expected");

  const nCheck = (vOut * vOut) / (2 * L) / G_EARTH;
  if (Math.abs(nCheck - nOut) / Math.max(nOut, 1e-9) > 0.01) flags.push("FAIL_kinematic_identity");

  const patentPass = !flags.some((f) => f.startsWith("FAIL_"));
  return { L, v: vOut, mach: machOut, n: nOut, a, t, theta, D, s, Nc, m, Ek, Ewall, qe, patentPass, flags };
}

export function fmt(n, d = 1) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(d) + " G";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(d) + " M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(d) + " k";
  return n.toFixed(d);
}
