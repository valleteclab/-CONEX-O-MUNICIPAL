const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "apps", "web", "src");

const blocked = [
  { label: "destino padrão", pattern: /\bdestino\s+padr[aã]o\b/i },
  { label: "rota", pattern: /\brota(s)?\b/i },
  { label: "parâmetro", pattern: /\bpar[aâ]metro(s)?\b/i },
  { label: "endpoint", pattern: /\bendpoint(s)?\b/i },
  { label: "payload", pattern: /\bpayload(s)?\b/i },
  { label: "Provider", pattern: /\bProvider\b/ },
  { label: "Temperatura", pattern: /\btemperatura\b/i },
  { label: "Máx. itens por job", pattern: /m[aá]x\.?\s+itens\s+por\s+job/i },
  { label: "X-Business-Id", pattern: /X-Business-Id/i },
  { label: "NEXT_PUBLIC_API_BASE_URL", pattern: /NEXT_PUBLIC_API_BASE_URL/ },
  { label: "CORS_ORIGINS", pattern: /CORS_ORIGINS/ },
  { label: "YOUTUBE_API_KEY", pattern: /YOUTUBE_API_KEY/ },
];

const blockedPaths = [
  { label: "/erp", pattern: /\/erp(\/|["'`<\s]|$)/ },
  { label: "/admin", pattern: /\/admin(\/|["'`<\s]|$)/ },
  { label: "/portal", pattern: /\/portal(\/|["'`<\s]|$)/ },
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!/\.(tsx|ts)$/.test(entry.name)) return [];
    return [full];
  });
}

function isAllowedTechnicalLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^(import|export type|type |interface |const |let |var |function )/.test(trimmed)) return true;
  if (/^(\/\/|\/\*|\*)/.test(trimmed)) return true;
  if (/(href=|href:|redirect\(|usePathname\(|pathname|startsWith\(|router\.push\(|return "\/|return `\/|return \[)/.test(line)) return true;
  if (/(apiFetch|apiAuthFetch|erpFetch|supportFetch|fetch\(|NextResponse\.json|publicApiUrl|getPublicApiBaseUrl|\/api\/v1\/)/.test(line)) return true;
  if (/(body: JSON\.stringify|headers:|Authorization:|FormData|URLSearchParams|searchParams)/.test(line)) return true;
  if (/\bpayload\b/.test(line) && !/[>][^<]*payload/i.test(line)) return true;
  if (/\bendpoint\b/.test(line) && !/[>][^<]*endpoint/i.test(line)) return true;
  if (/X-Business-Id/.test(line) && !/[>][^<]*X-Business-Id/.test(line)) return true;
  if (/["'`]\/(admin|erp)\/?:?/.test(line) && !/[>][^<]*\/(admin|erp)/.test(line)) return true;
  if (/\bprovider\b/.test(line) && !/["'`][^"'`]*Provider/.test(line)) return true;
  if (/(className=|id=|htmlFor=|name=|key=|value=|onClick=|onChange=)/.test(line) && !/[>][^<]+[<]/.test(line)) return true;
  return false;
}

const issues = [];
const candidates = [...blocked, ...blockedPaths];

for (const file of walk(srcDir)) {
  const rel = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (isAllowedTechnicalLine(line)) return;
    for (const item of candidates) {
      if (item.pattern.test(line)) {
        issues.push({ rel, lineNumber: index + 1, label: item.label, text: line.trim() });
      }
    }
  });
}

if (issues.length) {
  console.error("Textos de interface com linguagem técnica encontrados:\n");
  for (const issue of issues) {
    console.error(`${issue.rel}:${issue.lineNumber} [${issue.label}] ${issue.text}`);
  }
  console.error("\nReescreva a copy para linguagem de produto ou mova o detalhe técnico para código/documentação.");
  process.exit(1);
}

console.log("copy:check OK - nenhum jargão técnico visível encontrado.");
