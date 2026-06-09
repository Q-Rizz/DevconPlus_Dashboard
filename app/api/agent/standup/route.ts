import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendTelegramMessage } from "@/lib/telegram";
import { buildDailyStandup } from "@/lib/buildStandup";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runStandup();
}

export async function POST() {
  return runStandup();
}

async function runStandup() {
  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split("T")[0];

  const digestBody = await buildDailyStandup();

  await supabase.from("announcements").insert({
    title: `Daily Standup — ${today}`,
    body: digestBody,
  });

  let telegramError: string | undefined;
  try {
    await sendTelegramMessage(digestBody.slice(0, 4096));
  } catch (err) {
    telegramError = err instanceof Error ? err.message : String(err);
    console.error("[standup] Telegram send error:", err);
  }

  return NextResponse.json({ ok: true, date: today, length: digestBody.length, ...(telegramError && { telegram_error: telegramError }) });
}
