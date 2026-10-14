---
title: "Demo First shader"
summary: ""
direction: "shading"
date: 2024-04-25
tags:
  - "Shader"
  - "Prototype"

videos:
  - title: "Project demonstration"
    autoplay: true
    muted: true
    loop: true
    sources:
      - src: "projects/FirstBuildest-SettingsPreviewShader/FirstBuildest-PreviewSettingsShader.mp4"
        type: "video/mp4"

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
demo: false
---

