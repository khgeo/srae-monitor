// Typical crop growth stages (days after sowing/planting) for estimating the current stage.
// Durations are typical values for Cambodian conditions; if the user enters a harvest date,
// stages are stretched or shrunk to fit sowing → harvest.

export const STAGES = {
  rice_wet: { total: 125, stages: [['emergence', 0], ['seedling', 8], ['tillering', 25], ['booting', 55], ['heading', 80], ['grainfill', 95], ['maturity', 115]] },
  rice_dry: { total: 105, stages: [['emergence', 0], ['seedling', 7], ['tillering', 20], ['booting', 45], ['heading', 65], ['grainfill', 75], ['maturity', 95]] },
  maize: { total: 115, stages: [['emergence', 0], ['vegetative', 10], ['flowering', 55], ['grainfill', 70], ['maturity', 100]] },
  soybean: { total: 95, stages: [['emergence', 0], ['vegetative', 8], ['flowering', 40], ['podfill', 55], ['maturity', 85]] },
  mungbean: { total: 70, stages: [['emergence', 0], ['vegetative', 6], ['flowering', 32], ['podfill', 42], ['maturity', 60]] },
  cassava: { total: 300, stages: [['establishment', 0], ['canopy', 60], ['bulking', 150], ['maturity', 270]] },
  sugarcane: { total: 360, stages: [['germination', 0], ['tillering', 40], ['grandgrowth', 120], ['ripening', 270]] },
  vegetables: { total: 70, stages: [['emergence', 0], ['vegetative', 10], ['flowering', 35], ['maturity', 55]] },
};

export const STAGE_COLORS = {
  emergence: '#c9b38a', seedling: '#b9d98a', tillering: '#7cc26a', vegetative: '#7cc26a', booting: '#3fa45b',
  heading: '#e7c94c', flowering: '#e7c94c', grainfill: '#d9a33a', podfill: '#d9a33a', maturity: '#b5762e',
  establishment: '#c9b38a', canopy: '#7cc26a', bulking: '#3fa45b', germination: '#c9b38a', grandgrowth: '#3fa45b', ripening: '#d9a33a',
};

const DAY = 86400000;

/**
 * @returns null when the crop has no stage table or no sowing date; otherwise
 *  { day, total, stages:[{key,start,end}], current (index or -1 before sowing, stages.length after), harvestIso }
 */
export function growthStage(crop, sowingIso, harvestIso, todayIso) {
  const def = STAGES[crop];
  if (!def || !sowingIso) return null;
  const sow = Date.parse(sowingIso);
  let total = def.total;
  if (harvestIso && Date.parse(harvestIso) > sow + 20 * DAY) total = Math.round((Date.parse(harvestIso) - sow) / DAY);
  const k = total / def.total;
  const stages = def.stages.map(([key, start], i) => ({
    key, start: Math.round(start * k), end: Math.round((i + 1 < def.stages.length ? def.stages[i + 1][1] : def.total) * k),
  }));
  const day = Math.round((Date.parse(todayIso) - sow) / DAY);
  let current = -1;
  if (day >= 0) current = stages.findIndex(s => day < s.end);
  if (day >= total) current = stages.length;
  const harvest = harvestIso || new Date(sow + total * DAY).toISOString().slice(0, 10);
  return { day, total, stages, current, harvestIso: harvest };
}
