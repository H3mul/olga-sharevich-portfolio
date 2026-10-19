import { PLASMIC } from "@/plasmic-init";

export const dynamic = "force-static";

export async function GET() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const pages = await PLASMIC.fetchPages();

    const xmlItems = pages
        .map(
            (page) => `
      <url>
        <loc>${new URL(page.path, siteUrl).toString()}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
      </url>`,
        )
        .join("");

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://sitemaps.org">
      ${xmlItems}
    </urlset>`;

    return new Response(sitemapXml, {
        headers: { "Content-Type": "application/xml" },
    });
}
