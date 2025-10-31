"use client"
import * as React from "react"

type Props = React.SVGProps<SVGSVGElement> & {
  size?: number
}

export function XLogo({ size = 20, className, ...rest }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d="M18.244 2H21l-6.52 7.45L22 22h-6.9l-4.31-5.62L5.73 22H3l7.01-8.01L2 2h6.9l3.92 5.2L18.244 2Zm-1.21 18h2.03L7.04 4h-2.1l12.094 16Z" />
    </svg>
  )
}

