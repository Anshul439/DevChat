"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button"; // Assuming you have a Button component
import useAuthStore from "@/store/useAuthStore";

const VerifyPage = () => {
  const { username } = useParams();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const email = useAuthStore((state) => state.email);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const newOtp = [...otp];
    newOtp[index] = e.target.value;
    setOtp(newOtp);

    // Focus on the next input field if the user has entered a digit
    if (e.target.value && index < 5) {
      const nextInput = document.getElementById(
        `otp-${index + 1}`
      ) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Join OTP digits to form the complete OTP
    const otpValue = otp.join("");
    setIsSubmitting(true);

    try {
      // Call your API to verify the OTP (this is just an example)
      const response = await fetch("http://localhost:8000/api/verifyCode", {
        method: "POST",
        body: JSON.stringify({ email, otpValue }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log(data);
      console.log(data.message);

      if (data.message) {
        router.push("/dashboard");
      } else {
        // Handle failure (e.g., invalid OTP)
        alert("Invalid OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-6">
            OTP Verification
          </h1>
          <p className="mb-4">Enter the 6-digit OTP sent to your email.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-6 gap-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e, index)}
                className="w-full h-12 text-center text-2xl font-bold border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ))}
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full mt-6">
            {isSubmitting ? "Verifying..." : "Verify OTP"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VerifyPage;
