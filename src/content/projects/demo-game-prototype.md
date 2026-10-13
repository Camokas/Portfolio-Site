---
title: "Demo Game Prototype"
summary: "A temporary project used to demonstrate how portfolio entries are displayed."
direction: "game-development"
date: 2026-10-13
tags:
  - "Prototype"
  - "Game Design"
cover: "../../assets/projects/demo-game-prototype/demo-interface.svg"
gallery:
  - image: "../../assets/projects/demo-game-prototype/demo-interface.svg"
    alt: "Abstract monochrome interface with a circular map and status panels"
    caption: "Temporary cover artwork demonstrating the project image layout."
  - image: "../../assets/projects/demo-game-prototype/demo-mechanics.svg"
    alt: "Abstract monochrome game mechanics diagram made from connected geometric shapes"
    caption: "A second temporary image used to test the gallery and image viewer."
models:
  - title: "Aluminum Can"
    description: "Aluminum Can"
    kind: "glb"
    src: "models/AluminumCan.glb"
    autoRotate: true
  - title: "WorkTable"
    description: "Work Table"
    kind: "glb"
    src: "models/Worktable.glb"
    autoRotate: true
videos:
  - title: "Demo video player"
    caption: "Temporary CC0 sample from MDN used only to verify native video playback."
    preload: "metadata"
    sources:
      - src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
        type: "video/mp4"
audio:
  - title: "Demo sound effect"
    artist: "MDN Web Docs sample"
    caption: "Temporary CC0 audio used only to verify native playback."
    preload: "metadata"
    sources:
      - src: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3"
        type: "audio/mpeg"
downloads:
  - label: "Demo project notes"
    file: "downloads/demo-game-prototype/demo-project-notes.txt"
    description: "A temporary text file demonstrating local downloads."
    format: "TXT"
    size: "< 1 KB"
links:
  - label: "Portfolio source repository"
    href: "https://github.com/Camokas/Portfolio-Site"
    description: "The real GitHub repository containing this website."
    kind: "source"
codeSamples:
  - title: "Demo movement update"
    filename: "playerMovement.ts"
    language: "ts"
    description: "Temporary TypeScript used to demonstrate syntax highlighting and copying."
    code: |
      interface PlayerState {
        position: number;
        speed: number;
      }

      export function updateMovement(
        player: PlayerState,
        direction: -1 | 0 | 1,
        deltaTime: number,
      ): PlayerState {
        return {
          ...player,
          position: player.position + direction * player.speed * deltaTime,
        };
      }
featured: true
draft: false
demo: true
---

> This is demonstration content, not a real portfolio project. It can be removed as soon as the first real project is added.

## About this entry

This page demonstrates the basic structure that every future project can use: metadata, a short summary, tags, media, downloads, external links, code, and a longer Markdown description.

## What will be added later

- Project-specific interactive program demonstrations.

The temporary gallery images, video, and audio will be replaced with real project media when the first finished project is added.

The content is intentionally simple while the foundation of the portfolio is being built.
