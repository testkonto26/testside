# Smukkekort Invitation Editor (starter)

This plugin isolates invitation templates and the editor entry point from the WordPress theme. It registers a non-public `smuk_template` post type and hierarchical occasion taxonomy. The current plugin is a migration scaffold; it does not generate PDFs or process orders.

## Planned integration boundaries

- **Theme:** branding, navigation, product/category views, responsive layout.
- **Plugin:** reusable editor UI, field schema, safe text layout, template metadata.
- **WooCommerce adapter:** map templates to digital products, use the configured product price and require an order in `processing` or `completed` before fulfillment.
- **Protected asset service:** serve previews only from public URLs. Keep original artwork and generated PDFs outside the public web root or in private object storage; issue short-lived, order-bound downloads after server-side order verification.
- **PDF worker:** render A5 at print resolution from the original artwork and validated text schema only after payment verification; never accept arbitrary client-supplied artwork or trust a browser watermark.

GitHub Pages is a static preview and cannot enforce payment or hide a public image URL. The repository therefore contains only visibly watermarked preview artwork. Do not upload unwatermarked masters to a public branch.
