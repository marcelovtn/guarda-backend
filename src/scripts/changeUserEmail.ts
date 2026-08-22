/*
 * Troca o e-mail de uma conta.
 *
 * Existe porque nada no produto faz isso. A tela de conta desabilita o campo de
 * e-mail de propósito — mudar e-mail deveria exigir reverificação, e esse fluxo
 * não foi construído. Mas `requireEmailVerification` está desligado, então um
 * typo no cadastro cria uma conta que funciona e que ninguém consegue
 * recuperar: o link de recuperação vai para um endereço que não é da pessoa.
 * Até existir o fluxo próprio, o conserto é operacional.
 *
 * Seguro para a senha: no provedor `credential` do Better Auth o vínculo é pelo
 * `userId`, não pelo e-mail — o login busca o usuário por e-mail e depois a
 * credencial por id. Trocar o e-mail não desfaz esse vínculo.
 *
 *   railway ssh -s api node dist/scripts/changeUserEmail.js <atual> <novo>
 */
import { PrismaClient } from '@prisma/client'

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

const [currentEmail, newEmail] = process.argv.slice(2).map((v) => v?.trim().toLowerCase())

if (!currentEmail || !newEmail) {
  fail('Uso: changeUserEmail <email-atual> <email-novo>')
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
  fail(`"${newEmail}" não parece um e-mail.`)
}

const prisma = new PrismaClient()

const user = await prisma.user.findUnique({
  where: { email: currentEmail },
  select: { id: true, name: true },
})

if (!user) {
  fail(`Nenhuma conta com o e-mail ${currentEmail}.`)
}

if (await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } })) {
  fail(`Já existe uma conta com o e-mail ${newEmail}.`)
}

await prisma.user.update({
  where: { id: user.id },
  data: { email: newEmail },
})

const credential = await prisma.account.findFirst({
  where: { userId: user.id, providerId: 'credential' },
  select: { password: true },
})

console.log(`
✓ E-mail trocado

  conta        ${user.name}
  antes        ${currentEmail}
  agora        ${newEmail}
  credencial   ${credential?.password ? 'intacta — a senha continua a mesma' : 'AUSENTE — esta conta não tem senha (entrou por OAuth?)'}
`)

await prisma.$disconnect()
