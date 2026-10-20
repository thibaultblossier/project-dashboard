// Layered (Sugiyama-style) layout for a top-to-bottom dependency graph:
// 1. layers by longest path, sources pulled down next to their children;
// 2. long edges split by invisible "dummy" nodes so they route between boxes;
// 3. barycenter sweeps, keeping the ordering with the fewest crossings;
// 4. x coordinates pulled toward neighbours, without overlaps.

export interface LayoutOptions {
  width: number;
  minNodeW: number;
  maxNodeW: number;
  dummyW: number;
  gap: number;
  pad: number;
  /** Tie-break order for real nodes. */
  compare: (a: number, b: number) => number;
}

export interface LayoutResult {
  nodeW: number;
  width: number;
  layerCount: number;
  /** Real node id → center x and layer. */
  nodes: Map<number, { x: number; layer: number }>;
  /** One entry per dependency, through its dummy points. */
  edges: { from: number; to: number; via: { x: number; layer: number }[] }[];
}

interface N {
  layer: number;
  real: boolean;
  ups: number[];
  downs: number[];
  x: number;
}

export function layeredLayout(ids: number[], parentsOf: (id: number) => number[], o: LayoutOptions): LayoutResult {
  const idSet = new Set(ids);
  const parents = new Map(ids.map((id) => [id, parentsOf(id).filter((p) => idSet.has(p))]));
  const children = new Map(ids.map((id) => [id, [] as number[]]));
  for (const id of ids) for (const p of parents.get(id)!) children.get(p)!.push(id);

  // 1. Layers.
  const layer = new Map<number, number>();
  const depth = (id: number, stack = new Set<number>()): number => {
    if (layer.has(id)) return layer.get(id)!;
    if (stack.has(id)) return 0; // cycle guard: bad data must not freeze the page
    stack.add(id);
    const ps = parents.get(id)!;
    const d = ps.length ? 1 + Math.max(...ps.map((p) => depth(p, stack))) : 0;
    stack.delete(id);
    layer.set(id, d);
    return d;
  };
  ids.forEach((id) => depth(id));
  for (const id of ids) {
    const cs = children.get(id)!;
    if (!parents.get(id)!.length && cs.length) layer.set(id, Math.max(0, Math.min(...cs.map((c) => layer.get(c)!)) - 1));
  }

  // 2. Graph with dummies.
  const nodes = new Map<number, N>();
  for (const id of ids) nodes.set(id, { layer: layer.get(id)!, real: true, ups: [], downs: [], x: 0 });
  let nextDummy = -1;
  const chains: { from: number; to: number; keys: number[] }[] = [];
  for (const c of ids) {
    for (const p of parents.get(c)!) {
      const keys = [p];
      for (let l = layer.get(p)! + 1; l < layer.get(c)!; l++) {
        const d = nextDummy--;
        nodes.set(d, { layer: l, real: false, ups: [], downs: [], x: 0 });
        keys.push(d);
      }
      keys.push(c);
      for (let i = 1; i < keys.length; i++) {
        nodes.get(keys[i - 1])!.downs.push(keys[i]);
        nodes.get(keys[i])!.ups.push(keys[i - 1]);
      }
      chains.push({ from: p, to: c, keys });
    }
  }
  const layerCount = Math.max(0, ...[...nodes.values()].map((n) => n.layer)) + 1;
  let rows: number[][] = Array.from({ length: layerCount }, () => []);
  for (const [k, n] of nodes) rows[n.layer].push(k);
  rows[0].sort(o.compare);

  // 3. Ordering.
  const pos = new Map<number, number>();
  const index = () => rows.forEach((r) => r.forEach((k, i) => pos.set(k, i)));
  const bary = (k: number, nb: number[]) => (nb.length ? nb.reduce((s, x) => s + pos.get(x)!, 0) / nb.length : pos.get(k) ?? 0);
  const sortRow = (l: number, dir: 'ups' | 'downs') => {
    const r = rows[l];
    const b = new Map(r.map((k) => [k, bary(k, nodes.get(k)![dir])]));
    r.sort((a, c) => b.get(a)! - b.get(c)! || (a > 0 && c > 0 ? o.compare(a, c) : 0));
    r.forEach((k, i) => pos.set(k, i));
  };
  const crossings = () => {
    let total = 0;
    for (let l = 0; l < layerCount - 1; l++) {
      const es: [number, number][] = [];
      for (const k of rows[l]) for (const d of nodes.get(k)!.downs) es.push([pos.get(k)!, pos.get(d)!]);
      for (let i = 0; i < es.length; i++)
        for (let j = i + 1; j < es.length; j++) if ((es[i][0] - es[j][0]) * (es[i][1] - es[j][1]) < 0) total++;
    }
    return total;
  };
  index();
  for (let l = 1; l < layerCount; l++) sortRow(l, 'ups');
  let best = rows.map((r) => [...r]);
  let bestC = crossings();
  for (let it = 0; it < 24 && bestC > 0; it++) {
    if (it % 2) for (let l = layerCount - 2; l >= 0; l--) sortRow(l, 'downs');
    else for (let l = 1; l < layerCount; l++) sortRow(l, 'ups');
    const c = crossings();
    if (c < bestC) { bestC = c; best = rows.map((r) => [...r]); }
  }
  rows = best;
  index();

  // 4. Coordinates.
  let nodeW = o.maxNodeW;
  for (const r of rows) {
    const real = r.filter((k) => k > 0).length;
    if (!real) continue;
    const dummies = r.length - real;
    nodeW = Math.min(nodeW, (o.width - 2 * o.pad - dummies * o.dummyW - (r.length - 1) * o.gap) / real);
  }
  nodeW = Math.max(o.minNodeW, nodeW);
  const w = (k: number) => (k > 0 ? nodeW : o.dummyW);
  const rowWidth = (r: number[]) => r.reduce((s, k) => s + w(k), 0) + Math.max(0, r.length - 1) * o.gap;
  const width = Math.max(o.width, ...rows.map((r) => rowWidth(r) + 2 * o.pad));

  rows.forEach((r) => {
    let x = (width - rowWidth(r)) / 2;
    for (const k of r) { nodes.get(k)!.x = x + w(k) / 2; x += w(k) + o.gap; }
  });

  const resolve = (r: number[], want: number[]) => {
    const n = r.length;
    if (!n) return;
    const sep = (i: number) => (w(r[i - 1]) + w(r[i])) / 2 + o.gap;
    const lo = (i: number) => o.pad + w(r[i]) / 2;
    const hi = (i: number) => width - o.pad - w(r[i]) / 2;
    const a = [...want];
    a[0] = Math.max(a[0], lo(0));
    for (let i = 1; i < n; i++) a[i] = Math.max(a[i], a[i - 1] + sep(i));
    a[n - 1] = Math.min(a[n - 1], hi(n - 1));
    for (let i = n - 2; i >= 0; i--) a[i] = Math.min(a[i], a[i + 1] - sep(i + 1));
    const b = [...want];
    b[n - 1] = Math.min(b[n - 1], hi(n - 1));
    for (let i = n - 2; i >= 0; i--) b[i] = Math.min(b[i], b[i + 1] - sep(i + 1));
    b[0] = Math.max(b[0], lo(0));
    for (let i = 1; i < n; i++) b[i] = Math.max(b[i], b[i - 1] + sep(i));
    r.forEach((k, i) => (nodes.get(k)!.x = (a[i] + b[i]) / 2));
  };
  const pull = (l: number, dir: 'ups' | 'downs') => {
    const r = rows[l];
    resolve(r, r.map((k) => {
      const nb = nodes.get(k)![dir];
      return nb.length ? nb.reduce((s, x) => s + nodes.get(x)!.x, 0) / nb.length : nodes.get(k)!.x;
    }));
  };
  for (let it = 0; it < 10; it++) {
    for (let l = 1; l < layerCount; l++) pull(l, 'ups');
    for (let l = layerCount - 2; l >= 0; l--) pull(l, 'downs');
  }

  const out = new Map<number, { x: number; layer: number }>();
  for (const id of ids) out.set(id, { x: nodes.get(id)!.x, layer: nodes.get(id)!.layer });
  return {
    nodeW,
    width,
    layerCount,
    nodes: out,
    edges: chains.map((c) => ({
      from: c.from,
      to: c.to,
      via: c.keys.slice(1, -1).map((k) => ({ x: nodes.get(k)!.x, layer: nodes.get(k)!.layer })),
    })),
  };
}
