# Shader Graph Viewer — locally hosted portfolio edition

Original author: Stelios Petrakis (@stelabouras).
Original source: https://gitlab.com/stelabouras/shader-graph
Upstream snapshot: commit 93a1930f (2024-04-30).
License: GNU General Public License version 3; full text in LICENSE.
The viewer is free software and is provided without warranty.

The original style/style.css is included unmodified. script.js includes the
port-coordinate correction described below.
The original SVG icons are included in style/img; upstream credits Tabler Icons (MIT).
Source code for this edition, including all modifications:
https://github.com/Camokas/Portfolio-Site/tree/master/public/vendor/shader-graph

Portfolio modifications (2026-10-14):
- New index.html, portfolio.css and portfolio.js, distributed under GPL-3.0.
- Same-origin source-file loading, automatic fit-to-view, pointer-anchored zoom, compact controls.
- Non-passive canvas wheel handling prevents zoom gestures from scrolling the parent page.
- Edge endpoints use actual port centers converted into SVG coordinates, replacing
  upstream's layout-dependent fixed offsets (script.js, 2026-10-14).
- No submission, shared-preview service, public library or remote dependencies.
- Source and license notices retained in the viewer interface.

This is a structural graph viewer. It does not execute Unity shaders, render
their material output, resolve Unity asset GUIDs to local texture files, or save
changes to the source graph. Modern Unity versions may add unsupported nodes.
