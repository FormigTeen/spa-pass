#!/usr/bin/env node
/**
 * Ensures the dev host resolves locally.
 *
 * The app cannot be developed on localhost: WebAuthn validates the passkey's
 * `rpId` ("pass.cvlb.tech") against the page origin, so the dev server has to
 * answer on a subdomain of it. See vite.config.ts.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const HOST = process.env.DEV_HOST ?? "local.pass.cvlb.tech";
const IP = "127.0.0.1";
const HOSTS_FILE = "/etc/hosts";
const PORT = 5173;

const alreadyMapped = () => {
  let content;
  try {
    content = readFileSync(HOSTS_FILE, "utf8");
  } catch (error) {
    console.error(`✖ não consegui ler ${HOSTS_FILE}: ${error.message}`);
    process.exit(1);
  }

  return content.split("\n").some((line) => {
    const entry = line.trim();
    if (!entry || entry.startsWith("#")) return false;
    const [, ...names] = entry.split(/\s+/);
    return names.includes(HOST);
  });
};

if (alreadyMapped()) {
  console.log(`✔ ${HOST} já está em ${HOSTS_FILE}`);
  console.log(`  abra https://${HOST}:${PORT}`);
  process.exit(0);
}

console.log(`→ adicionando "${IP} ${HOST}" em ${HOSTS_FILE}`);
console.log("  (precisa de sudo — pode pedir sua senha)\n");

try {
  execFileSync(
    "sudo",
    ["sh", "-c", `printf '\\n%s\\t%s\\n' '${IP}' '${HOST}' >> ${HOSTS_FILE}`],
    { stdio: "inherit" },
  );
} catch {
  console.error(`\n✖ não deu. Rode manualmente:\n`);
  console.error(`  echo "${IP} ${HOST}" | sudo tee -a ${HOSTS_FILE}\n`);
  process.exit(1);
}

if (!alreadyMapped()) {
  console.error(`✖ a entrada não apareceu em ${HOSTS_FILE}`);
  process.exit(1);
}

console.log(`\n✔ pronto — rode "yarn dev" e abra https://${HOST}:${PORT}`);
console.log("  o certificado é auto-assinado, aceite o aviso na 1ª visita");
