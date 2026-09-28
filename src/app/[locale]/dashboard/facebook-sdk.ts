declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; xfbml: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        options: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

let fbSdkPromise: Promise<void> | null = null;

export function loadFacebookSdk(appId: string): Promise<void> {
  if (typeof window.FB !== "undefined") return Promise.resolve();
  if (fbSdkPromise) return fbSdkPromise;

  fbSdkPromise = new Promise((resolve) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, xfbml: false, version: "v21.0" });
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/fr_FR/sdk.js";
    script.async = true;
    document.body.appendChild(script);
  });
  return fbSdkPromise;
}
