"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "@/lib/toast";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { initialsOf } from "@/lib/initials";
import { ProfileSection } from "./profile-section";

export type InitialAccount = {
  name: string;
  email: string;
  image: string;
};

const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
const AVATAR_DIMENSION = 256;

// Messages d'erreur internes : l'appelant affiche son propre message.
function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(
          1,
          AVATAR_DIMENSION / Math.max(img.width, img.height)
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas-unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("invalid-image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("unreadable-file"));
    reader.readAsDataURL(file);
  });
}

export function AccountForm({ initialAccount }: { initialAccount: InitialAccount }) {
  const router = useRouter();
  const t = useTranslations("Dashboard.profile.account");
  const tCommon = useTranslations("Common");
  const [name, setName] = useState(initialAccount.name);
  const [image, setImage] = useState(initialAccount.image);
  const [isPending, startTransition] = useTransition();
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailRequestedFor, setEmailRequestedFor] = useState<string | null>(null);
  // Erreur affichée sous le champ du nouvel e-mail, qui reçoit le focus.
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isRequestingEmail, startEmailRequest] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = initialsOf(name);

  const isDirty = name !== initialAccount.name || image !== initialAccount.image;

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("notAnImage"));
      return;
    }
    if (file.size > MAX_AVATAR_FILE_SIZE) {
      toast.error(t("tooLarge"));
      return;
    }

    setIsProcessingImage(true);
    try {
      setImage(await resizeImageToDataUrl(file));
    } catch {
      toast.error(t("imageFailed"));
    } finally {
      setIsProcessingImage(false);
    }
  }

  function showEmailError(message: string) {
    setEmailError(message);
    document.getElementById("new-email")?.focus();
  }

  function handleEmailChange() {
    setEmailError(null);
    const email = newEmail.trim();
    if (!email || email.toLowerCase() === initialAccount.email.toLowerCase()) {
      showEmailError(t("sameEmail"));
      return;
    }
    startEmailRequest(async () => {
      const { error } = await authClient.changeEmail({
        newEmail: email,
        callbackURL: "/dashboard/profile",
      });
      if (error) {
        showEmailError(error.message ?? t("emailRequestFailed"));
        return;
      }
      setEmailRequestedFor(email);
      setChangingEmail(false);
      setNewEmail("");
    });
  }

  function handleSave() {
    startTransition(async () => {
      const { error } = await authClient.updateUser({
        name,
        image: image || null,
      });
      if (error) {
        toast.error(error.message ?? t("error"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingImage}
          aria-label={t("changePhoto")}
          className="group relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted outline-none focus-visible:focus-ring"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-xl font-medium text-muted-foreground">
              {initials}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {isProcessingImage ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="size-5" aria-hidden="true" />
            )}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="min-w-0">
          <p className="truncate text-xl font-semibold tracking-tight text-foreground">
            {name || t("namePlaceholder")}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {initialAccount.email}
          </p>
          {image && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="mt-1 -ml-2"
              onClick={() => setImage("")}
            >
              {t("removePhoto")}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <ProfileSection
          title={t("sectionTitle")}
          description={t("sectionDescription")}
        >
          <div className="grid gap-4 sm:max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-w-48 flex-1"
                />
                <Button onClick={handleSave} disabled={!isDirty || isPending} aria-busy={isPending}>
                  {isPending ? tCommon("saving") : tCommon("save")}
                </Button>
              </div>
              {isDirty && image !== initialAccount.image && (
                <p className="text-xs text-muted-foreground">
                  {t("savePhotoHint")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{t("email")}</p>
              {changingEmail ? (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEmailChange();
                  }}
                >
                  <Label htmlFor="new-email" className="font-normal text-muted-foreground">
                    {t("newEmail")}
                  </Label>
                  <Input
                    id="new-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value);
                      setEmailError(null);
                    }}
                    aria-invalid={emailError ? true : undefined}
                    aria-describedby={emailError ? "new-email-error" : undefined}
                  />
                  {emailError && (
                    <p id="new-email-error" className="text-sm text-destructive">{emailError}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={isRequestingEmail} aria-busy={isRequestingEmail}>
                      {isRequestingEmail ? tCommon("sending") : t("sendLink")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setChangingEmail(false);
                        setEmailError(null);
                      }}
                      disabled={isRequestingEmail}
                    >
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-sm text-foreground">{initialAccount.email}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setChangingEmail(true)}>
                    {t("changeEmail")}
                  </Button>
                </div>
              )}
              <p role="status" className="text-xs text-muted-foreground empty:hidden">
                {emailRequestedFor
                  ? t("emailRequested", { current: initialAccount.email, next: emailRequestedFor })
                  : ""}
              </p>
            </div>
          </div>
        </ProfileSection>
      </div>
    </>
  );
}
