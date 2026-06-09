(function () {
  var state = { promise: null, config: null };

  function requestConfig() {
    if (state.config) return Promise.resolve(state.config);
    return fetch("/api/auth/config", { credentials: "same-origin" })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          if (!res.ok) throw new Error(json.message || json.error || "Clerk is not configured.");
          state.config = json;
          return json;
        });
      });
  }

  function loadScript(src, attrs) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        if (existing.dataset.loaded === "1") resolve();
        return;
      }
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      Object.keys(attrs || {}).forEach(function (key) {
        script.setAttribute(key, attrs[key]);
      });
      script.onload = function () {
        script.dataset.loaded = "1";
        resolve();
      };
      script.onerror = function () { reject(new Error("Failed to load Clerk.")); };
      document.head.appendChild(script);
    });
  }

  function loadClerk() {
    if (state.promise) return state.promise;
    state.promise = requestConfig().then(function (config) {
      var base = "https://" + config.frontendApiUrl;
      return loadScript(base + "/npm/@clerk/ui@1/dist/ui.browser.js")
        .then(function () {
          return loadScript(base + "/npm/@clerk/clerk-js@6/dist/clerk.browser.js", {
            "data-clerk-publishable-key": config.publishableKey
          });
        })
        .then(function () {
          if (!window.Clerk) throw new Error("Clerk did not initialize.");
          return window.Clerk.load({
            ui: { ClerkUI: window.__internal_ClerkUICtor }
          });
        })
        .then(function () { return window.Clerk; });
    });
    return state.promise;
  }

  function token() {
    return loadClerk().then(function (clerk) {
      if (!clerk.session) return "";
      return clerk.session.getToken();
    });
  }

  function api(path, options) {
    return token().then(function (sessionToken) {
      options = options || {};
      options.headers = Object.assign({}, options.headers || {}, sessionToken ? {
        Authorization: "Bearer " + sessionToken
      } : {});
      options.credentials = "same-origin";
      return fetch(path, options).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          if (!res.ok) throw new Error(json.message || json.error || "Request failed");
          return json;
        });
      });
    });
  }

  function roleLabel(role) {
    return String(role || "").replace(/_/g, " ");
  }

  window.ILLY_CLERK = {
    load: loadClerk,
    api: api,
    roleLabel: roleLabel
  };
})();
