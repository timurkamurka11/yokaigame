let audioContext: AudioContext | null = null;
let enabled = false;
let masterVolume = 1;

const BG_ARENA_URL = "/assets/audio/bg_arena.mp3";
const BG_CREATOR_URL = "/assets/audio/bg_creator.mp3";
const BG_HUB_URL = "/assets/audio/hub_song.mp3";
const BG_RAMEN_URL = "/assets/audio/ramen/ramen_bgm.mp3";
const BG_HOME_URL = "/assets/audio/home/home_bgm.mp3";
const HOME_DOOR_URL = "/assets/audio/home/door-opening.mp3";
const HOME_UI_CLICK_URL = "/assets/audio/home/home-ui-click.mp3";
const KOI_TUTORIAL_CLICK_URL = "/assets/audio/koi-tutorial/click.mp3";
const KOI_TUTORIAL_PHRASE_URLS = [
  "/assets/audio/koi-tutorial/phrase-1.mp3",
  "/assets/audio/koi-tutorial/phrase-2.mp3",
  "/assets/audio/koi-tutorial/phrase-3.mp3",
  "/assets/audio/koi-tutorial/phrase-4.mp3",
  "/assets/audio/koi-tutorial/phrase-5.mp3",
];
const RAMEN_GREETING_URL = "/assets/audio/ramen/ramen_greeting.wav";
const RAMEN_DIALOG_URLS = [
  "/assets/audio/ramen/ramen_dialog_1.mp3",
  "/assets/audio/ramen/ramen_dialog_2.mp3",
  "/assets/audio/ramen/ramen_dialog_3.wav",
];
const RAMEN_GOODBYE_URL = "/assets/audio/ramen/ramen_goodbye.wav";
const KATANA_URL = "/assets/audio/katana_1.mp3";
const PRESET_SWITCH_URL = "/assets/audio/character_switch.mp3";
const HIT_URLS = [
  "/assets/audio/hit_1.mp3",
  "/assets/audio/hit_2.mp3",
  "/assets/audio/hit_3.mp3",
];
const ONI_ATTACK_URLS = [
  "/assets/audio/oni_punch.mp3",
  "/assets/audio/oni_energy_ball.mp3",
  "/assets/audio/oni_heavy_attack.mp3",
  "/assets/audio/oni_magic_cast.mp3",
];
const ONI_YELL_URL = "/assets/audio/oni_yell.mp3";
const ONI_PUNCH_RAGE_URL = "/assets/audio/oni_punch_rage.mp3";

let bgArenaAudio: HTMLAudioElement | null = null;
let bgCreatorAudio: HTMLAudioElement | null = null;
let bgHubAudio: HTMLAudioElement | null = null;
let bgRamenAudio: HTMLAudioElement | null = null;
let bgHomeAudio: HTMLAudioElement | null = null;
let hubFadeTimer: number | null = null;
let ramenFadeTimer: number | null = null;
let homeFadeTimer: number | null = null;
let presetSwitchAudio: HTMLAudioElement | null = null;
let homeUiClickAudio: HTMLAudioElement | null = null;
let koiTutorialClickAudio: HTMLAudioElement | null = null;
let koiTutorialPhraseAudio: HTMLAudioElement | null = null;
let pendingKoiTutorialPhraseStep: number | null = null;

function getContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

function getBgArenaAudio(): HTMLAudioElement {
  if (!bgArenaAudio) {
    bgArenaAudio = new Audio(BG_ARENA_URL);
    bgArenaAudio.loop = true;
    bgArenaAudio.preload = "auto";
    bgArenaAudio.volume = 0.14 * masterVolume;
  }
  return bgArenaAudio;
}

function getBgCreatorAudio(): HTMLAudioElement {
  if (!bgCreatorAudio) {
    bgCreatorAudio = new Audio(BG_CREATOR_URL);
    bgCreatorAudio.loop = true;
    bgCreatorAudio.preload = "auto";
    bgCreatorAudio.volume = 0.16 * masterVolume;
  }
  return bgCreatorAudio;
}



function getBgHubAudio(): HTMLAudioElement {
  if (!bgHubAudio) {
    bgHubAudio = new Audio(BG_HUB_URL);
    bgHubAudio.loop = true;
    bgHubAudio.preload = "auto";
    bgHubAudio.volume = 0.16 * masterVolume;
  }
  return bgHubAudio;
}


