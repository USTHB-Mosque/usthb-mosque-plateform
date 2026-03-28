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
    <div className="flex items-center gap-4">
      <div className="bg-primary/10 size-14 rounded-xl flex items-center justify-center">
        <div className="[&>svg]:size-8 [&>svg]:text-primary">{icon}</div>
      </div>
      <div>
        <div className="space-y-2">
          <p className="font-bold">{title}</p>
          <p className="text-sm">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default ActivityDescriptionLine
