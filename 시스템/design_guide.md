CRM 디자인 시스템 v2.0: "Clarity & Focus"
이 문서는 CRM 시스템의 사용자 경험(UX)과 인터페이스(UI)를 재정의하는 디자인 시스템 가이드입니다. 새로운 컨셉인 **"Clarity & Focus"**는 데이터의 명확성을 극대화하고 사용자가 핵심 업무에 집중할 수 있는 환경을 제공하는 것을 최우선 목표로 삼습니다.

디자인 철학: "Clarity & Focus"
성공적인 CRM의 디자인은 화려함이 아닌, 사용자의 인지 부하(Cognitive Load)를 줄이고, 더 빠르고 정확한 의사결정을 돕는 것에 있습니다. 모든 디자인 요소는 이러한 목적을 달성하기 위해 존재해야 합니다.

핵심 원칙:

체계 (Systematic): 모든 디자인 요소는 예측 가능한 규칙(Rule)에 따라 결정됩니다.

명확성 (Clarity): 사용자는 현재 상태, 데이터의 의미, 실행 가능한 행동을 즉시 파악할 수 있어야 합니다.

집중 (Focus): 불필요한 시각적 요소를 제거하고, 사용자가 현재 과업에만 집중할 수 있도록 유도합니다.

접근성 (Accessibility): 모든 사용자가 불편함 없이 시스템을 사용할 수 있도록 웹 접근성(WCAG) 표준을 준수합니다.

1. 기반 스타일 (Foundational Styles)
시스템의 뼈대를 이루는 컬러, 타이포그래피, 간격 시스템을 정의합니다. 이 기반 위에 모든 컴포넌트가 일관되게 쌓아 올려집니다.

1.1. 컬러 시스템 (Color System)
단순한 색상 목록을 넘어, 색상의 역할과 위계를 정의하는 **'의미론적 컬러 시스템'**을 도입합니다. 이를 통해 사용자는 색상만으로도 정보의 의미를 직관적으로 파악할 수 있습니다.

전문가 팁: 단순히 색상 이름을 나열하는 대신, 50부터 900까지의 명도 스케일(Scale)을 사용하면 훨씬 유연한 UI를 만들 수 있습니다. (예: primary-500은 기본 버튼, primary-100은 연한 배경색). uicolors.app 와 같은 도구를 사용하면 브랜드 색상에 맞는 전체 스케일을 쉽게 생성할 수 있습니다.

1.1.1. 기본 색상 (Grayscale & Primary)
무채색 (Neutral): UI의 90%를 차지하는 가장 중요한 색상입니다. 순수한 회색(Gray)보다 약간의 색조가 가미된 Slate 계열을 사용하면 화면이 더 세련되고 깊이 있어 보입니다.

주요 색상 (Primary): 브랜드의 신뢰성을 나타내는 파란색 계열을 유지하되, 다양한 상황에 대응할 수 있도록 명도 스케일을 정의합니다.

1.1.2. 의미론적 색상 (Semantic Colors)
사용자에게 특정 상태(성공, 위험, 경고, 정보)를 즉시 전달하기 위한 색상입니다. 각 상태별로 배경색, 테두리색, 텍스트색을 조합하여 사용할 수 있도록 다단계로 정의합니다.

1.1.3. 접근성 준수
모든 텍스트와 배경색의 조합은 WCAG 2.1 AA 표준에 따라 최소 4.5:1의 명도 대비를 만족해야 합니다. 웹에서 "Color Contrast Checker"를 검색하여 색상 조합을 수시로 확인하세요.

1.2. 타이포그래피 (Typography)
가독성은 데이터 중심 애플리케이션의 핵심입니다. 일관된 타이포그래피 스케일을 사용하여 정보의 위계를 명확하게 전달합니다.

글꼴 (Font Family): Pretendard는 한글과 영문의 조화가 뛰어나고 가독성이 높아 데이터 기반의 UI에 매우 적합한 선택입니다.

스케일 (Scale): 모든 폰트 크기는 정해진 비율에 따라 정의되어 시각적 조화를 이룹니다.

