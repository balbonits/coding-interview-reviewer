import { NextRequest } from "next/server";
import { checkJdkStatus, runJava } from "@/lib/javaRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CODE_BYTES = 100_000;
const MAX_STDIN_BYTES = 50_000;

const INSTALL_HINT =
  "Install JDK 21: `brew install openjdk@21` then `sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk`";

export async function GET() {
  const status = await checkJdkStatus();
  return Response.json({ ...status, installHint: INSTALL_HINT });
}

export async function POST(req: NextRequest) {
  let body: { code?: unknown; stdin?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = body.code;
  if (typeof code !== "string" || code.length === 0) {
    return Response.json(
      { error: "Missing or invalid `code` (string, non-empty)" },
      { status: 400 },
    );
  }
  if (code.length > MAX_CODE_BYTES) {
    return Response.json(
      { error: `Code too large (max ${MAX_CODE_BYTES} bytes)` },
      { status: 413 },
    );
  }

  const stdin = typeof body.stdin === "string" ? body.stdin : "";
  if (stdin.length > MAX_STDIN_BYTES) {
    return Response.json(
      { error: `Stdin too large (max ${MAX_STDIN_BYTES} bytes)` },
      { status: 413 },
    );
  }

  const status = await checkJdkStatus();
  if (!status.ok) {
    return Response.json(
      {
        error: status.stub
          ? "No JDK installed (macOS stub detected)."
          : "JDK not available.",
        detail: status.error,
        installHint: INSTALL_HINT,
      },
      { status: 503 },
    );
  }

  const result = await runJava(code, stdin);
  return Response.json(result);
}
