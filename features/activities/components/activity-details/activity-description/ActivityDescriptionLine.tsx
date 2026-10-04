import React from 'react'

interface ActivityDescriptionLineProps {
  icon: React.ReactNode
  title: string
  description: string
}

const ActivityDescriptionLine: React.FC<ActivityDescriptionLineProps> = ({
  icon,
  title,
  description,
}) => {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-primary mt-0.5 [&>svg]:size-5">{icon}</div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className="text-base font-semibold text-card-foreground">{description}</span>
      </div>
    </div>
  )
}

export default ActivityDescriptionLine
