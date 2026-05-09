import { useTranslate } from "@/hooks/use-translate";

export function T({ children }: { children: string | undefined | null }) {
  return <>{useTranslate(children)}</>;
}
