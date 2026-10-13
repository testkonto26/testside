/* SYNQ Stories admin — all pending content is protected by Supabase RPC admin checks. */
(function () {
  "use strict";
  const cfg = window.SYNQ_STORIES_CONFIG || {};
  const loginBox = document.getElementById("admin-login");
  const loginForm = document.getElementById("login-form");
  const loginButton = document.getElementById("admin-login-btn");
  const panel = document.getElementById("admin-panel");
  const output = document.getElementById("admin-story-list");
  const status = document.getElementById("admin-status");
  const tabs = Array.from(document.querySelectorAll("[data-admin-status]"));
  let client = null;
  let currentStatus = "pending";
  let busy = false;

  function message(text) { status.textContent = text; }
  function node(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function showLogin() { panel.hidden = true; loginBox.hidden = false; }
  function showPanel() { loginBox.hidden = true; panel.hidden = false; }

  async function verifyAdmin() {
    const result = await client.rpc("is_synq_story_admin");
    if (result.error) throw result.error;
    return result.data === true;
  }

  async function loadStories() {
    if (!client || busy) return;
    busy = true;
    output.replaceChildren();
    output.append(node("p", "admin-warning", "Henter historier..."));
    try {
      const response = await client.rpc("admin_list_synq_stories", { p_status: currentStatus });
      if (response.error) throw response.error;
      output.replaceChildren();
      const stories = response.data || [];
      if (!stories.length) {
        output.append(node("p", "admin-warning",
          currentStatus === "pending" ? "Ingen historier afventer godkendelse." : "Ingen godkendte historier endnu."));
      }
      stories.forEach(renderStory);
      message(stories.length + " historier vist.");
    } catch (err) {
      output.replaceChildren();
      message("Kunne ikke hente historier. Kontroller administratorrettigheder og databaseopsætning.");
    } finally {
      busy = false;
    }
  }

  async function review(id, action) {
    if (busy) return;
    const approved = action === "approve";
    const question = approved
      ? "Har du gennemlæst HELE historien og sikret, at den IKKE indeholder personnavne, identificerende forhold eller andre personoplysninger? Godkendelsen offentliggør historien straks."
      : "Afvis og SLET historien permanent? Dette kan ikke fortrydes.";
    if (!window.confirm(question)) return;
    busy = true;
    message(approved ? "Godkender historien..." : "Sletter historien...");
    try {
      const response = await client.rpc("admin_review_synq_story", { p_id: id, p_action: action });
      if (response.error) throw response.error;
      if (response.data !== true) throw new Error("Historien findes ikke længere.");
      message(approved ? "Historien er nu offentlig." : "Historien er slettet permanent.");
    } catch (err) {
      const detail = String(err && err.message || "");
      message(detail.includes("personal_data")
        ? "Historien indeholder kontaktoplysninger og kan ikke godkendes. Slet den."
        : "Handlingen kunne ikke gennemføres. Prøv igen.");
    } finally {
      busy = false;
      await loadStories();
    }
  }

  function renderStory(story) {
    const article = node("article", "admin-story");
    const date = story.submitted_at
      ? new Intl.DateTimeFormat("da-DK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(story.submitted_at))
      : "";
    article.append(node("small", "", date + " · " + story.status));
    article.append(node("h3", "", story.title));
    article.append(node("p", "", story.story_text));
    const actions = node("div", "admin-story-actions");
    if (story.status === "pending") {
      const approve = node("button", "admin-approve", "Godkend og offentliggør");
      approve.type = "button";
      approve.addEventListener("click", function () { review(story.id, "approve"); });
      actions.append(approve);
    }
    const remove = node("button", "admin-delete", "Afvis og slet permanent");
    remove.type = "button";
    remove.addEventListener("click", function () { review(story.id, "delete"); });
    actions.append(remove);
    article.append(actions);
    output.append(article);
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!client) return;
    loginButton.disabled = true;
    message("Kontrollerer adgang...");
    try {
      const email = document.getElementById("admin-email").value.trim();
      const password = document.getElementById("admin-password").value;
      const result = await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (!await verifyAdmin()) {
        await client.auth.signOut();
        throw new Error("Du har ikke administratorrettigheder.");
      }
      document.getElementById("admin-password").value = "";
      showPanel();
      await loadStories();
    } catch (err) {
      showLogin();
      message("Kunne ikke logge ind. Kontroller login og administratorrettigheder.");
    } finally {
      loginButton.disabled = false;
    }
  });

  document.getElementById("admin-logout").addEventListener("click", async function () {
    await client.auth.signOut();
    output.replaceChildren();
    showLogin();
    message("Du er logget ud.");
  });
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      currentStatus = tab.dataset.adminStatus;
      tabs.forEach(function (item) { item.setAttribute("aria-pressed", String(item === tab)); });
      loadStories();
    });
  });

  if (typeof cfg.url !== "string" || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url) ||
      typeof cfg.anonKey !== "string" || cfg.anonKey.length < 20 ||
      !window.supabase || !window.supabase.createClient) {
    loginButton.disabled = true;
    message("Backend er endnu ikke forbundet. Se supabase/README.md i GitHub-repositoriet.");
    return;
  }
  client = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  client.auth.getSession().then(async function (response) {
    if (response.data.session && await verifyAdmin()) {
      showPanel();
      await loadStories();
    } else {
      showLogin();
    }
  }).catch(function () { showLogin(); });
})();
