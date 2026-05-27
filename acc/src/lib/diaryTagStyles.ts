export type TagStyle = { icon: string; bg: string; border: string; text: string };

export const TAG_PRESETS: Record<string, TagStyle> = {
  // 장소
  "카페":       { icon: "☕", bg: "rgba(155,105,60,0.12)",  border: "rgba(155,105,60,0.32)",  text: "#B8845A" },
  "집":         { icon: "🏠", bg: "rgba(115,155,115,0.12)", border: "rgba(115,155,115,0.32)", text: "#6EA87A" },
  "방":         { icon: "🛋️", bg: "rgba(140,120,100,0.12)", border: "rgba(140,120,100,0.32)", text: "#9E8870" },
  "도서관":     { icon: "📚", bg: "rgba(100,130,170,0.12)", border: "rgba(100,130,170,0.32)", text: "#7090C0" },
  "지하철":     { icon: "🚇", bg: "rgba(80,120,180,0.12)",  border: "rgba(80,120,180,0.32)",  text: "#6090C8" },
  "버스":       { icon: "🚌", bg: "rgba(80,150,130,0.12)",  border: "rgba(80,150,130,0.32)",  text: "#50A090" },
  "공원":       { icon: "🌳", bg: "rgba(85,145,85,0.12)",   border: "rgba(85,145,85,0.32)",   text: "#5A9E5A" },
  "헬스장":     { icon: "🏋️", bg: "rgba(180,90,90,0.12)",   border: "rgba(180,90,90,0.32)",   text: "#C06060" },
  "사무실":     { icon: "💼", bg: "rgba(110,120,140,0.12)", border: "rgba(110,120,140,0.32)", text: "#7880A0" },
  "차 안":      { icon: "🚗", bg: "rgba(90,140,180,0.12)",  border: "rgba(90,140,180,0.32)",  text: "#5A9EC8" },
  "학교":       { icon: "🎓", bg: "rgba(130,100,180,0.12)", border: "rgba(130,100,180,0.32)", text: "#9070C8" },
  "야외":       { icon: "🌤️", bg: "rgba(100,170,150,0.12)", border: "rgba(100,170,150,0.32)", text: "#60B09A" },

  // 시간대
  "아침":       { icon: "🌅", bg: "rgba(210,150,80,0.12)",  border: "rgba(210,150,80,0.32)",  text: "#D09040" },
  "이른 아침":  { icon: "🌅", bg: "rgba(210,150,80,0.12)",  border: "rgba(210,150,80,0.32)",  text: "#D09040" },
  "오전":       { icon: "🌤️", bg: "rgba(190,160,80,0.12)",  border: "rgba(190,160,80,0.32)",  text: "#C0A840" },
  "점심":       { icon: "☀️", bg: "rgba(210,170,60,0.12)",  border: "rgba(210,170,60,0.32)",  text: "#C8A830" },
  "오후":       { icon: "🌇", bg: "rgba(200,140,80,0.12)",  border: "rgba(200,140,80,0.32)",  text: "#C89050" },
  "저녁":       { icon: "🌆", bg: "rgba(190,110,70,0.12)",  border: "rgba(190,110,70,0.32)",  text: "#C07040" },
  "밤":         { icon: "🌃", bg: "rgba(80,90,150,0.12)",   border: "rgba(80,90,150,0.32)",   text: "#6070B0" },
  "야밤에":     { icon: "🌃", bg: "rgba(80,90,150,0.12)",   border: "rgba(80,90,150,0.32)",   text: "#6070B0" },
  "심야":       { icon: "🌙", bg: "rgba(100,90,180,0.12)",  border: "rgba(100,90,180,0.32)",  text: "#7868C8" },
  "자정":       { icon: "🌙", bg: "rgba(100,90,180,0.12)",  border: "rgba(100,90,180,0.32)",  text: "#7868C8" },
  "새벽":       { icon: "🌌", bg: "rgba(60,70,140,0.12)",   border: "rgba(60,70,140,0.32)",   text: "#5060A8" },
  "퇴근 후":    { icon: "🌆", bg: "rgba(185,120,70,0.12)",  border: "rgba(185,120,70,0.32)",  text: "#C08045" },
  "출근 전":    { icon: "🌅", bg: "rgba(200,150,70,0.12)",  border: "rgba(200,150,70,0.32)",  text: "#C09840" },
  "잠들기 전":  { icon: "🌙", bg: "rgba(100,90,180,0.12)",  border: "rgba(100,90,180,0.32)",  text: "#7868C8" },

  // 이동/활동
  "출근길":     { icon: "🚇", bg: "rgba(70,130,185,0.12)",  border: "rgba(70,130,185,0.32)",  text: "#4888C8" },
  "퇴근길":     { icon: "🚇", bg: "rgba(70,130,185,0.12)",  border: "rgba(70,130,185,0.32)",  text: "#4888C8" },
  "출퇴근":     { icon: "🚇", bg: "rgba(70,130,185,0.12)",  border: "rgba(70,130,185,0.32)",  text: "#4888C8" },
  "산책":       { icon: "🌿", bg: "rgba(90,155,105,0.12)",  border: "rgba(90,155,105,0.32)",  text: "#5A9E6A" },
  "드라이브":   { icon: "🛣️", bg: "rgba(80,150,170,0.12)",  border: "rgba(80,150,170,0.32)",  text: "#50A0B8" },
  "자전거":     { icon: "🚴", bg: "rgba(80,150,170,0.12)",  border: "rgba(80,150,170,0.32)",  text: "#50A0B8" },
  "여행 중":    { icon: "✈️", bg: "rgba(60,140,200,0.12)",  border: "rgba(60,140,200,0.32)",  text: "#3A98D8" },
  "여행 후":    { icon: "✈️", bg: "rgba(60,140,200,0.12)",  border: "rgba(60,140,200,0.32)",  text: "#3A98D8" },
  "비행기":     { icon: "✈️", bg: "rgba(60,140,200,0.12)",  border: "rgba(60,140,200,0.32)",  text: "#3A98D8" },
  "기차":       { icon: "🚆", bg: "rgba(80,130,185,0.12)",  border: "rgba(80,130,185,0.32)",  text: "#5090C8" },
  "운동":       { icon: "🏃", bg: "rgba(180,80,80,0.12)",   border: "rgba(180,80,80,0.32)",   text: "#C05858" },

  // 기기
  "이어폰":     { icon: "🎧", bg: "rgba(110,130,185,0.12)", border: "rgba(110,130,185,0.32)", text: "#7888C8" },
  "헤드폰":     { icon: "🎧", bg: "rgba(100,120,175,0.12)", border: "rgba(100,120,175,0.32)", text: "#7080C0" },
  "에어팟":     { icon: "🎧", bg: "rgba(120,140,190,0.12)", border: "rgba(120,140,190,0.32)", text: "#8090CC" },
  "스피커":     { icon: "🔊", bg: "rgba(155,120,75,0.12)",  border: "rgba(155,120,75,0.32)",  text: "#A88050" },

  // 감정/분위기
  "차분함":     { icon: "🌊", bg: "rgba(70,155,160,0.12)",  border: "rgba(70,155,160,0.32)",  text: "#48A0A8" },
  "평온":       { icon: "🌊", bg: "rgba(70,155,160,0.12)",  border: "rgba(70,155,160,0.32)",  text: "#48A0A8" },
  "설렘":       { icon: "💫", bg: "rgba(180,130,200,0.12)", border: "rgba(180,130,200,0.32)", text: "#C090D8" },
  "기쁨":       { icon: "✨", bg: "rgba(210,175,80,0.12)",  border: "rgba(210,175,80,0.32)",  text: "#C8A840" },
  "행복":       { icon: "✨", bg: "rgba(210,175,80,0.12)",  border: "rgba(210,175,80,0.32)",  text: "#C8A840" },
  "따뜻함":     { icon: "☀️", bg: "rgba(210,170,60,0.12)",  border: "rgba(210,170,60,0.32)",  text: "#C8A830" },
  "우울함":     { icon: "🌧️", bg: "rgba(90,100,140,0.12)",  border: "rgba(90,100,140,0.32)",  text: "#6070A0" },
  "슬픔":       { icon: "🌧️", bg: "rgba(90,100,140,0.12)",  border: "rgba(90,100,140,0.32)",  text: "#6070A0" },
  "그리움":     { icon: "🕯️", bg: "rgba(160,130,90,0.12)",  border: "rgba(160,130,90,0.32)",  text: "#A88858" },
  "아련함":     { icon: "🕯️", bg: "rgba(160,130,90,0.12)",  border: "rgba(160,130,90,0.32)",  text: "#A88858" },
  "쓸쓸함":     { icon: "🍂", bg: "rgba(155,110,70,0.12)",  border: "rgba(155,110,70,0.32)",  text: "#A87848" },
  "외로움":     { icon: "🍂", bg: "rgba(155,110,70,0.12)",  border: "rgba(155,110,70,0.32)",  text: "#A87848" },
  "몽환적":     { icon: "🌸", bg: "rgba(185,130,165,0.12)", border: "rgba(185,130,165,0.32)", text: "#C090B0" },
  "편안한":     { icon: "🛋️", bg: "rgba(120,165,130,0.12)", border: "rgba(120,165,130,0.32)", text: "#78A888" },
  "피곤함":     { icon: "😪", bg: "rgba(120,110,100,0.12)", border: "rgba(120,110,100,0.32)", text: "#887868" },
  "나른함":     { icon: "😪", bg: "rgba(120,110,100,0.12)", border: "rgba(120,110,100,0.32)", text: "#887868" },
  "불안":       { icon: "🌪️", bg: "rgba(140,110,90,0.12)",  border: "rgba(140,110,90,0.32)",  text: "#9E7860" },
  "뭉클함":     { icon: "🫧", bg: "rgba(180,130,200,0.12)", border: "rgba(180,130,200,0.32)", text: "#C090D8" },
  "공허함":     { icon: "🌑", bg: "rgba(80,80,100,0.12)",   border: "rgba(80,80,100,0.32)",   text: "#606080" },

  // 상황/상태
  "혼자":       { icon: "🕯️", bg: "rgba(155,135,90,0.12)",  border: "rgba(155,135,90,0.32)",  text: "#A89060" },
  "집중":       { icon: "🎯", bg: "rgba(180,75,75,0.12)",   border: "rgba(180,75,75,0.32)",   text: "#C05050" },
  "반복 청취":  { icon: "🔁", bg: "rgba(196,170,124,0.12)", border: "rgba(196,170,124,0.32)", text: "#C4AA7C" },
  "처음 들음":  { icon: "🆕", bg: "rgba(60,180,160,0.12)",  border: "rgba(60,180,160,0.32)",  text: "#38B8A0" },
  "재청취":     { icon: "🔄", bg: "rgba(196,170,124,0.12)", border: "rgba(196,170,124,0.32)", text: "#C4AA7C" },
  "공부":       { icon: "📖", bg: "rgba(100,120,180,0.12)", border: "rgba(100,120,180,0.32)", text: "#6880C8" },
  "업무":       { icon: "💻", bg: "rgba(80,140,180,0.12)",  border: "rgba(80,140,180,0.32)",  text: "#5090C0" },
  "코딩":       { icon: "💻", bg: "rgba(80,140,180,0.12)",  border: "rgba(80,140,180,0.32)",  text: "#5090C0" },
  "요리":       { icon: "🍳", bg: "rgba(190,120,60,0.12)",  border: "rgba(190,120,60,0.32)",  text: "#C07838" },
  "청소":       { icon: "🧹", bg: "rgba(100,170,160,0.12)", border: "rgba(100,170,160,0.32)", text: "#58A89E" },
  "독서":       { icon: "📚", bg: "rgba(100,130,170,0.12)", border: "rgba(100,130,170,0.32)", text: "#7090C0" },
  "커피":       { icon: "☕", bg: "rgba(155,105,60,0.12)",  border: "rgba(155,105,60,0.32)",  text: "#B8845A" },
  "차":         { icon: "🍵", bg: "rgba(100,155,120,0.12)", border: "rgba(100,155,120,0.32)", text: "#60A878" },
  "맥주":       { icon: "🍺", bg: "rgba(200,160,60,0.12)",  border: "rgba(200,160,60,0.32)",  text: "#C8A030" },
  "와인":       { icon: "🍷", bg: "rgba(155,65,85,0.12)",   border: "rgba(155,65,85,0.32)",   text: "#B04058" },
  "위스키":     { icon: "🥃", bg: "rgba(185,130,60,0.12)",  border: "rgba(185,130,60,0.32)",  text: "#C09030" },

  // 날씨
  "맑음":       { icon: "☀️", bg: "rgba(210,175,55,0.12)",  border: "rgba(210,175,55,0.32)",  text: "#C8A828" },
  "비":         { icon: "🌧️", bg: "rgba(80,110,155,0.12)",  border: "rgba(80,110,155,0.32)",  text: "#5878A8" },
  "흐림":       { icon: "☁️", bg: "rgba(115,125,140,0.12)", border: "rgba(115,125,140,0.32)", text: "#808898" },
  "눈":         { icon: "❄️", bg: "rgba(160,185,210,0.12)", border: "rgba(160,185,210,0.32)", text: "#90B0D0" },
  "바람":       { icon: "🍃", bg: "rgba(90,155,130,0.12)",  border: "rgba(90,155,130,0.32)",  text: "#58A080" },
  "소나기":     { icon: "🌦️", bg: "rgba(90,130,175,0.12)",  border: "rgba(90,130,175,0.32)",  text: "#6090C0" },

  // 계절
  "봄":         { icon: "🌸", bg: "rgba(210,150,170,0.12)", border: "rgba(210,150,170,0.32)", text: "#D090A8" },
  "여름":       { icon: "🌊", bg: "rgba(60,160,200,0.12)",  border: "rgba(60,160,200,0.32)",  text: "#38A8D8" },
  "가을":       { icon: "🍂", bg: "rgba(185,115,55,0.12)",  border: "rgba(185,115,55,0.32)",  text: "#C07838" },
  "겨울":       { icon: "❄️", bg: "rgba(140,175,210,0.12)", border: "rgba(140,175,210,0.32)", text: "#80A8D0" },

  // 빛/분위기
  "노을":       { icon: "🌅", bg: "rgba(210,140,80,0.12)",  border: "rgba(210,140,80,0.32)",  text: "#D09050" },
  "야경":       { icon: "🌃", bg: "rgba(60,80,140,0.12)",   border: "rgba(60,80,140,0.32)",   text: "#4060A8" },
  "햇살":       { icon: "☀️", bg: "rgba(220,185,80,0.12)",  border: "rgba(220,185,80,0.32)",  text: "#D0B040" },
};

