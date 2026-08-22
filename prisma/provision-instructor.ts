/**
 * Creates (or updates) a real instructor account.
 *
 * This exists because there is no other way in: the `Instructor` module has GET
 * and PATCH but no create, and the landing's "Abrir meu perfil de professor"
 * button leads to the normal sign-up, which produces a student. Until becoming
 * an instructor is a product flow, professors are onboarded by hand — and doing
 * it by hand should not mean writing SQL against production.
 *
 * Deliberately not an HTTP endpoint. An instructor row is what lets someone
 * publish content and charge students monthly; who gets one is a business
 * decision, not something to expose to anyone with an account.
 *
 * Idempotent: keyed on the e-mail, so re-running updates the same instructor
 * rather than creating a second one.
 *
 *   yarn instructor:create --email joao@exemplo.com --name "João Pedro" \
 *     --slug joaopedro --price 19,90 [--bio "..."] [--password ...] [--draft]
 *
 * With no --password one is generated and printed once. Send it over a channel
 * you trust and have them change it.
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma.js";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

/** "19,90" and "19.90" both mean 1990 cents. "19" means 1900. */
function toCents(input: string): number {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) fail(`--price inválido: "${input}". Use 19,90`);

  const [, reais, decimals = "0"] = match;
  return Number(reais) * 100 + Number(decimals.padEnd(2, "0"));
}

const email = arg("email")?.trim().toLowerCase();
const name = arg("name")?.trim();
const slug = arg("slug")?.trim().toLowerCase();
const price = arg("price");
const bio = arg("bio")?.trim() ?? null;
const published = !process.argv.includes("--draft");

if (!email || !name || !slug || !price) {
  fail("Obrigatórios: --email, --name, --slug, --price");
}

if (!/^[a-z0-9-]+$/.test(slug)) {
  fail(`--slug precisa ser [a-z0-9-]: "${slug}". Ele vira a URL /p/${slug}`);
}

const monthlyPrice = toCents(price);

if (monthlyPrice <= 0) {
  fail("--price precisa ser maior que zero, senão o checkout não abre");
}

const generatedPassword = arg("password") ?? randomBytes(9).toString("base64url");

// The slug is public and unique. Catching it here gives a readable error
// instead of a Prisma constraint dump.
const slugOwner = await prisma.instructor.findFirst({
  where: { slug },
  select: { user: { select: { email: true } } },
});

if (slugOwner && slugOwner.user.email !== email) {
  fail(`o slug "${slug}" já é de ${slugOwner.user.email}`);
}

const user = await prisma.user.upsert({
  where: { email },
  update: { name },
  // Verified on purpose: this account was created by us, not claimed by
  // someone who typed the address.
  create: { id: randomUUID(), email, name, emailVerified: true },
});

/*
  Better Auth owns the user table but does not expose account creation, so the
  credential row is written in the shape it expects: providerId "credential",
  accountId equal to the user id, and a bcrypt hash matching the hasher in
  src/lib/auth.ts. Get any of the three wrong and the account exists but cannot
  sign in.
*/
const credential = await prisma.account.findFirst({
  where: { userId: user.id, providerId: "credential" },
  select: { id: true },
});

const password = await bcrypt.hash(generatedPassword, 10);

if (credential) {
  await prisma.account.update({ where: { id: credential.id }, data: { password } });
} else {
  await prisma.account.create({
    data: { userId: user.id, accountId: user.id, providerId: "credential", password },
  });
}

const instructor = await prisma.instructor.upsert({
  where: { userId: user.id },
  update: { slug, displayName: name, bio, monthlyPrice, published, deletedAt: null },
  create: { userId: user.id, slug, displayName: name, bio, monthlyPrice, published },
  select: { id: true, slug: true, displayName: true, monthlyPrice: true, published: true },
});

const asMoney = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

console.log(`
  ✓ Professor ${instructor.displayName}

    e-mail    ${email}
    senha     ${generatedPassword}
    perfil    /p/${instructor.slug}
    mensal    ${asMoney(instructor.monthlyPrice)}  (${instructor.monthlyPrice} centavos)
    estado    ${instructor.published ? "publicado" : "rascunho (não aparece para alunos)"}

  A senha aparece só agora. Manda por um canal confiável e pede pra trocar.
`);

/*
  Nothing is created at Stripe here. The Product and the Price are created on
  the first checkout, from monthlyPrice — see PaymentService.ensurePrice. Doing
  it here would mean two places that can invent prices.
*/

await prisma.$disconnect();
