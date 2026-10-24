import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { HailLogo } from "@/components/HailLogo";

export const metadata: Metadata = { title: "API guide" };

// The public API contract (docs/public/api.md), served as-is for outside developers.
export default async function ApiDocs() {
  const md = await readFile(path.join(process.cwd(), "docs", "public", "api.md"), "utf8");
  return (
    <div className="public-wrap">
      <header className="spread">
        <Link href="/" aria-label="Hail home">
          <HailLogo height={32} />
        </Link>
        <a href="/docs/api.md" className="btn btn-secondary">
          Download as Markdown
        </a>
      </header>
      <main id="main" style={{ paddingTop: "var(--s-5)" }}>
        <h1>Hail API guide</h1>
        <pre className="card mono" style={{ whiteSpace: "pre-wrap", overflowX: "auto", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
          {md}
        </pre>
      </main>
    </div>
  );
}