const FALLBACK_COLORS: Omit<TagStyle, "icon">[] = [
  { bg: "rgba(196,170,100,0.1)", border: "rgba(196,170,100,0.28)", text: "#C4AA64" },
  { bg: "rgba(100,120,165,0.1)", border: "rgba(100,120,165,0.28)", text: "#7088B8" },
  { bg: "rgba(100,150,115,0.1)", border: "rgba(100,150,115,0.28)", text: "#64A078" },
  { bg: "rgba(175,115,115,0.1)", border: "rgba(175,115,115,0.28)", text: "#C07878" },
  { bg: "rgba(185,120,80,0.1)",  border: "rgba(185,120,80,0.28)",  text: "#C08050" },
  { bg: "rgba(145,120,185,0.1)", border: "rgba(145,120,185,0.28)", text: "#9878C8" },
  { bg: "rgba(60,148,150,0.1)",  border: "rgba(60,148,150,0.28)",  text: "#3A9898" },
  { bg: "rgba(200,150,60,0.1)",  border: "rgba(200,150,60,0.28)",  text: "#C89830" },
  { bg: "rgba(120,95,170,0.1)",  border: "rgba(120,95,170,0.28)",  text: "#8060B8" },
  { bg: "rgba(110,135,80,0.1)",  border: "rgba(110,135,80,0.28)",  text: "#789050" },
  { bg: "rgba(90,155,185,0.1)",  border: "rgba(90,155,185,0.28)",  text: "#58A0C8" },
  { bg: "rgba(155,65,80,0.1)",   border: "rgba(155,65,80,0.28)",   text: "#A84050" },
];

export function getTagStyle(tag: string): TagStyle & { isPreset: boolean } {
  if (TAG_PRESETS[tag]) return { ...TAG_PRESETS[tag], isPreset: true };
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xffff;
  const c = FALLBACK_COLORS[h % FALLBACK_COLORS.length];
  return { icon: "", ...c, isPreset: false };
}
