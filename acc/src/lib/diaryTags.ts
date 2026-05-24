export type DiaryCategory = {
  id: string;
  label: string;
  defaultOpen?: boolean;
  tags: string[];
};

export const MAX_TAGS = 8;

export const DIARY_CATEGORIES: DiaryCategory[] = [
  {
    id: "emotion_positive",
    label: "감정 — 긍정",
    defaultOpen: true,
    tags: ["설렘", "기쁨", "행복", "평온", "차분함", "뿌듯함", "따뜻함", "감사함", "들뜸", "활기", "충만함", "사랑스러움"],
  },
  {
    id: "emotion_negative",
    label: "감정 — 부정",
    defaultOpen: true,
    tags: ["슬픔", "우울함", "외로움", "그리움", "불안", "지침", "공허함", "분노", "짜증", "답답함", "허무함", "실망"],
  },
  {
    id: "emotion_neutral",
    label: "감정 — 복합·중립",
    defaultOpen: true,
    tags: ["뭉클함", "아련함", "쓸쓸함", "복잡함", "덤덤함", "멍함", "묘한 기분", "감성적", "회한", "무감각"],
  },
  {
    id: "time",
    label: "시간대",
    defaultOpen: true,
    tags: ["새벽", "이른 아침", "오전", "점심", "오후", "저녁", "밤", "야밤에", "자정", "잠들기 전"],
  },
  {
    id: "activity_static",
    label: "활동 — 정적",
    defaultOpen: true,
    tags: ["독서", "그림 그리기", "글쓰기", "낮잠", "멍때리기", "누워있기", "명상", "영화 보기", "드라마 보기"],
  },
  {
    id: "weather",
    label: "날씨·기상",
    tags: ["맑음", "흐림", "비", "폭우", "눈", "안개", "바람", "소나기"],
  },
  {
    id: "season",
    label: "계절·자연",
    tags: ["봄", "여름", "가을", "겨울", "봄비", "낙엽", "첫눈", "여름 끝"],
  },
  {
    id: "body",
    label: "신체 상태",
    tags: ["피곤함", "졸림", "상쾌함", "아픔", "숙취", "나른함", "긴장됨", "릴랙스됨"],
  },
  {
    id: "energy",
    label: "에너지·페이스",
    tags: ["여유로움", "바쁨", "집중", "늘어짐", "몰입", "산만함"],
  },
  {
    id: "activity_moving",
    label: "활동 — 이동",
    tags: ["출근길", "퇴근길", "버스", "지하철", "산책", "드라이브", "비행기", "기차", "자전거"],
  },
  {
    id: "activity_productive",
    label: "활동 — 생산적",
    tags: ["공부", "업무", "과제", "코딩", "디자인", "창작", "운동"],
  },
  {
    id: "activity_routine",
    label: "활동 — 루틴",
    tags: ["청소", "요리", "설거지", "빨래", "샤워", "아침 준비"],
  },
  {
    id: "activity_social",
    label: "활동 — 사교",
    tags: ["파티", "모임", "데이트", "혼자만의 시간"],
  },
  {
    id: "place_indoor",
    label: "장소 — 실내",
    tags: ["집", "카페", "도서관", "사무실", "학교", "스튜디오", "체육관", "편의점"],
  },
  {
    id: "place_outdoor",
    label: "장소 — 야외",
    tags: ["공원", "한강", "바다", "산", "옥상", "야외 카페", "도심", "골목"],
  },
  {
    id: "with",
    label: "함께",
    tags: ["혼자", "친구와", "연인과", "가족과", "낯선 사람들 사이"],
  },
  {
    id: "listening_context",
    label: "청음 맥락",
    tags: ["처음 들음", "오랜만에 다시", "수백 번 들은", "추천받아서", "우연히", "전체 감상", "흘려듣기", "집중 감상"],
  },
  {
    id: "life_events",
    label: "인생·기억·이벤트",
    tags: ["생일", "기념일", "이별", "새 시작", "여행 중", "여행 후", "시험 후", "졸업", "이사", "한 해의 마무리"],
  },
  {
    id: "food_drink",
    label: "음식·음료",
    tags: ["커피", "차", "맥주", "와인", "위스키", "야식", "간식"],
  },
  {
    id: "light",
    label: "조명·빛",
    tags: ["햇살", "노을", "야경", "어두운 방", "촛불", "창문 빛"],
  },
  {
    id: "sound_env",
    label: "소리 환경",
    tags: ["완전한 정적", "도시 소음", "자연 소리", "카페 소음", "빗소리"],
  },
  {
    id: "vibe",
    label: "분위기·바이브",
    tags: ["몽환적", "서정적", "사색적", "영화 같은", "고즈넉한", "레트로", "도시적", "시네마틱"],
  },
  {
    id: "memory_time",
    label: "시간·기억 감각",
    tags: ["어린 시절이 떠올라", "특정 시절이 생각나", "처음 듣던 그 날", "잊고 있던 기억", "미래가 그려져"],
  },
];
