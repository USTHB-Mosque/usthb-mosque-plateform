'use client'

import { create } from 'zustand'

interface AuthFormState {
  step: number
  firstName: string
  lastName: string
  phoneNumber: string
  state: string
  speciality: string
  schoolCertificate: File | null
  email: string
  password: string
  confirmPassword: string
  
  setStep: (step: number) => void
  setField: (field: string, value: string | File | null) => void
  reset: () => void
}

const initialState = {
  step: 1,
  firstName: '',
  lastName: '',
  phoneNumber: '',
  state: '',
  speciality: '',
  schoolCertificate: null as File | null,
  email: '',
  password: '',
  confirmPassword: '',
}

export const useAuthFormStore = create<AuthFormState>((set) => ({
  ...initialState,
  
  setStep: (step) => set({ step }),
  
  setField: (field, value) => set((state) => ({
    ...state,
    [field]: value,
  })),
  
  reset: () => set(initialState),
}))