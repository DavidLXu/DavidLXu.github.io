(function () {
  function setupWechatModal() {
    var modal = document.querySelector("[data-wechat-modal]");
    if (!modal) return;

    var openBtn = document.querySelector("[data-wechat-modal-open]");
    var closeBtns = modal.querySelectorAll("[data-wechat-modal-close]");
    if (!openBtn) return;

    if (document.body && modal.parentNode !== document.body) {
      document.body.appendChild(modal);
    }

    modal.hidden = true;

    openBtn.addEventListener("click", function (e) {
      e.preventDefault();
      modal.hidden = false;
    });

    closeBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        modal.hidden = true;
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        modal.hidden = true;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupWechatModal);
  } else {
    setupWechatModal();
  }
})();
