import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // Parse incoming request body
    const response = await axios.post("http://localhost:8000/api/signup", body, {
      withCredentials: true,
    });

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || "Signup failed" },
      { status: error.response?.status || 500 }
    );
  }
}
