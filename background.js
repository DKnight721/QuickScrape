// background.js
import supabase from "./supabase";

// Keep session in Chrome storage in sync with Supabase session
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN") {
    chrome.storage.local.set({ supabaseSession: session });
  } else if (event === "SIGNED_OUT") {
    chrome.storage.local.remove("supabaseSession");
  }
});
