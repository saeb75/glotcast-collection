import { toast } from "sonner"

/** Short notices in the corner (sonner). Never knows the store. */
export class ToastService {
  static error(title: string, description?: string): void {
    toast.error(title, { description })
  }

  static success(title: string, description?: string): void {
    toast.success(title, { description })
  }

  static info(title: string, description?: string): void {
    toast(title, { description })
  }

  /** A notice with one action (Undo). */
  static withAction(title: string, label: string, onClick: () => void): void {
    toast(title, { action: { label, onClick } })
  }
}
