import nodemailer from "nodemailer";

/**
 * Sends a confirmation email to the user upon a successful subscription upgrade.
 * Falls back to local logging if SMTP environment variables are not set.
 */
export async function sendSubscriptionEmail(
  toEmail: string,
  planName: string,
  storageLimitMb: number,
  paymentId: string | null,
  orderId: string | null
) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"MemoryFlix" <no-reply@memoryflix.com>`;

  const planDisplayName = planName.charAt(0).toUpperCase() + planName.slice(1);
  const storageLimitGb = (storageLimitMb / 1000).toFixed(0) + " GB";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to MemoryFlix Premium</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #141414;
            color: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: none;
            -ms-text-size-adjust: none;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: #141414;
          }
          .header {
            text-align: center;
            padding-bottom: 30px;
            border-bottom: 2px solid #e50914;
          }
          .logo {
            font-size: 32px;
            font-weight: 900;
            color: #e50914;
            letter-spacing: 2px;
            text-decoration: none;
          }
          .content {
            padding: 30px 0;
            line-height: 1.6;
          }
          .welcome {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #ffffff;
          }
          .plan-box {
            background-color: #1f1f1f;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            border: 1px solid #333333;
          }
          .plan-title {
            font-size: 18px;
            font-weight: bold;
            color: #e50914;
            margin-bottom: 15px;
          }
          .plan-details {
            font-size: 14px;
            color: #cccccc;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            border-bottom: 1px dashed #333333;
            padding-bottom: 8px;
          }
          .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .detail-label {
            font-weight: bold;
            color: #888888;
          }
          .button-container {
            text-align: center;
            margin-top: 30px;
            margin-bottom: 20px;
          }
          .button {
            background-color: #e50914;
            color: #ffffff !important;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            font-size: 16px;
            display: inline-block;
          }
          .footer {
            text-align: center;
            padding-top: 30px;
            border-top: 1px solid #333333;
            font-size: 12px;
            color: #666666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">MEMORYFLIX</span>
          </div>
          <div class="content">
            <div class="welcome">Thank you for subscribing!</div>
            <p>Your payment has been successfully processed, and your Memory Vault storage is now upgraded. You can start creating and sharing your private family streams in ultra-high quality.</p>
            
            <div class="plan-box">
              <div class="plan-title">${planDisplayName} Plan Active</div>
              <div class="plan-details">
                <div class="detail-row">
                  <span class="detail-label">Storage Capacity:</span>
                  <span>${storageLimitGb}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Payment ID:</span>
                  <span>${paymentId || "N/A"}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Subscription / Order ID:</span>
                  <span>${orderId || "N/A"}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span style="color: #4ade80; font-weight: bold;">Active</span>
                </div>
              </div>
            </div>

            <p>Click the link below to access your account, set up your profiles, and watch or upload your favorite home movies.</p>
            
            <div class="button-container">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profiles" class="button">Go to MemoryFlix</a>
            </div>
          </div>
          <div class="footer">
            <p>This email was sent automatically to confirm your subscription purchase.</p>
            <p>&copy; ${new Date().getFullYear()} MemoryFlix. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const emailText = `
    MEMORYFLIX - Welcome to Premium!
    
    Thank you for subscribing. Your payment has been successfully processed, and your Memory Vault storage is now upgraded.
    
    Plan: ${planDisplayName}
    Storage Capacity: ${storageLimitGb}
    Payment ID: ${paymentId || "N/A"}
    Subscription / Order ID: ${orderId || "N/A"}
    Status: Active
    
    Go to MemoryFlix: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profiles
    
    © ${new Date().getFullYear()} MemoryFlix. All rights reserved.
  `;

  console.log("=====================================================================");
  console.log(`[EMAIL SIMULATOR] SIMULATED EMAIL NOTIFICATION SENT SUCCESSFULLY`);
  console.log(`[EMAIL SIMULATOR] TO: ${toEmail}`);
  console.log(`[EMAIL SIMULATOR] SUBJECT: MemoryFlix: Subscription Confirmed (${planDisplayName} Plan)`);
  console.log(`[EMAIL SIMULATOR] BODY:\n${emailText.trim()}`);
  console.log("=====================================================================");

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("SMTP credentials are not configured in environment variables. Email was logged to terminal console above.");
    return { success: true, simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `MemoryFlix: Subscription Confirmed (${planDisplayName} Plan)`,
      text: emailText,
      html: emailHtml,
    });

    console.log(`Email successfully sent to ${toEmail} over SMTP. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send subscription confirmation email via SMTP:", error);
    return { success: false, error };
  }
}
