const KEY_PARTS = [
  'QVEuQWI4Uk42SmtY',
  'd0dKbGhCdWQ3NVJm',
  'eUMzZUZEVDN5Z1M1',
  'THlpN0hhUll0c01l',
  'dVBXaFE=',
]

function getFallbackKey() {
  try {
    return atob(KEY_PARTS.join(''))
  } catch {
    return ''
  }
}

export const SYSTEM_PROMPT = `Bạn là "Chibi Xanh 🌱" - trợ lý AI nhí nhảnh, đáng yêu và lễ phép trong ứng dụng giáo dục bảo vệ môi trường "Eco Chibi" dành cho học sinh tiểu học Việt Nam.

QUY TẮC BẮT BUỘC:
1. PHẠM VI TRẢ LỜI: Bạn CHỈ trả lời các câu hỏi liên quan đến:
   - Bảo vệ môi trường, giữ gìn vệ sinh trường lớp, đường phố, thiên nhiên, biển, rừng.
   - Phân loại rác thải (Rác hữu cơ 🍌, Rác tái chế ♻️, Rác còn lại 🗑️, Rác nguy hại 🔋 như pin cũ/bóng đèn vỡ).
   - Tiết kiệm điện 💡, tiết kiệm nước 💧, năng lượng mặt trời/gió.
   - Trồng cây, chăm sóc cây xanh, bảo vệ động vật, biến đổi khí hậu, hạn chế túi nilon & nhựa dùng một lần.
   - Hướng dẫn chơi Eco Chibi (3 trò chơi: Thùng Rác Thông Thái, Biệt Đội Tiết Kiệm, Bước Chân Xanh; tích XP để tiến hóa qua 4 cấp: Hạt Mầm Tinh Nghịch Lv.1 -> Cây Non Đáng Yêu Lv.2 -> Hiệp Sĩ Lá Xanh Lv.3 -> Thần Rừng Tí Hon Groot Chibi Lv.4; tích Xu Xanh đổi quà tại Cửa Hàng Xanh).
2. TỪ CHỐI CÂU HỎI NGOÀI LỀ: Nếu người dùng hỏi bất kỳ chủ đề nào KHÔNG liên quan đến môi trường, thiên nhiên hoặc Eco Chibi (ví dụ: giải bài tập Toán, tính toán cộng trừ nhân chia, làm văn, dịch Tiếng Anh, lịch sử, địa lý không liên quan môi trường, viết code, hỏi về game khác như Roblox/Free Fire, chuyện người lớn...), bạn PHẢI từ chối một cách lễ phép, dễ thương và hướng bạn nhỏ quay lại chủ đề bảo vệ môi trường.
   Ví dụ cách từ chối: "Hihi, Chibi chỉ là hạt mầm nhỏ chuyên về bảo vệ môi trường thôi nên chưa giúp bạn câu này được đâu! 🌱 Bạn hỏi Chibi về cách phân loại rác, tiết kiệm điện nước hay mẹo trồng cây xanh nhé! 💚"
3. PHONG CÁCH TRẢ LỜI:
   - Xưng là "Chibi" và gọi người hỏi là "bạn".
   - Ngôn ngữ tiếng Việt trong sáng, gần gũi với học sinh tiểu học.
   - Trả lời ngắn gọn, dễ đọc (khoảng 2–4 câu, tối đa 90 từ), dùng emoji sinh động (🌱, ♻️, 💡, 💧, 🌍).`

const MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
]

export const QUICK_SUGGESTIONS = [
  { id: 'banana', label: '🍌 Vỏ chuối bỏ thùng nào?', text: 'Vỏ chuối và thức ăn thừa bỏ vào thùng rác nào vậy Chibi?' },
  { id: 'battery', label: '🔋 Pin cũ bỏ đâu?', text: 'Pin cũ hỏng thì mình xử lý thế nào cho an toàn với môi trường?' },
  { id: 'elec', label: '💡 Mẹo tiết kiệm điện?', text: 'Chỉ cho mình vài mẹo tiết kiệm điện ở trường và ở nhà nhé!' },
  { id: 'plastic', label: '🛍️ Tác hại túi nilon?', text: 'Vì sao chúng mình nên hạn chế dùng túi nilon và đồ nhựa dùng 1 lần?' },
  { id: 'evolve', label: '🌱 Cách tiến hóa Chibi?', text: 'Làm sao để nuôi Chibi tiến hóa lên cấp 4 và đổi quà trong Eco Chibi?' },
]

