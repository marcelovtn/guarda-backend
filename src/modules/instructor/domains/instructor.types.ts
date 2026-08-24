/** Public view of an instructor, as shown on /p/<slug> before subscribing. */
export type PublicInstructorDTO = {
  id: string;
  slug: string;
  displayName: string;
  bio: string | null;
  /** Endereço pronto para o `<img>`. Null quando não há foto. */
  photoUrl: string | null;
  /** Cents. */
  monthlyPrice: number;
  stats: InstructorStatsDTO;
};

/**
 * The numbers shown next to an instructor.
 *
 * Deliberately limited to lesson count, track count and recency. Student
 * counts and belt rank were dropped from the product: they turn the page into
 * social proof instead of a description of the content, and they read badly for
 * an instructor who is just starting.
 */
export type InstructorStatsDTO = {
  lessonCount: number;
  trackCount: number;
  /** Null when nothing has been published yet. */
  lastPublishedAt: Date | null;
};

/** The instructor's own editable profile. */
export type InstructorProfileDTO = PublicInstructorDTO & {
  published: boolean;
};

/**
 * Promove uma conta existente a professor. Só admin.
 *
 * Identifica por e-mail porque quem chama está olhando uma pessoa, não um
 * UUID: o fluxo real é "o Marcelo se cadastrou, me dá acesso de professor".
 */
export type CreateInstructorDTO = {
  /** E-mail de uma conta que já existe. */
  email: string;
  /** Segmento público da URL: /p/<slug>. */
  slug: string;
  displayName: string;
  bio?: string | null;
  /** Cents. */
  monthlyPrice?: number;
  published?: boolean;
};

export type UpdateInstructorProfileDTO = {
  displayName?: string;
  bio?: string | null;
  photoKey?: string | null;
  monthlyPrice?: number;
  published?: boolean;
};

/** A student of the current instructor, for the students screen. */
export type InstructorStudentDTO = {
  id: string;
  name: string;
  email: string;
  subscribedAt: Date;
  lessonsCompleted: number;
  lastActivityAt: Date | null;
};
