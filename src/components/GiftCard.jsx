export default function GiftCard({ reward, xu, onRedeem }) {
  const out = reward.so_luong_ton <= 0
  const thieu = reward.gia_xu - xu
  const canRedeem = !out && thieu <= 0

  return (
    <article className={`gift-card ${out ? 'is-out' : ''}`} id={`gift-${reward.id}`}>
      <div className="gift-card__img">
        <img src={reward.hinh_anh} alt={reward.ten_qua} loading="lazy" />
        {out ? (
          <span className="tag tag--grey">Hết quà</span>
        ) : (
          reward.so_luong_ton <= 3 && <span className="tag tag--coral">Chỉ còn {reward.so_luong_ton}</span>
        )}
        <span className="price-chip">🍃 {reward.gia_xu}</span>
      </div>
      <div className="gift-card__body">
        <h3 className="gift-card__name">{reward.ten_qua}</h3>
        <p className="gift-card__desc">{reward.mo_ta}</p>
      </div>
      <button
        className="btn btn--primary btn--block btn--sm"
        disabled={!canRedeem}
        onClick={() => onRedeem(reward)}
        id={`redeem-${reward.id}`}
      >
        {out ? 'Tạm hết quà' : canRedeem ? 'Đổi quà' : `Thiếu ${thieu} xu`}
      </button>
    </article>
  )
}
