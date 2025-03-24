import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Forward request to Express API
    const response = await axios.get("http://localhost:8000/api/check-email", {
      params: { email },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    return NextResponse.json({ message: "Error checking email" }, { status: 500 });
  }
}
