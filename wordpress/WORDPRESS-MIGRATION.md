# Smukkekort WordPress migration map

| Layer | Current location / future home |
|---|---|
| Approved storefront design | Root `index.html` remains the existing static storefront; migrate its visual system to the Smukkekort theme. |
| Catalog and templates | `invitationer/data/products.json` is the current demo catalog. Import each record as a WooCommerce digital product and `smuk_template` metadata. |
| Reusable editor | `invitationer/assets/editor.js` and `editor.css` are the static prototype; move the field schema and renderer into `smukkekort-invitation-editor`. |
| WooCommerce | Not connected. Use product IDs/SKUs `SMK-WED-001` and `SMK-WED-002`, categories Invitationer > Bryllup, and price 39 DKK. |
| Protected files | No originals or PDFs are in the public GitHub Pages site. Store masters outside the web root/private object storage. Add server-side order validation and short-lived downloads before launch. |
| PDF rendering | Not implemented. Add server-side A5 PDF generation from private masters after successful order status verification. |

## Launch checklist

1. Install the starter plugin and a dedicated theme; import catalog records into WooCommerce.
2. Move high-resolution master artwork to private storage and keep only marked previews public.
3. Add secure PDF rendering, order checks, signed/short-lived downloads, logging, retention policy, and failed-payment handling.
4. Test iPhone Safari, print dimensions/bleed, long names and addresses, Danish characters, accessibility, and real WooCommerce order states.
5. Configure Simply.com hosting, HTTPS, backups, privacy/cookie notices, terms, VAT/accounting, and transactional email before accepting orders.
