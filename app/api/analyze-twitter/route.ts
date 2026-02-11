import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { handle, tweets } = await request.json();

    if (!tweets || tweets.length === 0) {
      return NextResponse.json({
        error: "No tweets provided",
      }, { status: 400 });
    }

    const tweetsText = tweets.join("\n---\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing Twitter/X writing styles. Analyze the provided tweets and extract:
1. The user's writing tone (casual, professional, witty, inspirational, educational, or bold)
2. A brief bio/description of who they are based on their tweets (1-2 sentences)
3. The main topics they tweet about (comma-separated list)

Respond in JSON format:
{
  "tone": "casual" | "professional" | "witty" | "inspirational" | "educational" | "bold",
  "bio": "string",
  "topics": "string"
}`
        },
        {
          role: "user",
          content: `Analyze these tweets from @${handle}:\n\n${tweetsText}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || "";

    try {
      // Try to parse as JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      }
    } catch {
      // If parsing fails, return a default
    }

    return NextResponse.json({
      tone: "casual",
      bio: "",
      topics: "",
    });
  } catch (error) {
    console.error("Twitter analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze Twitter profile" },
      { status: 500 }
    );
  }
}
