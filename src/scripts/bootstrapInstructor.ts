/*
 * Cria o primeiro professor de um banco vazio.
 *
 * Existe porque o caminho normal — POST /api/admin/instructors — exige um
 * admin autenticado, e num banco novo não há admin nem professor. Este script
 * quebra esse ovo-e-galinha escrevendo direto no banco, com as mesmas
 * validações do service para não deixar passar estado que a API recusaria.
 *
 * Em produção, rode DENTRO do serviço: o Postgres da Railway só existe na rede
 * privada dela, então um `railway run` local não alcança o banco.
 *
 *   railway ssh -s api node dist/scripts/bootstrapInstructor.js \
 *     <email> <slug> "<Nome>" [precoEmCentavos]
 *
 * Localmente, contra o banco de desenvolvimento:
 *
 *   yarn bootstrap:instructor <email> <slug> "<Nome>" [precoEmCentavos]
 *
 * Do segundo professor em diante, use POST /api/admin/instructors.
 */
import { PrismaClient } from '@prisma/client'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_BIO_LENGTH = 400

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

/**
 * Contas que existem, para quando o e-mail informado não bate.
 *
 * Sem isso o erro é um beco: quem roda o script não tem outro jeito de olhar o
 * banco — o Postgres da Railway só existe na rede privada dela — e fica
 * adivinhando qual e-mail a pessoa usou de fato no cadastro.
 */
async function listAccounts(prisma: PrismaClient): Promise<string> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { email: true, name: true },
  })

  if (users.length === 0) return '  (nenhuma conta cadastrada ainda)'

  return users.map((u) => `  ${u.email}  —  ${u.name}`).join('\n')
}

/*
 * O nome vem como "resto dos argumentos", não como uma posição.
 *
 * `railway ssh` junta o comando e o re-divide por espaço, então as aspas de
 * "Marcelo Távora" não sobrevivem: o nome chega partido e o preço acabaria
 * lido como pedaço do nome. Aqui o preço é reconhecido por ser o último
 * argumento composto só de dígitos, e tudo entre o slug e ele é o nome.
 */
function parseArgs(argv: string[]) {
  const [email, slug, ...rest] = argv

  const hasPrice = rest.length > 1 && /^\d+$/.test(rest[rest.length - 1]!)
  const priceArg = hasPrice ? rest[rest.length - 1] : undefined
  const nameParts = hasPrice ? rest.slice(0, -1) : rest

  return { email, slug, displayName: nameParts.join(' ').trim(), priceArg }
}

const { email, slug, displayName, priceArg } = parseArgs(process.argv.slice(2))

if (!email || !slug || !displayName) {
  fail(
    'Uso: bootstrap-instructor <email> <slug> "<Nome de exibição>" [precoEmCentavos]\n' +
      '  Exemplo: bootstrap-instructor marcelo@exemplo.com marcelo-tavora "Marcelo Távora" 4990',
  )
}

const normalizedEmail = email.trim().toLowerCase()
const normalizedSlug = slug.trim().toLowerCase()
const monthlyPrice = priceArg ? Number(priceArg) : 0

if (!SLUG_PATTERN.test(normalizedSlug)) {
  fail('O slug aceita apenas letras minúsculas, números e hífen entre palavras.')
}

if (!Number.isInteger(monthlyPrice) || monthlyPrice < 0) {
  fail('O preço deve ser um número inteiro de centavos. Ex.: 4990 para R$ 49,90.')
}

const prisma = new PrismaClient()

const user = await prisma.user.findUnique({
  where: { email: normalizedEmail },
  select: { id: true, name: true },
})

if (!user) {
  const existing = await listAccounts(prisma)
  fail(
    `Nenhuma conta com o e-mail ${normalizedEmail}.\n` +
      '  A pessoa precisa se cadastrar antes de ser promovida.\n\n' +
      '  Contas mais recentes:\n' +
      existing,
  )
}

const existing = await prisma.instructor.findFirst({
  where: { userId: user.id, deletedAt: null },
  select: { slug: true },
})

if (existing) {
  fail(`Essa conta já é professor (slug "${existing.slug}").`)
}

const slugTaken = await prisma.instructor.findFirst({
  where: { slug: normalizedSlug, deletedAt: null },
  select: { id: true },
})

if (slugTaken) {
  fail(`O slug "${normalizedSlug}" já está em uso por outro professor.`)
}

const instructor = await prisma.instructor.create({
  data: {
    userId: user.id,
    slug: normalizedSlug,
    displayName: displayName.trim(),
    bio: null,
    monthlyPrice,
    // Aparecer na vitrine é decisão de quem vai ser visto. O professor liga
    // isso na própria tela de perfil quando estiver pronto.
    published: false,
  },
})

console.log(`
✓ Professor criado

  conta        ${normalizedEmail} (${user.name})
  slug         ${instructor.slug}
  nome         ${instructor.displayName}
  preço        ${(instructor.monthlyPrice / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
  publicado    não — ligue em /instructor/profile quando quiser aparecer

  A área do professor já abre para essa conta.

Para poder promover os próximos pelo painel, torne esta conta admin:

  railway variable set -s api "GOD_USERS=${user.id}"
`)

await prisma.$disconnect()
