/**
 * Cover-prompt styles and the system prompt, ported verbatim from whisper-transcriber
 * (app/api/generate-prompt/route.ts). The model writes `{podcast}` / `{episode}` tokens; the service fills them in.
 */
export const STYLE_IDS = [
  "vibrant-gradient",
  "cinematic-photo",
  "minimal-editorial",
  "risograph",
  "bold-pop",
] as const
export type StyleId = (typeof STYLE_IDS)[number]

export const STYLES: Record<StyleId, { sceneRule: string; styleTail: string; hardRule: string }> = {
  "vibrant-gradient": {
    sceneRule:
      "Describe an EXPRESSIVE, STYLIZED podcast-cover composition (NOT a literal photo). Lean into bold graphic shapes, atmospheric multi-stop gradients, soft glows, dreamlike color washes, silhouettes, simplified symbolic subjects, abstract motifs, or risograph/editorial-illustration vibes. The background must feature rich gradient transitions blending multiple harmonious colors (smooth multi-stop blends, color fields, glow halos, aurora-like washes) — not a flat single color and not a photographic scene. Anchor the palette in the brand colors below but feel free to extend with one or two harmonious accent hues (warm coral, electric violet, deep teal, peach, lilac, amber, etc.) for atmospheric depth.",
    styleTail:
      "Vibrant, gradient-rich, stylized podcast cover artwork; bold modern editorial design; multi-stop color blends; soft glows and atmospheric washes; clean composition; high detail; poster-quality finish.",
    hardRule:
      "This is stylized cover ARTWORK — not a literal photograph. Lean into colorful gradients, simplified shapes, glows, and graphic motifs. Avoid hyperreal photography, stock-photo realism, or naturalistic camera lens artifacts.",
  },
  "cinematic-photo": {
    sceneRule:
      "Describe a concrete, photorealistic CINEMATIC scene: subject, environment, time of day, lighting (golden hour, blue hour, neon, candlelight, harsh sun, soft window light, etc.), atmosphere, lens character (wide, 35mm, 50mm, anamorphic), shallow depth of field, film-grain feel. Think prestige editorial photography or a still from an A24 / Roger Deakins frame. Background is a real-world setting, not abstract gradients.",
    styleTail:
      "Photorealistic cinematic photography; natural or motivated lighting; shallow depth of field; subtle film grain; rich tonal range; cohesive color grade leaning toward the brand palette; high detail; magazine-cover finish.",
    hardRule:
      "Realistic photography style ONLY. No illustrations, no cartoons, no flat graphic shapes, no surreal abstractions. The image must read as an actual photograph.",
  },
  "minimal-editorial": {
    sceneRule:
      "Describe a MINIMALIST editorial cover: a single, simple, symbolic subject placed with intention against generous negative space. Limited palette of 2-3 colors only (drawn from the brand pair, optionally one quiet accent). Subtle, refined gradients or flat fields are acceptable; no busy detail, no clutter, no photography. Think Pentagram, The Atlantic, or modern Substack-style design — restrained, confident, white-space-forward.",
    styleTail:
      "Minimal modern editorial design; generous negative space; restrained palette; refined geometric or symbolic motif; flat or softly graduated color fields; clean Swiss-style composition; premium magazine finish.",
    hardRule:
      "Strict minimalism. No photography, no busy illustration, no more than 2-3 colors in total across the entire artwork (typography colors counted in addition). Negative space dominates the composition.",
  },
  risograph: {
    sceneRule:
      "Describe a RISOGRAPH-print podcast cover: limited spot-color palette (2-3 inks), grainy paper texture, slight off-register color shifts at edges, halftone dot patterns, layered transparent ink overlays, hand-printed analog charm. The subject is a stylized symbolic motif or simplified illustration. Vintage 70s-80s art-school print aesthetic. Brand colors are used as primary ink layers; one additional spot color (mustard, electric blue, sage, salmon) is acceptable.",
    styleTail:
      "Authentic risograph print aesthetic; grainy paper stock; halftone dot textures; soft off-register overlap edges; spot-color ink layers; vintage editorial print finish.",
    hardRule:
      "Must read as an actual risograph print — visible paper grain, halftone, slight ink misalignment. No smooth digital gradients in the artwork itself, no photography, no high-gloss digital finish (typography rendering remains clean as specified below).",
  },
  "bold-pop": {
    sceneRule:
      "Describe a BOLD POP-ART podcast cover: high-contrast flat color blocks, thick clean outlines or no outlines, geometric or simplified figurative shapes, confident graphic punch. Think modern Spotify Originals editorial, Bauhaus-inflected, Saul Bass-adjacent, or contemporary book-cover boldness. Strong, saturated colors arranged in deliberate blocks; one or two harmonious accent hues alongside the brand pair are welcome.",
    styleTail:
      "Bold pop / graphic-design cover artwork; flat saturated color blocks; high contrast; confident geometric or figurative shapes; Bauhaus / Saul Bass / modern editorial influence; clean poster finish.",
    hardRule:
      "Flat, graphic, high-contrast design only. No photography, no soft atmospheric gradients dominating the composition, no painterly illustration. Color blocks and shapes are crisp and intentional.",
  },
}

