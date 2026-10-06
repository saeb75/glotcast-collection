import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import { sql } from "drizzle-orm"
import { DRIZZLE, type Database } from "../../database/database.module"
import { jobStatus, toChunks } from "./assemblyai"
import { AssemblyAiClient } from "./assemblyai.client"
import { type Transcription } from "./transcribe.dto"

type JobRow = { provider_job_id: string; status: string; error: string | null; result: Transcription | null }

/**
 * Transcription as a job: POST submits to AssemblyAI and stores the job; GET polls AssemblyAI until it is done,
 * then keeps the result (utterances, sentences, paragraphs — with word timings, in seconds) so later reads are
 * local.
 */
@Injectable()
export class AdminTranscribeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly aai: AssemblyAiClient,
  ) {}

  async submit(audioUrl: string, adminId: string | null): Promise<{ jobId: string }> {
    const providerJobId = await this.aai.submit(audioUrl)
    const res = await this.db.execute<{ id: string }>(sql`
      INSERT INTO app.transcription_jobs (provider_job_id, audio_url, status, created_by)
      VALUES (${providerJobId}, ${audioUrl}, 'queued', ${adminId}) RETURNING id
    `)
    return { jobId: res.rows[0]!.id }
  }

  async get(jobId: string): Promise<Transcription> {
    const res = await this.db.execute<JobRow>(
      sql`SELECT provider_job_id, status, error, result FROM app.transcription_jobs WHERE id = ${jobId}`,
    )
    const job = res.rows[0]
    if (!job) throw new NotFoundException(`transcription job ${jobId} not found`)
    if (job.status === "completed" && job.result) return job.result
    if (job.status === "error") return { status: "error", error: job.error ?? "transcription failed" }

    const t = await this.aai.get(job.provider_job_id)
    const status = jobStatus(t.status)
    if (status === "completed") {
      const [sentences, paragraphs] = await Promise.all([
        this.aai.grouping(job.provider_job_id, "sentences"),
        this.aai.grouping(job.provider_job_id, "paragraphs"),
      ])
      const result: Transcription = {
        status,
        durationSec: Number(t.audio_duration ?? 0),
        utterances: toChunks(t.utterances),
        sentences: toChunks(sentences),
        paragraphs: toChunks(paragraphs),
      }
      await this.save(jobId, status, null, result)
      return result
    }
    if (status === "error") {
      const error = t.error ?? "transcription failed"
      await this.save(jobId, status, error, null)
      return { status, error }
    }
    if (status !== job.status) await this.save(jobId, status, null, null)
    return { status }
  }

  private async save(id: string, status: string, error: string | null, result: Transcription | null) {
    await this.db.execute(sql`
      UPDATE app.transcription_jobs
      SET status = ${status}, error = ${error}, result = ${result ? JSON.stringify(result) : null}::jsonb, updated_at = now()
      WHERE id = ${id}
    `)
  }
}
