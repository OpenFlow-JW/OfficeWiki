export function hasFlag(argv, flag) {
  return argv.includes(flag);
}

export function getFlagValue(argv, flag, fallback = null) {
  const idx = argv.indexOf(flag);
  if (idx === -1) return fallback;
  const v = argv[idx + 1];
  if (!v || v.startsWith('-')) return fallback;
  return v;
}