const TYPOGRAPHY_BLOCK = `Render the episode title "{episode}" exactly ONCE as the dominant headline in the central or upper-central portion of the image: large, set in an elegant modern editorial sans-serif (like Söhne, GT America, or Inter Display) at a heavy weight (semibold or bold), tight optical kerning, crisp and perfectly legible. Render the podcast name "{podcast}" exactly ONCE, placed as a refined masthead centered horizontally across the very top edge of the image — capitalize, generous letter-spacing (wide tracking), light to regular weight, set in the same editorial sans-serif family, noticeably smaller than the episode title, treated as a publication wordmark. The podcast name must NOT also appear at the bottom, in a corner, or anywhere else; it appears in exactly one location (the top masthead) and nowhere else. The episode title must NOT be repeated either. Pick typography colors that read with strong contrast against the underlying artwork and that feel native to its palette and style; if the area behind the text is too busy, subtly darken or desaturate that part of the background (no overlay rectangles, no banners, no boxes — just gentle integrated darkening). Both titles share a consistent, premium typographic system; spelling must be exact; no extra words, no logos, no captions, no watermarks, and no other text of any kind anywhere in the image.`

export function buildSystemPrompt(style: StyleId): string {
  const s = STYLES[style]
  return `You craft cover-image prompts for podcast episodes.

Given a transcript, produce ONE prompt for a single podcast COVER artwork that captures the episode's mood, subject, or central metaphor AND renders the show + episode titles as typography on the artwork. The cover's visual style is fixed to the style brief below.

Style brief: ${style}.

Required structure (write the prompt in this order):

1. Scene / artwork description — 1-2 sentences. ${s.sceneRule} Leave compositional space at the top (for the masthead) and center/upper-center (for the headline) so typography sits cleanly.

2. Typography block — append, verbatim, this exact phrasing (keeping the curly-brace tokens as-is):
   ${TYPOGRAPHY_BLOCK}

3. Style tail — end with: ${s.styleTail}

Hard rules:
- The tokens {podcast} and {episode} must remain EXACTLY as written, with curly braces. Do not replace or invent values.
- ${s.hardRule}
- The ONLY text rendered in the image is the episode title and the podcast name. Nothing else.
- Output ONLY the prompt text itself. No quotes wrapping the whole prompt, no preamble, no commentary.`
}

/** The model's prompt with the real names in place of the tokens. */
export function fillTokens(prompt: string, podcastName: string, episodeTitle: string): string {
  return prompt.replaceAll("{podcast}", podcastName).replaceAll("{episode}", episodeTitle)
}

/** Appended to every image prompt (the text-only part of whisper-transcriber's STYLE_HINT, which also forced the
 * vibrant-gradient look whatever style the prompt was written in). */
export const IMAGE_TEXT_RULE =
  "Aside from the explicitly described episode title and podcast name, no other text, captions, logos, or watermarks anywhere in the image."
