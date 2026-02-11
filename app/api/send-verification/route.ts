import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend("re_b5xNm4Y3_LmrFCtoFCfuqwTU2eSmzTXX5");

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    const { data, error } = await resend.emails.send({
      from: "ReplyRocket <onboarding@resend.dev>",
      to: email,
      subject: "Verify your ReplyRocket account",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #16181c; margin: 0; padding: 40px 20px;">
            <div style="max-width: 400px; margin: 0 auto; background-color: #1d1f23; border-radius: 16px; padding: 40px; text-align: center;">
              <div style="width: 56px; height: 56px; background-color: rgba(74, 153, 233, 0.1); border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px;">🚀</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px;">Verify your email</h1>
              <p style="color: #71767b; font-size: 14px; margin: 0 0 32px;">Enter this code to complete your registration</p>
              <div style="background-color: #16181c; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #4a99e9; letter-spacing: 8px;">${code}</span>
              </div>
              <p style="color: #71767b; font-size: 12px; margin: 0;">This code expires in 10 minutes</p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