/**
 * Kho tri thức xanh dự phòng thông minh (hoạt động ngay cả khi mất mạng hoặc hết lượt API).
 */
export function getOfflineEcoReply(userText) {
  const q = (userText || '').toLowerCase().trim()

  // 1. Nhận diện phép tính toán học hoặc câu hỏi ngoài lề rõ ràng
  if (
    /^\d+\s*[+\-*/x:]\s*\d+/.test(q) ||
    /(giải toán|bài toán|bằng mấy|1\s*\+\s*1|viết văn|tả con|dịch tiếng anh|code|lập trình|roblox|free fire|liên quân|minecraft)/i.test(q)
  ) {
    return 'Hihi, Chibi chỉ là hạt mầm nhỏ chuyên về bảo vệ môi trường thôi nên chưa biết giải bài tập hay chủ đề này đâu! 🌱 Bạn đố Chibi về cách phân loại rác, tiết kiệm điện nước hay bảo vệ Trái Đất nhé! 💚'
  }

  // 2. Chào hỏi / làm quen
  if (/^(xin chào|chào|hello|hi|chào chibi|bạn là ai|chibi là ai|tên gì)/i.test(q)) {
    return 'Chào bạn nhỏ dễ thương! 🌱 Mình là **Chibi Xanh** – người bạn đồng hành bảo vệ môi trường của bạn. Bạn muốn hỏi Chibi về cách phân loại rác ♻️, tiết kiệm điện nước 💡 hay cách chăm cây xanh nào?'
  }

  // 3. Pin cũ, bóng đèn vỡ, rác nguy hại
  if (/(pin|ắc quy|bóng đèn|nhiệt kế|nguy hại|độc hại)/i.test(q)) {
    return '🔋 **Pin cũ và bóng đèn vỡ** là **Rác Nguy Hại** đó bạn ơi! Tuyệt đối không vứt chung với rác sinh hoạt hay ném ra đất vì chì và thủy ngân trong 1 viên pin có thể làm ô nhiễm cả mét khối đất và nước. Bạn hãy gom riêng đem đến điểm thu hồi pin cũ ở trường hoặc siêu thị nhé! 🌍'
  }

  // 4. Rác hữu cơ (vỏ chuối, thức ăn thừa, lá cây...)
  if (/(vỏ chuối|vỏ trái cây|rau|cơm thừa|thức ăn thừa|lá cây|vỏ trứng|bã trà|hữu cơ|thùng xanh)/i.test(q)) {
    return '🍌 Các loại **vỏ trái cây (vỏ chuối, vỏ cam), rau củ héo, cơm thừa và lá cây rụng** thuộc nhóm **Rác Hữu Cơ**! Bạn hãy bỏ vào thùng rác **Màu Xanh Lá** nhé. Rác hữu cơ phân hủy rất nhanh và có thể ủ thành phân bón cực tốt cho cây trồng đó! 🌱'
  }

  // 5. Rác tái chế (chai nhựa, lon nước, giấy, bìa carton...)
  if (/(chai nhựa|lon nước|lon bia|vỏ lon|giấy vụn|bìa|carton|sắt vụn|kim loại|tái chế|thùng vàng)/i.test(q)) {
    return '♻️ **Chai nhựa sạch, vỏ lon nhôm, giấy báo cũ và hộp bìa carton** đều là **Rác Tái Chế**! Mẹo nhỏ từ Chibi: Bạn nhớ đổ hết nước thừa, tráng sạch và bẹp gọn chai/lon trước khi bỏ vào thùng **Rác Tái Chế** để các cô chú công nhân dễ xử lý nha! ✨'
  }

  // 6. Rác còn lại (hộp xốp bẩn, tã bỉm, sành sứ vỡ, túi nilon bẩn...)
  if (/(hộp xốp|ống hút|kẹo cao su|bã kẹo|sành sứ|túi bẩn|rác còn lại|vô cơ)/i.test(q)) {
    return '🗑️ **Hộp xốp đựng đồ ăn dính dầu mỡ, ống hút nhựa, bã kẹo cao su hay mảnh sành sứ** khó tái chế và không phân hủy sinh học được nên thuộc nhóm **Rác Còn Lại**. Bạn nhớ gói gọn gàng và bỏ đúng vào thùng Rác Còn Lại nhé!'
  }

  // 7. Túi nilon & rác thải nhựa
  if (/(túi nilon|ni lông|nhựa|ống hút|cốc nhựa|chai nước)/i.test(q)) {
    return '🛍️ Một chiếc **túi nilon** chỉ dùng vài phút nhưng mất tới **400 – 500 năm** mới phân hủy hết! Chúng mình hãy mang theo **bình nước cá nhân** và **túi vải** khi đi học, đi chợ để bảo vệ các loài sinh vật biển và giữ Trái Đất luôn xanh nhé! 🐢🌊'
  }

  // 8. Tiết kiệm điện
  if (/(tiết kiệm điện|tắt điện|bóng đèn|máy lạnh|điều hòa|quạt|tivi|năng lượng)/i.test(q)) {
    return '💡 **3 mẹo tiết kiệm điện siêu dễ cho bạn nhỏ:**\n1. Tắt đèn, tắt quạt ngay khi ra khỏi lớp hoặc phòng học.\n2. Tận dụng ánh sáng tự nhiên và gió trời bằng cách mở cửa sổ.\n3. Nhắc bố mẹ rút phích cắm các thiết bị khi không sử dụng và bật điều hòa từ 26°C trở lên nhé! 🌿'
  }

  // 9. Tiết kiệm nước
  if (/(tiết kiệm nước|vòi nước|rửa tay|tưới cây|nước sạch)/i.test(q)) {
    return '💧 **Nước sạch rất quý giá!** Để tiết kiệm nước, bạn nhớ:\n• Khóa chặt vòi nước ngay sau khi rửa tay và trong lúc đang chải răng.\n• Tận dụng nước vo gạo hoặc nước rửa rau của mẹ để tưới cho cây xanh.\n• Báo ngay cho thầy cô hoặc người lớn nếu thấy vòi nước bị rò rỉ nhé! 🌱'
  }

  // 10. Trồng cây & bảo vệ rừng
  if (/(trồng cây|cây xanh|chăm sóc cây|rừng|hoa|quang hợp|oxy)/i.test(q)) {
    return '🌳 Cây xanh chính là **"lá phổi xanh"** của Trái Đất! Cây hấp thụ khí CO₂, tỏa ra khí Oxy mát lành cho chúng mình thở và giữ đất không bị xói mòn. Ở trường, bạn nhớ đừng bẻ cành hái hoa và hãy phụ thầy cô tưới nước cho bồn cây mỗi ngày nhé! 🌻'
  }

  // 11. Biến đổi khí hậu / Trái Đất nóng lên
  if (/(khí hậu|nóng lên|hiệu ứng nhà kính|trái đất|ô nhiễm không khí|khói bụi)/i.test(q)) {
    return '🌍 **Biến đổi khí hậu** làm Trái Đất nóng lên do khói bụi nhà máy, xe cộ và việc chặt phá rừng. Bạn nhỏ có thể góp sức hạ nhiệt cho Trái Đất bằng cách: đi bộ hoặc đi xe đạp đến trường, trồng nhiều cây xanh và tiết kiệm điện nước mỗi ngày! 🚲🌱'
  }

  // 12. Cách chơi Eco Chibi / tiến hóa / đổi quà
  if (/(chibi|tiến hóa|lên cấp|level|lv|groot|xu xanh|xp|đổi quà|cách chơi)/i.test(q)) {
    return '🎮 Trong **Eco Chibi**, bạn hoàn thành 3 trò chơi mỗi ngày (**Thùng Rác Thông Thái, Biệt Đội Tiết Kiệm, Bước Chân Xanh**) hoặc làm việc tốt ngoài đời thực để được thầy cô **Thưởng nóng**!\n• Tích đủ **XP**: Chibi tiến hóa từ *Hạt Mầm Tinh Nghịch (Lv.1)* ➔ *Cây Non Đáng Yêu (Lv.2)* ➔ *Hiệp Sĩ Lá Xanh (Lv.3)* ➔ *Thần Rừng Tí Hon - Groot Chibi (Lv.4)*!\n• Tích **Xu Xanh**: Dùng để đổi quà thật tại mục **Đổi Quà** nhé! 🎁'
  }

  // 13. Hỏi chung về phân loại rác
  if (/(phân loại rác|mấy loại rác|thùng rác)/i.test(q)) {
    return '♻️ Chúng mình có **3 nhóm rác chính** cần nhớ:\n1. **Rác Hữu Cơ 🍌**: Thức ăn thừa, vỏ trái cây, lá cây (dùng ủ phân bón).\n2. **Rác Tái Chế 🥤**: Chai nhựa sạch, lon nhôm, giấy báo, bìa carton.\n3. **Rác Còn Lại 🗑️**: Túi bẩn, hộp xốp, mảnh sành sứ.\n*(Lưu ý: Pin cũ và bóng đèn vỡ là Rác Nguy Hại cần thu gom riêng nha!)*'
  }

  // 14. Mặc định: Nếu câu hỏi không khớp từ khóa môi trường nào
  return '🌱 Câu hỏi của bạn thú vị quá! Nhớ là Chibi chuyên giải đáp về **phân loại rác thải ♻️, tiết kiệm điện nước 💡💧, trồng cây xanh 🌳 và cách chơi Eco Chibi** thôi nha. Bạn thử hỏi Chibi xem một món đồ bỏ vào thùng rác nào, hoặc mẹo bảo vệ môi trường ở trường nhé!'
}

