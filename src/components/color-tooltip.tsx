type ColorTooltipProps = {
  x: number
  y: number
  colors: string[]
  onSelect: (color: string) => void
  onClose: () => void
}

export function ColorTooltip({
  x,
  y,
  colors,
  onSelect,
  onClose,
}: ColorTooltipProps) {
  return (
    <div
      className="pointer-events-auto fixed z-50"
      style={{
        left: x,
        top: y,
        transform: 'translateX(-50%)',
      }}
      onMouseLeave={onClose}
    >
      <div className="flex justify-center">
        <div className="h-0 w-0 border-r-6 border-b-8 border-l-6 border-r-transparent border-b-gray-400 border-l-transparent drop-shadow-sm" />
      </div>

      <div className="relative mt-1 grid grid-cols-8 gap-2 rounded-md border bg-gray-400 p-2 shadow-md">
        {colors.map((color) => (
          <button
            key={color}
            className={`h-6 w-6 rounded border transition hover:scale-110`}
            style={{ backgroundColor: color }}
            onClick={() => {
              onSelect(color)
              onClose()
            }}
          />
        ))}
      </div>
    </div>
  )
}
