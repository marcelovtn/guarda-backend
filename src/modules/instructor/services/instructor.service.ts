import { HTTPException } from "hono/http-exception";
import type {
  CreateInstructorDTO,
  InstructorProfileDTO,
  InstructorStudentDTO,
  PublicInstructorDTO,
  UpdateInstructorProfileDTO,
} from "../domains/instructor.types.js";
import {
  InstructorRepository,
  instructorRepository,
} from "../repositories/instructor.repository.js";
import { storageService } from "../../storage/services/storage.service.js";

/** Matches the character counter on the profile screen. */
const MAX_BIO_LENGTH = 400;

/** Slug vira URL pública, então só o que sobrevive a um endereço. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class InstructorService {
  private readonly repository: InstructorRepository;

  constructor(repository = instructorRepository) {
    this.repository = repository;
  }

  /** Profile a student sees before subscribing. */
  async getPublicProfile(slug: string): Promise<PublicInstructorDTO> {
    const instructor = await this.repository.findPublishedBySlug(slug);

    if (!instructor) {
      throw new HTTPException(404, { message: "Professor não encontrado" });
    }

    return {
      id: instructor.id,
      slug: instructor.slug,
      displayName: instructor.displayName,
      bio: instructor.bio,
      photoUrl: storageService.resolvePublicUrl(instructor.photoKey),
      monthlyPrice: instructor.monthlyPrice,
      stats: await this.repository.getStats(instructor.id),
    };
  }

  /** The requesting user's own instructor profile. */
  async getOwnProfile(): Promise<InstructorProfileDTO> {
    const instructor = await this.repository.findCurrent();

    if (!instructor) {
      throw new HTTPException(403, { message: "Not an instructor" });
    }

    return this.toProfileDTO(instructor);
  }

  /**
   * Promove uma conta existente a professor.
   *
   * Não existe caminho self-service de propósito: a linha `Instructor` é o que
   * permite publicar e cobrar, então quem ganha uma é decisão, não formulário.
   * Fora do seed, este é o único jeito de criar uma.
   */
  async promoteToInstructor(
    data: CreateInstructorDTO,
  ): Promise<InstructorProfileDTO> {
    const email = data.email?.trim().toLowerCase();
    const slug = data.slug?.trim().toLowerCase();
    const displayName = data.displayName?.trim();
    const bio = data.bio?.trim() ?? null;
    const monthlyPrice = data.monthlyPrice ?? 0;

    if (!email || !slug || !displayName) {
      throw new HTTPException(400, {
        message: "Campos obrigatórios: email, slug, displayName",
      });
    }

    if (!SLUG_PATTERN.test(slug)) {
      throw new HTTPException(400, {
        message:
          "O slug aceita apenas letras minúsculas, números e hífen entre palavras",
      });
    }

    if (bio && bio.length > MAX_BIO_LENGTH) {
      throw new HTTPException(400, {
        message: `A descrição pode ter no máximo ${MAX_BIO_LENGTH} caracteres`,
      });
    }

    if (monthlyPrice < 0) {
      throw new HTTPException(400, { message: "Preço inválido" });
    }

    const user = await this.repository.findUserByEmail(email);

    if (!user) {
      throw new HTTPException(404, {
        message: "Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar primeiro.",
      });
    }

    if (await this.repository.findByUserId(user.id)) {
      throw new HTTPException(409, { message: "Essa conta já é professor" });
    }

    if (await this.repository.findBySlug(slug)) {
      throw new HTTPException(409, { message: "Esse slug já está em uso" });
    }

    const instructor = await this.repository.createForUser(user.id, {
      slug,
      displayName,
      bio,
      monthlyPrice,
      // Publicar é decisão de quem vai aparecer na vitrine, não de quem promove.
      published: data.published ?? false,
    });

    return this.toProfileDTO(instructor);
  }

  private async toProfileDTO(instructor: {
    id: string;
    slug: string;
    displayName: string;
    bio: string | null;
    photoKey: string | null;
    monthlyPrice: number;
    published: boolean;
  }): Promise<InstructorProfileDTO> {
    return {
      id: instructor.id,
      slug: instructor.slug,
      displayName: instructor.displayName,
      bio: instructor.bio,
      photoUrl: storageService.resolvePublicUrl(instructor.photoKey),
      monthlyPrice: instructor.monthlyPrice,
      published: instructor.published,
      stats: await this.repository.getStats(instructor.id),
    };
  }

  async updateOwnProfile(
    data: UpdateInstructorProfileDTO,
  ): Promise<InstructorProfileDTO> {
    const instructor = await this.repository.findCurrent();

    if (!instructor) {
      throw new HTTPException(403, { message: "Not an instructor" });
    }

    if (data.displayName !== undefined && data.displayName.trim() === "") {
      throw new HTTPException(400, { message: "O nome não pode ficar vazio" });
    }

    if (data.bio && data.bio.length > MAX_BIO_LENGTH) {
      throw new HTTPException(400, {
        message: `A descrição pode ter no máximo ${MAX_BIO_LENGTH} caracteres`,
      });
    }

    if (data.monthlyPrice !== undefined && data.monthlyPrice < 0) {
      throw new HTTPException(400, { message: "Preço inválido" });
    }

    await this.repository.update(instructor.id, {
      ...data,
      displayName: data.displayName?.trim(),
      bio: data.bio?.trim() ?? data.bio,
    });

    return this.getOwnProfile();
  }

  async listOwnStudents(): Promise<InstructorStudentDTO[]> {
    const instructor = await this.repository.findCurrent();

    if (!instructor) {
      throw new HTTPException(403, { message: "Not an instructor" });
    }

    return this.repository.listStudents(instructor.id);
  }
}

export const instructorService = new InstructorService();
