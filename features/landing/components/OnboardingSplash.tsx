import React from 'react'

export type OnboardingPhase = 'ready' | 'hiding' | 'zooming' | 'leaving' | 'done'

interface OnboardingSplashProps {
  phase: Exclude<OnboardingPhase, 'done'>
  onContinue: () => void
}

export default function OnboardingSplash({ phase, onContinue }: OnboardingSplashProps) {
  return (
    <button
      aria-label="اضغط للمتابعة وتشغيل التلاوة"
      className={`onboarding-splash onboarding-splash--${phase}`}
      data-node-id="82:1441"
      onClick={onContinue}
      type="button"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className="onboarding-splash__background"
        data-node-id="82:1443"
        src="/static/images/onboarding-splash-bg.png"
      />
      <span className="onboarding-splash__content" data-node-id="82:1444">
        <span className="onboarding-splash__ring" data-node-id="82:1445">
          <span className="onboarding-splash__icon" data-node-id="82:1446">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" data-node-id="82:1447" src="/static/images/onboarding-splash-icon.svg" />
          </span>
        </span>
        <span className="onboarding-splash__copy" data-node-id="82:1450">
          <span className="onboarding-splash__heading" data-node-id="82:1451">
            اضغط للمتابعة
          </span>
          <span className="onboarding-splash__subtitle" data-node-id="82:1452">
            اضغط على أي شيء
          </span>
        </span>
      </span>
    </button>
  )
}
