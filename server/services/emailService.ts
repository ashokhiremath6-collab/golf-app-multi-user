import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface HandicapChangeEmail {
  playerName: string;
  playerEmail: string;
  month: string;
  prevHandicap: number;
  newHandicap: number;
  delta: number;
  roundsPlayed: number;
}

export class EmailService {
  private fromEmail = 'onboarding@resend.dev'; // Default Resend test email
  
  /**
   * Send handicap change notification to a player
   */
  async sendHandicapChangeNotification(data: HandicapChangeEmail): Promise<void> {
    const {
      playerName,
      playerEmail,
      month,
      prevHandicap,
      newHandicap,
      delta,
      roundsPlayed,
    } = data;

    // Determine trend
    const trend = delta > 0 ? 'increased' : delta < 0 ? 'decreased' : 'remained the same';
    const trendEmoji = delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️';
    const changeText = delta !== 0 
      ? `${Math.abs(delta)} ${delta > 0 ? 'up' : 'down'}`
      : 'no change';

    const subject = `${trendEmoji} Your Golf Handicap Update - ${month}`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .stat-box {
      background: white;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .handicap-change {
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
    }
    .handicap-item {
      text-align: center;
    }
    .handicap-number {
      font-size: 48px;
      font-weight: bold;
      margin: 10px 0;
    }
    .old { color: #999; }
    .new { color: #667eea; }
    .arrow {
      font-size: 36px;
      color: #764ba2;
      align-self: center;
    }
    .summary {
      background: #e8f4f8;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⛳ Handicap Update</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px;">${month}</p>
  </div>
  
  <div class="content">
    <p>Hi ${playerName},</p>
    <p>Your monthly handicap has been recalculated based on your performance in ${month}.</p>
    
    <div class="handicap-change">
      <div class="handicap-item">
        <div class="stat-label">Previous</div>
        <div class="handicap-number old">${prevHandicap}</div>
      </div>
      <div class="arrow">${trendEmoji}</div>
      <div class="handicap-item">
        <div class="stat-label">New</div>
        <div class="handicap-number new">${newHandicap}</div>
      </div>
    </div>
    
    <div class="summary">
      <strong>Summary:</strong> Your handicap ${trend} by <strong>${changeText}</strong> based on ${roundsPlayed} round${roundsPlayed !== 1 ? 's' : ''} played in ${month}.
    </div>
    
    <div class="stat-box">
      <div class="stat-label">Rounds Played</div>
      <div class="stat-value">${roundsPlayed}</div>
    </div>
    
    ${delta !== 0 ? `
    <p style="margin-top: 30px;">
      ${delta > 0 
        ? "Keep practicing! Your handicap increased this month, but every round is an opportunity to improve." 
        : "Great job! Your handicap decreased this month. Keep up the excellent play!"}
    </p>
    ` : `
    <p style="margin-top: 30px;">
      Your handicap remained stable this month. ${roundsPlayed > 0 ? 'Consistent performance!' : 'Play more rounds next month to see changes.'}
    </p>
    `}
    
    <p>Keep playing and tracking your rounds to see your progress over time!</p>
    
    <div style="text-align: center; margin-top: 30px;">
      <p>View your detailed stats and history in the app.</p>
    </div>
  </div>
  
  <div class="footer">
    <p>This is an automated monthly handicap notification from Blues Golf Challenge</p>
    <p>© ${new Date().getFullYear()} Blues Golf Challenge</p>
  </div>
</body>
</html>
    `;

    const textContent = `
Hi ${playerName},

Your monthly handicap has been recalculated for ${month}.

Previous Handicap: ${prevHandicap}
New Handicap: ${newHandicap}
Change: ${changeText}
Rounds Played: ${roundsPlayed}

Your handicap ${trend} based on your performance this month.

${delta > 0 
  ? "Keep practicing! Your handicap increased this month, but every round is an opportunity to improve." 
  : delta < 0
  ? "Great job! Your handicap decreased this month. Keep up the excellent play!"
  : "Your handicap remained stable this month."}

Keep playing and tracking your rounds to see your progress over time!

---
Blues Golf Challenge
This is an automated monthly handicap notification.
    `;

    try {
      await resend.emails.send({
        from: this.fromEmail,
        to: playerEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });
      
      console.log(`✅ Handicap notification sent to ${playerEmail}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${playerEmail}:`, error);
      throw error;
    }
  }

  /**
   * Send bulk handicap notifications (for monthly recalculation)
   */
  async sendBulkHandicapNotifications(notifications: HandicapChangeEmail[]): Promise<{
    sent: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];

    console.log(`📧 Sending ${notifications.length} handicap notifications...`);

    for (const notification of notifications) {
      try {
        await this.sendHandicapChangeNotification(notification);
        sent++;
      } catch (error: any) {
        failed++;
        errors.push({
          email: notification.playerEmail,
          error: error.message || 'Unknown error',
        });
      }
    }

    console.log(`✅ Email notifications complete: ${sent} sent, ${failed} failed`);
    
    return { sent, failed, errors };
  }

  /**
   * Set custom from email (if you have a verified domain)
   */
  setFromEmail(email: string) {
    this.fromEmail = email;
  }
}

export const emailService = new EmailService();
