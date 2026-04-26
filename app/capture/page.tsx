import { CaptureForm } from "@/components/CaptureForm";

export const metadata = {
  title: "Quick Capture · Coding Interview Reviewer",
};

export default function CapturePage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Quick Capture</h1>
        <p className="mt-2 text-muted-foreground">
          Draft notes and exercise ideas on the go. Download as MDX to add to the repo later.
        </p>
      </header>
      <CaptureForm />
    </div>
  );
}