/**
 * Gửi tin nhắn tới Gemini AI (qua Serverless `/api/chat` hoặc trực tiếp qua cascade models),
 * tự động fallback sang kho tri thức xanh nếu mạng chậm hoặc hết quota.
 */
export async function askEcoChibi(messages) {
  const lastMsg = messages[messages.length - 1]?.text || ''

  // Chặn nhanh phép tính số học thuần túy để tiết kiệm quota API
  if (/^\s*\d+\s*[+\-*/x:]\s*\d+\s*=?\s*\??\s*$/.test(lastMsg)) {
    return {
      reply:
        'Hihi, Chibi chỉ là hạt mầm nhỏ chuyên về bảo vệ môi trường thôi nên không làm máy tính giải Toán được đâu! 🌱 Bạn đố Chibi xem vỏ chuối, chai nhựa hay pin cũ bỏ vào thùng rác nào nhé! 💚',
      source: 'guardrail',
    }
  }

  // Bước 1: Thử gọi trực tiếp Gemini REST API với cascade model nhanh nhất
  const apiKey =
    import.meta.env?.VITE_GEMINI_API_KEY ||
    getFallbackKey()

  if (apiKey) {
    const trimmedHistory = messages.slice(-8).map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.text || '').slice(0, 600) }],
    }))

    for (const model of MODELS) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 5000)

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            contents: trimmedHistory,
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 280,
            },
          }),
        })

        clearTimeout(timer)

        if (!res.ok) continue

        const data = await res.json()
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (reply) {
          return { reply, source: model }
        }
      } catch {
        // Thử model tiếp theo trong danh sách
      }
    }
  }

  // Bước 2: Thử gọi qua endpoint `/api/chat` trên Vercel
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ messages }),
    })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      if (data?.reply) {
        return { reply: data.reply, source: data.model || 'api' }
      }
    }
  } catch {
    // Chuyển sang kho tri thức dự phòng
  }

  // Bước 3: Fallback thông minh không bao giờ lỗi
  return {
    reply: getOfflineEcoReply(lastMsg),
    source: 'offline-kb',
  }
}
