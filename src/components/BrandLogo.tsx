interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg'
}

export default function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const dimensions = {
    sm: { container: 'w-10 h-10', svg: 28 },
    md: { container: 'w-12 h-12', svg: 38 },
    lg: { container: 'w-16 h-16', svg: 48 },
  }[size]

  return (
    <div className={`${dimensions.container} rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0`}>
      <svg
        width={dimensions.svg}
        height={dimensions.svg}
        viewBox="0 0 34 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 跑道外圈 */}
        <path
          d="M8 6H22C27 6 30 9 30 14C30 19 27 22 22 22H12"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* 跑道内圈 */}
        <path
          d="M8 12H20C23 12 25 14 25 17C25 20 23 22 20 22H12"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* AI 闪电 */}
        <path
          d="M16 16L21 16L18 22L24 22L14 30L17 24L12 24L16 16Z"
          fill="white"
        />
      </svg>
    </div>
  )
}
