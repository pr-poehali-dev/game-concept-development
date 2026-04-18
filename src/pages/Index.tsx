import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Choice {
  id: string;
  text: string;
  next: string;
  effect?: Partial<Stats>;
  questUpdate?: { id: string; status: "active" | "completed" };
  flag?: string;
}

interface DialogNode {
  id: string;
  speaker: string;
  text: string;
  portrait: string;
  choices: Choice[];
}

interface Quest {
  id: string;
  title: string;
  description: string;
  status: "locked" | "active" | "completed";
  xpReward: number;
}

interface Stats {
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  strength: number;
  wisdom: number;
  charisma: number;
  gold: number;
}

interface SaveSlot {
  id: number;
  name: string;
  timestamp: string;
  dialogNode: string;
  stats: Stats;
  quests: Quest[];
  flags: string[];
}

type Screen = "menu" | "game" | "load";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const INITIAL_STATS: Stats = {
  hp: 100, maxHp: 100, xp: 0, level: 1,
  strength: 8, wisdom: 6, charisma: 5, gold: 10
};

const INITIAL_QUESTS: Quest[] = [
  { id: "q1", title: "Пробуждение", description: "Выберись из тёмного леса", status: "active", xpReward: 50 },
  { id: "q2", title: "Тайна руин", description: "Найди древний артефакт в руинах", status: "locked", xpReward: 100 },
  { id: "q3", title: "Голос теней", description: "Поговори с духом и узнай правду", status: "locked", xpReward: 150 },
];

