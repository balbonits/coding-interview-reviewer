import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

type QuizMeProps =
  | { source: "interview-note"; id: string; size?: "sm" | "default" }
  | { source: "note"; slug: string; size?: "sm" | "default" }
  | { source: "exercise"; slug: string; size?: "sm" | "default" }
  | { source: "topic"; topic: string; size?: "sm" | "default" };

/**
 * Universal "Quiz me" entry point. Sends the user to /quiz with URL params
 * that auto-trigger generation against the given source.
 */
export function QuizMeButton(props: QuizMeProps) {
  const params = new URLSearchParams({ source: props.source });
  if (props.source === "interview-note") params.set("id", props.id);
  else if (props.source === "note" || props.source === "exercise")
    params.set("slug", props.slug);
  else if (props.source === "topic") params.set("topic", props.topic);

  return (
    <Link href={`/quiz?${params.toString()}`}>
      <Button variant="outline" size={props.size ?? "sm"}>
        <ListChecks className="size-4" />
        <span className="hidden sm:inline">Quiz me</span>
      </Button>
    </Link>
  );
}
