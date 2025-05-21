# ARP Tools

A browser-based library/tools/UI for building dose response assays.

Live version available at https://dsehnal.github.io/arp-tools-dev/.

## Development

- Clone repo
- `npm install`
- `npm run dev`

## Deployment

- `npm run build -- --base=/app-prefix/`

## Data storage

Currently, the app uses `IndexedDB` to store data locally in the user's browser. It should be fairly straightforward to write a custom store interface and modify `src/pages/store.ts`.

