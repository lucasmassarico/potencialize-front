import { describe, expect, it } from "vitest";
import indexHtml from "../index.html?raw";
import manifestJson from "../public/site.webmanifest?raw";

describe("favicon metadata", () => {
    it("exposes desktop, mobile, and manifest icons from the initial HTML", () => {
        expect(indexHtml).toContain('<link rel="icon" href="/favicon.ico" sizes="any" />');
        expect(indexHtml).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
        expect(indexHtml).toContain('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />');
        expect(indexHtml).toContain('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />');
        expect(indexHtml).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />');
        expect(indexHtml).toContain('<link rel="manifest" href="/site.webmanifest" />');
        expect(indexHtml).toContain('<meta name="theme-color" content="#3F51B5" />');
    });

    it("defines installable app icon metadata in the web manifest", () => {
        const manifest = JSON.parse(manifestJson) as {
            name?: string;
            short_name?: string;
            theme_color?: string;
            background_color?: string;
            display?: string;
            icons?: Array<{ src?: string; sizes?: string; type?: string }>;
        };

        expect(manifest).toMatchObject({
            name: "Potencialize",
            short_name: "Potencialize",
            theme_color: "#3F51B5",
            background_color: "#FFFFFF",
            display: "standalone",
        });
        expect(manifest.icons).toEqual([
            { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
        ]);
    });
});