사용 예시	Tailwind 클래스	폰트 크기 / 줄 간격	설명
페이지 제목	text-3xl	30px / 36px	가장 중요한 페이지 제목
섹션 제목	text-xl	20px / 28px	카드, 모달 등 섹션의 제목
본문, 기본 텍스트	text-base	16px / 24px	대부분의 텍스트, 입력 필드 기본 크기
보조 텍스트, 라벨	text-sm	14px / 20px	보조 설명, 입력 필드 라벨
작은 캡션	text-xs	12px / 16px	표의 각주, 작은 태그 등

Sheets로 내보내기
두께 (Weight):

font-normal (400): 기본 본문

font-medium (500): 라벨, 강조하고 싶은 텍스트

font-semibold (600): 제목, 버튼 텍스트

1.3. 간격 및 여백 (Spacing)
8pt 그리드 시스템을 도입하여 모든 여백(margin), 패딩(padding), 컴포넌트 간 간격을 8px의 배수로 설정합니다. 이는 디자인에 시각적인 리듬감과 일관성을 부여하는 가장 효과적인 방법입니다.

p-2 (8px), p-4 (16px), p-6 (24px), p-8 (32px) 등을 주로 사용합니다.

1.4. 스타일 (Borders & Shadows)
테두리 곡률 (Border Radius):

rounded-lg (8px): 버튼, 입력 필드, 카드 등 대부분의 컴포넌트

rounded-xl (12px): 모달 등 더 큰 컨테이너

그림자 (Box Shadow):

shadow-sm: 기본 상태의 카드

shadow-md: 인터랙티브한 요소에 마우스를 올렸을 때

2. 컴포넌트 가이드 (Component Guide)
위 기반 스타일을 바탕으로 시스템의 핵심 컴포넌트를 정의합니다.

2.1. 버튼 (Buttons)
Primary Button (주요 버튼): 가장 중요한 행동(저장, 등록)에 사용합니다.

배경: bg-primary-600, 호버: bg-primary-700

텍스트: text-white, font-semibold

Secondary Button (보조 버튼): 덜 중요한 행동(취소, 목록으로)에 사용합니다.

배경: bg-white, 호버: bg-neutral-50

테두리: border border-neutral-300

텍스트: text-neutral-700, font-semibold

Destructive Button (파괴적 버튼): 삭제 등 위험한 행동에 사용합니다.

배경: bg-danger-600, 호버: bg-danger-700

텍스트: text-white, font-semibold

2.2. 입력 폼 (Forms)
라벨 (Label): text-sm, font-medium, text-neutral-700

입력 필드 (Input):

기본: rounded-lg, border-neutral-300

포커스: border-primary-500, ring-2 ring-primary-200 (테두리와 그림자 효과 동시 적용)

3. Tailwind CSS 설정 파일
위 디자인 시스템을 프로젝트에 즉시 적용하기 위한 tailwind.config.js 파일입니다. (실제 프로젝트에서는 require('tailwindcss/colors')가 필요할 수 있습니다.)

JavaScript

// tailwind.config.js 또는 <script> 태그 내

// const colors = require('tailwindcss/colors') // Node.js 환경에서 사용

tailwind.config = {
  theme: {
    extend: {
      colors: {
        // 1. 무채색: Gray 대신 Slate를 사용하여 깊이감을 더함
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b', // 보조 텍스트 (기존 secondary)
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },

        // 2. 주요 색상: 기존 Blue를 명도 스케일로 확장
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // 기본 (기존 primary)
          600: '#2563eb', // 호버 (기존 primary-dark)
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },

        // 3. 의미론적 색상: 상태별로 명확한 색상 정의
        // Tailwind CSS의 기본 색상을 그대로 활용하거나 커스텀할 수 있습니다.
        // 예: success: colors.emerald, warning: colors.amber, danger: colors.rose
        success: {
          500: '#10B981', // 기존 success
        },
        danger: {
          500: '#EF4444', // 기존 danger
        },
      },
      // 4. 폰트 패밀리: Pretendard를 기본 sans-serif 글꼴로 지정
      fontFamily: {
        sans: ['Pretendard', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}