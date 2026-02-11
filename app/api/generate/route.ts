import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, userProfile, currentDraft } = await request.json();

    const systemPrompt = `You are a Twitter/X content assistant helping ${userProfile.name} (@${userProfile.handle}) create engaging tweets.

User Profile:
- Name: ${userProfile.name}
- Handle: @${userProfile.handle}
- Bio: ${userProfile.bio}
- Tone: ${userProfile.tone}
- Topics they post about: ${userProfile.topics}

Guidelines:
- Keep tweets under 280 characters
- Match the user's tone and style
- Make content relevant to their topics
- Be authentic and engaging
- Don't use hashtags unless specifically requested`;

    const userMessage = currentDraft
      ? `The user is working on this draft: "${currentDraft}"\n\nTheir request: ${prompt}`
      : prompt;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.8,
    });

    const response = completion.choices[0]?.message?.content || "";

    return NextResponse.json({ result: response });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
