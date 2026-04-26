"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

export type PageCtx = {
  title: string;
  description: string;
};

const defaultCtx: PageCtx = { title: "", description: "" };

const Ctx = createContext<{
  ctx: PageCtx;
  setCtx: (c: PageCtx) => void;
}>({ ctx: defaultCtx, setCtx: () => {} });

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<PageCtx>(defaultCtx);
  return <Ctx.Provider value={{ ctx, setCtx }}>{children}</Ctx.Provider>;
}

export function usePageContext() {
  return useContext(Ctx);
}
