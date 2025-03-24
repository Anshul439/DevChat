import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request, { params }: { params: { state: string } }) {
  try {
    const { code } = await req.json();
    const { state } = params; // Extract state (Google, GitHub, etc.)
    console.log(state);
    

    const response = await axios.post(`http://localhost:8000/api/auth/${state}`, { code }, {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });
    console.log(response.data, "HAHAHHAHAHA");
    

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || "OAuth authentication failed" },
      { status: error.response?.status || 500 }
    );
  }
}
