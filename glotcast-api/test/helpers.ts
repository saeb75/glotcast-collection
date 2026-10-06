import { type INestApplication } from "@nestjs/common"
import { Test, type TestingModuleBuilder } from "@nestjs/testing"
import { type CryptoKey, generateKeyPair, SignJWT } from "jose"
import request from "supertest"
import { AssemblyAiClient, type AaiTranscript } from "../src/admin/transcribe/assemblyai.client"
import { type AaiSegment } from "../src/admin/transcribe/assemblyai"
import { ImageModels } from "../src/admin/covers/image-models"
import { AdminRolesModule } from "../src/admin/admin-roles.module"
import { AppModule } from "../src/app.module"
import { AUTH_KEYS } from "../src/auth/auth-verifier"
import { DRIZZLE, type Database } from "../src/database/database.module"
import {
  OneSignalClient,
  type OneSignalMessage,
  type OneSignalResult,
  type OneSignalStats,
} from "../src/notifications/onesignal.client"
import { configureApp } from "../src/setup-app"
import { R2Storage } from "../src/storage/r2.service"
import { MigrateStrapiService } from "../src/strapi/migrate-strapi.service"
import { StrapiModule } from "../src/strapi/strapi.module"
import { GoogleTranslateClient } from "../src/translate/google-translate.client"
import { SupabaseAdmin } from "../src/users/supabase-admin"
import { DictionaryClient } from "../src/words/dictionary.client"
import { type WordLookup } from "../src/words/lookup"

export const ISSUER = "https://test.supabase.co/auth/v1"

/** Supabase's admin API: records deletions instead of calling Supabase. */
export class FakeSupabaseAdmin {
  readonly configured = true
  deleted: string[] = []
  deleteUser(id: string): Promise<void> {
    this.deleted.push(id)
    return Promise.resolve()
  }
}

/** Google Translate: "[tr] text", and records what it was asked for. */
export class FakeTranslate {
  readonly configured = true
  calls: { texts: string[]; target: string; source: string }[] = []
  translate(texts: string[], target: string, source = "en"): Promise<string[]> {
    this.calls.push({ texts, target, source })
    return Promise.resolve(texts.map((t) => `[${target}] ${t}`))
  }
}

export class FakeDictionary {
  lookup(word: string, target: string): Promise<WordLookup> {
    return Promise.resolve({
      word: word.toLowerCase(),
      lemma: word.toLowerCase().replace(/ing$/, ""),
      phonetic: "/fake/",
      audioUrl: "https://audio.example.com/fake.mp3",
      translations: [{ partOfSpeech: "verb", terms: [`${target}:${word}`] }],
      definitions: [{ partOfSpeech: "verb", definition: `to ${word}`, example: null }],
    })
  }
}

export class FakeStorage {
  readonly configured = true
  puts: { name: string; contentType: string; folder: string; bytes: number }[] = []
  presignPut(folder: string, filename: string, contentType: string) {
    return Promise.resolve({
      uploadUrl: `https://r2.example.com/upload/${folder}/${filename}?sig=1&ct=${encodeURIComponent(contentType)}`,
      publicUrl: `https://cdn.example.com/${folder}/1-${filename}`,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    })
  }
  put(body: Uint8Array, name: string, contentType: string, folder: string): Promise<string> {
    this.puts.push({ name, contentType, folder, bytes: body.length })
    return Promise.resolve(`https://cdn.example.com/${folder}/1-${name}`)
  }
}

/** AssemblyAI: a job is "processing" on the first poll, then "completed". */
export class FakeAssemblyAi {
  polls = new Map<string, number>()
  submitted: string[] = []
  submit(audioUrl: string): Promise<string> {
    this.submitted.push(audioUrl)
    return Promise.resolve(`aai-${this.submitted.length}`)
  }
  get(id: string): Promise<AaiTranscript> {
    const n = (this.polls.get(id) ?? 0) + 1
    this.polls.set(id, n)
    if (n === 1) return Promise.resolve({ id, status: "processing" })
    return Promise.resolve({
      id,
      status: "completed",
      audio_duration: 4.2,
      utterances: [
        {
          text: "Hello there.",
          start: 100,
          end: 1500,
          speaker: "A",
          words: [
            { text: "Hello", start: 100, end: 600 },
            { text: "there.", start: 700, end: 1500 },
          ],
        },
      ],
    })
  }
  grouping(_id: string, kind: "sentences" | "paragraphs"): Promise<AaiSegment[]> {
    return Promise.resolve([
      {
        text: kind === "sentences" ? "Hello there." : "Hello there. Bye.",
        start: 100,
        end: 4200,
        speaker: "A",
        words: [],
      },
    ])
  }
}

/**
 * OneSignal: records every request; `subscribed = false` or an id in `invalid` makes users unreachable, like the
 * real API answers (`invalid_aliases`, "All included players are not subscribed").
 */
