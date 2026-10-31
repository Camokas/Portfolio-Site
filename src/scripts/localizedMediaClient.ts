import { createMediaResolver } from "../data/localizedMediaUrl.mjs";
const pairs = JSON.parse(document.getElementById("localized-media")?.dataset.versions || "[]");
const resolve = createMediaResolver(pairs, import.meta.env.BASE_URL);
export const localizedMediaUrl = (value: string, language = document.documentElement.lang) => resolve(value, language);
