import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "개인정보처리방침" };

const S = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "28px 0 10px 0", paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
    {children}
  </h2>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.8, margin: "6px 0" }}>{children}</p>
);

const Li = ({ children }: { children: React.ReactNode }) => (
  <li style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.8, marginBottom: 3 }}>· {children}</li>
);

export default function PrivacyPage() {
  return (
    <main style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", padding: "48px 24px calc(80px + env(safe-area-inset-bottom))" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none", display: "inline-block", marginBottom: 32 }}>
          ← 아차청음사
        </Link>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>개인정보처리방침</h1>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 0 }}>시행일: 2026년 5월 8일</p>

        <P>
          아차청음사(이하 &quot;서비스&quot;)는 이용자의 개인정보를 중요하게 생각하며,
          개인정보 보호법 및 관련 법령을 준수합니다. 본 방침은 서비스가 수집하는 개인정보의 항목,
          수집 목적, 보유 기간, 제3자 제공 및 이용자의 권리에 대해 안내합니다.
        </P>

        <S>1. 수집하는 개인정보 항목</S>
        <P>서비스는 회원가입 및 서비스 제공을 위해 아래 정보를 수집합니다.</P>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li>이메일 주소 (회원가입·로그인 수단)</Li>
          <Li>닉네임</Li>
          <Li>프로필 이모지</Li>
          <Li>서비스 이용 기록 (평점, 한줄평, 북마크, 트랙 좋아요, 댓글 등)</Li>
        </ul>
        <P>서비스는 민감정보(건강, 종교, 정치 성향 등)를 수집하지 않습니다.</P>

        <S>2. 개인정보 수집 및 이용 목적</S>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li>회원 식별 및 로그인 서비스 제공</Li>
          <Li>사용자 작성 콘텐츠(평점, 한줄평 등) 저장 및 표시</Li>
          <Li>서비스 운영·개선 및 오류 대응</Li>
        </ul>

        <S>3. 개인정보 보유 및 이용 기간</S>
        <P>
          회원 탈퇴 요청 시까지 보유합니다. 탈퇴 요청은 서비스 내 계정 설정 또는
          아래 문의처를 통해 신청할 수 있으며, 요청 즉시 또는 최대 7일 이내에 삭제 처리합니다.
        </P>
        <P>단, 관련 법령에 보존 의무가 있는 정보는 해당 기간 동안 별도 보관합니다.</P>

        <S>4. 개인정보의 제3자 제공</S>
        <P>서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 서비스 운영을 위해 아래 업체에 위탁합니다.</P>
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-elevated)" }}>
                {["수탁자", "위탁 업무", "보유 기간"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 12px", color: "var(--text-sub)" }}>Supabase Inc.</td>
                <td style={{ padding: "8px 12px", color: "var(--text-sub)" }}>데이터베이스 저장 및 인증 서비스</td>
                <td style={{ padding: "8px 12px", color: "var(--text-sub)" }}>회원 탈퇴 시까지</td>
              </tr>
            </tbody>
          </table>
        </div>

        <S>5. 개인정보의 국외 이전</S>
        <P>서비스는 원활한 운영을 위해 개인정보를 아래와 같이 국외로 이전합니다.</P>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li><b>수탁자:</b> Supabase Inc.</Li>
          <Li><b>이전 국가:</b> 미국</Li>
          <Li><b>이전 목적:</b> 데이터베이스 저장 및 인증 처리</Li>
          <Li><b>이전 항목:</b> 이메일, 닉네임, 서비스 이용 기록</Li>
          <Li><b>보유 기간:</b> 회원 탈퇴 시까지</Li>
        </ul>
        <P>
          또한 앨범 검색 기능 제공을 위해 Spotify AB(스웨덴)의 API를 이용합니다.
          Spotify API 이용 시 검색어가 Spotify 서버로 전송될 수 있습니다.
          Spotify의 개인정보 처리 방식은{" "}
          <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            Spotify 개인정보처리방침
          </a>
          을 참고하세요.
        </P>

        <S>6. 정보주체의 권리 및 행사 방법</S>
        <P>이용자는 언제든지 아래 권리를 행사할 수 있습니다.</P>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li>개인정보 열람 요청</Li>
          <Li>개인정보 정정·삭제 요청</Li>
          <Li>개인정보 처리 정지 요청</Li>
          <Li>회원 탈퇴(개인정보 전체 삭제) 요청</Li>
        </ul>
        <P>요청은 아래 개인정보 보호책임자에게 이메일로 연락해주시면 7일 이내에 처리합니다.</P>

        <S>7. 만 14세 미만 아동의 개인정보</S>
        <P>
          서비스는 만 14세 미만 아동의 개인정보를 수집하지 않습니다.
          만 14세 미만인 경우 서비스에 가입할 수 없습니다.
        </P>

        <S>8. 개인정보 보호책임자</S>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li>담당자: 아차청음사 운영자</Li>
          <Li>이메일: dshin280@gmail.com</Li>
        </ul>

        <S>9. 개인정보처리방침 변경</S>
        <P>
          본 방침은 법령 또는 서비스 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지사항을 통해 안내합니다.
        </P>

        <div style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <Link href="/terms" style={{ fontSize: 12, color: "var(--text-muted)" }}>이용약관 보기 →</Link>
        </div>
      </div>
    </main>
  );
}
