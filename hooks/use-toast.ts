import { toast as sonnerToast } from "sonner"

export function useToast() {
  const toast = ({
    title,
    description,
    variant,
  }: {
    title?: string
    description?: string
    variant?: "default" | "destructive"
  }) => {
    const message = title && description ? `${title}: ${description}` : (title || description || "")
    if (variant === "destructive") {
      sonnerToast.error(message)
    } else {
      sonnerToast.success(message)
    }
  }

  return { toast }
}
