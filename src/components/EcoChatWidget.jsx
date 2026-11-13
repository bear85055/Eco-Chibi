import { useEffect, useRef, useState } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { askEcoChibi, QUICK_SUGGESTIONS } from '../services/ecoChatService'
import { getLevel } from '../utils/levels'
import './EcoChatWidget.css'

function formatMessageText(text) {
  if (!text) return null
  const lines = String(text).split('\n')
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <span key={lineIdx}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>
          }
          return <span key={i}>{part}</span>
        })}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    )
  })
}

export default function EcoChatWidget() {
  const { user } = usePlayer()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const msgCounterRef = useRef(1)

  const lv = getLevel(user?.tong_diem_tich_luy || 0)
  const avatarSrc = lv?.img || '/assets/chibi/lv1.jpg'
  const studentName = user?.ho_ten ? user.ho_ten.split(' ').slice(-1)[0] : 'bạn nhỏ'

  const getInitialMessages = () => [
    {
      id: 'welcome',
      role: 'assistant',
      text: `Chào **${user?.ho_ten || 'bạn nhỏ'}**! 🌱 Mình là **Chibi Xanh** – Trợ lý AI bảo vệ môi trường của trường mình.\nBạn muốn đố Chibi về cách **phân loại rác ♻️**, **tiết kiệm điện nước 💡** hay **chăm sóc cây xanh 🌳** nào?`,
    },
  ]

  const [messages, setMessages] = useState(getInitialMessages)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages, isTyping])

  async function handleSend(customText) {
    const textToSend = (customText ?? input).trim()
    if (!textToSend || isTyping) return

    const nextId = msgCounterRef.current++
    const userMsg = {
      id: `u_${nextId}`,
      role: 'user',
      text: textToSend,
    }

    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    if (!customText) setInput('')
    setIsTyping(true)

    try {
      const { reply } = await askEcoChibi(nextMessages)
      const botId = msgCounterRef.current++
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${botId}`,
          role: 'assistant',
          text: reply,
        },
      ])
    } catch {
      const errId = msgCounterRef.current++
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${errId}`,
          role: 'assistant',
          text: `Hihi, đường truyền đang hơi chập chờn một xíu! 🌱 Bạn ${studentName} thử hỏi lại Chibi về phân loại rác hoặc tiết kiệm điện nước nhé!`,
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleResetChat() {
    setMessages(getInitialMessages())
    setInput('')
  }

  return (
    <div className="eco-chat-root">
      {/* Cửa sổ Chat */}
      {isOpen && (
        <div className="eco-chat-window" role="dialog" aria-label="Trợ Lý Chibi Xanh AI">
          <div className="eco-chat-header">
            <div className="eco-chat-header__left">
              <div className="eco-chat-header__avatar-wrap">
                <img src={avatarSrc} alt="Chibi AI" className="eco-chat-header__avatar" />
                <span className="eco-chat-header__online-dot" />
              </div>
              <div>
                <h3 className="eco-chat-header__title">Trợ Lý Chibi Xanh 🌱</h3>
                <p className="eco-chat-header__sub">AI Hỏi đáp Bảo vệ Môi trường</p>
              </div>
            </div>
            <div className="eco-chat-header__actions">
              <button
                type="button"
                className="eco-chat-header__btn"
                onClick={handleResetChat}
                title="Làm mới cuộc trò chuyện"
              >
                🔄
              </button>
              <button
                type="button"
                className="eco-chat-header__btn eco-chat-header__btn--close"
                onClick={() => setIsOpen(false)}
                title="Đóng cửa sổ chat"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="eco-chat-notice">
            🛡️ Chibi AI chỉ giải đáp các câu hỏi về <strong>Môi trường, Phân loại rác & Sống xanh</strong>
          </div>

          <div className="eco-chat-messages">
            {messages.map((msg) => {
              const isBot = msg.role === 'assistant'
              return (
                <div
                  key={msg.id}
                  className={`eco-chat-msg ${isBot ? 'eco-chat-msg--bot' : 'eco-chat-msg--user'}`}
                >
                  {isBot && (
                    <img
                      src={avatarSrc}
                      alt="Chibi"
                      className="eco-chat-msg__avatar"
                    />
                  )}
                  <div className="eco-chat-msg__bubble">
                    {formatMessageText(msg.text)}
                  </div>
                </div>
              )
            })}

            {isTyping && (
              <div className="eco-chat-msg eco-chat-msg--bot">
                <img src={avatarSrc} alt="Chibi" className="eco-chat-msg__avatar" />
                <div className="eco-chat-msg__bubble eco-chat-msg__bubble--typing">
                  <span className="eco-typing-dot" />
                  <span className="eco-typing-dot" />
                  <span className="eco-typing-dot" />
                  <span className="eco-typing-text">Chibi đang suy nghĩ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Gợi ý câu hỏi nhanh */}
          <div className="eco-chat-suggestions">
            {QUICK_SUGGESTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="eco-chat-chip"
                disabled={isTyping}
                onClick={() => handleSend(item.text)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Ô nhập câu hỏi */}
          <form
            className="eco-chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="eco-chat-input"
              placeholder="Hỏi Chibi về rác thải, điện nước, cây xanh..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              maxLength={250}
            />
            <button
              type="submit"
              className="eco-chat-send-btn"
              disabled={!input.trim() || isTyping}
            >
              Gửi ➤
            </button>
          </form>
        </div>
      )}

      {/* Nút tròn nổi bật góc dưới */}
      <button
        type="button"
        className={`eco-chat-fab ${isOpen ? 'eco-chat-fab--active' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Mở Trợ Lý Chibi Xanh AI"
      >
        <div className="eco-chat-fab__avatar-box">
          <img src={avatarSrc} alt="Chibi AI" className="eco-chat-fab__avatar" />
          <span className="eco-chat-fab__badge">AI</span>
        </div>
        <span className="eco-chat-fab__label">
          {isOpen ? 'Đóng Chat' : '💬 Hỏi Chibi Xanh'}
        </span>
      </button>
    </div>
  )
}