function getBgRamenAudio(): HTMLAudioElement {
  if (!bgRamenAudio) {
    bgRamenAudio = new Audio(BG_RAMEN_URL);
    bgRamenAudio.loop = true;
    bgRamenAudio.preload = "auto";
    bgRamenAudio.volume = 0.18 * masterVolume;
  }
  return bgRamenAudio;
}

function getBgHomeAudio(): HTMLAudioElement {
  if (!bgHomeAudio) {
    bgHomeAudio = new Audio(BG_HOME_URL);
    bgHomeAudio.loop = true;
    bgHomeAudio.preload = "auto";
    bgHomeAudio.volume = 0.17 * masterVolume;
  }
  return bgHomeAudio;
}

function getPresetSwitchAudio(): HTMLAudioElement {
  if (!presetSwitchAudio) {
    presetSwitchAudio = new Audio(PRESET_SWITCH_URL);
    presetSwitchAudio.preload = "auto";
    presetSwitchAudio.volume = 0.88 * masterVolume;
  }
  return presetSwitchAudio;
}

function getHomeUiClickAudio(): HTMLAudioElement {
  if (!homeUiClickAudio) {
    homeUiClickAudio = new Audio(HOME_UI_CLICK_URL);
    homeUiClickAudio.preload = "auto";
    homeUiClickAudio.volume = 0.42 * masterVolume;
  }
  return homeUiClickAudio;
}

function getKoiTutorialClickAudio(): HTMLAudioElement {
  if (!koiTutorialClickAudio) {
    koiTutorialClickAudio = new Audio(KOI_TUTORIAL_CLICK_URL);
    koiTutorialClickAudio.preload = "auto";
    koiTutorialClickAudio.volume = 0.48 * masterVolume;
  }
  return koiTutorialClickAudio;
}

function stopAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

function playOneShot(url: string, volume: number) {
  if (!enabled) return;
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.volume = Math.max(0, Math.min(1, volume * masterVolume));
  audio.play().catch(() => {});
}

export function preloadGameAudio() {
  getBgArenaAudio();
  getBgCreatorAudio();
  getBgHubAudio();
  getBgRamenAudio();
  getBgHomeAudio();

  getPresetSwitchAudio();
  getHomeUiClickAudio();
  getKoiTutorialClickAudio();

  [KATANA_URL, PRESET_SWITCH_URL, ONI_YELL_URL, ONI_PUNCH_RAGE_URL, RAMEN_GREETING_URL, RAMEN_GOODBYE_URL, HOME_DOOR_URL, HOME_UI_CLICK_URL, KOI_TUTORIAL_CLICK_URL, ...KOI_TUTORIAL_PHRASE_URLS, ...RAMEN_DIALOG_URLS, ...HIT_URLS, ...ONI_ATTACK_URLS].forEach((url) => {
    const audio = new Audio(url);
    audio.preload = "auto";
    audio.volume = 0.01;
  });
}

export async function unlockGameAudio() {
  try {
    const ctx = getContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  } catch {
    // HTML audio can still work even when WebAudio is unavailable.
  }

  enabled = true;
}

export async function enableSound() {
  await unlockGameAudio();
  playUiClickSound();
}

export function isSoundEnabled() {
  return enabled;
}

export function disableSound() {
  enabled = false;
  stopArenaSound();
  stopCreatorSound();
  stopHubSound();
  stopRamenSound();
  stopHomeSound();
}

export function setMasterVolume(value: number) {
  masterVolume = Math.max(0, Math.min(1, value));
  if (bgArenaAudio) bgArenaAudio.volume = 0.14 * masterVolume;
  if (bgCreatorAudio) bgCreatorAudio.volume = 0.16 * masterVolume;
  if (bgHubAudio) bgHubAudio.volume = 0.16 * masterVolume;
  if (bgRamenAudio) bgRamenAudio.volume = 0.18 * masterVolume;
  if (bgHomeAudio) bgHomeAudio.volume = 0.17 * masterVolume;
  if (presetSwitchAudio) presetSwitchAudio.volume = 0.88 * masterVolume;
  if (homeUiClickAudio) homeUiClickAudio.volume = 0.42 * masterVolume;
  if (koiTutorialClickAudio) koiTutorialClickAudio.volume = 0.72 * masterVolume;
  if (koiTutorialPhraseAudio) koiTutorialPhraseAudio.volume = 0.96 * masterVolume;
}

export function getMasterVolume() {
  return masterVolume;
}

