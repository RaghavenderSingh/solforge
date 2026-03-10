import React from 'react'
import Image from 'next/image'

interface LogoProps {
  size?: 'lg' | 'md' | 'sm'
  className?: string
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    lg: { width: 105, height: 69 },
    md: { width: 86, height: 57 },
    sm: { width: 66, height: 43 },
  }

  const dimensions = sizes[size]

  return (
    <div className={`inline-block ${className}`}>
      <Image
        src="/logo.png"
        alt="Solforge"
        width={dimensions.width}
        height={dimensions.height}
        priority
      />
    </div>
  )
}


export function ElaraLogoGradient({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    lg: { width: 105, height: 69 },
    md: { width: 86, height: 57 },
    sm: { width: 66, height: 43 },
  }

  const dimensions = sizes[size]

  return (
    <div className={`inline-block ${className}`}>
      <Image
        src="/logo.png"
        alt="Solforge"
        width={dimensions.width}
        height={dimensions.height}
        priority
      />
    </div>
  )
}