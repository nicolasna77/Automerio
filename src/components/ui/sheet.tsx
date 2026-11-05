"use client"

import { useTranslations } from "next-intl"
import * as React from "react"
import { Drawer as SheetPrimitive } from "@base-ui/react/drawer"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

type SheetSide = "top" | "right" | "bottom" | "left"

const SWIPE_DIRECTION = {
  top: "up",
  right: "right",
  bottom: "down",
  left: "left",
} as const

// Tiroir sur le Drawer de Base UI (DESIGN.md, Mouvement) : il suit le doigt
// et se referme d'un glissement vers son bord, à la vitesse du geste. Le
// côté se choisit sur la racine, qui fixe le sens du glissement.
function Sheet({
  side = "right",
  ...props
}: SheetPrimitive.Root.Props & { side?: SheetSide }) {
  return (
    <SheetSideContext.Provider value={side}>
      <SheetPrimitive.Root
        data-slot="sheet"
        swipeDirection={SWIPE_DIRECTION[side]}
        {...props}
      />
    </SheetSideContext.Provider>
  )
}

const SheetSideContext = React.createContext<SheetSide>("right")

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

// Le fond s'éclaircit à mesure que le tiroir s'en va sous le doigt. Base UI
// ne lui transmet pas la force du geste (--drawer-swipe-strength vaut
// toujours 1 sur lui) : sa sortie reste courte pour suivre un geste vif.
function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0 data-swiping:duration-0 supports-backdrop-filter:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const t = useTranslations("Common")
  const side = React.useContext(SheetSideContext)
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Viewport data-slot="sheet-viewport" className="fixed inset-0 z-50">
        <SheetPrimitive.Popup
          data-slot="sheet-content"
          data-side={side}
          className={cn(
            // Pendant le geste, le tiroir suit le doigt sans transition ; au
            // relâchement, la durée suit la force du geste.
            "fixed z-50 flex flex-col data-[side=left]:touch-pan-y data-[side=right]:touch-pan-y bg-popover bg-clip-padding text-sm text-popover-foreground shadow-xl transition-[translate,opacity] duration-200 ease-out data-swiping:duration-0 data-swiping:select-none data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*200ms)]",
            "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:translate-y-[var(--drawer-swipe-movement-y,0px)] data-[side=bottom]:data-ending-style:translate-y-full data-[side=bottom]:data-starting-style:translate-y-full",
            "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:translate-y-[var(--drawer-swipe-movement-y,0px)] data-[side=top]:data-ending-style:-translate-y-full data-[side=top]:data-starting-style:-translate-y-full",
            "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:translate-x-[var(--drawer-swipe-movement-x,0px)] data-[side=left]:data-ending-style:-translate-x-full data-[side=left]:data-starting-style:-translate-x-full data-[side=left]:sm:max-w-sm",
            "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:translate-x-[var(--drawer-swipe-movement-x,0px)] data-[side=right]:data-ending-style:translate-x-full data-[side=right]:data-starting-style:translate-x-full data-[side=right]:sm:max-w-sm",
            // Animations réduites : fondu seul, le tiroir ne glisse pas.
            "motion-reduce:data-ending-style:translate-x-0! motion-reduce:data-ending-style:translate-y-0! motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:translate-x-0! motion-reduce:data-starting-style:translate-y-0! motion-reduce:data-starting-style:opacity-0",
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close
              data-slot="sheet-close"
              render={
                <Button
                  variant="ghost"
                  className="absolute top-4 right-4 bg-secondary"
                  size="icon-sm"
                />
              }
            >
              <XIcon
              />
              <span className="sr-only">{t("close")}</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Popup>
      </SheetPrimitive.Viewport>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  )
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("flex-1 overflow-y-auto px-6 pb-6", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-6", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
