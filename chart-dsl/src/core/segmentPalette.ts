/**
 * Палитра цветов по умолчанию для сегментов Pie/Doughnut (различимые цвета).
 * Используется когда датасет приходит с одним цветом (например из bar chart) и нужен массив по одному цвету на сегмент.
 */
export const PIE_DEFAULT_SEGMENT_PALETTE: string[] = [
  '#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de',
  '#5856d6', '#00c7be', '#ff2d55', '#a2845e', '#32ade6',
  '#e6815f', '#8e8e93'
];

/**
 * Вернуть массив из N цветов для сегментов круговой диаграммы.
 * Если segmentCount === 0, возвращает [].
 * firstSegmentColor: первый сегмент получит этот цвет (связь с полем «Внешний вид»), остальные — из палитры.
 */
export function getSegmentColorsForPie(segmentCount: number, firstSegmentColor?: string): string[] {
  if (segmentCount <= 0) return [];
  const out: string[] = [];
  if (segmentCount >= 1 && firstSegmentColor) {
    out.push(firstSegmentColor);
  }
  const start = out.length;
  for (let i = start; i < segmentCount; i++) {
    out.push(PIE_DEFAULT_SEGMENT_PALETTE[(i - start) % PIE_DEFAULT_SEGMENT_PALETTE.length]);
  }
  return out;
}
