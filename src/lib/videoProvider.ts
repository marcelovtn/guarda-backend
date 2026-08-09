/**
 * The single seam between GUARDA and whatever hosts the lesson videos.
 *
 * Nothing outside this file should know where a video actually lives — no
 * service or controller may reach into `lib/r2.ts` for a lesson. That is
 * deliberate: the real delivery pipeline (transcoding, HLS, adaptive bitrate,
 * a genuine processing status) is being built separately. When it lands, the
 * only thing that changes is which implementation `videoProvider` points at.
 *
 * The R2 implementation below is intentionally minimal. It stores the original
 * upload and serves it back as a single file. That is enough to build and use
 * every screen, and it is not enough to ship to students on mobile data.
 */
import { getPresignedUploadUrl } from "./r2.js";

/** Where a lesson video is in its journey from upload to playable. */
export type VideoProcessingState = "pending" | "processing" | "ready" | "failed";

export type VideoProcessingStatus = {
  state: VideoProcessingState;
  /** 0–100. Meaningful only while `state` is "processing". */
  percent: number;
  /** Populated when `state` is "failed". */
  error?: string;
};

export type VideoUploadTarget = {
  /** Where the browser PUTs the file. */
  uploadUrl: string;
  /** Store this on the Lesson — it is how the video is referenced later. */
  key: string;
  /** Seconds until `uploadUrl` stops being valid. */
  expiresIn: number;
};

export interface VideoProvider {
  /**
   * Issues an upload destination for a new lesson video. The blob goes
   * straight from the browser to storage; it never passes through the API.
   */
  createUploadTarget(params: {
    fileName: string;
    contentType: string;
    instructorId: string;
  }): Promise<VideoUploadTarget>;

  /**
   * Resolves a stored key into something a player can load.
   *
   * Implementations backed by a streaming service will return a signed,
   * short-lived URL here, so callers must not cache the result.
   */
  getPlaybackUrl(key: string): Promise<string>;

  /**
   * Whether the video is playable yet.
   *
   * The "Nova aula" screen polls this to drive its progress bar and to decide
   * when publishing can be unblocked.
   */
  getProcessingStatus(key: string): Promise<VideoProcessingStatus>;
}

/** Namespaces lesson videos in the bucket, per instructor. */
function lessonFolder(instructorId: string): string {
  return `lessons/${instructorId}`;
}

/**
 * Stores the raw upload in R2 and serves the original file back.
 *
 * There is no transcoding step, so a video is "ready" the moment it finishes
 * uploading — `getProcessingStatus` has nothing to report and always says so.
 * A real provider replaces this with an actual pipeline state.
 */
export class R2VideoProvider implements VideoProvider {
  async createUploadTarget({
    fileName,
    contentType,
    instructorId,
  }: {
    fileName: string;
    contentType: string;
    instructorId: string;
  }): Promise<VideoUploadTarget> {
    // Matches the video policy in the storage module: a multi-gigabyte upload
    // on a home connection needs hours, not minutes.
    const expiresIn = 6 * 60 * 60;

    const key = `${lessonFolder(instructorId)}/${crypto.randomUUID()}.${
      fileName.split(".").pop() ?? "mp4"
    }`;

    const { presignedUrl } = await getPresignedUploadUrl(
      key,
      contentType,
      expiresIn,
    );

    return { uploadUrl: presignedUrl, key, expiresIn };
  }

  async getPlaybackUrl(key: string): Promise<string> {
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!publicUrl) {
      throw new Error("R2_PUBLIC_URL não configurado");
    }
    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  }

  async getProcessingStatus(key: string): Promise<VideoProcessingStatus> {
    // Nothing processes the file, so anything that has a key is playable.
    return { state: key ? "ready" : "pending", percent: 100 };
  }
}

export const videoProvider: VideoProvider = new R2VideoProvider();
