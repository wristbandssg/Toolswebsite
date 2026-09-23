import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCalculator, CalculationError, type CalcInputField } from "@/lib/calc-engine";

/**
 * Public calculation endpoint. The formula/logic stays server-side — the
 * browser only ever sends input values and gets a number back (Section 7 &
 * 18: calculation logic isolation + no client-exposed secrets/logic).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.values !== "object") {
    return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
  }

  const tool = await prisma.tool.findUnique({ where: { slug } });
  if (!tool || tool.status !== "published") {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  const fields: CalcInputField[] = JSON.parse(tool.calcInputs);

  try {
    const result = runCalculator(
      tool.calcType as "expression" | "custom",
      tool.slug,
      tool.calcFormula,
      fields,
      body.values
    );
    // A "custom" calculator may return a single number (legacy shape, most
    // tools) or a named breakdown object (multi-line result — see
    // Tool.calcResults). Only one of the two response keys is ever set, so
    // the client can tell which shape it got.
    if (typeof result === "number") {
      return NextResponse.json({ result });
    }
    return NextResponse.json({ results: result });
  } catch (err) {
    if (err instanceof CalculationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Something went wrong while calculating." }, { status: 500 });
  }
}
