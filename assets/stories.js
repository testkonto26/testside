/* SYNQ Stories — public experience. No private API keys or story data in source. */
(function () {
  "use strict";
  const form = document.getElementById("story-form");
  if (!form) return;
  const title = document.getElementById("story-title");
  const body = document.getElementById("story-text");
  const count = document.getElementById("story-count");
  const status = document.getElementById("story-form-status");
  const submit = document.getElementById("story-submit");
  const dialog = document.getElementById("story-confirm");
  const confirm = document.getElementById("story-confirm-send");
  const cancel = document.getElementById("story-cancel");
  const list = document.getElementById("story-list");
  const more = document.getElementById("stories-more");
  const sorts = Array.from(document.querySelectorAll("[data-sort]"));
  const PAGE_SIZE = 20;
  let client = null;
  let currentSort = "new";
  let page = 0;
  let loading = false;
  let sending = false;

  function message(text, type) {
    status.textContent = text;
    status.dataset.state = type || "info";
  }

  function containsContactInfo(value) {
    return /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(value) ||
      /(?:https?:\/\/|www\.)\S+/i.test(value) ||
      /(^|\s)@[\w.]{2,}/m.test(value) ||
      /(?:\+?\d[\d\s().-]{6,}\d)/.test(value);
  }

  function empty(text) {
    const p = document.createElement("p");
    p.className = "stories-empty";
    p.textContent = text;
    list.appendChild(p);
  }

  function prettyDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function el(tag, cls, text) {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function storyCard(story) {
    const card = el("article", "story-card");
    const head = el("div", "story-card-head");
    head.append(el("span", "story-card-tag", "SYNQ STORIES"));
    head.append(el("time", "story-card-date", prettyDate(story.published_at)));
    const h3 = el("h3", "", story.title);
    const content = el("p", "story-card-text", story.story_text);
    const foot = el("div", "story-card-footer");
    foot.append(el("span", "story-card-anon", "ANONYM HISTORIE"));
    const like = el("button", "story-like");
    like.type = "button";
    like.setAttribute("aria-pressed", String(Boolean(story.liked_by_me)));
    like.setAttribute("aria-label", "Synes godt om: " + story.title);
    const heart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    heart.setAttribute("viewBox", "0 0 24 24");
    heart.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z");
    heart.append(path);
    like.append(heart, el("span", "", new Intl.NumberFormat("da-DK").format(story.like_count || 0)));
    like.addEventListener("click", async function () {
      if (!client || like.disabled) return;
      like.disabled = true;
      try {
        await ensureSession();
        const result = await client.rpc("toggle_synq_like", { p_story_id: story.id });
        if (result.error) throw result.error;
        await loadStories(true);
      } catch (err) {
        like.disabled = false;
        window.alert("Kunne ikke gemme dit like lige nu. Prøv igen senere.");
      }
    });
    foot.append(like);
    card.append(head, h3, content, foot);
    return card;
  }

  async function loadStories(reset) {
    if (!client || loading) return;
    loading = true;
    if (reset) {
      page = 0;
      list.replaceChildren();
      empty("Henter historier...");
    }
    more.hidden = true;
    try {
      const response = await client.rpc("list_synq_stories", {
        p_sort: currentSort, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE
      });
      if (response.error) throw response.error;
      const items = response.data || [];
      if (reset) list.replaceChildren();
      if (items.length === 0 && page === 0) empty("Der er endnu ingen godkendte historier. Måske bliver din den første.");
      items.forEach(function (story) { list.appendChild(storyCard(story)); });
      if (items.length === PAGE_SIZE) more.hidden = false;
      page += 1;
    } catch (err) {
      if (reset) list.replaceChildren();
      if (!list.children.length) empty("Historierne kunne ikke hentes lige nu. Prøv igen senere.");
    } finally {
      loading = false;
    }
  }

  async function ensureSession() {
    const response = await client.auth.getSession();
    if (response.error) throw response.error;
    if (response.data.session) return;
    const auth = await client.auth.signInAnonymously();
    if (auth.error) throw auth.error;
  }

  body.addEventListener("input", function () {
    count.textContent = new Intl.NumberFormat("da-DK").format(body.value.length) + " / 2.500";
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!client || sending) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const text = title.value.trim() + "\n" + body.value.trim();
    if (title.value.trim().length < 6 || body.value.trim().length < 80) {
      message("Skriv en titel på mindst 6 tegn og en historie på mindst 80 tegn.", "error");
      return;
    }
    if (containsContactInfo(text)) {
      message("Fjern e-mails, telefonnumre, links og brugernavne. Husk også at fjerne personnavne.", "error");
      return;
    }
    message("Bekræft indsendelsen i vinduet.", "info");
    dialog.showModal();
  });

  cancel.addEventListener("click", function () { if (!sending) dialog.close(); });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog && !sending) dialog.close();
  });
  dialog.addEventListener("cancel", function (event) {
    if (sending) event.preventDefault();
  });

  confirm.addEventListener("click", async function () {
    if (!client || sending) return;
    if (!form.checkValidity()) { dialog.close(); form.reportValidity(); return; }
    sending = true;
    confirm.disabled = true;
    cancel.disabled = true;
    try {
      await ensureSession();
      const response = await client.rpc("submit_synq_story", {
        p_title: title.value.trim(), p_story: body.value.trim(),
        p_rights_ok: true, p_privacy_ok: true
      });
      if (response.error) throw response.error;
      dialog.close();
      form.reset();
      count.textContent = "0 / 2.500";
      message("Tak! Din historie er modtaget og afventer godkendelse. Den er ikke offentlig endnu.", "success");
    } catch (err) {
      dialog.close();
      const detail = String(err && err.message || "").toLowerCase();
      if (detail.includes("personal_data")) {
        message("Historien indeholder muligvis kontaktoplysninger. Fjern dem og prøv igen.", "error");
      } else if (detail.includes("rate_limit")) {
        message("Du har allerede sendt flere historier i dag. Prøv igen senere.", "error");
      } else {
        message("Historien kunne ikke sendes. Prøv igen senere. Intet er offentliggjort.", "error");
      }
    } finally {
      sending = false;
      confirm.disabled = false;
      cancel.disabled = false;
    }
  });

  sorts.forEach(function (button) {
    button.addEventListener("click", function () {
      currentSort = button.dataset.sort;
      sorts.forEach(function (item) { item.setAttribute("aria-pressed", String(item === button)); });
      loadStories(true);
    });
  });
  more.addEventListener("click", function () { loadStories(false); });

  const config = window.SYNQ_STORIES_CONFIG || {};
  if (typeof config.url !== "string" || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url) ||
      typeof config.anonKey !== "string" || config.anonKey.length < 20 ||
      !window.supabase || !window.supabase.createClient) {
    message("Indsendelser åbner snart. Vi er ved at gøre den anonyme indsendelse og godkendelsen klar.", "info");
    return;
  }
  try {
    client = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    submit.disabled = false;
    message("Din historie sendes først, når du har bekræftet begge punkter og godkendt den sidste pop-up.", "info");
    loadStories(true);
  } catch (err) {
    message("Indsendelser er midlertidigt utilgængelige.", "error");
  }
})();
