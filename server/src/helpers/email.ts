import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailVerify = async (email: string, username: string, verifyCode: string): Promise<void> => {
    try {
      await resend.emails.send({
        from: "Chatter <noreply@anshulwadhwa.me>",
        to: email,
        subject: "Verify Your Email - Chatter",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f9;
                margin: 0;
                padding: 0;
                color: #333;
              }
              .email-container {
                max-width: 600px;
                margin: 20px auto;
                background: #fff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                background-color: #4CAF50;
                color: #fff;
                text-align: center;
                padding: 20px;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .content {
                padding: 20px;
                line-height: 1.6;
                font-size: 16px;
              }
              .otp {
                display: block;
                margin: 20px 0;
                font-size: 24px;
                font-weight: bold;
                color: #4CAF50;
                text-align: center;
                background: #f9f9f9;
                border: 1px dashed #4CAF50;
                padding: 10px;
                border-radius: 5px;
              }
              .footer {
                text-align: center;
                padding: 10px;
                background: #f9f9f9;
                font-size: 14px;
                color: #777;
              }
              .footer a {
                color: #4CAF50;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>Welcome to Chatter, ${username}!</h1>
              </div>
              <div class="content">
                <p>Thank you for signing up for Chatter. Please use the verification code below to verify your email address:</p>
                <span class="otp">${verifyCode}</span>
                <p>If you didn’t create an account with Chatter, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>Need help? Contact our <a href="mailto:support@chatter.com">support team</a>.</p>
                <p>&copy; 2024 Chatter. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw new Error("Failed to send verification email");
    }
  };