'use client'

import type { ReactNode } from 'react'
import { QueryProvider } from './QueryProvider'
import { StoreProvider } from './StoreProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <StoreProvider>
        {children}
      </StoreProvider>
    </QueryProvider>
  )
}