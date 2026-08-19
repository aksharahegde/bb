export interface GraphNode {
  id: string;
  label?: string;
  source_file?: string;
  source_location?: string;
  community?: number | string;
  [key: string]: unknown;
}

export interface GraphLink {
  source: string;
  target: string;
  relation?: string;
  [key: string]: unknown;
}

export interface GraphDocument {
  directed?: boolean;
  nodes: GraphNode[];
  links?: GraphLink[];
  edges?: GraphLink[];
  hyperedges?: unknown[];
}

export interface GraphStatus {
  exists: boolean;
  nodeCount: number;
  edgeCount: number;
  directed: boolean;
  graphPath: string;
  topNodes: Array<{ id: string; label: string; degree: number }>;
}

export const CATALOG_MAX_CHARS = 2800;

function linksOf(doc: GraphDocument): GraphLink[] {
  return doc.links ?? doc.edges ?? [];
}

function nodeLabel(node: GraphNode): string {
  return String(node.label ?? node.id);
}

export function parseGraphDocument(raw: string): GraphDocument {
  const parsed = JSON.parse(raw) as GraphDocument;
  if (!parsed || !Array.isArray(parsed.nodes)) {
    throw new Error("graph.json is missing a nodes array");
  }
  return parsed;
}

export function computeGraphStatus(
  doc: GraphDocument | null,
  graphPath: string,
  topN = 10,
): GraphStatus {
  if (doc === null) {
    return {
      exists: false,
      nodeCount: 0,
      edgeCount: 0,
      directed: false,
      graphPath,
      topNodes: [],
    };
  }
  const links = linksOf(doc);
  const degree = new Map<string, number>();
  for (const node of doc.nodes) {
    degree.set(node.id, 0);
  }
  for (const link of links) {
    const source = String(link.source);
    const target = String(link.target);
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  }
  const byId = new Map(doc.nodes.map((node) => [node.id, node]));
  const topNodes = [...degree.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id, deg]) => {
      const node = byId.get(id);
      return {
        id,
        label: node ? nodeLabel(node) : id,
        degree: deg,
      };
    });
  return {
    exists: true,
    nodeCount: doc.nodes.length,
    edgeCount: links.length,
    directed: Boolean(doc.directed),
    graphPath,
    topNodes,
  };
}

export function renderCatalog(status: GraphStatus): string {
  if (!status.exists) {
    return [
      "Graphify index",
      "No graphify-out/graph.json found for this project yet.",
      "Run `bb graphify update` (AST-only, no LLM) then `bb graphify query \"…\"`.",
      "Before risky edits, run `bb graphify affected \"<symbol-or-file>\"`.",
      "Agents may also use `graphify --mcp` when Graphify is on PATH.",
    ].join("\n");
  }

  const lines = [
    "Graphify index",
    `Graph: ${status.nodeCount} nodes, ${status.edgeCount} edges (${status.directed ? "directed" : "undirected"}).`,
    "Use `bb graphify query \"…\"`, `bb graphify path \"A\" \"B\"`, `bb graphify affected \"X\"`.",
    "Before risky edits, run `bb graphify affected` on the symbol or file you will change.",
    "God nodes (highest degree):",
  ];
  for (const node of status.topNodes.slice(0, 8)) {
    lines.push(`- ${node.label} (degree ${node.degree})`);
  }
  lines.push("Add graphify-out/ to .gitignore; do not commit graphs.");

  let text = lines.join("\n");
  if (text.length > CATALOG_MAX_CHARS) {
    text = `${text.slice(0, CATALOG_MAX_CHARS - 1)}…`;
  }
  return text;
}
