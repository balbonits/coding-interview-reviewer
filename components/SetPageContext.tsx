"use client";
import { useEffect } from "react";
import { usePageContext } from "@/lib/pageContext";

export function SetPageContext({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { setCtx } = usePageContext();
  useEffect(() => {
    setCtx({ title, description });
    return () => setCtx({ title: "", description: "" });
  }, [title, description, setCtx]);
  return null;
}
