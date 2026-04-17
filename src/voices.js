/**
 * ElevenLabs voice_id values for the dropdown. Edit labels to match names in your library.
 */
const IDS = [
  "Astm9kBg2GoJpvmLehN0",
  "9B6qQdh3qf1JUYTPPqV7",
  "YzYhZnqss746aWqRJC9H",
  "XCwC1YU8b4SGMtnX5Qwr",
  "psS9TrEzDPCk10harX8d",
  "vqmq3bd63istIYHZxsYV",
  "QrwRvbpswBgwmOulozTX",
  "loJfO8jlTj6khCTCwavv",
  "Ek1n0msUbTIdejEKyNMW",
  "266TYS22fdxXLTfICz7W",
  "Uo7HdPMCyPjRirKwQKtd",
  "YFPFGVR1mImNYR9wDTpM",
  "0F814WpHip5Wll1X8d5d",
  "ZtkBZMkcwNBEP6zu1N7K",
  "E7HyWrwFtIWIOHyBnzr3",
  "cyy2EulTZZtaeMqQob9M",
];

function shortLabel(id, index) {
  const n = String(index + 1).padStart(2, "0");
  const hint = id.length > 14 ? `${id.slice(0, 14)}…` : id;
  return `Voice ${n} · ${hint}`;
}

export const VOICES = IDS.map((id, i) => ({ id, label: shortLabel(id, i) }));
