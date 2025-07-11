"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface DelegationContextType {
  delegateSignatures: boolean
  payForGas: boolean
  setDelegateSignatures: (value: boolean) => void
  setPayForGas: (value: boolean) => void
}

const DelegationContext = createContext<DelegationContextType | undefined>(undefined)

export function DelegationProvider({ children }: { children: ReactNode }) {
  const [delegateSignatures, setDelegateSignatures] = useState(false)
  const [payForGas, setPayForGas] = useState(false)

  return (
    <DelegationContext.Provider
      value={{
        delegateSignatures,
        payForGas,
        setDelegateSignatures,
        setPayForGas,
      }}
    >
      {children}
    </DelegationContext.Provider>
  )
}

export function useDelegation() {
  const context = useContext(DelegationContext)
  if (context === undefined) {
    throw new Error("useDelegation must be used within a DelegationProvider")
  }
  return context
}
