"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ProfileSection } from "./profile-section";

export type InitialAccount = {
  name: string;
  email: string;
  image: string;
};

const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
const AVATAR_DIMENSION = 256;

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
          reject(new Error("Traitement d'image indisponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Image invalide"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

export function AccountForm({ initialAccount }: { initialAccount: InitialAccount }) {
  const router = useRouter();
  const [name, setName] = useState(initialAccount.name);
  const [image, setImage] = useState(initialAccount.image);
  const [isPending, startTransition] = useTransition();
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailRequestedFor, setEmailRequestedFor] = useState<string | null>(null);
  const [isRequestingEmail, startEmailRequest] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isDirty = name !== initialAccount.name || image !== initialAccount.image;

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Merci de choisir un fichier image.");
      return;
    }
    if (file.size > MAX_AVATAR_FILE_SIZE) {
      toast.error("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    setIsProcessingImage(true);
    try {
      setImage(await resizeImageToDataUrl(file));
    } catch {
      toast.error("Impossible de traiter cette image.");
    } finally {
      setIsProcessingImage(false);
    }
  }

  function handleEmailChange() {
    const email = newEmail.trim();
    if (!email || email.toLowerCase() === initialAccount.email.toLowerCase()) {
      toast.error("Saisissez une adresse différente de l'actuelle.");
      return;
    }
    startEmailRequest(async () => {
      const { error } = await authClient.changeEmail({
        newEmail: email,
        callbackURL: "/dashboard/profile",
      });
      if (error) {
        toast.error(error.message ?? "La demande n'a pas pu être envoyée.");
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
        toast.error(error.message ?? "Une erreur est survenue.");
        return;
      }
      toast.success("Profil enregistré.");
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
          aria-label="Changer la photo de profil"
          className="group relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted outline-none focus-visible:focus-ring"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-xl font-medium text-muted-foreground">
              {initials || "?"}
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
            {name || "Votre nom"}
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
              Retirer la photo
            </Button>
          )}
        </div>
      </div>

      <div className="mt-8">
        <ProfileSection
          title="Vos informations"
          description="Le nom et la photo qui apparaissent dans vos échanges avec l'équipe Automerio."
        >
          <div className="grid gap-4 sm:max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-w-48 flex-1"
                />
                <Button onClick={handleSave} disabled={!isDirty || isPending} aria-busy={isPending}>
                  {isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
              {isDirty && image !== initialAccount.image && (
                <p className="text-xs text-muted-foreground">
                  Enregistrez pour appliquer la nouvelle photo.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">E-mail</p>
              {changingEmail ? (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEmailChange();
                  }}
                >
                  <Label htmlFor="new-email" className="font-normal text-muted-foreground">
                    Nouvelle adresse
                  </Label>
                  <Input
                    id="new-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={isRequestingEmail} aria-busy={isRequestingEmail}>
                      {isRequestingEmail ? "Envoi…" : "Recevoir le lien de confirmation"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setChangingEmail(false)}
                      disabled={isRequestingEmail}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-sm text-foreground">{initialAccount.email}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setChangingEmail(true)}>
                    Changer d&apos;adresse
                  </Button>
                </div>
              )}
              <p role="status" className="text-xs text-muted-foreground empty:hidden">
                {emailRequestedFor
                  ? `Un lien de confirmation a été envoyé à ${initialAccount.email}. Une fois confirmé, un second lien vérifiera ${emailRequestedFor}.`
                  : ""}
              </p>
            </div>
          </div>
        </ProfileSection>
      </div>
    </>
  );
}