const DIALOGS: Record<string, DialogNode> = {
  start: {
    id: "start", speaker: "Таинственный голос", portrait: "👁️",
    text: "Ты просыпаешься в тёмном лесу. Сквозь густые кроны просачивается лунный свет. Где-то вдали мерцают руины. Ты ничего не помнишь...",
    choices: [
      { id: "c1", text: "Осмотреться вокруг", next: "explore", effect: { xp: 10 } },
      { id: "c2", text: "Крикнуть — может кто-то услышит?", next: "shout", effect: { xp: 5 } },
      { id: "c3", text: "Затаиться и подождать", next: "wait" },
    ]
  },
  explore: {
    id: "explore", speaker: "Повествователь", portrait: "📜",
    text: "Ты осторожно оглядываешься. Среди деревьев ты замечаешь тропу, ведущую к руинам, и странный кристалл, светящийся синим светом.",
    choices: [
      { id: "c1", text: "Идти к руинам", next: "ruins", questUpdate: { id: "q1", status: "completed" }, effect: { xp: 40, gold: 5 } },
      { id: "c2", text: "Взять кристалл", next: "crystal", effect: { xp: 20, wisdom: 1 } },
    ]
  },
  shout: {
    id: "shout", speaker: "Эхо", portrait: "🌑",
    text: "Твой крик разносится по лесу... и затихает. Но вдруг ты слышишь шорох. Из тени появляется фигура в плаще.",
    choices: [
      { id: "c1", text: "Кто ты?!", next: "stranger", effect: { xp: 15 } },
      { id: "c2", text: "Приготовиться к бою", next: "stranger_fight", effect: { strength: 1 } },
      { id: "c3", text: "Отступить в темноту", next: "explore" },
    ]
  },
  wait: {
    id: "wait", speaker: "Повествователь", portrait: "📜",
    text: "Ты сидишь тихо. Через время лес словно оживает — шёпот, движение теней. Ты начинаешь замечать паттерны в хаосе деревьев.",
    choices: [
      { id: "c1", text: "Следовать за тенями", next: "shadow_path", effect: { xp: 25, wisdom: 1 } },
      { id: "c2", text: "Всё же осмотреться", next: "explore" },
    ]
  },
  crystal: {
    id: "crystal", speaker: "Кристалл", portrait: "💎",
    text: "Как только твоя рука касается кристалла, по телу проходит волна холода. В голове вспыхивают обрывки воспоминаний: храм, ритуал, предательство...",
    choices: [
      { id: "c1", text: "Сосредоточиться на видении", next: "vision", effect: { xp: 30, wisdom: 2 } },
      { id: "c2", text: "Отбросить кристалл", next: "explore", effect: { xp: 5 } },
    ]
  },
  ruins: {
    id: "ruins", speaker: "Дух Руин", portrait: "👻",
    text: "Ты входишь в полуразрушенный храм. Среди камней витает призрачный дух. Он смотрит на тебя с узнаванием. 'Наконец-то ты вернулся...'",
    choices: [
      { id: "c1", text: "Я вас знаю?", next: "spirit_talk", questUpdate: { id: "q2", status: "active" }, effect: { xp: 50 }, flag: "met_spirit" },
      { id: "c2", text: "Назад — это ловушка!", next: "ruins_escape", effect: { strength: 1 } },
    ]
  },
  stranger: {
    id: "stranger", speaker: "Незнакомец", portrait: "🧙",
    text: "'Тише, — шепчет он. — Лес слышит всё. Меня зовут Варис. Я искал тебя три дня. Ты в опасности — за тобой охотятся.'",
    choices: [
      { id: "c1", text: "Почему меня ищут?", next: "varis_explain", effect: { xp: 20 } },
      { id: "c2", text: "Почему я должен тебе верить?", next: "varis_trust", effect: { charisma: 1 } },
      { id: "c3", text: "Веди меня в безопасное место", next: "safe_place", effect: { xp: 10, gold: 15 } },
    ]
  },
  stranger_fight: {
    id: "stranger_fight", speaker: "Незнакомец", portrait: "🧙",
    text: "Фигура поднимает руки: 'Подожди! Я не враг. Твоя агрессия понятна, но неуместна.' Он говорит спокойно, без страха.",
    choices: [
      { id: "c1", text: "Опустить оружие и слушать", next: "stranger", effect: { xp: 10 } },
      { id: "c2", text: "Атаковать всё равно", next: "fight_result", effect: { xp: 5 } },
    ]
  },
  shadow_path: {
    id: "shadow_path", speaker: "Тень", portrait: "🌑",
    text: "Тени ведут тебя к скрытой тропе. На земле — следы, ведущие к старому колодцу. У колодца сидит девушка в разорванной одежде.",
    choices: [
      { id: "c1", text: "Подойти и заговорить", next: "girl_meet", questUpdate: { id: "q3", status: "active" }, effect: { xp: 30 } },
      { id: "c2", text: "Наблюдать издалека", next: "girl_observe", effect: { wisdom: 1 } },
    ]
  },
  vision: {
    id: "vision", speaker: "Воспоминание", portrait: "🔮",
    text: "Ты видишь себя молодым — стоишь перед магистром. Он говорит: 'Хранитель Кристалла выбирается один раз в столетие. Ты был избран.' И потом — тьма.",
    choices: [
      { id: "c1", text: "Я — Хранитель...", next: "ruins", questUpdate: { id: "q2", status: "active" }, effect: { xp: 50, wisdom: 2 } },
      { id: "c2", text: "Это невозможно", next: "ruins", effect: { xp: 20 } },
    ]
  },
  spirit_talk: {
    id: "spirit_talk", speaker: "Дух", portrait: "👻",
    text: "'Ты забыл, кто ты есть. Тебя предали, твои воспоминания были стёрты. Но кристалл помнит всё. Найди его три части — и вернёшь себя.'",
    choices: [
      { id: "c1", text: "Где части кристалла?", next: "spirit_quest", questUpdate: { id: "q3", status: "active" }, effect: { xp: 50 } },
      { id: "c2", text: "Кто меня предал?", next: "spirit_betrayal", effect: { xp: 30, wisdom: 1 } },
    ]
  },
  varis_explain: {
    id: "varis_explain", speaker: "Варис", portrait: "🧙",
    text: "'За тобой охотится Орден Чёрного Пламени. Они уничтожают всех Хранителей Кристалла. Ты последний. Если они найдут тебя раньше, чем ты вспомнишь — всё потеряно.'",
    choices: [
      { id: "c1", text: "Помоги мне вспомнить", next: "varis_help", questUpdate: { id: "q2", status: "active" }, effect: { xp: 40 } },
      { id: "c2", text: "Я справлюсь один", next: "solo_path", effect: { strength: 2, xp: 20 } },
    ]
  },
  varis_trust: {
    id: "varis_trust", speaker: "Варис", portrait: "🧙",
    text: "Варис усмехается: 'Ты всегда был проницателен. Мы знакомы уже десять лет, хотя ты этого не помнишь. Я — твой старый друг и учитель.'",
    choices: [
      { id: "c1", text: "Расскажи мне всё", next: "varis_explain", effect: { charisma: 1, xp: 25 } },
    ]
  },
  fight_result: {
    id: "fight_result", speaker: "Повествователь", portrait: "📜",
    text: "Незнакомец уклоняется от каждого твоего удара с лёгкостью. Наконец он просто хватает твоё запястье: 'Хватит. Ты устал. Вспомни — я на твоей стороне.'",
    choices: [
      { id: "c1", text: "Прекратить бой", next: "stranger", effect: { xp: 10, hp: -15 } },
    ]
  },
  safe_place: {
    id: "safe_place", speaker: "Варис", portrait: "🧙",
    text: "Варис ведёт тебя через лес к небольшому укрытию. 'Здесь безопасно. Отдохни — я расскажу всё, что знаю.' Он разводит огонь.",
    choices: [
      { id: "c1", text: "Слушать рассказ Вариса", next: "varis_explain", effect: { hp: 20, xp: 15 } },
    ]
  },
  girl_meet: {
    id: "girl_meet", speaker: "Незнакомка", portrait: "🌙",
    text: "'Ты тоже слышишь их? Голоса теней?' — шепчет она. 'Они говорят о тебе. Говорят, что ты — ключ к воротам между мирами.'",
    choices: [
      { id: "c1", text: "Что за ворота?", next: "girl_lore", questUpdate: { id: "q3", status: "active" }, effect: { xp: 35 } },
      { id: "c2", text: "Ты в безопасности?", next: "girl_help", effect: { charisma: 2, xp: 20 } },
    ]
  },
  girl_observe: {
    id: "girl_observe", speaker: "Повествователь", portrait: "📜",
    text: "Ты наблюдаешь. Девушка что-то шепчет, и тени вокруг неё движутся, словно живые. Она явно владеет какой-то магией.",
    choices: [
      { id: "c1", text: "Подойти — ты видел достаточно", next: "girl_meet", effect: { wisdom: 1, xp: 25 } },
    ]
  },
  spirit_quest: {
    id: "spirit_quest", speaker: "Дух", portrait: "👻",
    text: "'Первая часть — здесь, в руинах. Вторая — у девушки у колодца. Третья — в сердце Ордена. Каждая часть несёт часть твоей памяти... и часть твоей боли.'",
    choices: [
      { id: "c1", text: "Я готов к правде", next: "ending_brave", questUpdate: { id: "q3", status: "completed" }, effect: { xp: 100, wisdom: 3, gold: 30 } },
      { id: "c2", text: "Может, лучше не знать?", next: "ending_doubt", effect: { xp: 50 } },
    ]
  },
  spirit_betrayal: {
    id: "spirit_betrayal", speaker: "Дух", portrait: "👻",
    text: "'Твой предатель — тот, кому ты доверял больше всего. Тот, кто называл себя твоим другом и учителем. Его имя — Варис.'",
    choices: [
      { id: "c1", text: "Этого не может быть...", next: "spirit_quest", effect: { xp: 40 }, flag: "knows_betrayer" },
    ]
  },
  varis_help: {
    id: "varis_help", speaker: "Варис", portrait: "🧙",
    text: "'Тебе нужно найти осколки Разбитого Кристалла. Первый — в этом лесу.' Он замолкает, осматриваясь. 'За нами следят. Беги к руинам — встретимся там.'",
    choices: [
      { id: "c1", text: "Бежать к руинам", next: "ruins", effect: { xp: 30 } },
      { id: "c2", text: "Остаться и сражаться", next: "forest_battle", effect: { strength: 1, xp: 20 } },
    ]
  },
  solo_path: {
    id: "solo_path", speaker: "Повествователь", portrait: "📜",
    text: "Ты уходишь один. Лес расступается, открывая путь к руинам. Возможно, одиночество — твоя сила.",
    choices: [
      { id: "c1", text: "Идти к руинам", next: "ruins", effect: { xp: 25 } },
    ]
  },
  forest_battle: {
    id: "forest_battle", speaker: "Повествователь", portrait: "📜",
    text: "Из теней выскакивают двое в чёрных плащах. Ты сражаешься отчаянно. Варис помогает тебе. Враги бегут, но успевают ранить тебя.",
    choices: [
      { id: "c1", text: "Продолжить путь к руинам", next: "ruins", effect: { xp: 35, hp: -20 } },
    ]
  },
  girl_lore: {
    id: "girl_lore", speaker: "Незнакомка", portrait: "🌙",
    text: "'Ворота между миром живых и миром теней. Раз в сто лет Хранитель должен обновить печать. Если этого не сделать — мир погрузится во тьму навсегда.'",
    choices: [
      { id: "c1", text: "Тогда мне нужно действовать", next: "ruins", questUpdate: { id: "q2", status: "active" }, effect: { xp: 50 } },
    ]
  },
  girl_help: {
    id: "girl_help", speaker: "Незнакомка", portrait: "🌙",
    text: "'Меня зовут Лира. Я — Страж Теней, последняя из своего рода.' Она смотрит на тебя прямо. 'Я ждала тебя. Вместе мы можем остановить Орден.'",
    choices: [
      { id: "c1", text: "Я с тобой, Лира", next: "ruins", questUpdate: { id: "q2", status: "active" }, effect: { xp: 40, charisma: 2 } },
    ]
  },
  ruins_escape: {
    id: "ruins_escape", speaker: "Повествователь", portrait: "📜",
    text: "Ты отступаешь — но дух не преследует тебя. Он лишь тихо произносит вслед: 'Ты вернёшься. Ты всегда возвращаешься...'",
    choices: [
      { id: "c1", text: "Войти в руины", next: "ruins", effect: { xp: 15 } },
      { id: "c2", text: "Поискать другой путь", next: "explore", effect: { xp: 10 } },
    ]
  },
  ending_brave: {
    id: "ending_brave", speaker: "Повествователь", portrait: "🌟",
    text: "Кристалл воссоединяется. Воспоминания возвращаются волной — боль, радость, предательство, любовь. Ты помнишь всё. Ты снова — Хранитель. И путь только начинается...",
    choices: [
      { id: "c1", text: "Начать заново", next: "start" },
    ]
  },
  ending_doubt: {
    id: "ending_doubt", speaker: "Дух", portrait: "👻",
    text: "'Тогда тьма придёт. И ты не будешь помнить даже этого выбора.' Лес смолкает. Ты один. Может, ещё не поздно изменить решение?",
    choices: [
      { id: "c1", text: "Изменить решение", next: "spirit_quest", effect: { xp: 20 } },
      { id: "c2", text: "Принять тьму", next: "start" },
    ]
  },
};