export async function startArenaSound() {
  if (!enabled) return;
  stopCreatorSound();
  stopHubSound();
  stopRamenSound();
  stopHomeSound();
  const bg = getBgArenaAudio();
  bg.volume = 0.14 * masterVolume;
  await bg.play().catch(() => {});
}

export function stopArenaSound() {
  stopAudio(bgArenaAudio);
}

export async function startCreatorSound() {
  if (!enabled) return;
  stopArenaSound();
  stopHubSound();
  stopRamenSound();
  stopHomeSound();
  const bg = getBgCreatorAudio();
  bg.volume = 0.16 * masterVolume;
  await bg.play().catch(() => {});
}

export function stopCreatorSound() {
  stopAudio(bgCreatorAudio);
}

export async function startHubSound() {
  if (!enabled) return;
  stopArenaSound();
  stopCreatorSound();
  stopRamenSound();
  stopHomeSound();
  const bg = getBgHubAudio();
  if (!bg.paused) {
    bg.volume = 0.16 * masterVolume;
    return;
  }

  if (hubFadeTimer !== null) {
    window.clearInterval(hubFadeTimer);
    hubFadeTimer = null;
  }

  const targetVolume = 0.16 * masterVolume;
  bg.volume = 0;
  await bg.play().catch(() => {});
  let step = 0;
  hubFadeTimer = window.setInterval(() => {
    step += 1;
    bg.volume = Math.min(targetVolume, targetVolume * (step / 14));
    if (step >= 14) {
      if (hubFadeTimer !== null) window.clearInterval(hubFadeTimer);
      hubFadeTimer = null;
    }
  }, 70);
}

export function stopHubSound() {
  if (hubFadeTimer !== null) {
    window.clearInterval(hubFadeTimer);
    hubFadeTimer = null;
  }
  stopAudio(bgHubAudio);
}

export async function startRamenSound() {
  if (!enabled) return;
  stopArenaSound();
  stopCreatorSound();
  stopHubSound();
  stopHomeSound();
  const bg = getBgRamenAudio();

  if (ramenFadeTimer !== null) {
    window.clearInterval(ramenFadeTimer);
    ramenFadeTimer = null;
  }

  const targetVolume = 0.18 * masterVolume;
  if (!bg.paused) {
    bg.volume = targetVolume;
    return;
  }

  bg.volume = 0;
  await bg.play().catch(() => {});
  let step = 0;
  ramenFadeTimer = window.setInterval(() => {
    step += 1;
    bg.volume = Math.min(targetVolume, targetVolume * (step / 12));
    if (step >= 12) {
      if (ramenFadeTimer !== null) window.clearInterval(ramenFadeTimer);
      ramenFadeTimer = null;
    }
  }, 70);
}

export function stopRamenSound() {
  if (ramenFadeTimer !== null) {
    window.clearInterval(ramenFadeTimer);
    ramenFadeTimer = null;
  }
  stopAudio(bgRamenAudio);
}

export async function startHomeSound() {
  if (!enabled) return;
  stopArenaSound();
  stopCreatorSound();
  stopHubSound();
  stopRamenSound();
  const bg = getBgHomeAudio();

  if (homeFadeTimer !== null) {
    window.clearInterval(homeFadeTimer);
    homeFadeTimer = null;
  }

  const targetVolume = 0.17 * masterVolume;
  if (!bg.paused) {
    bg.volume = targetVolume;
    return;
  }

  bg.volume = 0;
  await bg.play().catch(() => {});
  let step = 0;
  homeFadeTimer = window.setInterval(() => {
    step += 1;
    bg.volume = Math.min(targetVolume, targetVolume * (step / 12));
    if (step >= 12) {
      if (homeFadeTimer !== null) window.clearInterval(homeFadeTimer);
      homeFadeTimer = null;
    }
  }, 70);
}

export function stopHomeSound() {
  if (homeFadeTimer !== null) {
    window.clearInterval(homeFadeTimer);
    homeFadeTimer = null;
  }
  stopAudio(bgHomeAudio);
}

export function playHomeDoorSound() {
  playOneShot(HOME_DOOR_URL, 0.72);
}

export function playHomeUiClickSound() {
  if (!enabled) return;
  const audio = getHomeUiClickAudio();
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.42 * masterVolume;
  audio.play().catch(() => {});
}

export function stopKoiTutorialAudio() {
  pendingKoiTutorialPhraseStep = null;
  if (koiTutorialPhraseAudio) {
    koiTutorialPhraseAudio.pause();
    koiTutorialPhraseAudio.currentTime = 0;
    koiTutorialPhraseAudio = null;
  }
}

