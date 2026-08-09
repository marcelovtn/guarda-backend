/*
 * Seeds the database with the content the Paper artboards were designed
 * against: one instructor, nine tracks, 133 lessons, two lessons with no track,
 * and one student partway through the passing track.
 *
 * Idempotent — safe to run repeatedly. Run with `yarn db:seed`.
 */
import { PrismaClient, PublishStatus } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { ORPHAN_LESSONS, TRACKS } from './data/tracks.js'

const prisma = new PrismaClient()

const INSTRUCTOR = {
  email: 'rafael@guarda.app',
  name: 'Rafael Moura',
  slug: 'rafaelmoura',
  bio: 'Ensino jiu jitsu há doze anos. Aqui eu subo as aulas na ordem exata que eu ensino no tatame — do fundamento à finalização. Você não escolhe vídeo, você segue a trilha.',
  monthlyPriceCents: 4990,
}

const STUDENT = { email: 'aluno@guarda.app', name: 'Marcelo Távora' }

/** The track the seeded student is partway through, and where they stopped. */
const STUDENT_PROGRESS = { trackSlug: 'passagem-pressao', lessonsCompleted: 6 }

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000)
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000)

/**
 * Better Auth owns the user table and generates its own ids, so the seed
 * writes users directly rather than going through the auth API. These accounts
 * have no password — sign in with Google, or register normally and promote the
 * account afterwards.
 */
async function upsertUser(email: string, name: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name },
    create: { id: randomUUID(), email, name, emailVerified: true },
  })
}

async function main() {
  console.log('Seeding GUARDA…')

  const instructorUser = await upsertUser(INSTRUCTOR.email, INSTRUCTOR.name)
  const studentUser = await upsertUser(STUDENT.email, STUDENT.name)

  const instructor = await prisma.instructor.upsert({
    where: { userId: instructorUser.id },
    update: {
      slug: INSTRUCTOR.slug,
      displayName: INSTRUCTOR.name,
      bio: INSTRUCTOR.bio,
      monthlyPrice: INSTRUCTOR.monthlyPriceCents,
      published: true,
    },
    create: {
      userId: instructorUser.id,
      slug: INSTRUCTOR.slug,
      displayName: INSTRUCTOR.name,
      bio: INSTRUCTOR.bio,
      monthlyPrice: INSTRUCTOR.monthlyPriceCents,
      published: true,
    },
  })

  // Wipe the instructor's content so re-running does not stack duplicates.
  // Modules and lessons cascade from the track.
  await prisma.lesson.deleteMany({ where: { instructorId: instructor.id } })
  await prisma.track.deleteMany({ where: { instructorId: instructor.id } })

  let lessonCount = 0

  for (const [trackIndex, seedTrack] of TRACKS.entries()) {
    const track = await prisma.track.create({
      data: {
        instructorId: instructor.id,
        slug: seedTrack.slug,
        title: seedTrack.title,
        description: seedTrack.description,
        category: seedTrack.category,
        level: seedTrack.level,
        position: trackIndex,
        published: seedTrack.published,
        publishedAt: seedTrack.published ? daysAgo(60 - trackIndex) : null,
      },
    })

    for (const [moduleIndex, seedModule] of seedTrack.modules.entries()) {
      const module = await prisma.module.create({
        data: { trackId: track.id, title: seedModule.title, position: moduleIndex },
      })

      for (const [lessonIndex, seedLesson] of seedModule.lessons.entries()) {
        const isPublished = seedLesson.status === PublishStatus.PUBLISHED
        await prisma.lesson.create({
          data: {
            instructorId: instructor.id,
            moduleId: module.id,
            title: seedLesson.title,
            description: seedLesson.description ?? seedTrack.description,
            durationSec: seedLesson.durationSec,
            status: seedLesson.status,
            position: lessonIndex,
            // Lessons without an explicit date fall back to something older, so
            // the "Vídeos" screen still sorts sensibly.
            publishedAt: isPublished ? daysAgo(seedLesson.daysAgo ?? 30 + lessonIndex) : null,
          },
        })
        lessonCount++
      }
    }
  }

  for (const orphan of ORPHAN_LESSONS) {
    await prisma.lesson.create({
      data: {
        instructorId: instructor.id,
        moduleId: null,
        title: orphan.title,
        description: orphan.description,
        durationSec: orphan.durationSec,
        status: orphan.status,
        publishedAt:
          orphan.status === PublishStatus.PUBLISHED ? hoursAgo(orphan.hoursAgo) : null,
      },
    })
    lessonCount++
  }

  await prisma.subscription.upsert({
    where: {
      studentId_instructorId: { studentId: studentUser.id, instructorId: instructor.id },
    },
    update: { status: 'ACTIVE' },
    create: {
      studentId: studentUser.id,
      instructorId: instructor.id,
      status: 'ACTIVE',
      monthlyPrice: INSTRUCTOR.monthlyPriceCents,
      renewsAt: daysAgo(-25),
    },
  })

  // Put the student partway through one track, so the home page has a real
  // "continue de onde parou" and the track list shows completion ticks.
  const progressTrack = await prisma.track.findFirst({
    where: { instructorId: instructor.id, slug: STUDENT_PROGRESS.trackSlug },
    include: { modules: { orderBy: { position: 'asc' }, include: { lessons: { orderBy: { position: 'asc' } } } } },
  })

  const orderedLessons = progressTrack?.modules.flatMap((m) => m.lessons) ?? []

  for (const [index, lesson] of orderedLessons.entries()) {
    if (index < STUDENT_PROGRESS.lessonsCompleted) {
      await prisma.lessonProgress.upsert({
        where: { studentId_lessonId: { studentId: studentUser.id, lessonId: lesson.id } },
        update: { completed: true, lastPositionSec: lesson.durationSec, completedAt: daysAgo(1) },
        create: {
          studentId: studentUser.id,
          lessonId: lesson.id,
          completed: true,
          lastPositionSec: lesson.durationSec,
          completedAt: daysAgo(1),
        },
      })
      continue
    }

    // The lesson in progress — 11:56 into 18:32, matching the player artboard.
    if (index === STUDENT_PROGRESS.lessonsCompleted) {
      await prisma.lessonProgress.upsert({
        where: { studentId_lessonId: { studentId: studentUser.id, lessonId: lesson.id } },
        update: { completed: false, lastPositionSec: 716 },
        create: { studentId: studentUser.id, lessonId: lesson.id, lastPositionSec: 716 },
      })
      break
    }
  }

  console.log(
    `Done. ${TRACKS.length} tracks, ${lessonCount} lessons, 1 instructor, 1 subscribed student.`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
