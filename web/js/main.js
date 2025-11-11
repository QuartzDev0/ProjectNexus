document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("proxyForm");
  const input = document.getElementById("urlInput");
  const cloakBtn = document.getElementById("cloakBtn");
  const cloakOption = document.getElementById("cloakOption");

  // Submit form -> open proxied URL
  form.addEventListener("submit", e => {
    e.preventDefault();
    let url = input.value.trim();

    if (!url) return alert("Enter a URL or search query.");

    // add https:// if missing
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }

    window.location.href = `/api/proxy?url=${encodeURIComponent(url)}`;
  });

  // Cloaker behavior
  cloakBtn.addEventListener("click", () => {
    const mode = cloakOption.value;
    const nexusURL = window.location.origin;

    if (mode === "about_blank") {
      const cloaked = window.open("about:blank", "_blank");
      const iframe = cloaked.document.createElement("iframe");
      iframe.src = nexusURL;
      iframe.style = "border:none;width:100%;height:100vh;";
      cloaked.document.body.style.margin = "0";
      cloaked.document.body.appendChild(iframe);
    } else if (mode === "blob_url") {
      const blob = new Blob(
        [`<iframe src="${nexusURL}" style="border:none;width:100%;height:100vh;"></iframe>`],
        { type: "text/html" }
      );
      const blobURL = URL.createObjectURL(blob);
      window.open(blobURL, "_blank");
    }
  });
});