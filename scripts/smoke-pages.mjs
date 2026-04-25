import { readdir } from "node:fs/promises";

const baseUrl = process.env.AISCHOOL_BASE_URL || "https://shiwen6674.github.io/aischool/";
const root = new URL("../", import.meta.url);

const files = (await readdir(root)).filter((name) => name.endsWith(".html")).sort();
const urls = [
  new URL("favicon.svg", baseUrl).href,
  new URL("assets/css/tailwind.css", baseUrl).href,
  ...files.map((file) => new URL(file, baseUrl).href),
];

let failed = false;

for (const url of urls) {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? "OK  " : "FAIL"} ${response.status} ${url}`);
    if (!ok) failed = true;
  } catch (error) {
    failed = true;
    console.log(`FAIL ERR ${url} ${error.message}`);
  }
}

if (failed) {
  process.exitCode = 1;
}