export class FakeOneSignal {
  configured = true
  sent: OneSignalMessage[] = []
  invalid = new Set<string>()
  stats: OneSignalStats = { successful: 3, failed: 1, errored: 0, converted: 2, received: 3 }
  send(m: OneSignalMessage): Promise<OneSignalResult> {
    this.sent.push(m)
    const invalid = m.externalIds.filter((id) => this.invalid.has(id))
    if (invalid.length === m.externalIds.length)
      return Promise.resolve({ id: null, invalidExternalIds: m.externalIds, notSubscribed: true })
    return Promise.resolve({ id: `os-${this.sent.length}`, invalidExternalIds: invalid, notSubscribed: false })
  }
  get(): Promise<OneSignalStats> {
    return Promise.resolve(this.stats)
  }
  /** The requests that reached one user. */
  to(userId: string): OneSignalMessage[] {
    return this.sent.filter((m) => m.externalIds.includes(userId))
  }
}

export class FakeImageModels {
  chat(system: string, user: string): Promise<string> {
    return Promise.resolve(`A cover for "{episode}" of "{podcast}" (${system.length}/${user.length})`)
  }
  openaiImage(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array([137, 80, 78, 71]))
  }
  geminiImage(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array([137, 80, 78, 71, 1]))
  }
}

export interface TestApp {
  app: INestApplication
  db: Database
  http: () => ReturnType<typeof request>
  token: (sub: string, opts?: TokenOptions) => Promise<string>
  as: (sub: string, opts?: TokenOptions) => Promise<{ Authorization: string }>
  fakes: {
    supabase: FakeSupabaseAdmin
    translate: FakeTranslate
    storage: FakeStorage
    assemblyai: FakeAssemblyAi
    onesignal: FakeOneSignal
  }
  migrate: () => Promise<void>
  close: () => Promise<void>
}

export interface TokenOptions {
  anonymous?: boolean
  email?: string
  admin?: boolean
  issuer?: string
  name?: string
}

/** The real AppModule with a local ES256 key instead of the project's JWKS and fakes for every outside service. */
export async function createTestApp(
  customize?: (b: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<TestApp> {
  const pair = await generateKeyPair("ES256")
  const privateKey: CryptoKey = pair.privateKey
  const fakes = {
    supabase: new FakeSupabaseAdmin(),
    translate: new FakeTranslate(),
    storage: new FakeStorage(),
    assemblyai: new FakeAssemblyAi(),
    onesignal: new FakeOneSignal(),
  }
  // The CLI-only modules (migrate-strapi, admin grant) are tested through the same app.
  let builder = Test.createTestingModule({ imports: [AppModule, StrapiModule, AdminRolesModule] })
    .overrideProvider(AUTH_KEYS)
    .useValue({ issuer: ISSUER, key: pair.publicKey })
    .overrideProvider(SupabaseAdmin)
    .useValue(fakes.supabase)
    .overrideProvider(GoogleTranslateClient)
    .useValue(fakes.translate)
    .overrideProvider(DictionaryClient)
    .useValue(new FakeDictionary())
    .overrideProvider(R2Storage)
    .useValue(fakes.storage)
    .overrideProvider(AssemblyAiClient)
    .useValue(fakes.assemblyai)
    .overrideProvider(ImageModels)
    .useValue(new FakeImageModels())
    .overrideProvider(OneSignalClient)
    .useValue(fakes.onesignal)
  if (customize) builder = customize(builder)
  const moduleRef = await builder.compile()
  const app = moduleRef.createNestApplication({ logger: ["error"] })
  configureApp(app)
  await app.init()
  const db = moduleRef.get<Database>(DRIZZLE)

  const token = (sub: string, opts: TokenOptions = {}) =>
    new SignJWT({
      is_anonymous: opts.anonymous ?? false,
      email: opts.email ?? "",
      role: "authenticated",
      app_metadata: {
        provider: opts.anonymous ? "anonymous" : "email",
        ...(opts.admin ? { role: "admin" } : {}),
      },
      user_metadata: opts.name ? { full_name: opts.name } : {},
    })
      .setProtectedHeader({ alg: "ES256" })
      .setSubject(sub)
      .setIssuer(opts.issuer ?? ISSUER)
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(privateKey)

  // Strapi's content (the fixture) → schema app; the command is idempotent, every spec may run it.
  const migrate = async () => {
    await moduleRef.get(MigrateStrapiService).run({ dryRun: false })
  }

  return {
    app,
    db,
    http: () => request(app.getHttpServer()),
    token,
    as: async (sub, opts) => ({ Authorization: `Bearer ${await token(sub, opts)}` }),
    fakes,
    migrate,
    close: () => app.close(),
  }
}

/** Legacy Strapi documentIds of the fixture (test/fixtures/strapi.sql). */
export const LEGACY = {
  aroundTheWorld: "wcjzu12yhhr7w2ea6oewhemm",
  cafeScience: "gllrbi1ptagsovmj3m6d9kws",
  unreleasedShow: "i6vyw60qtmw5mjtndjb21co3",
  lisbon: "ehfirmmax1jcmu6ix7w5o5fe",
  porto: "lor0ghjo4ij52pku6jtcxuj6",
  quantum: "kbhvv3efuk9wx8oxzruvd9na",
  draftEpisode: "wshbdxsbblvk5tc6ofw57f0d",
} as const
