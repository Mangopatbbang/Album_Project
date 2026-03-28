import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/spotify";

export async function GET() {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    // 검색 테스트
    const searchRes = await fetch(
      "https://api.spotify.com/v1/search?q=To+Pimp+A+Butterfly+Kendrick+Lamar&type=album&limit=1",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const searchText = await searchRes.text();

    return NextResponse.json({
      token_ok: !!token,
      search_status: searchRes.status,
      search_response: searchText.slice(0, 500),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
