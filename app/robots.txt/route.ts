export const dynamic = "force-static"; // Turbopack supports this flag here

export async function GET() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml`;

    return new Response(robotsTxt, {
        headers: { "Content-Type": "text/plain" },
    });
}
