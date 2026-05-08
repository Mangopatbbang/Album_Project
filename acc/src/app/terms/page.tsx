import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "이용약관" };

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

export default function TermsPage() {
  return (
    <main style={{ backgroundColor: "var(--bg)", minHeight: "100dvh", padding: "48px 24px 80px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none", display: "inline-block", marginBottom: 32 }}>
          ← 아차청음사
        </Link>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>이용약관</h1>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 0 }}>시행일: 2026년 5월 8일</p>

        <P>
          아차청음사(이하 &quot;서비스&quot;)를 이용해 주셔서 감사합니다.
          본 약관은 서비스 이용에 관한 기본적인 사항을 규정합니다.
          서비스에 가입하거나 이용함으로써 본 약관에 동의한 것으로 간주합니다.
        </P>

        <S>1. 서비스 소개</S>
        <P>
          아차청음사는 음악 앨범을 기록하고, 평점·한줄평·트랙 좋아요 등 감상 기록을 남기며
          멤버들과 공유할 수 있는 음악 아카이브 서비스입니다.
        </P>
        <P>
          서비스는 Spotify의 API를 활용하여 앨범 정보를 제공합니다.
          앨범 데이터 및 이미지의 저작권은 각 권리자에게 있으며, 서비스는 이를 상업적으로 이용하지 않습니다.
        </P>

        <S>2. 이용 자격</S>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li>만 14세 이상인 경우에만 서비스에 가입하고 이용할 수 있습니다.</Li>
          <Li>만 14세 미만인 경우 보호자의 동의가 있어도 가입이 불가합니다.</Li>
          <Li>허위 정보로 가입한 경우 서비스 이용이 제한될 수 있습니다.</Li>
        </ul>

        <S>3. 계정 및 보안</S>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li>계정의 보안(비밀번호 관리 등)은 이용자 본인이 책임집니다.</Li>
          <Li>타인의 계정을 도용하거나 허가 없이 접근하는 행위는 금지됩니다.</Li>
          <Li>계정 도용이 의심될 경우 즉시 비밀번호를 변경하고 운영자에게 알려주세요.</Li>
        </ul>

        <S>4. 금지 행위</S>
        <P>서비스 이용 시 아래 행위는 금지됩니다.</P>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li>타인을 비방·모욕하거나 명예를 훼손하는 콘텐츠 게시</Li>
          <Li>허위 사실 유포 또는 타인을 속이는 행위</Li>
          <Li>음란물, 폭력물 등 불법 콘텐츠 게시</Li>
          <Li>저작권 등 타인의 지식재산권을 침해하는 행위</Li>
          <Li>서비스 시스템에 해를 끼치는 행위 (해킹, 크롤링, 서비스 방해 등)</Li>
          <Li>영리 목적의 광고·홍보 콘텐츠 무단 게시</Li>
          <Li>관련 법령을 위반하는 일체의 행위</Li>
        </ul>
        <P>위 금지 행위 적발 시 사전 통보 없이 계정이 정지 또는 삭제될 수 있습니다.</P>

        <S>5. 이용자 콘텐츠</S>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li>평점, 한줄평, 댓글 등 이용자가 작성한 콘텐츠의 저작권은 이용자 본인에게 있습니다.</Li>
          <Li>작성한 콘텐츠는 서비스 운영 및 개선을 위해 내부적으로 활용될 수 있습니다.</Li>
          <Li>타인의 권리를 침해하는 콘텐츠는 운영자가 삭제할 수 있습니다.</Li>
          <Li>회원 탈퇴 시 작성 콘텐츠 처리 방식은 탈퇴 시 안내를 따릅니다.</Li>
        </ul>

        <S>6. 서비스 변경 및 중단</S>
        <P>
          운영자는 서비스의 내용·기능을 변경하거나 서비스를 일시적·영구적으로 중단할 수 있습니다.
          중요한 변경이나 종료의 경우 서비스 내 공지 또는 이메일을 통해 사전에 안내합니다.
        </P>
        <P>
          서비스 중단으로 인해 이용자에게 발생한 손해에 대해서는 관련 법령에서 정한 범위 내에서만 책임을 집니다.
        </P>

        <S>7. 면책 조항</S>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li>서비스는 이용자가 게시한 콘텐츠의 정확성·신뢰성을 보증하지 않습니다.</Li>
          <Li>천재지변, 서버 장애 등 불가항력적 사유로 발생한 손해에 대해 책임을 지지 않습니다.</Li>
          <Li>이용자 간 분쟁 또는 이용자와 제3자 간 분쟁에 대해 운영자는 개입 의무가 없습니다.</Li>
          <Li>서비스가 제공하는 앨범 정보(Spotify 데이터)의 정확성은 Spotify의 데이터에 의존하며, 오류에 대해 책임을 지지 않습니다.</Li>
        </ul>

        <S>8. 약관 변경</S>
        <P>
          본 약관은 법령 변경이나 서비스 정책 변경에 따라 수정될 수 있습니다.
          약관 변경 시 시행일 7일 전부터 서비스 내 공지사항을 통해 안내하며,
          변경 후 서비스를 계속 이용하면 변경된 약관에 동의한 것으로 간주합니다.
        </P>

        <S>9. 준거법 및 관할</S>
        <P>
          본 약관은 대한민국 법령에 따라 해석되며, 서비스 관련 분쟁은 대한민국 법원을 관할로 합니다.
        </P>

        <S>10. 문의</S>
        <ul style={{ margin: "8px 0", padding: 0, listStyle: "none" }}>
          <Li>운영자: 아차청음사 운영자</Li>
          <Li>이메일: dshin280@gmail.com</Li>
        </ul>

        <div style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <Link href="/privacy" style={{ fontSize: 12, color: "var(--text-muted)" }}>개인정보처리방침 보기 →</Link>
        </div>
      </div>
    </main>
  );
}
