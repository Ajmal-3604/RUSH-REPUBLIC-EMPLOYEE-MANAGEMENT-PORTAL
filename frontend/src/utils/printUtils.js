// Shared by Review & Approval and Print Details' "Preview Printable Version"
// buttons. Waits for every uploaded image to finish loading (otherwise a
// slow network request prints as a blank box) and swaps the browser tab
// title for the duration of the print so the browser's own print header
// shows the shoot name instead of the app's generic tab title.
export async function printWithBranding(title, container) {
  const root = container || document.body;
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
        // Don't let one slow/broken image block printing forever.
        setTimeout(resolve, 5000);
      });
    })
  );

  const originalTitle = document.title;
  if (title) document.title = title;
  window.print();
  if (title) {
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }
}
