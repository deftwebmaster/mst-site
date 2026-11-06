# CrossRoads Decorative Pavement: 2026 site

Plain HTML, CSS and JS with no build step and no framework. You can upload this folder to any static host.

## Structure
- `index.html`, `gallery.html`, `services.html`, `about-us.html`, `contact.html`, `404.html`
- `assets/css/style.css`: all styles. Colors are set as variables at the top.
- `assets/js/main.js`: mobile menu, gallery filters, lightbox and before/after sliders.
- `assets/img/work/`: project photos. Each one has a `name.webp` (full size) and a `name-sm.webp` (thumbnail).
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, favicons, `crossroads-decorative-pavement.vcf` (the "save contact" card)
- `_redirects`: 301 redirects from the old GoDaddy URLs (Netlify and Cloudflare Pages format)

## Adding a photo to the gallery
1. Export a JPG at least 1600px wide and convert it to WebP. Save it as `assets/img/work/<slug>.webp` and add a 640px-wide copy as `<slug>-sm.webp`.
2. In `gallery.html`, copy one `<figure class="tile">` block and change the filenames, title, location, alt text and `data-cat`. The categories are `stamped`, `streetbond`, `crosswalks` and `art`.

## Turning on the contact form
In `contact.html`, set the form's `action` to a form endpoint (for example Formspree, Netlify Forms or Basin). Then remove `disabled` from the `<fieldset>`, `onsubmit="return false"` from the `<form>`, and the yellow "coming soon" note.

## Before launch
- [ ] Add a business email address (none appears on the current site) to the contact page, the footer and the JSON-LD.
- [ ] Host with clean URLs (`/gallery` serves `gallery.html`) so the canonical URLs match the pages.
- [ ] Submit `sitemap.xml` in Google Search Console and update the Google Business Profile website link.
