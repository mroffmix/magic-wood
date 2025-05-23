export function shiftPath(d: string, dx: number, dy: number): string {
    /* ① — токенизатор: команда ИЛИ число/NaN/Infinity */
    const TOKEN = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d*\.)?\d+(?:[eE][+-]?\d+)?)|([+-]?(?:Infinity|NaN))/g;
  
    const tokens: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = TOKEN.exec(d)) !== null) tokens.push(m[0]);
  
    /* ② — сколько чисел ждём после каждой команды */
    const count: Record<string, number> = {
      H: 1, V: 1,
      M: 2, L: 2, T: 2,
      S: 4, Q: 4,
      C: 6, A: 7,
      Z: 0
    };
  
    const out: string[] = [];
    let cmd = '';                   // последняя команда
    for (let i = 0; i < tokens.length;) {
      const t = tokens[i];
  
      /* новая команда */
      if (/^[A-Za-z]$/.test(t)) {
        cmd = t;
        out.push(t);
        i++;
        continue;
      }
  
      const ABS = cmd.toUpperCase();      // та же команда, но в верхнем регистре
      const n   = count[ABS] ?? 0;
      if (n === 0 || i + n > tokens.length) break;   // нечего парсить
  
      /* координаты текущего кортежа */
      const nums = tokens.slice(i, i + n).map(parseFloat);
  
      /* ③ — смещаем ТОЛЬКО абсолютные команды */
      if (cmd === ABS) {
        if (ABS === 'H')            nums[0] += dx;
        else if (ABS === 'V')       nums[0] += dy;
        else if (ABS === 'A') {     nums[5] += dx;  nums[6] += dy; }
        else {
          for (let k = 0; k < nums.length; k += 2) {
            nums[k]     += dx;
            if (nums[k+1] !== undefined) nums[k+1] += dy;
          }
        }
      }
  
      out.push(nums.map(v => Number.isFinite(v) ? v : 0).join(' ')); // NaN → 0
      i += n;
    }
  
    return out.join(' ').replace(/\s+/g, ' ').trim();
  }
  

// Функция для вычисления центра path (работает для простых M/L path)
export function getPathCenter(path: string, dx = 0, dy = 0) {
  // Извлекаем все числа (координаты) из path
  const coords = path.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < coords.length; i += 2) {
    xs.push(coords[i]);
    ys.push(coords[i + 1]);
  }
  // Среднее значение по x и y
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    x: avg(xs) + dx,
    y: avg(ys) + dy
  };
}


export function applyShiftPath(arr: Array<{ path: string; x: number; y: number; absolutePath?: string }>) {
  arr.forEach(item => {
    item.absolutePath = shiftPath(item.path, item.x, item.y);
  });
}