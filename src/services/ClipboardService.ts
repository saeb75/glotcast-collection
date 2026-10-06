/** The system clipboard; false when the browser refuses (insecure origin, no permission). */
export class ClipboardService {
  static async copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
}