export function playKoiTutorialClickSound() {
  if (!enabled) return;
  const audio = getKoiTutorialClickAudio();
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.72 * masterVolume;
  audio.play().catch(() => {});
}

export function playKoiTutorialPhrase(step: number) {
  const normalizedStep = Math.max(0, Math.min(KOI_TUTORIAL_PHRASE_URLS.length - 1, step));
  if (!enabled) {
    pendingKoiTutorialPhraseStep = normalizedStep;
    return false;
  }

  if (koiTutorialPhraseAudio) {
    koiTutorialPhraseAudio.pause();
    koiTutorialPhraseAudio.currentTime = 0;
  }

  const url = KOI_TUTORIAL_PHRASE_URLS[normalizedStep];
  const audio = new Audio(url);
  koiTutorialPhraseAudio = audio;
  audio.preload = "auto";
  audio.volume = 0.96 * masterVolume;
  pendingKoiTutorialPhraseStep = normalizedStep;

  audio.play()
    .then(() => {
      if (koiTutorialPhraseAudio === audio) pendingKoiTutorialPhraseStep = null;
    })
    .catch(() => {
      if (koiTutorialPhraseAudio === audio) pendingKoiTutorialPhraseStep = normalizedStep;
    });

  return true;
}

export async function resumePendingKoiTutorialPhrase(fallbackStep?: number) {
  await unlockGameAudio();
  const step = pendingKoiTutorialPhraseStep ?? fallbackStep;
  if (typeof step !== "number") return;
  playKoiTutorialPhrase(step);
}

export function playRamenGreetingSound() {
  playOneShot(RAMEN_GREETING_URL, 0.88);
}

export function playRamenDialogueSound(index: number) {
  const url = RAMEN_DIALOG_URLS[Math.abs(index) % RAMEN_DIALOG_URLS.length];
  playOneShot(url, 0.82);
}

export function playRamenGoodbyeSound() {
  playOneShot(RAMEN_GOODBYE_URL, 0.48);
}

function playTone(frequency: number, duration: number, type: OscillatorType, volume = 0.08) {
  if (!enabled) return;

  const ctx = getContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(volume * masterVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

export function playUiClickSound() {
  playTone(760, 0.03, "square", 0.03);
  setTimeout(() => playTone(980, 0.04, "square", 0.02), 35);
}

export function playPresetSwitchSound() {
  if (!enabled) return;
  const audio = getPresetSwitchAudio();
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.88 * masterVolume;
  audio.play().catch(() => {});
}

export function playKatanaSound() {
  playOneShot(KATANA_URL, 0.75);
}

export function playRandomOniHitSound() {
  const index = Math.floor(Math.random() * HIT_URLS.length);
  playOneShot(HIT_URLS[index], 0.62);
}

export function playRandomOniAttackSound() {
  const index = Math.floor(Math.random() * ONI_ATTACK_URLS.length);
  playOneShot(ONI_ATTACK_URLS[index], 0.65);
}

export function playOniYellSound() {
  playOneShot(ONI_YELL_URL, 0.78);
}

export function playOniRagePunchSound() {
  playOneShot(ONI_PUNCH_RAGE_URL, 0.82);
}

export function playSealSound() {
  playTone(520, 0.12, "sine", 0.06);
  setTimeout(() => playTone(740, 0.12, "sine", 0.05), 100);
  setTimeout(() => playTone(980, 0.16, "sine", 0.04), 200);
}

export function playSummonSound() {
  playTone(260, 0.08, "triangle", 0.05);
  setTimeout(() => playTone(390, 0.08, "triangle", 0.05), 80);
  setTimeout(() => playTone(520, 0.1, "triangle", 0.05), 160);
}

export function playDeathSound() {
  playTone(260, 0.18, "sawtooth", 0.06);
  setTimeout(() => playTone(180, 0.22, "sawtooth", 0.05), 160);
  setTimeout(() => playTone(90, 0.35, "sine", 0.05), 320);
}

export function playPlayerHitSound() {
  playTone(95, 0.12, "square", 0.05);
  setTimeout(() => playTone(60, 0.16, "sawtooth", 0.04), 100);
}

export function playHealSound() {
  playTone(430, 0.1, "triangle", 0.05);
  setTimeout(() => playTone(610, 0.12, "triangle", 0.05), 100);
  setTimeout(() => playTone(810, 0.16, "sine", 0.04), 210);
}
