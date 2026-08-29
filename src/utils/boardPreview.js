// Normalize board preview sizes so all shapes occupy the same footprint.

export const getPreviewMetrics = (size) => {
  const gridDim = size === 16 ? 4 : 5;
  const target = 252;
  const gap = 5;
  const tileSize = Math.floor((target - (gridDim - 1) * gap) / gridDim);
  return { tileSize, gap, gridDim, target };
};

export const getBoardLabel = (size) => {
  const map = { 16: '4×4', 25: '5×5', 20: 'Donut', 21: 'X' };
  return map[size] || `${size}`;
};