const BG = "https://cdn.poehali.dev/projects/c7a4dbcf-1d45-4c5f-96f2-a9c95b9f1ff2/files/39a01b6f-0ddf-482d-8a23-ecebebb82c8e.jpg";

function xpToNextLevel(level: number) { return level * 100; }

function loadSaves(): SaveSlot[] {
  try { return JSON.parse(localStorage.getItem("rpg_saves") || "[]"); }
  catch { return []; }
}
function writeSaves(saves: SaveSlot[]) {
  localStorage.setItem("rpg_saves", JSON.stringify(saves));
}

function StatBar({ label, value, max, colorClass }: { label: string; value: number; max: number; colorClass: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs" style={{ color: "rgba(251,191,36,0.6)", fontFamily: "IBM Plex Sans, sans-serif" }}>
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${Math.max(0, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Index() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [currentNode, setCurrentNode] = useState("start");
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const [flags, setFlags] = useState<string[]>([]);
  const [saves, setSaves] = useState<SaveSlot[]>(loadSaves);
  const [tab, setTab] = useState<"dialog" | "quests" | "stats">("dialog");
  const [showSave, setShowSave] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const node = DIALOGS[currentNode] || DIALOGS["start"];

  useEffect(() => {
    setIsTyping(true);
    setDisplayedText("");
    let i = 0;
    const txt = node.text;
    const iv = setInterval(() => {
      if (i < txt.length) { setDisplayedText(txt.slice(0, i + 1)); i++; }
      else { setIsTyping(false); clearInterval(iv); }
    }, 20);
    return () => clearInterval(iv);
  }, [currentNode]);

  const notify = useCallback((msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2600);
  }, []);

  const applyChoice = useCallback((choice: Choice) => {
    if (isTyping) { setDisplayedText(node.text); setIsTyping(false); return; }
    const s = { ...stats };
    const e = choice.effect || {};
    if (e.xp) {
      s.xp += e.xp;
      while (s.xp >= xpToNextLevel(s.level)) {
        s.xp -= xpToNextLevel(s.level);
        s.level++;
        s.maxHp += 10;
        s.hp = Math.min(s.hp + 20, s.maxHp);
        notify(`⬆️ Уровень ${s.level}! +10 к здоровью`);
      }
    }
    if (e.hp) s.hp = Math.max(0, Math.min(s.maxHp, s.hp + e.hp));
    if (e.gold) s.gold += e.gold;
    if (e.strength) s.strength += e.strength;
    if (e.wisdom) s.wisdom += e.wisdom;
    if (e.charisma) s.charisma += e.charisma;
    setStats(s);
    if (choice.questUpdate) {
      const { id, status } = choice.questUpdate;
      setQuests(prev => prev.map(q => {
        if (q.id === id) {
          if (status === "completed") notify(`✅ Квест: ${q.title}`);
          else notify(`📜 Новый квест: ${q.title}`);
          return { ...q, status };
        }
        return q;
      }));
    }
    if (choice.flag) setFlags(prev => [...prev, choice.flag!]);
    setCurrentNode(choice.next);
  }, [isTyping, node.text, stats, notify]);

  const saveGame = (slotId: number) => {
    const sv: SaveSlot = { id: slotId, name: `Слот ${slotId}`, timestamp: new Date().toLocaleString("ru-RU"), dialogNode: currentNode, stats, quests, flags };
    const updated = [...saves.filter(s => s.id !== slotId), sv];
    setSaves(updated); writeSaves(updated);
    notify(`💾 Сохранено в слот ${slotId}`);
    setShowSave(false);
  };

  const loadGame = (slot: SaveSlot) => {
    setCurrentNode(slot.dialogNode); setStats(slot.stats); setQuests(slot.quests); setFlags(slot.flags);
    setScreen("game"); notify("📂 Загружено");
  };

  const startNewGame = () => {
    setCurrentNode("start"); setStats(INITIAL_STATS); setQuests(INITIAL_QUESTS); setFlags([]); setScreen("game");
  };

  const xpPct = stats.xp / xpToNextLevel(stats.level) * 100;

  // ─── MENU ──────────────────────────────────────────────────────────────────

  if (screen === "menu") {
    return (
      <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">
        {/* Background with filters */}
        <div className="absolute inset-0 z-0">
          <img src={BG} alt="" className="w-full h-full object-cover"
            style={{ filter: "brightness(0.55) saturate(1.4) contrast(1.1)" }} />
          {/* Deep gradient overlay */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(5,3,20,0.45) 0%, rgba(10,5,30,0.2) 40%, rgba(5,2,18,0.75) 75%, rgba(3,1,12,0.97) 100%)" }} />
          {/* Purple-blue atmospheric tint */}
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 35%, rgba(80,40,160,0.25) 0%, transparent 65%)" }} />
          {/* Vignette */}
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.7) 100%)" }} />
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {[...Array(28)].map((_, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`,
                left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                background: i % 3 === 0 ? "#f59e0b" : i % 3 === 1 ? "#a78bfa" : "#e2d9c0",
                opacity: Math.random() * 0.5 + 0.2,
                animation: `floatUp ${4 + Math.random() * 6}s ${Math.random() * 5}s linear infinite`,
              }} />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-col items-center text-center px-6 select-none"
          style={{ animation: "fadeUp 0.9s ease forwards" }}>

          {/* Subtitle */}
          <p className="text-xs tracking-[0.5em] uppercase mb-6"
            style={{ color: "rgba(167,139,250,0.8)", fontFamily: "IBM Plex Sans, sans-serif", letterSpacing: "0.45em" }}>
            Ролевая игра
          </p>

          {/* Main title */}
          <h1 className="leading-none mb-3 font-cinzel font-black"
            style={{
              fontSize: "clamp(3rem, 12vw, 7.5rem)",
              background: "linear-gradient(180deg, #fff8e7 0%, #f5c842 35%, #c8860a 65%, #7a4a00 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "none",
              filter: "drop-shadow(0 0 40px rgba(200,134,10,0.45)) drop-shadow(0 4px 20px rgba(0,0,0,0.9))",
              letterSpacing: "0.12em",
            }}>
            ХРАНИТЕЛЬ
          </h1>

          {/* Subtitle title */}
          <h2 className="font-cinzel font-semibold tracking-[0.55em] mb-2"
            style={{
              fontSize: "clamp(0.85rem, 3vw, 1.4rem)",
              background: "linear-gradient(90deg, rgba(167,139,250,0.4) 0%, rgba(196,166,255,0.9) 40%, rgba(167,139,250,0.4) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              letterSpacing: "0.55em",
            }}>
            КРИСТАЛЛА
          </h2>

          {/* Ornament line */}
          <div className="flex items-center gap-4 my-6" style={{ width: "min(340px, 80vw)" }}>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(245,200,66,0.5))" }} />
            <span style={{ color: "rgba(245,200,66,0.7)", fontSize: "10px" }}>◆</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(245,200,66,0.5), transparent)" }} />
          </div>

          <p className="text-sm mb-10 leading-relaxed max-w-sm"
            style={{ color: "rgba(210,195,170,0.65)", fontFamily: "IBM Plex Sans, sans-serif", fontWeight: 300 }}>
            Тёмный лес. Утраченные воспоминания.<br />Судьба мира в твоих руках.
          </p>

          {/* Buttons */}
          <div className="flex flex-col items-center gap-3 w-full" style={{ maxWidth: 280 }}>
            <button onClick={startNewGame}
              className="w-full py-4 font-cinzel font-bold tracking-widest uppercase text-sm transition-all duration-300 hover:scale-105 rounded-sm"
              style={{
                background: "linear-gradient(135deg, #b8730a 0%, #e09c18 50%, #b8730a 100%)",
                color: "#1a0d00",
                letterSpacing: "0.25em",
                boxShadow: "0 0 30px rgba(200,134,10,0.35), 0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,220,100,0.3)",
                border: "1px solid rgba(245,190,60,0.4)",
              }}>
              НОВАЯ ИГРА
            </button>

            {saves.length > 0 && (
              <button onClick={() => setScreen("load")}
                className="w-full py-3.5 font-cinzel font-medium tracking-widest uppercase text-xs transition-all duration-300 hover:scale-105 rounded-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(196,166,255,0.85)",
                  letterSpacing: "0.25em",
                  border: "1px solid rgba(167,139,250,0.3)",
                  boxShadow: "0 0 20px rgba(120,80,200,0.15)",
                }}>
                ЗАГРУЗИТЬ
              </button>
            )}
          </div>

          <p className="mt-10 text-xs" style={{ color: "rgba(255,255,255,0.18)", fontFamily: "IBM Plex Sans, sans-serif", letterSpacing: "0.15em" }}>
            Диалоги · Квесты · Прокачка · Сохранения
          </p>
        </div>

        <style>{`
          @keyframes floatUp {
            0% { transform: translateY(20px) scale(1); opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 0.4; }
            100% { transform: translateY(-80vh) scale(0.5); opacity: 0; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ─── LOAD SCREEN ───────────────────────────────────────────────────────────

  if (screen === "load") {
    return (
      <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0">
          <img src={BG} alt="" className="w-full h-full object-cover" style={{ filter: "brightness(0.3) saturate(0.8)" }} />
          <div className="absolute inset-0" style={{ background: "rgba(3,2,15,0.8)" }} />
        </div>
        <div className="relative z-10 w-full max-w-md px-6 space-y-5" style={{ animation: "fadeUp 0.5s ease forwards" }}>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setScreen("menu")} className="transition-colors hover:opacity-80" style={{ color: "rgba(251,191,36,0.7)" }}>
              <Icon name="ArrowLeft" size={20} />
            </button>
            <h2 className="font-cinzel font-bold tracking-widest text-xl" style={{ color: "#f5c842" }}>ЗАГРУЗИТЬ ИГРУ</h2>
          </div>
          {saves.length === 0 ? (
            <p className="text-center py-16" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "IBM Plex Sans, sans-serif" }}>Сохранений пока нет</p>
          ) : (
            saves.sort((a, b) => a.id - b.id).map(slot => (
              <div key={slot.id} className="flex items-center gap-3 p-4 rounded-lg border transition-all hover:scale-[1.01]"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(167,139,250,0.2)" }}>
                <div className="flex-1">
                  <p className="font-cinzel font-bold text-sm" style={{ color: "#f5c842" }}>{slot.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "IBM Plex Sans" }}>{slot.timestamp}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "IBM Plex Sans" }}>
                    Ур. {slot.stats.level} · {slot.stats.hp} HP · {slot.stats.gold}💰
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadGame(slot)}
                    className="px-4 py-2 text-xs font-cinzel font-bold uppercase tracking-wider rounded transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#b8730a,#e09c18)", color: "#1a0d00" }}>
                    Загрузить
                  </button>
                  <button onClick={() => { const u = saves.filter(s => s.id !== slot.id); setSaves(u); writeSaves(u); }}
                    className="px-3 py-2 rounded transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,100,100,0.6)" }}>
                    <Icon name="Trash2" size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>
      </div>
    );
  }

  // ─── GAME SCREEN ───────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col" style={{ fontFamily: "IBM Plex Sans, sans-serif" }}>
      {/* BG */}
      <div className="absolute inset-0 z-0">
        <img src={BG} alt="" className="w-full h-full object-cover transition-all duration-1000"
          style={{ filter: "brightness(0.4) saturate(1.2)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(5,3,20,0.6) 0%,transparent 50%,rgba(3,1,12,0.9) 100%)" }} />
      </div>

      {/* Notification */}
      {note && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm backdrop-blur-sm"
          style={{ background: "rgba(20,10,40,0.9)", border: "1px solid rgba(245,200,66,0.4)", color: "#f5c842", animation: "fadeUp 0.3s ease forwards" }}>
          {note}
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2">
        <button onClick={() => setScreen("menu")} className="transition-opacity hover:opacity-70" style={{ color: "rgba(255,255,255,0.4)" }}>
          <Icon name="ChevronLeft" size={20} />
        </button>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="font-cinzel font-bold text-sm" style={{ color: "#f5c842" }}>Ур. {stats.level}</div>
            <div className="w-20 h-1 rounded-full overflow-hidden mt-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${xpPct}%`, background: "linear-gradient(90deg,#b8730a,#f5c842)" }} />
            </div>
          </div>
          <span className="text-sm" style={{ color: "rgba(255,220,80,0.75)" }}>{stats.gold} 💰</span>
        </div>
        <button onClick={() => setShowSave(!showSave)} className="transition-opacity hover:opacity-70" style={{ color: "rgba(167,139,250,0.7)" }}>
          <Icon name="Save" size={18} />
        </button>
      </div>

      {/* Save panel */}
      {showSave && (
        <div className="relative z-20 mx-4 mb-2 p-4 rounded-xl backdrop-blur-sm" style={{ background: "rgba(5,3,20,0.95)", border: "1px solid rgba(167,139,250,0.2)", animation: "slideIn 0.25s ease forwards" }}>
          <p className="text-xs uppercase tracking-widest mb-3 font-cinzel" style={{ color: "rgba(167,139,250,0.6)" }}>Сохранить в слот</p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(id => (
              <button key={id} onClick={() => saveGame(id)}
                className="py-3 rounded-lg text-center transition-all hover:scale-105"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${saves.find(s => s.id === id) ? "rgba(245,200,66,0.3)" : "rgba(255,255,255,0.1)"}` }}>
                <p className="font-cinzel font-bold text-xs" style={{ color: "#f5c842" }}>Слот {id}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{saves.find(s => s.id === id) ? "Перезаписать" : "Пусто"}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="relative z-10 mx-4 mb-3 flex gap-1 p-1 rounded-xl" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {([["dialog", "MessageCircle", "Диалог"], ["quests", "ScrollText", "Квесты"], ["stats", "Swords", "Герой"]] as const).map(([t, icon, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium tracking-wider transition-all duration-200"
            style={{
              background: tab === t ? "linear-gradient(135deg,rgba(184,115,10,0.7),rgba(120,80,200,0.4))" : "transparent",
              color: tab === t ? "#fef3c7" : "rgba(255,255,255,0.35)",
              border: tab === t ? "1px solid rgba(245,200,66,0.2)" : "1px solid transparent",
              fontFamily: "Cinzel, serif",
            }}>
            <Icon name={icon} size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3">

        {/* DIALOG */}
        {tab === "dialog" && (
          <div className="flex flex-col gap-3" style={{ animation: "slideIn 0.3s ease forwards" }}>
            {/* Speaker */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                style={{ background: "linear-gradient(135deg,rgba(80,40,160,0.6),rgba(20,10,40,0.9))", border: "1.5px solid rgba(245,200,66,0.35)", boxShadow: "0 0 16px rgba(167,139,250,0.2)" }}>
                {node.portrait}
              </div>
              <div>
                <p className="font-cinzel font-bold text-sm" style={{ color: "#f5c842" }}>{node.speaker}</p>
                <div className="flex gap-1 mt-1">
                  {[...Array(3)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full" style={{ background: "rgba(245,200,66,0.3)" }} />)}
                </div>
              </div>
            </div>

            {/* Text box */}
            <div className="p-5 rounded-2xl cursor-pointer relative" onClick={() => isTyping && (setDisplayedText(node.text), setIsTyping(false))}
              style={{ background: "rgba(3,2,15,0.82)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", minHeight: 110 }}>
              <div className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ background: "linear-gradient(135deg,rgba(80,40,160,0.08) 0%,transparent 60%)" }} />
              <p className="relative text-sm leading-relaxed" style={{ color: "rgba(235,225,200,0.92)" }}>
                {displayedText}
                {isTyping && <span className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "#f5c842" }} />}
              </p>
              {isTyping && <p className="absolute bottom-3 right-4 text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>нажми для пропуска</p>}
            </div>

            {/* Choices */}
            {!isTyping && (
              <div className="space-y-2" style={{ animation: "slideIn 0.3s ease forwards" }}>
                {node.choices.map((ch, i) => (
                  <button key={ch.id} onClick={() => applyChoice(ch)}
                    className="w-full text-left p-4 rounded-xl transition-all duration-200 group"
                    style={{ background: "rgba(5,3,20,0.75)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(245,200,66,0.4)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateX(4px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(255,255,255,0.07)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateX(0)"; }}>
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono mt-0.5 shrink-0" style={{ color: "rgba(245,200,66,0.45)" }}>{i + 1}.</span>
                      <span className="text-sm leading-relaxed" style={{ color: "rgba(220,210,190,0.9)" }}>{ch.text}</span>
                    </div>
                    {ch.effect && (
                      <div className="flex gap-1.5 mt-2 ml-5 flex-wrap">
                        {ch.effect.xp && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(200,134,10,0.15)", color: "rgba(245,200,66,0.75)" }}>+{ch.effect.xp} XP</span>}
                        {ch.effect.gold && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.15)", color: "rgba(253,224,71,0.75)" }}>+{ch.effect.gold}💰</span>}
                        {ch.effect.hp && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: ch.effect.hp > 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: ch.effect.hp > 0 ? "rgba(52,211,153,0.8)" : "rgba(252,165,165,0.8)" }}>{ch.effect.hp > 0 ? "+" : ""}{ch.effect.hp} HP</span>}
                        {ch.effect.wisdom && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.15)", color: "rgba(147,197,253,0.75)" }}>+Мудрость</span>}
                        {ch.effect.strength && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(251,146,60,0.15)", color: "rgba(253,186,116,0.75)" }}>+Сила</span>}
                        {ch.effect.charisma && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(244,114,182,0.15)", color: "rgba(249,168,212,0.75)" }}>+Харизма</span>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QUESTS */}
        {tab === "quests" && (
          <div className="space-y-3" style={{ animation: "slideIn 0.3s ease forwards" }}>
            <h3 className="font-cinzel font-bold text-xs uppercase tracking-widest" style={{ color: "rgba(245,200,66,0.6)" }}>Журнал квестов</h3>
            {quests.map(q => (
              <div key={q.id} className="p-3 rounded-xl transition-all"
                style={{
                  background: q.status === "completed" ? "rgba(200,134,10,0.07)" : q.status === "active" ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${q.status === "completed" ? "rgba(200,134,10,0.3)" : q.status === "active" ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.07)"}`,
                }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 11 }}>{q.status === "completed" ? "✓" : q.status === "active" ? "●" : "🔒"}</span>
                  <span className="font-cinzel font-semibold text-sm"
                    style={{ color: q.status === "completed" ? "rgba(245,200,66,0.55)" : q.status === "active" ? "rgba(52,211,153,0.9)" : "rgba(255,255,255,0.3)", textDecoration: q.status === "completed" ? "line-through" : "none" }}>
                    {q.title}
                  </span>
                  <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>+{q.xpReward} XP</span>
                </div>
                {q.status !== "locked" && <p className="mt-1 text-xs pl-5" style={{ color: "rgba(255,255,255,0.4)" }}>{q.description}</p>}
              </div>
            ))}
            <div className="p-3 rounded-xl mt-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "IBM Plex Sans" }}>
                Активных: <span style={{ color: "rgba(52,211,153,0.8)" }}>{quests.filter(q => q.status === "active").length}</span>
                {" · "}Выполнено: <span style={{ color: "rgba(245,200,66,0.8)" }}>{quests.filter(q => q.status === "completed").length}</span>
              </p>
            </div>
          </div>
        )}

        {/* STATS */}
        {tab === "stats" && (
          <div className="space-y-4" style={{ animation: "slideIn 0.3s ease forwards" }}>
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(5,3,20,0.8)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0"
                style={{ background: "linear-gradient(135deg,rgba(120,60,20,0.8),rgba(40,20,80,0.8))", border: "2px solid rgba(245,200,66,0.35)" }}>
                ⚔️
              </div>
              <div>
                <p className="font-cinzel font-bold text-base" style={{ color: "#f5c842" }}>Герой</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.7)" }}>Уровень {stats.level} · Хранитель Кристалла</p>
              </div>
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <StatBar label="Здоровье" value={stats.hp} max={stats.maxHp} colorClass="bg-gradient-to-r from-red-700 to-red-500" />
              <StatBar label="Опыт до ур. " value={stats.xp} max={xpToNextLevel(stats.level)} colorClass="bg-gradient-to-r from-amber-700 to-amber-400" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Сила", value: stats.strength, icon: "⚔️", color: "rgba(251,146,60,0.9)" },
                { label: "Мудрость", value: stats.wisdom, icon: "🔮", color: "rgba(147,197,253,0.9)" },
                { label: "Харизма", value: stats.charisma, icon: "✨", color: "rgba(249,168,212,0.9)" },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: "rgba(5,3,20,0.8)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="font-cinzel font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl flex justify-between items-center" style={{ background: "rgba(120,80,5,0.2)", border: "1px solid rgba(245,200,66,0.2)" }}>
              <span className="text-sm" style={{ color: "rgba(245,200,66,0.6)", fontFamily: "Cinzel, serif" }}>Золото</span>
              <span className="font-cinzel font-bold" style={{ color: "#f5c842" }}>{stats.gold} 💰</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatUp { 0%{transform:translateY(0);opacity:0} 15%{opacity:1} 85%{opacity:.4} 100%{transform:translateY(-80vh);opacity:0} }
      `}</style>
    </div>
  );
}
