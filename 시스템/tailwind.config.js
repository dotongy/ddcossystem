const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./index.html",
    "./js/**/*.{js,ts,jsx,tsx}", // JavaScript 파일 내에서 Tailwind 클래스를 사용하도록 경로 추가
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#3B82F6',      // 메인 브랜드 색상 (ex: 버튼, 활성화된 메뉴)
        'primary-dark': '#2563EB', // 마우스 올렸을 때 색상
        'secondary': '#6B7280',    // 보조 텍스트, 아이콘 색상
        'light': '#F9FAFB',        // 배경색 (아주 연한 회색)
        'border': '#E5E7EB',       // 경계선, 구분선 색상
        'success': '#10B981',      // 성공 상태 (ex: 저장 완료)
        'danger': '#EF4444',       // 위험, 삭제 상태
      },
      fontFamily: {
        // 기본 폰트를 Pretendard로 설정
        sans: ['Pretendard', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}