import { useEffect, useMemo, useRef, useState } from "react";
import "./FishingMiniGame.css";

const FISHING_BG_PARTS = [
  "/assets/video/fishing/fishing-bg-part-1.mp4?v=1",
  "/assets/video/fishing/fishing-bg-part-2.mp4?v=1",
];

const FISH_NAME = "Призрачная медака";

function NeonFishIcon() {
  return (
    <svg viewBox="0 0 120 64" aria-hidden="true" className="fishingFishIconSvg">
      <path d="M16 32c18-18 48-22 74-5l15-12v34L90 37c-26 17-56 13-74-5Z" />
      <path d="M38 23c13 6 24 11 38 18" />
      <path d="M41 41c11-3 23-7 35-18" />
      <circle cx="82" cy="28" r="3" />
    </svg>
  );
}

export function FishingMiniGame({ onBack }: { onBack?: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activePart, setActivePart] = useState(0);
  const [sync, setSync] = useState(72);
  const [holding, setHolding] = useState(false);

  const currentVideo = FISHING_BG_PARTS[activePart];
  const nextLabel = useMemo(() => activePart === 0 ? "PART 1" : "PART 2", [activePart]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
  }, [activePart]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSync((value) => {
        const direction = holding ? 1 : -1;
        return Math.max(0, Math.min(100, value + direction * (holding ? 2 : 1)));
      });
    }, 220);
    return () => window.clearInterval(timer);
  }, [holding]);

  function handleVideoEnded() {
    setActivePart((current) => (current + 1) % FISHING_BG_PARTS.length);
  }

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    window.location.hash = "";
  }

  return (
    <main className="fishingScreen" aria-label="Yokai.exe fishing minigame">
      <video
        key={currentVideo}
        ref={videoRef}
        className="fishingVideoBg"
        src={currentVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onEnded={handleVideoEnded}
        onCanPlay={(event) => event.currentTarget.play().catch(() => {})}
        aria-hidden="true"
      />
      <div className="fishingBgShade" aria-hidden="true" />
      <div className="fishingBgVignette" aria-hidden="true" />

      <header className="fishingTopBar">
        <div>
          <small>YOKAI.EXE // FISHING NODE</small>
          <strong>КАНАЛ ДУХОВ</strong>
        </div>
        <div className="fishingTopControls">
          <span>{nextLabel}</span>
          <button type="button" aria-label="Помощь">?</button>
          <button type="button" aria-label="Настройки">⚙</button>
          <button type="button" onClick={handleBack} aria-label="Назад">✕</button>
        </div>
      </header>

      <section className="fishingHudLeft" aria-label="Данные рыбалки">
        <article className="fishingInfoCard">
          <span>ЦЕЛЬ</span>
          <p>Поймай призрачную медаку</p>
          <NeonFishIcon />
        </article>

        <article className="fishingInfoCard fishingCatchCard">
          <span>УЛОВ</span>
          <div className="fishingCatchRow"><NeonFishIcon /><b>0/1</b></div>
        </article>

        <article className="fishingInfoCard fishingGearCard">
          <span>СНАРЯЖЕНИЕ</span>
          <div className="fishingGearLine"><i>♆</i><p>Призрачный крючок</p></div>
          <div className="fishingGearBar"><i /></div>
        </article>

        <article className="fishingInfoCard fishingHintCard">
          <span>ПОДСКАЗКА</span>
          <p>Удерживай, чтобы поднять поле печати. Отпускай, чтобы опустить.</p>
          <div className="fishingKitsuneMark">狐</div>
        </article>
      </section>

      <section className="fishingPlayfield" aria-label="Игровая шкала ловли">
        <div className="fishingPlayfieldFrame">
          <div className="fishingToriiMark">鳥居</div>
          <div className="fishingFishMarker" style={{ top: `${Math.max(12, 78 - sync * 0.45)}%` }}><NeonFishIcon /></div>
          <div className="fishingCatchZone" style={{ bottom: `${Math.max(8, Math.min(68, sync * 0.46))}%` }}>
            <span>捕</span>
          </div>
        </div>
      </section>

      <aside className="fishingSyncPanel" aria-label={`Синхронизация ${sync}%`}>
        <span>СИНХРОНИЗАЦИЯ</span>
        <strong>{sync}%</strong>
        <div className="fishingSyncTube"><i style={{ height: `${sync}%` }} /></div>
      </aside>

      <section className="fishingStatusCopy">
        <small>РЕДКИЙ // NORMAL</small>
        <h1>{FISH_NAME}</h1>
        <p>Держи рыбу внутри поля печати, пока синхронизация не достигнет 100%.</p>
      </section>

      <button
        type="button"
        className={`fishingHoldButton ${holding ? "isHolding" : ""}`}
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
      >
        <strong>УДЕРЖИВАТЬ</strong>
        <small>SPACE / E / HOLD</small>
      </button>
    </main>
  );
}
