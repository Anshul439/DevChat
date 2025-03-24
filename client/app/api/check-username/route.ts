import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ message: "Username is required" }, { status: 400 });
    }

    // Forward request to Express API
    const response = await axios.get("http://localhost:8000/api/check-username", {
      params: { username },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    return NextResponse.json({ message: "Error checking username" }, { status: 500 });
  }
}
