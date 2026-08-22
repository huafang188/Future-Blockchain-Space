# Future Blockchain Space Project

This repository is a static marketing and informational website for a blockchain/crypto ecosystem project. It is built with plain HTML, CSS, and JavaScript and does not require a build step.

## Project structure
- `index.html`: main landing page and content structure
- `style.css`: global layout, theming, and responsive styling
- `js/`: JavaScript modules for app logic, UI rendering, localization, and API interactions
- `assets/`: image and static media files
- `worker.js`: service worker / offline-related logic

## Working rules
- Prefer small, targeted edits that preserve the existing static-site architecture.
- Do not add frameworks or build tooling unless explicitly requested.
- Keep compatibility with the current browser-based setup and avoid breaking localization or dynamic UI behavior.
- For content updates, preserve the current structure and language support in the existing HTML/JS files.
- When validating changes, use a lightweight local static server such as:
  - `python3 -m http.server 8000`
  - then open the served page in a browser to check layout and behavior.

## Typical tasks
- Update copy, sections, or calls to action in `index.html`
- Adjust styles in `style.css`
- Fix or extend logic in the files under `js/`
- Preserve translation entries and page structure for all supported locales

## Important notes
- This is a content-heavy static site; changes should remain simple and robust.
- Prefer consistent naming and code organization with the existing project style.
- If a bug is suspected in the UI or data flow, trace the relevant JS module before patching.
