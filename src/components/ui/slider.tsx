import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"

/**
 * `getAriaLabel` et `getAriaValueText` visent la poignee, non la racine : c'est
 * l'`input` qu'elle rend qui porte la valeur pour un lecteur d'ecran. Poses sur
 * la racine, ils atterriraient sur un conteneur de role `group` et n'auraient
 * jamais ete lus.
 */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  getAriaLabel,
  getAriaValueText,
  ...props
}: SliderPrimitive.Root.Props & {
  getAriaLabel?: SliderPrimitive.Thumb.Props["getAriaLabel"];
  getAriaValueText?: SliderPrimitive.Thumb.Props["getAriaValueText"];
}) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  return (
    <SliderPrimitive.Root
      className={cn("data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-input/90 select-none data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            getAriaLabel={getAriaLabel}
            getAriaValueText={getAriaValueText}
            className="relative block h-4 w-6 shrink-0 rounded-full before:absolute before:-inset-y-1 before:-inset-x-0.5 before:content-['']  bg-white shadow-md ring-1 ring-black/10 transition-[color,box-shadow,background-color] select-none not-dark:bg-clip-padding hover:ring-4 hover:ring-ring/30 focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[orientation=vertical]:h-6 data-[orientation=vertical]:w-4"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
