import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HailLogo } from "@/components/HailLogo";

export const metadata: Metadata = { title: "API guide" };

// The public API contract (docs/public/api.md), rendered for outside developers. Its own "# " heading
// is the page's h1.
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
      <main id="main" className="prose">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="table-wrap">
                <table className="data">{children}</table>
              </div>
            ),
          }}
        >
          {md}
        </Markdown>
      </main>
    </div>
  );
}
