import { ForgePage } from "@/components/forge/ForgePage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string; model?: string }>;
}) {
  const { prompt = "", model = "gemini-flash" } = await searchParams;
  return <ForgePage initialPrompt={decodeURIComponent(prompt)} initialModel={model} />;
}
