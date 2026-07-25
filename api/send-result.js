// api/send-result.js
// دالة Vercel Serverless — بتستقبل نتيجة الامتحان من الصفحة وتبعتها لتليجرام.
// التوكن ومعرّف الشات بيتقروا من Environment Variables في إعدادات Vercel،
// مش موجودين هنا في الكود، فمش هيظهروا أبدًا لأي زائر ومش هيتكشفوا زي ما حصل قبل كده.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars in Vercel settings");
    return res.status(500).json({ ok: false, error: "Server not configured (missing env vars)" });
  }

  try {
    const { studentName, score, total, percentage, answers, questionsData } = req.body || {};

    if (typeof score !== "number" || typeof total !== "number" || !Array.isArray(questionsData)) {
      return res.status(400).json({ ok: false, error: "Invalid payload" });
    }

    const pct = Number(percentage);
    const gradeLabel = pct >= 80 ? "امتياز" : (pct >= 60 ? "جيد جدا" : "ضعيف - يحتاج مراجعة");

    const wrongList = questionsData
      .map((q, idx) => ({ q, idx, given: answers ? answers[idx] : undefined }))
      .filter((item) => item.given !== item.q.correctIndex)
      .map((item) => `س${item.idx + 1}`)
      .join("، ");

    let text = `📝 نتيجة اختبار أساسيات البرمجة\n`;
    text += `👤 الطالب: ${studentName || "غير مسجل"}\n`;
    text += `✅ الدرجة: ${score} / ${total} (${pct.toFixed(0)}%)\n`;
    text += `🏷️ التقييم: ${gradeLabel}\n`;
    text += wrongList ? `❌ الأسئلة الخاطئة: ${wrongList}\n` : `🌟 إجابة كل الأسئلة صح!\n`;

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const data = await tgRes.json();

    if (!data.ok) {
      console.error("Telegram rejected message:", data);
      return res.status(502).json({ ok: false, error: "Telegram API error", details: data });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("send-result error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
};
