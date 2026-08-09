import { HTTPException } from "hono/http-exception";
import type {
  InstructorProfileDTO,
  InstructorStudentDTO,
  PublicInstructorDTO,
  UpdateInstructorProfileDTO,
} from "../domains/instructor.types.js";
import {
  InstructorRepository,
  instructorRepository,
} from "../repositories/instructor.repository.js";

/** Matches the character counter on the profile screen. */
const MAX_BIO_LENGTH = 400;

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
      photoKey: instructor.photoKey,
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

    return {
      id: instructor.id,
      slug: instructor.slug,
      displayName: instructor.displayName,
      bio: instructor.bio,
      photoKey: instructor.photoKey,
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
